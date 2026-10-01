import Link from "next/link";
import { Suspense } from "react";
import { getDashboardData } from "@/lib/queries";
import type { RoleScored } from "@/lib/types";
import { defaultDashboardRange } from "@/lib/date-ranges";
import DashboardFilters from "@/components/DashboardFilters";
import DashboardCandidateRow from "@/components/DashboardCandidateRow";

export const dynamic = "force-dynamic";

interface SearchParams {
  role?: string;
  from?: string;
  to?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const role = (params.role === "PM" || params.role === "SPM" ? params.role : "BOTH") as
    | RoleScored
    | "BOTH";
  const defaultRange = defaultDashboardRange();
  const from = params.from ?? defaultRange.from;
  const to = params.to ?? defaultRange.to;
  const data = await getDashboardData({ role, from, to });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Dashboard</h1>
        <p className="text-sm text-neutral-400">
          What needs your attention, at a glance.
        </p>
      </div>

      <Suspense fallback={null}>
        <DashboardFilters defaultFrom={defaultRange.from} defaultTo={defaultRange.to} />
      </Suspense>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <CountCard label="Queue" value={data.counts.queue} href="/queue" accent="text-neutral-100" />
        <CountCard label="Approved" value={data.counts.approved} href="/approved" accent="text-green-300" />
        <CountCard
          label="Interview Scheduled"
          value={data.counts.interviewScheduled}
          href="/approved"
          accent="text-blue-300"
        />
        <CountCard label="Hired" value={data.counts.hired} href="/hired" accent="text-indigo-300" />
        <CountCard label="Rejected" value={data.counts.rejected} href="/rejected" accent="text-red-300" />
        <CountCard label="On Hold" value={data.counts.hold} href="/hold" accent="text-amber-300" />
        <CountCard
          label="Total Checked"
          value={data.counts.totalChecked}
          accent="text-neutral-100"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-100">Top 3 in Queue</h2>
            <Link href="/queue" className="text-xs font-medium text-indigo-300 hover:underline">
              View all →
            </Link>
          </div>
          {data.topQueue.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing waiting in the Queue.</p>
          ) : (
            <div className="space-y-2">
              {data.topQueue.map((c) => (
                <DashboardCandidateRow key={c.id} candidate={c} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-neutral-100">Top 3 Interviews Scheduled</h2>
            <Link href="/approved" className="text-xs font-medium text-indigo-300 hover:underline">
              View all →
            </Link>
          </div>
          {data.topInterviewScheduled.length === 0 ? (
            <p className="text-sm text-neutral-500">No interviews scheduled right now.</p>
          ) : (
            <div className="space-y-2">
              {data.topInterviewScheduled.map((c) => (
                <DashboardCandidateRow key={c.id} candidate={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CountCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href?: string;
  accent: string;
}) {
  const content = (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-all duration-200 hover:border-neutral-700 hover:shadow-lg hover:shadow-black/30 hover:scale-[1.02]">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
