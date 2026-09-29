import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { InterviewStatus } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STATUSES: InterviewStatus[] = ["NOT_SCHEDULED", "SCHEDULED", "DONE"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await params;
  const body = await req.json().catch(() => null);

  const update: Record<string, unknown> = {};
  if (body?.interview_status !== undefined) {
    if (!VALID_STATUSES.includes(body.interview_status)) {
      return NextResponse.json({ error: "Invalid interview_status" }, { status: 400 });
    }
    update.interview_status = body.interview_status;
  }
  if (body?.interview_notes !== undefined) {
    if (typeof body.interview_notes !== "string") {
      return NextResponse.json({ error: "interview_notes must be a string" }, { status: 400 });
    }
    update.interview_notes = body.interview_notes;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  update.updated_at = new Date().toISOString();

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("interviews")
    .upsert({ candidate_id: candidateId, ...update }, { onConflict: "candidate_id" })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: `Failed to update interview: ${error?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ interview: data });
}
