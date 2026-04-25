const { userPartitionKey, userScopedPrefix } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { utcNow } = require("../../services/ids");
const { buildProcessedDocument, extractTextFromBytes } = require("../../services/parser");
const { MetadataRepository } = require("../../services/repository");
const { StorageService } = require("../../services/storage");

function documentIdFromKey(s3Key) {
  const parts = String(s3Key || "").split("/");
  if (parts[0] === "users" && parts[2] === "uploads" && parts.length >= 5) {
    return parts[3];
  }
  throw new Error(`Unexpected S3 key format: ${s3Key}`);
}

function userSubFromKey(s3Key) {
  const parts = String(s3Key || "").split("/");
  if (parts[0] === "users" && parts[2] === "uploads" && parts.length >= 5) {
    return decodeURIComponent(parts[1]);
  }
  throw new Error(`Unexpected S3 key format: ${s3Key}`);
}

function repositoryForObjectKey(config, objectKey) {
  const userSub = userSubFromKey(objectKey);
  return {
    userSub,
    repository: new MetadataRepository(config.tableName, userPartitionKey(userSub)),
  };
}

function processedKeyFor(userSub, documentId) {
  return `${userScopedPrefix(userSub)}/processed/${documentId}.json`;
}

function validateObjectKey(s3Key) {
  const parts = String(s3Key || "").split("/");
  if (parts[0] === "users" && parts[2] === "uploads") {
    return;
  }
  if (parts[0] !== "users") {
    throw new Error(`Unexpected S3 key format: ${s3Key}`);
  }
  throw new Error(`Ignoring non-upload S3 key: ${s3Key}`);
}

function iterObjectKeys(event) {
  const keys = [];
  const records = event?.Records || [];
  if (records.length) {
    for (const record of records) {
      keys.push(decodeURIComponent(String(record?.s3?.object?.key || "").replace(/\+/g, " ")));
    }
    return keys;
  }

  const objectKey = event?.detail?.object?.key;
  if (objectKey) {
    keys.push(decodeURIComponent(String(objectKey).replace(/\+/g, " ")));
  }
  return keys;
}

exports.iterObjectKeys = iterObjectKeys;

exports.handler = async (event) => {
  const config = getConfig();
  const storage = new StorageService(config.bucketName);

  for (const objectKey of iterObjectKeys(event)) {
    validateObjectKey(objectKey);
    const documentId = documentIdFromKey(objectKey);
    const { userSub, repository } = repositoryForObjectKey(config, objectKey);
    const asset = await repository.getDocument(documentId);
    if (!asset) {
      continue;
    }

    await repository.updateDocument(documentId, {
      status: "PROCESSING",
      updatedAt: utcNow(),
      error: null,
    });

    try {
      const fileBytes = await storage.downloadBytes(objectKey);
      const fileType = String(asset.fileType || "").toLowerCase();
      const rawText = await extractTextFromBytes(fileBytes, fileType);
      const processed = buildProcessedDocument({
        documentId,
        title: asset.fileName || documentId,
        rawText,
        sourceLabel: asset.fileName || "uploaded-file",
      });
      const processedKey = processedKeyFor(userSub, documentId);

      await storage.uploadJson(processedKey, processed);
      await repository.updateDocument(documentId, {
        status: "READY",
        processedKey,
        chunkCount: processed.chunks.length,
        updatedAt: utcNow(),
        error: null,
      });
    } catch (error) {
      await repository.updateDocument(documentId, {
        status: "FAILED",
        updatedAt: utcNow(),
        error: error.message,
      });
    }
  }

  return { status: "ok" };
};
