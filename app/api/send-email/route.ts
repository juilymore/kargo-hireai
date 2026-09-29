import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { EmailType } from "@/lib/types";

export const runtime = "nodejs";

const VALID_TYPES: EmailType[] = ["APPROVE_INVITE", "REJECT_NOTICE"];

// Called only when Arjun clicks Send on the preview modal (guardrail #1 —
// never invoked directly from Approve/Reject). Body carries the *edited*
// subject/body from the modal, not a re-render of the template.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const candidateId = body?.candidate_id;
  const emailType = body?.email_type;
  const subject = body?.subject;
  const emailBody = body?.body;

  if (typeof candidateId !== "string") {
    return NextResponse.json({ error: "Missing candidate_id" }, { status: 400 });
  }
  if (typeof emailType !== "string" || !VALID_TYPES.includes(emailType as EmailType)) {
    return NextResponse.json(
      { error: "email_type must be APPROVE_INVITE or REJECT_NOTICE" },
      { status: 400 }
    );
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (typeof emailBody !== "string" || !emailBody.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: candidate, error: fetchError } = await supabase
    .from("candidates")
    .select("id, email")
    .eq("id", candidateId)
    .single();

  if (fetchError || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }
  // Guardrail #2: no email without a valid address.
  if (!candidate.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
    return NextResponse.json(
      { error: "Candidate has no valid email address on file" },
      { status: 400 }
    );
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: "RESEND_API_KEY / RESEND_FROM_EMAIL are not configured" },
      { status: 500 }
    );
  }

  // Log as DRAFTED first so a crash mid-send still leaves a record.
  const { data: logRow, error: logError } = await supabase
    .from("emails_log")
    .insert({
      candidate_id: candidateId,
      email_type: emailType,
      subject,
      body: emailBody,
      status: "DRAFTED",
    })
    .select()
    .single();

  if (logError || !logRow) {
    return NextResponse.json(
      { error: `Failed to log email: ${logError?.message}` },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);
  const { data: sendResult, error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: candidate.email,
    subject,
    text: emailBody,
  });

  if (sendError) {
    // Guardrail #6: failures are visible, never marked as sent.
    await supabase
      .from("emails_log")
      .update({ status: "FAILED" })
      .eq("id", logRow.id);
    return NextResponse.json(
      { error: `Resend failed: ${sendError.message}`, email_log_id: logRow.id },
      { status: 502 }
    );
  }

  const { data: updatedLog, error: updateError } = await supabase
    .from("emails_log")
    .update({
      status: "SENT",
      resend_message_id: sendResult?.id ?? null,
      sent_at: new Date().toISOString(),
    })
    .eq("id", logRow.id)
    .select()
    .single();

  if (updateError || !updatedLog) {
    return NextResponse.json(
      { error: `Sent but failed to update log: ${updateError?.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ email_log: updatedLog });
}
