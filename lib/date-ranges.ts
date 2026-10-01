export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Monday of the current week, in the server/browser's local calendar time.
export function startOfWeekMonday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export function defaultDashboardRange(): { from: string; to: string } {
  const today = new Date();
  return { from: toIsoDate(startOfWeekMonday(today)), to: toIsoDate(today) };
}

export function presetRange(preset: "24h" | "week" | "month" | "year"): { from: string; to: string } {
  const today = new Date();
  const to = toIsoDate(today);
  if (preset === "24h") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { from: toIsoDate(yesterday), to };
  }
  if (preset === "week") {
    return { from: toIsoDate(startOfWeekMonday(today)), to };
  }
  if (preset === "month") {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toIsoDate(firstOfMonth), to };
  }
  const firstOfYear = new Date(today.getFullYear(), 0, 1);
  return { from: toIsoDate(firstOfYear), to };
}
