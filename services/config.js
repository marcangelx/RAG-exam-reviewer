class AppConfig {
  constructor({
    bucketName,
    tableName,
    maxUploadSizeMb,
    openaiModel,
    openaiSecretArn,
    generationStateMachineArn,
  }) {
    this.bucketName = bucketName;
    this.tableName = tableName;
    this.maxUploadSizeMb = maxUploadSizeMb;
    this.openaiModel = openaiModel;
    this.openaiSecretArn = openaiSecretArn;
    this.generationStateMachineArn = generationStateMachineArn;
  }

  get maxUploadSizeBytes() {
    return this.maxUploadSizeMb * 1024 * 1024;
  }
}

function getConfig() {
  return new AppConfig({
    bucketName: process.env.APP_BUCKET_NAME,
    tableName: process.env.APP_TABLE_NAME,
    maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 10),
    openaiModel: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    openaiSecretArn: process.env.OPENAI_SECRET_ARN || "",
    generationStateMachineArn: process.env.GENERATION_STATE_MACHINE_ARN || "",
  });
}

module.exports = {
  AppConfig,
  getConfig,
};
