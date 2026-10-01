"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  href: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export default function HeaderDropdown({
  label,
  icon,
  items,
}: {
  label: string;
  icon?: ReactNode;
  items: DropdownItem[];
}) {
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
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded-md text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 flex items-center gap-1.5 whitespace-nowrap"
      >
        {icon}
        {label}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-48 rounded-md border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/50 py-1 z-20 animate-fade-in">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              {typeof item.count === "number" && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-neutral-800 text-xs text-neutral-400">
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
