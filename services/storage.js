const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({});

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

class StorageService {
  constructor(bucketName, client = s3Client) {
    this.bucketName = bucketName;
    this.client = client;
  }

  async createPresignedUpload({ key, contentType, expiresIn = 900 }) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  async uploadText(key, content, contentType = "text/plain; charset=utf-8") {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: Buffer.from(content, "utf-8"),
        ContentType: contentType,
      }),
    );
  }

  async uploadJson(key, payload) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: Buffer.from(JSON.stringify(payload), "utf-8"),
        ContentType: "application/json",
      }),
    );
  }

  async downloadBytes(key) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
    return streamToBuffer(response.Body);
  }

  async downloadText(key) {
    const bytes = await this.downloadBytes(key);
    return bytes.toString("utf-8");
  }

  async downloadJson(key) {
    return JSON.parse(await this.downloadText(key));
  }
}

module.exports = {
  StorageService,
};
