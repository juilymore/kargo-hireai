import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { scoreCv } from "@/lib/gemini";
import type { RoleScored } from "@/lib/types";

export const runtime = "nodejs";
// A single scoring call routinely takes 30s+ with gemini-3.1-pro-preview's
// "thinking" overhead on this rubric's size, and the retry-on-bad-JSON path
// (lib/gemini.ts) can mean two such calls back to back. 60s measured too
// tight in practice — production calls were hitting Vercel's own gateway
// timeout (FUNCTION_INVOCATION_TIMEOUT, HTTP 504) before finishing. Give it
// real headroom.
export const maxDuration = 180;

const VALID_ROLES: RoleScored[] = ["PM", "SPM"];

// Scores one candidate against one role. A BOTH candidate needs this called
// twice (PM and SPM) — the caller (upload flow or a manual re-score action)
// is responsible for that, so the two verdicts are always independent
// (guardrail #7, never merged/averaged).
export async function POST(req: NextRequest) {
  try {
    return await handleScore(req);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

async function handleScore(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const candidateId = body?.candidate_id;
  const roleScored = body?.role_scored;

  if (typeof candidateId !== "string") {
    return NextResponse.json({ error: "Missing candidate_id" }, { status: 400 });
  }
  if (typeof roleScored !== "string" || !VALID_ROLES.includes(roleScored as RoleScored)) {
    return NextResponse.json({ error: "role_scored must be PM or SPM" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: candidate, error: fetchError } = await supabase
    .from("candidates")
    .select("id, extracted_text, role_requested, role_recommended")
    .eq("id", candidateId)
    .single();

  if (fetchError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  if (!candidate.extracted_text) {
    return NextResponse.json(
      { error: "No extracted CV text for this candidate — fix extraction before scoring" },
      { status: 400 }
    );
  }

  const { parsed, rawResponseText, needsManualReview } = await scoreCv(
    candidate.extracted_text,
    roleScored as RoleScored
  );

  const { data: row, error: insertError } = await supabase
    .from("scoring_results")
    .insert({
      candidate_id: candidateId,
      role_scored: roleScored,
      jd_score: parsed?.jd_score ?? null,
      arjun_score: parsed?.arjun_score ?? null,
      total_score: parsed?.total_score ?? null,
      tier: parsed?.tier ?? null,
      jd_notes: parsed?.jd_summary ?? null,
      arjun_notes: parsed?.arjun_summary ?? null,
      risk_notes: parsed?.risk_summary ?? null,
      verdict: parsed?.verdict ?? null,
      confidence: parsed?.confidence ?? null,
      flags: parsed?.flags ?? [],
      closest_past_hire: parsed?.closest_past_hire ?? null,
      why_ranked_here: parsed?.why_ranked_here ?? null,
      probe_questions: parsed?.probe_questions ?? [],
      decline_reason_if_any: parsed?.decline_reason_if_any || null,
      needs_manual_review: needsManualReview,
      raw_llm_response: safeJsonParse(rawResponseText),
    })
    .select()
    .single();

  if (insertError || !row) {
    return NextResponse.json(
      { error: `Failed to save scoring result: ${insertError?.message}` },
      { status: 500 }
    );
  }

  // Update candidate identity fields extracted by Gemini (editable by Arjun
  // afterwards) and role_recommended when both roles have been scored.
  if (parsed) {
    const candidateUpdate: Record<string, unknown> = {};
    if (parsed.name) candidateUpdate.name = parsed.name;
    if (parsed.email) candidateUpdate.email = parsed.email;
    if (parsed.phone) candidateUpdate.phone = parsed.phone;

    if (candidate.role_requested === "BOTH") {
      const { data: otherResults } = await supabase
        .from("scoring_results")
        .select("role_scored, total_score, created_at")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      const latestByRole = new Map<string, number | null>();
      for (const r of otherResults ?? []) {
        if (!latestByRole.has(r.role_scored)) latestByRole.set(r.role_scored, r.total_score);
      }
      const pmScore = latestByRole.get("PM");
      const spmScore = latestByRole.get("SPM");
      if (pmScore != null && spmScore != null) {
        candidateUpdate.role_recommended =
          pmScore === spmScore
            ? "Either (tied)"
            : pmScore > spmScore
              ? "PM (better fit)"
              : "SPM (better fit)";
      }
    } else {
      candidateUpdate.role_recommended = roleScored;
    }

    if (Object.keys(candidateUpdate).length > 0) {
      await supabase.from("candidates").update(candidateUpdate).eq("id", candidateId);
    }
  }

  return NextResponse.json({ scoring_result: row });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  } catch {
    return { raw_text: text };
  }
}
