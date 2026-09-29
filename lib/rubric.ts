import "server-only";
import fs from "node:fs";
import path from "node:path";

// Loaded read-only from its own file (guardrail #8) — the app never writes
// to this file. If the rubric needs updating, that happens by editing
// data/rubric.txt and redeploying, not through the UI.
let cached: string | null = null;

export function loadRubric(): string {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "data", "rubric.txt");
  cached = fs.readFileSync(filePath, "utf-8");
  return cached;
}
