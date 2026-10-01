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
    return repairShatteredText(result.text);
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: .${ext}. Only PDF and DOCX are supported.`);
}

export interface ExtractionResult {
  cvText: string | null;
  extractionError: string | null;
}

// Shared by both upload paths (direct file upload and the Drive-link
// upload) so an empty/scanned CV is caught here once, before ever calling
// Gemini, instead of burning an API call to have the model discover the
// same thing and report "empty CV" back to us.
export async function extractAndValidate(
  buffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  try {
    const cvText = await extractCvText(buffer, fileName);
    if (cvText.replace(/\s/g, "").length < 30) {
      return {
        cvText: null,
        extractionError:
          "This file has little to no extractable text — it's likely a scanned image without a text layer. Try re-exporting it as a text-based PDF, or upload the DOCX version instead.",
      };
    }
    return { cvText, extractionError: null };
  } catch (err) {
    return {
      cvText: null,
      extractionError: err instanceof Error ? err.message : "Unknown extraction error",
    };
  }
}

// Some PDFs (typically docx-to-pdf conversions) make pdf-parse emit one
// character per line — "A\nd\ni\nt\ny\na" instead of "Aditya" — because every
// glyph lands at a slightly different y-coordinate. Word/line boundaries in
// the real document still survive as their own single-space "line" in that
// stream, so once this pattern is detected, simply dropping every newline
// reconstructs the original text correctly.
function repairShatteredText(text: string): string {
  const lines = text.split("\n");
  const nonEmpty = lines.filter((l) => l.length > 0);
  const isShattered =
    nonEmpty.length > 20 &&
    nonEmpty.filter((l) => l.length === 1).length / nonEmpty.length > 0.6;
  return isShattered ? lines.join("") : text;
}
