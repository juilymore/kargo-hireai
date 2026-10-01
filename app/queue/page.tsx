import Link from "next/link";
import { getCandidatesByStatus } from "@/lib/queries";
import CandidateCard from "@/components/CandidateCard";

export default async function QueuePage() {
  const candidates = await getCandidatesByStatus("NEW");
  const schedulingLink = process.env.SCHEDULING_LINK ?? "";
  const defaultTestEmail = process.env.DEFAULT_TEST_EMAIL ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Queue</h1>
        <p className="text-sm text-neutral-400">
          New candidates, newest first. Approve, Reject or Hold each one.
        </p>
      </div>

      {candidates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              schedulingLink={schedulingLink}
              defaultTestEmail={defaultTestEmail}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Link
      href="/upload"
      className="group flex flex-col items-center gap-2 border-2 border-dashed border-neutral-600 rounded-xl p-12 text-center bg-gradient-to-b from-neutral-800/80 to-neutral-800/40 hover:border-indigo-500 hover:from-neutral-800 hover:to-neutral-800/60 hover:shadow-lg hover:shadow-indigo-900/20 transition-all duration-200"
    >
      <svg
        className="w-9 h-9 text-neutral-500 group-hover:text-indigo-400 group-hover:-translate-y-0.5 transition-all duration-200"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"
        />
      </svg>
      <p className="font-medium text-neutral-200">Queue is empty</p>
      <p className="text-sm text-neutral-500">Click here to upload a CV and get started</p>
    </Link>
  );
}
