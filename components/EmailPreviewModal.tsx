"use client";

import { useState } from "react";
import type { EmailType } from "@/lib/types";
import { renderApproveInviteEmail, renderRejectNoticeEmail, roleLabelFor } from "@/lib/email-templates";

interface Props {
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  defaultTestEmail?: string;
  emailType: EmailType;
  schedulingLink: string;
  factualDetail: string | null;
  roleScored?: "PM" | "SPM" | null;
  onClose: (sent: boolean) => void;
}

const FALLBACK_DETAIL = "your background";

export default function EmailPreviewModal({
  candidateId,
  candidateName,
  candidateEmail,
  defaultTestEmail = "",
  emailType,
  schedulingLink,
  factualDetail,
  roleScored,
  onClose,
}: Props) {
  // Gemini generates one_factual_detail per candidate (a neutral CV detail,
  // no rubric language). Only falls back to a generic phrase for older
  // scoring rows saved before this field existed.
  const oneFactualDetail = factualDetail?.trim() || FALLBACK_DETAIL;
  const roleLabel = roleLabelFor(roleScored);

  const initial =
    emailType === "APPROVE_INVITE"
      ? renderApproveInviteEmail({ name: candidateName, oneFactualDetail, schedulingLink, roleLabel })
      : renderRejectNoticeEmail({ name: candidateName, oneFactualDetail });

  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [email, setEmail] = useState(candidateEmail || defaultTestEmail || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function saveEmailIfNeeded() {
    if (email === candidateEmail) return true;
    setSavingEmail(true);
    const res = await fetch(`/api/candidate/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSavingEmail(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to save email address");
      return false;
    }
    return true;
  }

  async function handleSend() {
    setError(null);
    if (!hasValidEmail) {
      setError("Enter a valid email address before sending.");
      return;
    }
    const emailSaved = await saveEmailIfNeeded();
    if (!emailSaved) return;

    setSending(true);
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidateId,
        email_type: emailType,
        subject,
        body,
      }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to send email");
      return;
    }
    onClose(true);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl shadow-black/50 w-full max-w-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-neutral-100">
            {emailType === "APPROVE_INVITE" ? "Interview invite" : "Decline notice"} — {candidateName}
          </h2>
          <button onClick={() => onClose(false)} className="text-neutral-500 hover:text-neutral-200">
            ✕
          </button>
        </div>
        <p className="text-xs text-neutral-500 -mt-2">
          Drafted by HireAI — review and edit before sending. Nothing sends automatically.
        </p>

        <div
          className={
            hasValidEmail
              ? "space-y-1"
              : "rounded-md bg-amber-950/40 border border-amber-800/50 p-2 space-y-1"
          }
        >
          <label
            className={`block text-xs font-medium ${hasValidEmail ? "text-neutral-500" : "text-amber-300"}`}
          >
            {hasValidEmail
              ? "To (pulled from the CV — edit if you want to send elsewhere)"
              : "No valid email on file — add one to enable Send"}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="candidate@example.com"
            className={
              hasValidEmail
                ? "w-full rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1 text-sm"
                : "w-full rounded border border-amber-800/50 bg-neutral-900 text-neutral-100 px-2 py-1 text-sm"
            }
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded border border-neutral-700 bg-neutral-800 text-neutral-100 px-2 py-1.5 text-sm font-mono"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => onClose(false)}
            className="px-3 py-1.5 rounded-md border border-neutral-700 text-neutral-200 text-sm hover:bg-neutral-800 transition-colors"
          >
            Close without sending
          </button>
          <button
            onClick={handleSend}
            disabled={!hasValidEmail || sending || savingEmail}
            className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-900/40 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
