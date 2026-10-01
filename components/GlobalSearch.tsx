"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { TAB_FOR_STATUS } from "@/lib/status-tabs";
import type { CandidateStatus } from "@/lib/types";

interface Result {
  id: string;
  name: string | null;
  srno: number;
  status: CandidateStatus;
  role_requested: string;
}

const STATUS_LABEL: Record<CandidateStatus, string> = {
  NEW: "Queue",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  HOLD: "Hold",
  HIRED: "Hired",
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.results ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search all candidates…"
          className="w-48 sm:w-64 rounded-md border border-neutral-700 bg-neutral-800 pl-8 pr-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute right-0 mt-1 w-72 rounded-md border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/50 py-1 z-30 animate-fade-in max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-3 py-2 text-sm text-neutral-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-neutral-500">No candidates match.</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.id}
                href={TAB_FOR_STATUS[r.status]}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
              >
                <span className="truncate">
                  <span className="text-xs text-neutral-500 mr-1.5">#{r.srno}</span>
                  {r.name || "Unnamed candidate"}
                </span>
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                  {STATUS_LABEL[r.status]}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
