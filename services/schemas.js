class ValidationError extends Error {}

const ALLOWED_JOB_TYPES = new Set(["MULTIPLE_CHOICE", "FILL_IN_THE_BLANK", "TRICK"]);
const ALLOWED_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function buildFallbackHint(questionType, sourceEvidence) {
  const evidence = Array.isArray(sourceEvidence) ? sourceEvidence.slice(0, 2).join(", ") : "";
  if (questionType === "MULTIPLE_CHOICE") {
    return evidence
      ? `Use ${evidence} to eliminate options that are not directly supported.`
      : "Eliminate the options that add facts not supported by the source material.";
  }
  return evidence
    ? `Re-read ${evidence} and focus on the exact term or claim supported by the source.`
    : "Focus on the precise wording from the source material before revealing the answer.";
}

function validateJobRequest(payload = {}) {
  const sourceAssetIds = payload.sourceAssetIds || [];
  if (!Array.isArray(sourceAssetIds) || !sourceAssetIds.length) {
    throw new ValidationError("sourceAssetIds must contain at least one ready knowledge asset.");
  }

  const questionCount = Number(payload.questionCount || 0);
  if (questionCount < 1 || questionCount > 25) {
    throw new ValidationError("questionCount must be between 1 and 25.");
  }

  const requestedTypes = payload.questionTypes || [];
  const normalizedTypes = requestedTypes.map((item) => String(item).trim().toUpperCase());
  if (!normalizedTypes.length) {
    throw new ValidationError("questionTypes must include at least one supported type.");
  }

  const invalidTypes = normalizedTypes.filter((item) => !ALLOWED_JOB_TYPES.has(item));
  if (invalidTypes.length) {
    throw new ValidationError(`Unsupported question types: ${invalidTypes.join(", ")}`);
  }

  return {
    sourceAssetIds,
    questionCount,
    questionTypes: normalizedTypes,
    includeDistractors: Boolean(payload.includeDistractors),
    certificationName: String(payload.certificationName || "General certification prep").trim(),
  };
}

function validateGeneratedExam(payload = {}) {
  const questions = payload.questions;
  if (!Array.isArray(questions) || !questions.length) {
    throw new ValidationError("Generated exam must include a non-empty questions array.");
  }

  return {
    examTitle: payload.examTitle || "Generated Exam",
    questions: questions.map((question, index) => {
      const questionType = String(question.type || "").trim().toUpperCase();
      if (!ALLOWED_JOB_TYPES.has(questionType)) {
        throw new ValidationError(`Question ${index + 1} has an unsupported type.`);
      }

      const prompt = String(question.prompt || "").trim();
      const correctAnswer = String(question.correctAnswer || "").trim();
      const hint = String(question.hint || "").trim();
      const explanation = String(question.explanation || "").trim();
      const difficulty = String(question.difficulty || "").trim().toLowerCase();
      const sourceEvidence = question.sourceEvidence || [];
      const choices = question.choices || [];

      if (!prompt || !correctAnswer || !explanation) {
        throw new ValidationError(`Question ${index + 1} is missing a required field.`);
      }
      if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
        throw new ValidationError(`Question ${index + 1} has an invalid difficulty.`);
      }
      if (!Array.isArray(sourceEvidence) || !sourceEvidence.length) {
        throw new ValidationError(`Question ${index + 1} must include source evidence.`);
      }

      if (questionType === "MULTIPLE_CHOICE") {
        if (!Array.isArray(choices) || choices.length !== 4) {
          throw new ValidationError(`Question ${index + 1} must include exactly 4 choices.`);
        }
      } else if (!Array.isArray(choices)) {
        throw new ValidationError(`Question ${index + 1} choices must be an array.`);
      }

      return {
        type: questionType,
        prompt,
        choices,
        hint: hint || buildFallbackHint(questionType, sourceEvidence),
        correctAnswer,
        explanation,
        difficulty,
        sourceEvidence,
      };
    }),
  };
}

module.exports = {
  ValidationError,
  validateJobRequest,
  validateGeneratedExam,
};
