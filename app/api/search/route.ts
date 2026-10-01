import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ results: [] });

  const supabase = supabaseAdmin();
  const cols = "id, name, srno, status, role_requested";
  const asSrno = Number(q);

  const [byName, bySrno] = await Promise.all([
    supabase
      .from("candidates")
      .select(cols)
      .ilike("name", `%${q}%`)
      .order("date_added", { ascending: false })
      .limit(8),
    Number.isInteger(asSrno)
      ? supabase.from("candidates").select(cols).eq("srno", asSrno).limit(1)
      : Promise.resolve({ data: [], error: null }),
  ]);

  interface Row {
    id: string;
    name: string | null;
    srno: number;
    status: string;
    role_requested: string;
  }
  const byId = new Map<string, Row>();
  for (const row of [...((bySrno.data as Row[]) ?? []), ...((byName.data as Row[]) ?? [])]) {
    byId.set(row.id, row);
  }

  return NextResponse.json({ results: [...byId.values()].slice(0, 8) });
}
