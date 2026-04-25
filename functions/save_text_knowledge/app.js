const { getUserSub, userPartitionKey, userScopedPrefix } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { newId, utcNow } = require("../../services/ids");
const { ValidationError, buildProcessedDocument, normalizeText } = require("../../services/parser");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse, parseJsonBody } = require("../../services/responses");
const { StorageService } = require("../../services/storage");

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const body = parseJsonBody(event);

  const text = String(body.text || "").trim();
  const title = String(body.title || "Pasted knowledge").trim();
  if (!text) {
    return jsonResponse(400, { message: "text is required." });
  }

  let processed;
  try {
    const normalizedText = normalizeText(text);
    processed = buildProcessedDocument({
      documentId: newId("doc"),
      title,
      rawText: normalizedText,
      sourceLabel: "inline-text",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse(400, { message: error.message });
    }
    throw error;
  }

  const storage = new StorageService(config.bucketName);
  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  const prefix = userScopedPrefix(userSub);
  const rawKey = `${prefix}/processed/${processed.documentId}.source.txt`;
  const processedKey = `${prefix}/processed/${processed.documentId}.json`;
  const timestamp = utcNow();

  await storage.uploadText(rawKey, normalizeText(text), "text/plain; charset=utf-8");
  await storage.uploadJson(processedKey, processed);

  const asset = {
    id: processed.documentId,
    entityType: "KnowledgeAsset",
    userSub,
    title,
    sourceType: "TEXT",
    fileType: "TXT",
    fileName: "inline.txt",
    status: "READY",
    s3Key: rawKey,
    processedKey,
    chunkCount: processed.chunks.length,
    createdAt: timestamp,
    updatedAt: timestamp,
    error: null,
  };

  await repository.saveDocument(asset);
  return jsonResponse(201, { documentId: asset.id, asset });
};
