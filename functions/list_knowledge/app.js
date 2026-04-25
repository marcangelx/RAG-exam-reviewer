const { getUserSub, userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse } = require("../../services/responses");

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  const assets = await repository.listDocuments();

  return jsonResponse(200, { assets });
};
