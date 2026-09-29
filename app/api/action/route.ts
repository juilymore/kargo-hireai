import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ActionType, CandidateStatus } from "@/lib/types";

export const runtime = "nodejs";

const VALID_ACTIONS: ActionType[] = ["APPROVE", "REJECT", "HOLD"];
const STATUS_FOR_ACTION: Record<ActionType, CandidateStatus> = {
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  HOLD: "HOLD",
};

// Records an Approve/Reject/Hold decision + its optional comment. (The
// original build spec required a comment on every action; that guardrail was
// deliberately relaxed at the product owner's request — the DB column stays
// NOT NULL, so an empty comment is stored as an explicit placeholder rather
// than requiring a schema migration.)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const candidateId = body?.candidate_id;
  const action = body?.action;
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
  const createdBy = typeof body?.created_by === "string" ? body.created_by : null;

  if (typeof candidateId !== "string") {
    return NextResponse.json({ error: "Missing candidate_id" }, { status: 400 });
  }
  if (typeof action !== "string" || !VALID_ACTIONS.includes(action as ActionType)) {
    return NextResponse.json({ error: "action must be APPROVE, REJECT or HOLD" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: logEntry, error: logError } = await supabase
    .from("actions_log")
    .insert({
      candidate_id: candidateId,
      action,
      comment: comment || "(no comment provided)",
      created_by: createdBy,
    })
    .select()
    .single();

  if (logError || !logEntry) {
    return NextResponse.json(
      { error: `Failed to record action: ${logError?.message}` },
      { status: 500 }
    );
  }

  const newStatus = STATUS_FOR_ACTION[action as ActionType];
  const { data: candidate, error: updateError } = await supabase
    .from("candidates")
    .update({ status: newStatus, status_updated_at: new Date().toISOString() })
    .eq("id", candidateId)
    .select()
    .single();

  if (updateError || !candidate) {
    return NextResponse.json(
      { error: `Failed to update candidate status: ${updateError?.message}` },
      { status: 500 }
    );
  }

  // Approve creates the interviews row (NOT_SCHEDULED) so it shows up on the
  // Approved tab immediately; Reject creates none (Section 5.2).
  if (action === "APPROVE") {
    await supabase
      .from("interviews")
      .upsert({ candidate_id: candidateId, interview_status: "NOT_SCHEDULED" }, {
        onConflict: "candidate_id",
        ignoreDuplicates: true,
      });
  }

  return NextResponse.json({ action_log: logEntry, candidate });
}
