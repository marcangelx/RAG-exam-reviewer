const test = require("node:test");
const assert = require("node:assert/strict");

const { buildExamPrompt } = require("../services/prompt_builder");

test("buildExamPrompt includes grounding rules and hint field", () => {
  const processedDocuments = [
    {
      documentId: "doc_1",
      title: "AWS Notes",
      chunks: [
        {
          chunkId: "chunk-001",
          label: "Section 1",
          text: "Amazon S3 provides object storage with eleven nines of durability.",
        },
      ],
    },
  ];

  const prompt = buildExamPrompt({
    certificationName: "AWS Certified Cloud Practitioner",
    questionCount: 5,
    questionTypes: ["MULTIPLE_CHOICE", "TRICK"],
    includeDistractors: true,
    processedDocuments,
  });

  assert.match(prompt, /AWS Certified Cloud Practitioner/);
  assert.match(prompt, /MULTIPLE_CHOICE, TRICK/);
  assert.match(prompt, /Use plausible distractors/);
  assert.match(prompt, /"hint": "string"/);
  assert.match(prompt, /chunk-001/);
});
