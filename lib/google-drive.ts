import "server-only";

interface ParsedGoogleLink {
  kind: "drive-file" | "google-doc";
  fileId: string;
}

// Recognizes two different kinds of Google links:
//   - an uploaded file sitting in Drive: drive.google.com/file/d/ID/view,
//     drive.google.com/open?id=ID, drive.google.com/uc?id=ID
//   - a native Google Docs document: docs.google.com/document/d/ID/edit
// These need different download endpoints below, since a Google Doc has no
// PDF/DOCX bytes of its own until it's exported.
export function parseGoogleLink(input: string): ParsedGoogleLink | null {
  const docMatch = input.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { kind: "google-doc", fileId: docMatch[1] };

  const drivePatterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const p of drivePatterns) {
    const match = input.match(p);
    if (match) return { kind: "drive-file", fileId: match[1] };
  }
  return null;
}

export interface DriveFile {
  buffer: Buffer;
  ext: "pdf" | "docx";
  viewUrl: string;
}

const PDF_MAGIC = Buffer.from("%PDF-");
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // docx is a zip

// Fetches a Google Drive file or Google Docs document's bytes using public,
// no-credentials-needed endpoints — this only works when the file/doc is
// shared "Anyone with the link can view". We never call the real Drive API
// (that needs OAuth / a service account), so there's no new credential to
// manage.
export async function fetchDriveFile(url: string): Promise<DriveFile> {
  const parsed = parseGoogleLink(url);
  if (!parsed) {
    throw new Error(
      "Couldn't find a file ID in that link. Paste the normal 'Share' link for a single Drive file or Google Doc."
    );
  }

  const buffer =
    parsed.kind === "google-doc"
      ? await downloadGoogleDocAsPdf(parsed.fileId)
      : await downloadDriveFile(parsed.fileId);

  let ext: "pdf" | "docx";
  if (buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    ext = "pdf";
  } else if (buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
    ext = "docx";
  } else {
    throw new Error(
      "That link didn't return a PDF or DOCX file — this usually means it isn't shared as 'Anyone with the link can view'. Check the sharing settings and try again."
    );
  }

  const viewUrl =
    parsed.kind === "google-doc"
      ? `https://docs.google.com/document/d/${parsed.fileId}/edit`
      : `https://drive.google.com/file/d/${parsed.fileId}/view`;

  return { buffer, ext, viewUrl };
}

async function downloadGoogleDocAsPdf(fileId: string): Promise<Buffer> {
  const res = await fetch(`https://docs.google.com/document/d/${fileId}/export?format=pdf`, {
    redirect: "follow",
  });
  return Buffer.from(await res.arrayBuffer());
}

async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const firstUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const first = await fetch(firstUrl, { redirect: "follow" });
  const firstBuffer = Buffer.from(await first.arrayBuffer());
  const contentType = first.headers.get("content-type") ?? "";

  if (!contentType.includes("text/html")) {
    return firstBuffer;
  }

  // Large files get an HTML "can't scan for viruses" interstitial with a
  // confirm token embedded in the page instead of the file bytes. Resumes
  // are small enough that this is rare, but handle it rather than failing.
  const html = firstBuffer.toString("utf-8");
  const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
  if (confirmMatch) {
    const confirmed = await fetch(
      `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`,
      { redirect: "follow" }
    );
    return Buffer.from(await confirmed.arrayBuffer());
  }

  return firstBuffer; // let the magic-byte check above produce the final error
}
