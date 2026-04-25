const path = require("node:path");

const { getUserSub, userPartitionKey, userScopedPrefix } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { newId, utcNow } = require("../../services/ids");
const { inferFileType, ValidationError } = require("../../services/parser");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse, parseJsonBody } = require("../../services/responses");
const { StorageService } = require("../../services/storage");

function sanitizeFilename(fileName) {
  const cleaned = path.basename(fileName).replace(/ /g, "-");
  return encodeURIComponent(cleaned).replace(/%28/g, "(").replace(/%29/g, ")");
}

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const body = parseJsonBody(event);

  const fileName = String(body.fileName || "").trim();
  const contentType = String(body.contentType || "").trim();
  const fileSizeBytes = Number(body.fileSizeBytes || 0);

  if (!fileName) {
    return jsonResponse(400, { message: "fileName is required." });
  }

  let fileType;
  try {
    fileType = inferFileType(fileName, contentType);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse(400, { message: error.message });
    }
    throw error;
  }

  if (fileSizeBytes <= 0) {
    return jsonResponse(400, { message: "fileSizeBytes must be greater than zero." });
  }

  if (fileSizeBytes > config.maxUploadSizeBytes) {
    return jsonResponse(400, {
      message: `File exceeds the ${config.maxUploadSizeMb} MB upload limit.`,
    });
  }

  const documentId = newId("doc");
  const safeName = sanitizeFilename(fileName);
  const s3Key = `${userScopedPrefix(userSub)}/uploads/${documentId}/${safeName}`;

  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  const storage = new StorageService(config.bucketName);
  const timestamp = utcNow();
  const asset = {
    id: documentId,
    entityType: "KnowledgeAsset",
    userSub,
    sourceType: "FILE",
    fileType: fileType.toUpperCase(),
    fileName,
    status: "UPLOADED",
    s3Key,
    processedKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    error: null,
  };

  await repository.saveDocument(asset);
  const uploadUrl = await storage.createPresignedUpload({
    key: s3Key,
    contentType: contentType || "application/octet-stream",
  });

  return jsonResponse(200, { documentId, uploadUrl, asset });
};
