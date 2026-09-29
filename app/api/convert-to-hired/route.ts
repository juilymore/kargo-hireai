import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { RoleScored } from "@/lib/types";

export const runtime = "nodejs";

const VALID_ROLES: RoleScored[] = ["PM", "SPM"];

// Moves an Approved candidate to Hired. Enforces interview_status === DONE
// unless override is explicitly passed (Section 5.6 — the UI shows a
// confirm dialog before setting override: true).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const candidateId = body?.candidate_id;
  const roleHiredFor = body?.role_hired_for;
  const override = body?.override === true;

  if (typeof candidateId !== "string") {
    return NextResponse.json({ error: "Missing candidate_id" }, { status: 400 });
  }
  if (typeof roleHiredFor !== "string" || !VALID_ROLES.includes(roleHiredFor as RoleScored)) {
    return NextResponse.json({ error: "role_hired_for must be PM or SPM" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, status")
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  if (candidate.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only an Approved candidate can be converted to Hired" },
      { status: 400 }
    );
  }

  const { data: interview } = await supabase
    .from("interviews")
    .select("interview_status")
    .eq("candidate_id", candidateId)
    .single();

  if (interview?.interview_status !== "DONE" && !override) {
    return NextResponse.json(
      { error: "Interview is not marked Done. Pass override: true to convert anyway." },
      { status: 400 }
    );
  }

  const { data: hire, error: hireError } = await supabase
    .from("hires")
    .insert({ candidate_id: candidateId, role_hired_for: roleHiredFor })
    .select()
    .single();

  if (hireError || !hire) {
    return NextResponse.json(
      { error: `Failed to create hire record: ${hireError?.message}` },
      { status: 500 }
    );
  }

  const { data: updatedCandidate, error: updateError } = await supabase
    .from("candidates")
    .update({ status: "HIRED", status_updated_at: new Date().toISOString() })
    .eq("id", candidateId)
    .select()
    .single();

  if (updateError || !updatedCandidate) {
    return NextResponse.json(
      { error: `Failed to update candidate status: ${updateError?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ hire, candidate: updatedCandidate });
}
