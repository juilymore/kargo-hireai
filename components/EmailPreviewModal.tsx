"use client";

import { useState } from "react";
import type { EmailType } from "@/lib/types";
import { renderApproveInviteEmail, renderRejectNoticeEmail } from "@/lib/email-templates";

interface Props {
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  emailType: EmailType;
  schedulingLink: string;
  onClose: (sent: boolean) => void;
}

const PLACEHOLDER_DETAIL = "[one specific, factual detail from their CV — replace before sending]";

export default function EmailPreviewModal({
  candidateId,
  candidateName,
  candidateEmail,
  emailType,
  schedulingLink,
  onClose,
}: Props) {
  const initial =
    emailType === "APPROVE_INVITE"
      ? renderApproveInviteEmail({
          name: candidateName,
          oneFactualDetail: PLACEHOLDER_DETAIL,
          schedulingLink,
        })
      : renderRejectNoticeEmail({ name: candidateName, oneFactualDetail: PLACEHOLDER_DETAIL });

  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [email, setEmail] = useState(candidateEmail ?? "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const stillHasPlaceholder = body.includes(PLACEHOLDER_DETAIL) || subject.includes(PLACEHOLDER_DETAIL);

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {emailType === "APPROVE_INVITE" ? "Interview invite" : "Decline notice"} — {candidateName}
          </h2>
          <button onClick={() => onClose(false)} className="text-neutral-400 hover:text-neutral-700">
            ✕
          </button>
        </div>

        {!hasValidEmail && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 space-y-1">
            <label className="block text-xs font-medium text-amber-800">
              No valid email on file — add one to enable Send
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="candidate@example.com"
              className="w-full rounded border border-amber-300 px-2 py-1 text-sm"
            />
          </div>
        )}

        {hasValidEmail && email !== candidateEmail && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm font-mono"
          />
        </div>

        {stillHasPlaceholder && (
          <p className="text-xs text-amber-700">
            Replace the bracketed placeholder with a real detail from their CV before sending.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => onClose(false)}
            className="px-3 py-1.5 rounded-md border border-neutral-300 text-sm"
          >
            Close without sending
          </button>
          <button
            onClick={handleSend}
            disabled={!hasValidEmail || sending || savingEmail}
            className="px-3 py-1.5 rounded-md bg-neutral-900 text-white text-sm font-semibold disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
