// Explicit locale + timeZone so server-rendered and client-hydrated output
// always match — relying on the environment's default locale/timezone was
// causing React hydration mismatches when they differed.
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: "UTC" });
}
