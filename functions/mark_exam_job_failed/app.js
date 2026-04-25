const { userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { utcNow } = require("../../services/ids");
const { MetadataRepository } = require("../../services/repository");

function extractErrorMessage(event = {}) {
  const cause = event?.errorInfo?.Cause;
  if (!cause) {
    return event?.errorInfo?.Error || "Exam generation failed after retries.";
  }

  try {
    const parsed = JSON.parse(cause);
    return parsed.errorMessage || cause;
  } catch (_error) {
    return cause;
  }
}

exports.handler = async (event) => {
  const config = getConfig();
  const { jobId, userSub } = event || {};
  if (!jobId) {
    throw new Error("jobId is required.");
  }
  if (!userSub) {
    throw new Error("userSub is required.");
  }

  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  await repository.updateJob(jobId, {
    status: "FAILED",
    updatedAt: utcNow(),
    error: extractErrorMessage(event),
  });

  return { status: "failed", jobId };
};
