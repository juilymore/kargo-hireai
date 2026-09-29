import "server-only";
import mammoth from "mammoth";

// Server-side only text extraction (never in the browser), per Section 2 of
// the build spec. Content extracted here is later treated as untrusted data
// when sent to Gemini (guardrail #9) — this module only extracts text, it
// does not sanitize it, since the LLM prompt itself carries the
// data-not-instructions guard.
//
// Uses pdf-parse@1.1.1 (not the v2 class-based API) deliberately: v2 wraps
// pdfjs-dist's worker machinery, which does a bundler-unfriendly dynamic
// `import()` of pdf.worker.mjs that Turbopack rewrites to a chunk path that
// doesn't exist at runtime. v1 runs pdf.js in-process with no worker.
export async function extractCvText(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
      data: Buffer
    ) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: .${ext}. Only PDF and DOCX are supported.`);
}
