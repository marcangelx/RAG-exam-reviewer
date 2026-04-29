const OpenAI = require("openai");
const { GetSecretValueCommand, SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");

const secretsClient = new SecretsManagerClient({});

class OpenAIExamClient {
  constructor({ model, secretArn = "" }) {
    this.model = model;
    this.secretArn = secretArn;
  }

  async loadApiKey() {
    const envKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (envKey) {
      return envKey;
    }

    if (!this.secretArn) {
      throw new Error("OPENAI_API_KEY or OPENAI_SECRET_ARN must be configured.");
    }

    const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: this.secretArn }));
    const rawSecret = response.SecretString || "";
    if (!rawSecret) {
      throw new Error("OpenAI secret is empty.");
    }

    try {
      const parsed = JSON.parse(rawSecret);
      const apiKey = parsed.apiKey || parsed.OPENAI_API_KEY;
      if (apiKey) {
        return apiKey;
      }
    } catch (_error) {
      // fall back to treating the secret as a raw API key
    }

    return rawSecret;
  }

  async generateExam({ systemPrompt, userPrompt }) {
    const client = new OpenAI({ apiKey: await this.loadApiKey() });
    const response = await client.chat.completions.create({
      model: this.model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    return JSON.parse(content);
  }
}

module.exports = {
  OpenAIExamClient,
};
