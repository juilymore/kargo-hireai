import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const EDITABLE_FIELDS = ["name", "email", "phone", "extracted_text"] as const;

// Generic patch for the fields the spec marks editable by Arjun: name/email
// (Section 3 — email required before any send), phone, and extracted_text
// (guardrail #5 — fix parsed text, then re-trigger /api/score-candidate).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await params;
  const body = await req.json().catch(() => null);

  const update: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body?.[field] !== undefined) {
      if (typeof body[field] !== "string") {
        return NextResponse.json({ error: `${field} must be a string` }, { status: 400 });
      }
      update[field] = body[field];
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (typeof update.email === "string" && update.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(update.email as string)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("candidates")
    .update(update)
    .eq("id", candidateId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `Failed to update candidate: ${error?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ candidate: data });
}

// Used when every scoring attempt for a freshly uploaded candidate fails
// (e.g. a Gemini outage) — rather than leaving a dangling, unscored
// "Unnamed candidate" row in the Queue, the upload flow deletes it so a
// failed upload leaves nothing behind. Cascades to any scoring_results/
// actions_log/emails_log rows, though a candidate in this state has none.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await params;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("candidates").delete().eq("id", candidateId);

  if (error) {
    return NextResponse.json({ error: `Failed to delete candidate: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
