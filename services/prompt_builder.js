const systemPrompt = `
You are a certification exam preparation assistant.

Your job is to generate realistic study questions using only the supplied knowledge context.

Follow these rules:
- Never invent facts that are not supported by the knowledge.
- Keep the style exam-like, concise, and useful for practice.
- Return strict JSON only.
- Respect the requested question count and question types.
- Explanations should help the learner understand why the answer is correct.
- Every question must cite source chunk ids from the supplied knowledge.
`.trim();

function loadSystemPrompt() {
  return systemPrompt;
}

function selectChunks(processedDocuments, maxChars = 14000) {
  const selected = [];
  let usedChars = 0;

  for (const document of processedDocuments) {
    const title = document.title || document.documentId || "Knowledge Source";
    for (const chunk of document.chunks || []) {
      const rendered = `Document: ${title}\nChunk: ${chunk.chunkId} (${chunk.label})\nContent:\n${String(chunk.text || "").trim()}`;
      if (usedChars + rendered.length > maxChars && selected.length) {
        return selected;
      }
      selected.push(rendered);
      usedChars += rendered.length;
    }
  }

  return selected;
}

function buildExamPrompt({
  certificationName,
  questionCount,
  questionTypes,
  includeDistractors,
  processedDocuments,
}) {
  const selectedChunks = selectChunks(processedDocuments);
  const typesString = questionTypes.join(", ");
  const distractorInstruction = includeDistractors
    ? "Use plausible distractors and at least some trick framing where appropriate."
    : "Do not add trick framing beyond what the source naturally supports.";
  const chunkBlock = selectedChunks.join("\n\n---\n\n");

  return `
Create a certification-style practice exam grounded only in the supplied knowledge.

Exam target:
- Certification focus: ${certificationName}
- Number of questions: ${questionCount}
- Question types to include: ${typesString}
- Distractor mode: ${distractorInstruction}

Return strict JSON with this exact top-level shape:
{
  "examTitle": "string",
  "questions": [
    {
      "type": "MULTIPLE_CHOICE | FILL_IN_THE_BLANK | TRICK",
      "prompt": "string",
      "choices": ["string", "string"],
      "hint": "string",
      "correctAnswer": "string",
      "explanation": "string",
      "difficulty": "easy | medium | hard",
      "sourceEvidence": ["chunk-001", "chunk-002"]
    }
  ]
}

Rules:
- Use only the knowledge below.
- If the knowledge is insufficient for a requested question, reduce scope instead of inventing facts.
- Every question must have at least one sourceEvidence entry pointing to the chunk ids below.
- MULTIPLE_CHOICE questions must have exactly 4 choices.
- FILL_IN_THE_BLANK and TRICK questions may use an empty choices array.
- The hint must help the learner reason toward the answer without giving the exact answer away.
- Keep explanations concise and study-friendly.

Knowledge:
${chunkBlock}
`.trim();
}

module.exports = {
  loadSystemPrompt,
  buildExamPrompt,
};
