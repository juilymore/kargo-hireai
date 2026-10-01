import Link from "next/link";
import {
  LayoutDashboard,
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  XCircle,
  BookOpen,
  ClipboardList,
  Mail,
} from "lucide-react";
import type { CandidateStatus } from "@/lib/types";
import HeaderDropdown from "./HeaderDropdown";
import GlobalSearch from "./GlobalSearch";

const NAV_LINK =
  "px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-1.5 whitespace-nowrap shrink-0";

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
          <nav className="flex items-center gap-1">
            <Link href="/" className={NAV_LINK}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link href="/queue" className={`${NAV_LINK} gap-2`}>
              Queue
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-800 text-xs text-neutral-300">
                {counts.NEW}
              </span>
            </Link>
            <HeaderDropdown
              label="Advancing"
              icon={CheckCircle2}
              items={[
                { href: "/approved", label: "Approved", count: counts.APPROVED },
                { href: "/hired", label: "Hired", count: counts.HIRED },
              ]}
            />
            <HeaderDropdown
              label="Declined"
              icon={XCircle}
              items={[
                { href: "/rejected", label: "Rejected", count: counts.REJECTED },
                { href: "/hold", label: "Hold", count: counts.HOLD },
              ]}
            />
            <Link href="/rubrics" className={NAV_LINK}>
              <SlidersHorizontal className="w-4 h-4" />
              Rubrics
            </Link>
            <HeaderDropdown
              label="Resources"
              items={[
                { href: "/help", label: "How to Use", icon: BookOpen },
                { href: "/logs/activity", label: "Activity Log", icon: ClipboardList },
                { href: "/logs/emails", label: "Email Log", icon: Mail },
              ]}
            />
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <GlobalSearch />
          <Link
            href="/upload"
            className="px-3 py-1.5 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add CVs
          </Link>
        </div>
      </div>
    </header>
  );
}
