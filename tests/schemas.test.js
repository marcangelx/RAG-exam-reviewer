const test = require("node:test");
const assert = require("node:assert/strict");

const { ValidationError, validateGeneratedExam, validateJobRequest } = require("../services/schemas");

test("validateJobRequest normalizes types", () => {
  const payload = validateJobRequest({
    sourceAssetIds: ["doc_123"],
    questionCount: 5,
    questionTypes: ["multiple_choice", "trick"],
    includeDistractors: true,
    certificationName: "AWS SAA",
  });

  assert.deepEqual(payload.questionTypes, ["MULTIPLE_CHOICE", "TRICK"]);
});

test("validateGeneratedExam accepts valid payload", () => {
  const payload = validateGeneratedExam({
    examTitle: "AWS Quiz",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which service stores objects?",
        choices: ["S3", "EC2", "Lambda", "IAM"],
        hint: "Focus on the storage service in the notes.",
        correctAnswer: "S3",
        explanation: "S3 is AWS object storage.",
        difficulty: "easy",
        sourceEvidence: ["chunk-001"],
      },
    ],
  });

  assert.equal(payload.questions[0].difficulty, "easy");
  assert.equal(payload.questions[0].hint, "Focus on the storage service in the notes.");
});

test("validateGeneratedExam rejects invalid choices", () => {
  assert.throws(
    () =>
      validateGeneratedExam({
        questions: [
          {
            type: "MULTIPLE_CHOICE",
            prompt: "Bad question",
            choices: ["one", "two"],
            correctAnswer: "one",
            explanation: "Too few choices.",
            difficulty: "easy",
            sourceEvidence: ["chunk-001"],
          },
        ],
      }),
    ValidationError,
  );
});

test("validateGeneratedExam builds fallback hint", () => {
  const payload = validateGeneratedExam({
    questions: [
      {
        type: "TRICK",
        prompt: "Which statement is incorrect?",
        choices: [],
        correctAnswer: "The claim that S3 is block storage.",
        explanation: "S3 is object storage, not block storage.",
        difficulty: "medium",
        sourceEvidence: ["chunk-002"],
      },
    ],
  });

  assert.match(payload.questions[0].hint, /chunk-002/);
});
