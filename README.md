# HireAI

An internal hiring dashboard for Kargo (a fictional Series A logistics SaaS
company, per the case brief), built for the MESA Case 2 assignment. Vikram
uploads CVs, Gemini scores each one against Arjun's resume rubric (PM/SPM),
and Arjun reviews a queue and clicks Approve / Reject / Hold — with an
editable email preview before anything is sent.

**Live app:** https://kargo-hireai.vercel.app
**Repo:** https://github.com/juilymore/kargo-hireai

---

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **Supabase** (Postgres + Storage) — no auth in v1, trusted internal tool
- **Gemini API** (`gemini-3.1-pro-preview`) for CV scoring
- **Resend** for the Approve/Reject emails
- **Vercel** for hosting

## Data model

See [`supabase/schema.sql`](supabase/schema.sql) for the full schema:
`candidates`, `scoring_results` (one row per candidate × role scored, PM and
SPM never merged into one score), `actions_log` (append-only audit trail —
every Approve/Reject/Hold requires a comment), `emails_log`, `interviews`,
and `hires`.

## Local setup

1. Clone the repo and `npm install`.
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase
     project's API settings.
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com).
   - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — see **Email sending** below.
   - `SCHEDULING_LINK` — any URL you want candidates to book time with
     (Google Calendar, Calendly, etc.) — it's just dropped into the email
     body verbatim.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase
   project's SQL Editor once, to create the tables and the `resumes`
   storage bucket.
4. `npm run dev` and open `http://localhost:3000`.

### Email sending

Resend requires the **sending domain** to be verified before it will
deliver mail. If you don't own a domain, use `onboarding@resend.dev` as
`RESEND_FROM_EMAIL` — it works, but Resend restricts it to sending only to
the email address on your own Resend account, so it's fine for demos but
not for emailing real candidates. To send to anyone, verify your own
domain at [resend.com/domains](https://resend.com/domains) and use an
address on it instead.

## Deploying on Vercel

Import the repo on [vercel.com](https://vercel.com), add the same 6
environment variables above in **Settings → Environment Variables**
(covering Production + Preview), and deploy. Vercel's default assumption
is that your Production branch is named `main` — if your repo's default
branch is `master`, either rename it to `main` or change the Production
Branch setting under **Settings → Environments → Production**.

## Notable build decisions

A few calls made during the build that aren't obvious from the code:

- **PM/SPM, not PM/APM.** The build prompt mentioned APM at one point —
  that was a typo caught during planning. The app scores PM and SPM
  exactly as the rubric defines them, with no remapping.
- **Hold is its own tab, not also shown at the bottom of the Queue.** The
  case brief could be read either way; this app treats New/Approved/
  Rejected/Hold/Hired as mutually exclusive buckets for a simpler mental
  model.
- **No "we'll keep your profile on file" line in reject emails** — no
  re-review process actually exists yet, so the email doesn't imply one.
- **The "one factual detail from their CV" in the approve email is a
  placeholder** (`[one specific, factual detail from their CV — replace
  before sending]`) that Arjun fills in before sending, rather than an
  automated extraction — the spec didn't define how that detail should be
  chosen, and guessing risked pulling in rubric-flavored language the
  guardrails explicitly forbid in candidate-facing emails.
- **PDF text extraction has a repair step** for a real quirk seen in
  several test CVs, where certain docx→pdf conversions make `pdf-parse`
  emit one character per line. See the comment in
  [`lib/parse-cv.ts`](lib/parse-cv.ts) for how it's detected and fixed.

## Known limitations

- No authentication — anyone with the URL can act as Arjun. Fine for this
  assignment; the schema was deliberately kept RLS-ready (clean FKs, no
  denormalized PII) if auth gets added later.
- `RESEND_FROM_EMAIL=onboarding@resend.dev` can only send to your own
  Resend account's email address, not arbitrary candidates, until a real
  domain is verified.
- Local dev and the deployed app currently point at the same Supabase
  project, so testing locally affects the same data you'd see live.
