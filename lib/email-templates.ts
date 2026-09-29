// Editable templates rendered into plain text before being shown in the
// preview modal — Arjun edits the *rendered* text, not this template string
// (guardrail: no rubric language, no scores, no tiers ever appear here).

export interface EmailTemplateParams {
  name: string;
  oneFactualDetail: string;
  schedulingLink: string;
}

export function renderApproveInviteEmail({
  name,
  oneFactualDetail,
  schedulingLink,
}: EmailTemplateParams): { subject: string; body: string } {
  const firstName = name.split(" ")[0] || name;
  return {
    subject: `Following up on your application to Kargo`,
    body: `Hi ${firstName},

Thanks for sharing your background with us — ${oneFactualDetail} stood out to me.

I'd like to talk further about the role. Could you grab a slot that works for you here: ${schedulingLink}

Looking forward to speaking with you.

Best,
Arjun`,
  };
}

export function renderRejectNoticeEmail({
  name,
  oneFactualDetail,
}: Omit<EmailTemplateParams, "schedulingLink">): { subject: string; body: string } {
  const firstName = name.split(" ")[0] || name;
  return {
    subject: `Update on your application to Kargo`,
    body: `Hi ${firstName},

Thank you for taking the time to share your background with us — ${oneFactualDetail} was genuinely interesting to read.

After reviewing things closely, we've decided to move forward with other candidates whose backgrounds more closely match what we need right now.

I wish you the best in your search.

Best,
Arjun`,
  };
}
