class ValidationError extends Error {}

function inferFileType(fileName, contentType = "") {
  const normalizedName = String(fileName || "").toLowerCase();
  const normalizedType = String(contentType || "").toLowerCase();

  if (normalizedName.endsWith(".pdf") || normalizedType === "application/pdf") {
    return "pdf";
  }
  if (normalizedName.endsWith(".txt") || normalizedType.startsWith("text/plain")) {
    return "txt";
  }
  if (
    normalizedName.endsWith(".docx") ||
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }

  throw new ValidationError("Only PDF, TXT, and DOCX uploads are supported in Phase 2.");
}

function normalizeText(text) {
  const normalized = String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new ValidationError("No usable text was found in the knowledge source.");
  }
  return normalized;
}

function chunkText(text, chunkSize = 1400, overlap = 200) {
  if (chunkSize <= overlap) {
    throw new Error("chunkSize must be greater than overlap.");
  }

  const normalized = normalizeText(text);
  const paragraphs = normalized.split("\n\n").map((item) => item.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}`.trim() : paragraph;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= chunkSize) {
      current = paragraph;
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      const end = Math.min(start + chunkSize, paragraph.length);
      chunks.push(paragraph.slice(start, end));
      if (end === paragraph.length) {
        break;
      }
      start = Math.max(0, end - overlap);
    }
    current = "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((item, index) => ({
    chunkId: `chunk-${String(index + 1).padStart(3, "0")}`,
    label: `Section ${index + 1}`,
    text: item,
  }));
}

function buildProcessedDocument({ documentId, title, rawText, sourceLabel }) {
  const normalized = normalizeText(rawText);
  const chunks = chunkText(normalized);
  return {
    documentId,
    title,
    sourceLabel,
    chunkCount: chunks.length,
    chunks,
  };
}

async function extractTextFromBytes(fileBytes, fileType) {
  if (fileType === "txt") {
    try {
      return normalizeText(new TextDecoder("utf-8", { fatal: true }).decode(fileBytes));
    } catch (_error) {
      return normalizeText(new TextDecoder("latin1").decode(fileBytes));
    }
  }

  if (fileType === "pdf") {
    return extractPdfText(fileBytes);
  }

  if (fileType === "docx") {
    return extractDocxText(fileBytes);
  }

  throw new ValidationError(`Unsupported file type: ${fileType}`);
}

async function extractPdfText(fileBytes) {
  let pdfParse;
  try {
    pdfParse = require("pdf-parse");
  } catch (error) {
    throw new Error("pdf-parse is required to extract PDF text.");
  }

  const data = await pdfParse(Buffer.from(fileBytes));
  const normalized = normalizeText(data.text || "");
  return normalized;
}

async function extractDocxText(fileBytes) {
  let mammoth;
  try {
    mammoth = require("mammoth");
  } catch (error) {
    throw new Error("mammoth is required to extract DOCX text.");
  }

  const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBytes) });
  return normalizeText(result.value || "");
}

module.exports = {
  ValidationError,
  inferFileType,
  normalizeText,
  chunkText,
  buildProcessedDocument,
  extractTextFromBytes,
};
