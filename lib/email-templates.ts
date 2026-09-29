// Editable templates rendered into plain text before being shown in the
// preview modal — Arjun edits the *rendered* text, not this template string
// (guardrail: no rubric language, no scores, no tiers ever appear here).

export function roleLabelFor(role: "PM" | "SPM" | null | undefined): string {
  if (role === "SPM") return "Senior Product Manager";
  if (role === "PM") return "Product Manager";
  return "role";
}

export interface EmailTemplateParams {
  name: string;
  oneFactualDetail: string;
  schedulingLink: string;
  roleLabel: string;
}

export function renderApproveInviteEmail({
  name,
  oneFactualDetail,
  schedulingLink,
  roleLabel,
}: EmailTemplateParams): { subject: string; body: string } {
  const firstName = name.split(" ")[0] || name;
  return {
    subject: `Next steps for the ${roleLabel} role at Kargo`,
    body: `Hi ${firstName},

We'd like to move you to the next step for the ${roleLabel} position.

Your experience with ${oneFactualDetail} stood out to us, and we'd love to learn more about your work and how you approach problems.

Please pick a convenient time here:

${schedulingLink}

Looking forward to speaking.

Best,
Arjun`,
  };
}

export function renderRejectNoticeEmail({
  name,
  oneFactualDetail,
}: Omit<EmailTemplateParams, "schedulingLink" | "roleLabel">): { subject: string; body: string } {
  const firstName = name.split(" ")[0] || name;
  return {
    subject: `Update on your application to Kargo`,
    body: `Hi ${firstName},

Thank you for taking the time to speak with us and share your background. We particularly enjoyed learning about ${oneFactualDetail}.

After reviewing your application, we've decided to move forward with other candidates whose experience is a closer match for what we're looking for at this stage.

Thank you again for your time, and wishing you all the best with your search.

Best,
Arjun`,
  };
}
