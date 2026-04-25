const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

class MetadataRepository {
  constructor(tableName, partitionKey, dbClient = documentClient) {
    if (!partitionKey) {
      throw new Error("MetadataRepository requires an explicit partition key.");
    }
    this.tableName = tableName;
    this.partitionKey = partitionKey;
    this.dbClient = dbClient;
  }

  key(skValue) {
    return { PK: this.partitionKey, SK: skValue };
  }

  async save(item) {
    await this.dbClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  async get(skValue) {
    const response = await this.dbClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: this.key(skValue),
      }),
    );
    return response.Item || null;
  }

  async listByPrefix(skPrefix) {
    const response = await this.dbClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": this.partitionKey,
          ":skPrefix": skPrefix,
        },
      }),
    );
    return response.Items || [];
  }

  async saveDocument(document) {
    await this.save({ ...document, ...this.key(`DOC#${document.id}`) });
  }

  async getDocument(documentId) {
    return this.get(`DOC#${documentId}`);
  }

  async listDocuments() {
    const items = await this.listByPrefix("DOC#");
    return items.sort((left, right) => String(right.updatedAt || "").localeCompare(String(left.updatedAt || "")));
  }

  async updateDocument(documentId, fields) {
    const item = await this.getDocument(documentId);
    if (!item) {
      return null;
    }
    const updated = { ...item, ...fields };
    await this.save(updated);
    return updated;
  }

  async saveJob(job) {
    await this.save({ ...job, ...this.key(`JOB#${job.id}`) });
  }

  async getJob(jobId) {
    return this.get(`JOB#${jobId}`);
  }

  async listJobs() {
    const items = await this.listByPrefix("JOB#");
    return items.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  }

  async updateJob(jobId, fields) {
    const item = await this.getJob(jobId);
    if (!item) {
      return null;
    }
    const updated = { ...item, ...fields };
    await this.save(updated);
    return updated;
  }
}

module.exports = {
  MetadataRepository,
};
