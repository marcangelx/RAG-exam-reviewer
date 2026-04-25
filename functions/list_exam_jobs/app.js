const { getUserSub, userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse } = require("../../services/responses");

function summarizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    certificationName: job.certificationName,
    questionCount: job.questionCount,
    questionTypes: job.questionTypes,
    includeDistractors: job.includeDistractors,
    sourceAssetIds: job.sourceAssetIds,
    resultAvailable: Boolean(job.resultKey),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    error: job.error,
  };
}

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  const jobs = await repository.listJobs();

  return jsonResponse(200, { jobs: jobs.map(summarizeJob) });
};
