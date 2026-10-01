"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = searchParams.get("role") ?? "BOTH";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function update(next: { role?: string; from?: string; to?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { role, from, to, ...next };
    if (merged.role && merged.role !== "BOTH") params.set("role", merged.role);
    else params.delete("role");
    if (merged.from) params.set("from", merged.from);
    else params.delete("from");
    if (merged.to) params.set("to", merged.to);
    else params.delete("to");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Role</label>
        <div className="flex rounded-md border border-neutral-700 overflow-hidden">
          {(["BOTH", "PM", "SPM"] as const).map((r) => (
            <button
              key={r}
              onClick={() => update({ role: r })}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                role === r
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {r === "BOTH" ? "Both" : r}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => update({ from: e.target.value })}
          className="rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm [color-scheme:dark]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => update({ to: e.target.value })}
          className="rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm [color-scheme:dark]"
        />
      </div>
      {(from || to || (role && role !== "BOTH")) && (
        <button
          onClick={() => router.push("/")}
          className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
