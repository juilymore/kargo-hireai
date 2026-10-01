"use client";

import { useMemo, useState } from "react";
import { Save, Briefcase, HeartHandshake } from "lucide-react";
import type { RubricCriterion } from "@/lib/rubric-weights";

const JD_TOTAL = 40;
const ARJUN_TOTAL = 60;

function isDirty(current: RubricCriterion[], initial: RubricCriterion[]): boolean {
  const byId = new Map(initial.map((c) => [c.id, c]));
  return current.some((c) => {
    const orig = byId.get(c.id);
    return !orig || orig.points !== c.points || orig.description !== c.description;
  });
}

export default function RubricTable({ initialCriteria }: { initialCriteria: RubricCriterion[] }) {
  const [baseline, setBaseline] = useState(initialCriteria);
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
  const dirty = isDirty(criteria, baseline);

  function updatePoints(id: string, points: number) {
    setSavedAt(null);
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, points } : c)));
  }

  function updateDescription(id: string, description: string) {
    setSavedAt(null);
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
    setBaseline(json.criteria);
    setSavedAt(Date.now());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex-1 space-y-2">
          <p className="text-sm text-neutral-300">
            This rubric scores every candidate through two lenses:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-blue-300 mt-0.5 shrink-0" />
              <p className="text-sm text-neutral-400">
                <span className="font-medium text-neutral-200">JD Fit</span> — hard skills &amp;
                experience: years, project depth, domain match. <span className="text-neutral-500">40 pts</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <HeartHandshake className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <p className="text-sm text-neutral-400">
                <span className="font-medium text-neutral-200">Arjun&apos;s Pattern</span> — judgment
                &amp; behavioral fit: ownership, resourcefulness, honesty about failure.{" "}
                <span className="text-neutral-500">60 pts</span>
              </p>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-900/40 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save weights"}
          </button>
          {savedAt && <p className="text-xs text-green-400">Saved — new scores will use this.</p>}
          {!dirty && !savedAt && <p className="text-xs text-neutral-600">No changes yet</p>}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <RubricSection
        title="JD Fit"
        icon={Briefcase}
        rows={jdRows}
        sum={jdSum}
        total={JD_TOTAL}
        valid={jdValid}
        onPointsChange={updatePoints}
        onDescriptionChange={updateDescription}
      />
      <RubricSection
        title="Arjun's Instinct Pattern"
        icon={HeartHandshake}
        rows={arjunRows}
        sum={arjunSum}
        total={ARJUN_TOTAL}
        valid={arjunValid}
        onPointsChange={updatePoints}
        onDescriptionChange={updateDescription}
        note="B9 is a deduction bucket (negative points) and isn't part of this total."
      />
    </div>
  );
}

function RubricSection({
  title,
  icon: Icon,
  rows,
  sum,
  total,
  valid,
  note,
  onPointsChange,
  onDescriptionChange,
}: {
  title: string;
  icon: typeof Briefcase;
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
        <h2 className="font-semibold text-neutral-100 flex items-center gap-2">
          <Icon className="w-4 h-4 text-neutral-400" />
          {title}
        </h2>
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
      <div className="grid lg:grid-cols-2 gap-3">
        {rows.map((c) => (
          <div key={c.id} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-neutral-500 shrink-0">{c.code}</span>
              <span className="text-sm font-medium text-neutral-200 flex-1">{c.label}</span>
              <label className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-neutral-500">pts</span>
                <input
                  type="number"
                  value={c.points}
                  onChange={(e) => onPointsChange(c.id, Number(e.target.value))}
                  className="w-16 rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1 text-sm text-center"
                />
              </label>
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
