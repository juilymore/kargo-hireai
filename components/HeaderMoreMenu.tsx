"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Mail } from "lucide-react";

export default function HeaderMoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-1"
      >
        More
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-48 rounded-md border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/50 py-1 z-20 animate-fade-in">
          <Link
            href="/logs/emails"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <Mail className="w-4 h-4" />
            Email History
          </Link>
        </div>
      )}
    </div>
  );
}
