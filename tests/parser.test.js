const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const {
  buildProcessedDocument,
  extractTextFromBytes,
  inferFileType,
} = require("../services/parser");
const { iterObjectKeys } = require("../functions/process_knowledge/app");

test("inferFileType supports pdf, txt, and docx", () => {
  assert.equal(inferFileType("notes.pdf", "application/pdf"), "pdf");
  assert.equal(inferFileType("notes.txt", "text/plain"), "txt");
  assert.equal(
    inferFileType("notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "docx",
  );
});

test("inferFileType rejects unsupported uploads", () => {
  assert.throws(() => inferFileType("notes.xlsx", "application/vnd.ms-excel"), /Only PDF, TXT, and DOCX/);
});

test("buildProcessedDocument chunks long text", () => {
  const rawText = Array.from({ length: 7 }, (_, index) => `Paragraph ${index + 1} `.repeat(50)).join("\n\n");
  const processed = buildProcessedDocument({
    documentId: "doc_123",
    title: "Study Guide",
    rawText,
    sourceLabel: "study-guide.txt",
  });

  assert.equal(processed.documentId, "doc_123");
  assert.ok(processed.chunkCount >= 2);
  assert.ok(processed.chunks[0].text);
});

test("extractTextFromBytes handles txt payloads", async () => {
  const extracted = await extractTextFromBytes(Buffer.from("hello\r\nworld"), "txt");
  assert.equal(extracted, "hello\nworld");
});

test("extractTextFromBytes uses pdf-parse for pdf payloads", async () => {
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "pdf-parse") {
      return async () => ({ text: "Page one\n\nPage two" });
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const extracted = await extractTextFromBytes(Buffer.from("%PDF-1.4 fake"), "pdf");
    assert.match(extracted, /Page one/);
    assert.match(extracted, /Page two/);
  } finally {
    Module._load = originalLoad;
  }
});

test("extractTextFromBytes uses mammoth for docx payloads", async () => {
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "mammoth") {
      return {
        extractRawText: async () => ({ value: "Heading\n\nDOCX body" }),
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const extracted = await extractTextFromBytes(Buffer.from("fake docx"), "docx");
    assert.match(extracted, /DOCX body/);
  } finally {
    Module._load = originalLoad;
  }
});

test("iterObjectKeys supports eventbridge s3 events", () => {
  const event = {
    detail: {
      bucket: { name: "example-bucket" },
      object: { key: "users/user-123/uploads/doc_123/sample.pdf" },
    },
  };

  assert.deepEqual(iterObjectKeys(event), ["users/user-123/uploads/doc_123/sample.pdf"]);
});
