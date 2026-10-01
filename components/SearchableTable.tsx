"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { SearchableItem } from "./SearchableList";

export default function SearchableTable({
  headerRow,
  items,
  placeholder = "Search by name…",
  emptyMessage = "No candidates match that search.",
}: {
  headerRow: ReactNode;
  items: SearchableItem[];
  placeholder?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-neutral-100 placeholder-neutral-600"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      ) : (
        <table className="w-full text-sm text-neutral-200">
          <thead>{headerRow}</thead>
          <tbody>
            {filtered.map((i) => (
              <Fragment key={i.id}>{i.node}</Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
