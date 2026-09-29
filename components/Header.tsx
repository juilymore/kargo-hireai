import Link from "next/link";
import type { CandidateStatus } from "@/lib/types";

const TABS: { href: string; label: string; status: CandidateStatus }[] = [
  { href: "/", label: "Queue (New)", status: "NEW" },
  { href: "/approved", label: "Approved", status: "APPROVED" },
  { href: "/rejected", label: "Rejected", status: "REJECTED" },
  { href: "/hold", label: "Hold", status: "HOLD" },
  { href: "/hired", label: "Hired", status: "HIRED" },
];

export default function Header({ counts }: { counts: Record<CandidateStatus, number> }) {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg tracking-tight text-neutral-100">HireAI</span>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-2"
              >
                {tab.label}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-800 text-xs text-neutral-300">
                  {counts[tab.status]}
                </span>
              </Link>
            ))}
          </nav>
        </div>
        <Link
          href="/upload"
          className="px-3 py-1.5 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500"
        >
          + Add CVs
        </Link>
      </div>
    </header>
  );
}
