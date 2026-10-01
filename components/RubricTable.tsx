"use client";

import { useMemo, useState } from "react";
import type { RubricCriterion } from "@/lib/rubric-weights";

const JD_TOTAL = 40;
const ARJUN_TOTAL = 60;

export default function RubricTable({ initialCriteria }: { initialCriteria: RubricCriterion[] }) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const jdRows = criteria.filter((c) => c.section === "JD");
  const arjunRows = criteria.filter((c) => c.section === "ARJUN");

  const jdSum = useMemo(() => jdRows.reduce((s, c) => s + c.points, 0), [jdRows]);
  const arjunSum = useMemo(
    () => arjunRows.filter((c) => c.code !== "B9").reduce((s, c) => s + c.points, 0),
    [arjunRows]
  );
  const jdValid = Math.abs(jdSum - JD_TOTAL) < 0.01;
  const arjunValid = Math.abs(arjunSum - ARJUN_TOTAL) < 0.01;

  function updatePoints(id: string, points: number) {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, points } : c)));
  }

  function updateDescription(id: string, description: string) {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, description } : c)));
  }

  async function handleSave() {
    setError(null);
    if (!jdValid || !arjunValid) {
      setError("Fix the totals below before saving — see the running sums.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/rubric", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        criteria: criteria.map((c) => ({ id: c.id, points: c.points, description: c.description })),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to save");
      return;
    }
    setCriteria(json.criteria);
    setSavedAt(Date.now());
  }

  return (
    <div className="space-y-6">
      <RubricSection
        title="JD Fit"
        rows={jdRows}
        sum={jdSum}
        total={JD_TOTAL}
        valid={jdValid}
        onPointsChange={updatePoints}
        onDescriptionChange={updateDescription}
      />
      <RubricSection
        title="Arjun's Instinct Pattern"
        rows={arjunRows}
        sum={arjunSum}
        total={ARJUN_TOTAL}
        valid={arjunValid}
        onPointsChange={updatePoints}
        onDescriptionChange={updateDescription}
        note="B9 is a deduction bucket (negative points) and isn't part of this total."
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-900/40 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
        >
          {saving ? "Saving…" : "Save weights"}
        </button>
        {savedAt && <span className="text-sm text-green-400">Saved — new scores will use this.</span>}
      </div>
    </div>
  );
}

function RubricSection({
  title,
  rows,
  sum,
  total,
  valid,
  note,
  onPointsChange,
  onDescriptionChange,
}: {
  title: string;
  rows: RubricCriterion[];
  sum: number;
  total: number;
  valid: boolean;
  note?: string;
  onPointsChange: (id: string, points: number) => void;
  onDescriptionChange: (id: string, description: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-neutral-100">{title}</h2>
        <span
          className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            valid
              ? "bg-green-500/10 text-green-300 border border-green-800/40"
              : "bg-red-500/10 text-red-300 border border-red-800/40"
          }`}
        >
          {sum} / {total} points
        </span>
      </div>
      {note && <p className="text-xs text-neutral-500 mb-3">{note}</p>}
      <div className="space-y-3">
        {rows.map((c) => (
          <div key={c.id} className="grid grid-cols-[3rem_10rem_1fr] gap-3 items-start">
            <div className="text-sm font-mono text-neutral-400 pt-1.5">{c.code}</div>
            <div>
              <p className="text-sm font-medium text-neutral-200">{c.label}</p>
              <input
                type="number"
                value={c.points}
                onChange={(e) => onPointsChange(c.id, Number(e.target.value))}
                className="mt-1 w-24 rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1 text-sm"
              />
            </div>
            <textarea
              value={c.description}
              onChange={(e) => onDescriptionChange(c.id, e.target.value)}
              rows={2}
              className="w-full rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
