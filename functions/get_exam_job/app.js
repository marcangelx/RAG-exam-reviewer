const { getUserSub, userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse } = require("../../services/responses");
const { StorageService } = require("../../services/storage");

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  const storage = new StorageService(config.bucketName);

  const jobId = event?.pathParameters?.jobId;
  if (!jobId) {
    return jsonResponse(400, { message: "jobId is required." });
  }

  const job = await repository.getJob(jobId);
  if (!job) {
    return jsonResponse(404, { message: `Exam job ${jobId} was not found.` });
  }

  const response = { job };
  if (job.status === "COMPLETED" && job.resultKey) {
    response.result = await storage.downloadJson(job.resultKey);
  }

  return jsonResponse(200, response);
};
