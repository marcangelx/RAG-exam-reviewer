const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");

const { getUserSub, userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { newId, utcNow } = require("../../services/ids");
const { MetadataRepository } = require("../../services/repository");
const { jsonResponse, parseJsonBody } = require("../../services/responses");
const { ValidationError, validateJobRequest } = require("../../services/schemas");

const sfnClient = new SFNClient({});

exports.handler = async (event) => {
  const config = getConfig();
  const userSub = getUserSub(event);
  const body = parseJsonBody(event);

  let payload;
  try {
    payload = validateJobRequest(body);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse(400, { message: error.message });
    }
    throw error;
  }

  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  for (const assetId of payload.sourceAssetIds) {
    const asset = await repository.getDocument(assetId);
    if (!asset) {
      return jsonResponse(404, { message: `Knowledge asset ${assetId} was not found.` });
    }
    if (asset.status !== "READY") {
      return jsonResponse(409, { message: `Knowledge asset ${assetId} is not ready for generation.` });
    }
  }

  const jobId = newId("job");
  const timestamp = utcNow();
  const job = {
    id: jobId,
    entityType: "ExamJob",
    userSub,
    sourceAssetIds: payload.sourceAssetIds,
    status: "QUEUED",
    questionCount: payload.questionCount,
    questionTypes: payload.questionTypes,
    includeDistractors: payload.includeDistractors,
    certificationName: payload.certificationName,
    resultKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    error: null,
  };

  await repository.saveJob(job);
  await sfnClient.send(
    new StartExecutionCommand({
      stateMachineArn: config.generationStateMachineArn,
      name: jobId,
      input: JSON.stringify({ jobId, userSub }),
    }),
  );

  return jsonResponse(202, { jobId, job });
};
