"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { presetRange } from "@/lib/date-ranges";

type Preset = "24h" | "week" | "month" | "year" | "custom";

export default function DashboardFilters({
  defaultFrom,
  defaultTo,
}: {
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlRole = searchParams.get("role") ?? "BOTH";
  const urlFrom = searchParams.get("from") ?? defaultFrom;
  const urlTo = searchParams.get("to") ?? defaultTo;

  // Mirrored in local state so the clicked button highlights instantly —
  // waiting on the URL to round-trip through the server component before
  // repainting is what caused the visible lag.
  const [role, setRole] = useState(urlRole);
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);

  useEffect(() => {
    setRole(urlRole);
    setFrom(urlFrom);
    setTo(urlTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRole, urlFrom, urlTo]);

  function push(next: { role: string; from: string; to: string }) {
    const params = new URLSearchParams();
    if (next.role !== "BOTH") params.set("role", next.role);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    startTransition(() => router.push(`/?${params.toString()}`));
  }

  function selectRole(r: string) {
    setRole(r);
    push({ role: r, from, to });
  }

  function selectPreset(p: Preset) {
    if (p === "custom") return;
    const range = presetRange(p);
    setFrom(range.from);
    setTo(range.to);
    push({ role, from: range.from, to: range.to });
  }

  function updateDate(key: "from" | "to", value: string) {
    const next = { from, to, [key]: value };
    setFrom(next.from);
    setTo(next.to);
    push({ role, from: next.from, to: next.to });
  }

  const activePreset = detectPreset(from, to);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">Role</label>
        <div className="flex rounded-md border border-neutral-700 overflow-hidden">
          {(["BOTH", "PM", "SPM"] as const).map((r) => (
            <button
              key={r}
              onClick={() => selectRole(r)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
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
        <label className="block text-xs font-medium text-neutral-500 mb-1">Quick range</label>
        <div className="flex rounded-md border border-neutral-700 overflow-hidden">
          {(
            [
              ["24h", "24 Hrs"],
              ["week", "Week"],
              ["month", "Month"],
              ["year", "Year"],
            ] as const
          ).map(([p, label]) => (
            <button
              key={p}
              onClick={() => selectPreset(p)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
                activePreset === p
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => updateDate("from", e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm [color-scheme:dark]"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => updateDate("to", e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm [color-scheme:dark]"
        />
      </div>
    </div>
  );
}

function detectPreset(from: string, to: string): Preset {
  for (const p of ["24h", "week", "month", "year"] as const) {
    const r = presetRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}
