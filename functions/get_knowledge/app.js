const { getUserSub, userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse } = require("../../services/responses");

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));

  const documentId = event?.pathParameters?.documentId;
  if (!documentId) {
    return jsonResponse(400, { message: "documentId is required." });
  }

  const asset = await repository.getDocument(documentId);
  if (!asset) {
    return jsonResponse(404, { message: `Knowledge asset ${documentId} was not found.` });
  }

  return jsonResponse(200, { asset });
};
