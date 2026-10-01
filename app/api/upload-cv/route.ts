import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extractAndValidate } from "@/lib/parse-cv";
import type { RoleRequested } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_EXTENSIONS = ["pdf", "docx"];
const VALID_ROLES: RoleRequested[] = ["PM", "SPM", "BOTH"];

// Accepts one file + role_requested per call. The upload UI calls this once
// per file so each file's own role selection and progress state are
// independent (Section 5.1).
export async function POST(req: NextRequest) {
  try {
    return await handleUpload(req);
  } catch (err) {
    // Guarantees the client always gets JSON back, even on an unexpected
    // crash — an empty/non-JSON response is what produced the confusing
    // "Unexpected end of JSON input" error in the UI.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

async function handleUpload(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const roleRequested = formData.get("role_requested");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (typeof roleRequested !== "string" || !VALID_ROLES.includes(roleRequested as RoleRequested)) {
    return NextResponse.json({ error: "Invalid role_requested" }, { status: 400 });
  }

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storagePath = `${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("resumes")
    .getPublicUrl(storagePath);

  // Extract text before inserting so the candidate row is created with
  // whatever we have in one shot. Parsing failures are surfaced, not
  // silently dropped (guardrail #4 applies equally to extraction, not just
  // Gemini's response) — extraction_error is stored and shown in the UI,
  // and extracted_text stays editable so Arjun can paste corrected text and
  // re-trigger scoring (guardrail #5).
  const { cvText, extractionError } = await extractAndValidate(buffer, file.name);

  const { data: candidate, error: insertError } = await supabase
    .from("candidates")
    .insert({
      resume_file_path: storagePath,
      resume_public_url: publicUrlData.publicUrl,
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
