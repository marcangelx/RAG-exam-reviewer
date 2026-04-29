const { userPartitionKey } = require("../../services/auth");
const { getConfig } = require("../../services/config");
const { utcNow } = require("../../services/ids");
const { OpenAIExamClient } = require("../../services/openai_client");
const { buildExamPrompt, loadSystemPrompt } = require("../../services/prompt_builder");
const { MetadataRepository } = require("../../services/repository");
const { validateGeneratedExam } = require("../../services/schemas");
const { StorageService } = require("../../services/storage");

exports.handler = async (event) => {
  const config = getConfig();
  const storage = new StorageService(config.bucketName);
  const client = new OpenAIExamClient({
    model: config.openaiModel,
    secretArn: config.openaiSecretArn,
  });

  const { jobId, userSub } = event || {};
  if (!jobId) {
    throw new Error("jobId is required.");
  }
  if (!userSub) {
    throw new Error("userSub is required.");
  }

  const repository = new MetadataRepository(config.tableName, userPartitionKey(userSub));
  const job = await repository.getJob(jobId);
  if (!job) {
    throw new Error(`Exam job ${jobId} was not found.`);
  }

  await repository.updateJob(jobId, { status: "RUNNING", updatedAt: utcNow(), error: null });

  const processedDocuments = [];
  for (const assetId of job.sourceAssetIds || []) {
    const asset = await repository.getDocument(assetId);
    if (!asset || asset.status !== "READY" || !asset.processedKey) {
      throw new Error(`Knowledge asset ${assetId} is not ready.`);
    }
    processedDocuments.push(await storage.downloadJson(asset.processedKey));
  }

  const systemPrompt = loadSystemPrompt();
  const userPrompt = buildExamPrompt({
    certificationName: job.certificationName || "General certification prep",
    questionCount: job.questionCount,
    questionTypes: job.questionTypes,
    includeDistractors: job.includeDistractors,
    processedDocuments,
  });

  const generatedExam = await client.generateExam({ systemPrompt, userPrompt });
  const validatedExam = validateGeneratedExam(generatedExam);
  const resultKey = `users/${encodeURIComponent(userSub)}/generated/${jobId}.json`;

  await storage.uploadJson(resultKey, validatedExam);
  await repository.updateJob(jobId, {
    status: "COMPLETED",
    resultKey,
    updatedAt: utcNow(),
    error: null,
  });

  return { status: "ok", jobId };
};
