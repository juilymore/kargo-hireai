import Link from "next/link";
import { LayoutDashboard, SlidersHorizontal, Plus } from "lucide-react";
import type { CandidateStatus } from "@/lib/types";
import HeaderMoreMenu from "./HeaderMoreMenu";
import GlobalSearch from "./GlobalSearch";

const STATUS_TABS: { href: string; label: string; status: CandidateStatus }[] = [
  { href: "/queue", label: "Queue", status: "NEW" },
  { href: "/approved", label: "Approved", status: "APPROVED" },
  { href: "/rejected", label: "Rejected", status: "REJECTED" },
  { href: "/hold", label: "Hold", status: "HOLD" },
  { href: "/hired", label: "Hired", status: "HIRED" },
];

export default function Header({ counts }: { counts: Record<CandidateStatus, number> }) {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/"
            className="font-semibold text-lg tracking-tight text-neutral-100 whitespace-nowrap shrink-0"
          >
            Kargo <span className="text-neutral-500 font-normal">-</span> Hire AI
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            {STATUS_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                {tab.label}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-800 text-xs text-neutral-300">
                  {counts[tab.status]}
                </span>
              </Link>
            ))}
            <Link
              href="/rubrics"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Rubrics
            </Link>
            <div className="shrink-0">
              <HeaderMoreMenu />
            </div>
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <GlobalSearch />
          <Link
            href="/upload"
            className="px-3 py-1.5 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add CVs
          </Link>
        </div>
      </div>
    </header>
  );
}
