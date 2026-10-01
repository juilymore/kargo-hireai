import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getRubricCriteria, invalidateRubricCache, JD_TOTAL, ARJUN_TOTAL } from "@/lib/rubric-weights";

export const runtime = "nodejs";

export async function GET() {
  try {
    const criteria = await getRubricCriteria();
    return NextResponse.json({ criteria });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 }
    );
  }
}

// Note: on Vercel each invocation may land on a different warm instance, so
// this in-process invalidation is best-effort — the cache's own 30s TTL
// (see lib/rubric-weights.ts) is what guarantees an edit is never stale for
// long, even on an instance this call didn't run on.
interface UpdateItem {
  id: string;
  points: number;
  description: string;
}

// Saves the whole table in one call. Points must still add up to the
// rubric's fixed totals (40 for JD, 60 for ARJUN's B1-B8 — B9 is a
// deduction bucket, not part of that sum) — Arjun is redistributing weight
// between criteria, not changing the overall 100-point scale everything
// else (tiers, the 0-40/0-60 score bounds) assumes.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const updates: UpdateItem[] = body?.criteria;
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "criteria array is required" }, { status: 400 });
    }

    const existing = await getRubricCriteria();
    const byId = new Map(existing.map((c) => [c.id, c]));

    let jdSum = 0;
    let arjunSum = 0; // B1-B8 only
    for (const u of updates) {
      const current = byId.get(u.id);
      if (!current) {
        return NextResponse.json({ error: `Unknown criterion id: ${u.id}` }, { status: 400 });
      }
      if (typeof u.points !== "number" || Number.isNaN(u.points)) {
        return NextResponse.json({ error: `Invalid points for ${current.code}` }, { status: 400 });
      }
      if (current.section === "JD") jdSum += u.points;
      else if (current.code !== "B9") arjunSum += u.points;
    }

    if (Math.abs(jdSum - JD_TOTAL) > 0.01) {
      return NextResponse.json(
        { error: `JD criteria must add up to ${JD_TOTAL} points (currently ${jdSum}).` },
        { status: 400 }
      );
    }
    if (Math.abs(arjunSum - ARJUN_TOTAL) > 0.01) {
      return NextResponse.json(
        {
          error: `ARJUN criteria (B1-B8, excluding the B9 deduction) must add up to ${ARJUN_TOTAL} points (currently ${arjunSum}).`,
        },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();
    for (const u of updates) {
      const { error } = await supabase
        .from("rubric_criteria")
        .update({
          points: u.points,
          description: u.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);
      if (error) {
        return NextResponse.json({ error: `Failed to save: ${error.message}` }, { status: 500 });
      }
    }

    invalidateRubricCache();
    const criteria = await getRubricCriteria();
    return NextResponse.json({ criteria });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown server error" },
      { status: 500 }
    );
  }
}
