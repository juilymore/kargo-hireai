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
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg tracking-tight">HireAI</span>
          <nav className="flex items-center gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                {tab.label}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-200 text-xs text-neutral-700">
                  {counts[tab.status]}
                </span>
              </Link>
            ))}
          </nav>
        </div>
        <Link
          href="/upload"
          className="px-3 py-1.5 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
        >
          + Add CVs
        </Link>
      </div>
    </header>
  );
}
