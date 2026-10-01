import type { CandidateStatus } from "./types";

export const TAB_FOR_STATUS: Record<CandidateStatus, string> = {
  NEW: "/queue",
  APPROVED: "/approved",
  REJECTED: "/rejected",
  HOLD: "/hold",
  HIRED: "/hired",
};
