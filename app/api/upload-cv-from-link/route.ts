import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchDriveFile } from "@/lib/google-drive";
import { extractAndValidate } from "@/lib/parse-cv";
import type { RoleRequested } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_ROLES: RoleRequested[] = ["PM", "SPM", "BOTH"];

// Mirrors /api/upload-cv, but the source is a public Google Drive share
// link instead of a multipart file upload. Unlike a direct upload, we don't
// copy the bytes into our own Storage bucket — "View resume" opens the
// original Drive link directly, per the product owner's request — we only
// hold the bytes in memory long enough to extract text from them.
export async function POST(req: NextRequest) {
  try {
    return await handleUploadFromLink(req);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

async function handleUploadFromLink(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const driveUrl = body?.drive_url;
  const roleRequested = body?.role_requested;

  if (typeof driveUrl !== "string" || !driveUrl.trim()) {
    return NextResponse.json({ error: "Missing drive_url" }, { status: 400 });
  }
  if (typeof roleRequested !== "string" || !VALID_ROLES.includes(roleRequested as RoleRequested)) {
    return NextResponse.json({ error: "Invalid role_requested" }, { status: 400 });
  }

  let buffer: Buffer;
  let ext: "pdf" | "docx";
  let viewUrl: string;
  try {
    const driveFile = await fetchDriveFile(driveUrl.trim());
    buffer = driveFile.buffer;
    ext = driveFile.ext;
    viewUrl = driveFile.viewUrl;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch the Drive file" },
      { status: 400 }
    );
  }

  const { cvText, extractionError } = await extractAndValidate(buffer, `drive-file.${ext}`);

  const supabase = supabaseAdmin();
  const { data: candidate, error: insertError } = await supabase
    .from("candidates")
    .insert({
      resume_file_path: null,
      resume_public_url: viewUrl,
      extracted_text: cvText,
      extraction_error: extractionError,
      role_requested: roleRequested,
      status: "NEW",
    })
    .select()
    .single();

  if (insertError || !candidate) {
    return NextResponse.json(
      { error: `Failed to create candidate: ${insertError?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ candidate });
}
