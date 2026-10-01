import { CalendarDays } from "lucide-react";
import type { WeekSummary } from "@/lib/queries";

export default function WeeklySummary({
  thisWeek,
  lastWeek,
}: {
  thisWeek: WeekSummary;
  lastWeek: WeekSummary;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="font-semibold text-neutral-100 flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-neutral-400" />
        Weekly Summary
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <WeekCard week={thisWeek} />
        <WeekCard week={lastWeek} />
      </div>
    </div>
  );
}

function WeekCard({ week }: { week: WeekSummary }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
      <p className="text-xs font-medium text-neutral-500 mb-1">{week.rangeLabel}</p>
      <p className="text-sm text-neutral-300">{week.sentence}</p>
    </div>
  );
}
