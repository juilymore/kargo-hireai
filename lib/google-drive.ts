import "server-only";

// Extracts the file ID from the common Google Drive share link shapes:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID&export=download
export function extractDriveFileId(input: string): string | null {
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/];
  for (const p of patterns) {
    const match = input.match(p);
    if (match) return match[1];
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

// Fetches a Drive file's bytes using the public, no-credentials-needed
// download endpoint — this only works when the file is shared "Anyone with
// the link can view". We never call the real Drive API (that needs OAuth /
// a service account), so there's no new credential to manage.
export async function fetchDriveFile(driveUrl: string): Promise<DriveFile> {
  const fileId = extractDriveFileId(driveUrl);
  if (!fileId) {
    throw new Error(
      "Couldn't find a file ID in that link. Paste the normal 'Share' link for a single Drive file."
    );
  }

  const buffer = await downloadWithConfirmHandling(fileId);

  let ext: "pdf" | "docx";
  if (buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    ext = "pdf";
  } else if (buffer.subarray(0, 4).equals(ZIP_MAGIC)) {
    ext = "docx";
  } else {
    throw new Error(
      "That link didn't return a PDF or DOCX file. Make sure it's shared as 'Anyone with the link can view', and that it points directly to a PDF/DOCX file (not a Google Docs file, which has no PDF/DOCX bytes to read)."
    );
  }

  return { buffer, ext, viewUrl: `https://drive.google.com/file/d/${fileId}/view` };
}

async function downloadWithConfirmHandling(fileId: string): Promise<Buffer> {
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

  throw new Error(
    "Google Drive didn't return the file directly — this usually means it isn't shared as 'Anyone with the link can view'. Check the file's sharing settings and try again."
  );
}
