import { BookOpen, Upload, Inbox, CheckCircle2, Mail, ClipboardList, SlidersHorizontal, Search } from "lucide-react";
import type { ReactNode } from "react";

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          How to Use HireAI
        </h1>
        <p className="text-sm text-neutral-400">
          A quick walkthrough for anyone stepping in to run the hiring queue — written so you can
          follow along without needing anyone else around.
        </p>
      </div>

      <Step icon={Upload} title="1. Upload CVs">
        Go to <Code>Upload</Code>. Add one or more CV files (PDF, or a Google Doc/Drive link), pick
        the role (PM or SPM) for each, and submit. You can add several at once — they&apos;re
        scored in parallel, so it doesn&apos;t take much longer to do five than one. Each CV is
        read by AI and scored against the current rubric automatically; this can take 15–45
        seconds per CV, so leave the tab open until it finishes.
      </Step>

      <Step icon={Inbox} title="2. Review the Queue">
        New candidates land in <Code>Queue</Code>. Click into a candidate to see their score,
        tier, and the reasoning behind it ("Score at a Glance"). If you see a{" "}
        <span className="text-amber-300 font-medium">Low confidence</span> badge, it means the AI
        wasn&apos;t sure about something in the CV (e.g. conflicting dates) — treat the score as a
        starting point, not the final word, and read the CV yourself before deciding.
      </Step>

      <Step icon={CheckCircle2} title="3. Make a decision: Approve, Reject, or Hold">
        From a candidate&apos;s page, choose one:
        <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-400">
          <li>
            <span className="text-green-300 font-medium">Approve</span> — moves them to{" "}
            <Code>Approved</Code>. You can then mark an interview as scheduled from there.
          </li>
          <li>
            <span className="text-red-300 font-medium">Reject</span> — moves them to{" "}
            <Code>Rejected</Code>. Optionally sends a rejection email (see below).
          </li>
          <li>
            <span className="text-amber-300 font-medium">Hold</span> — moves them to{" "}
            <Code>On Hold</Code> for a later look. Nothing is sent automatically.
          </li>
        </ul>
        Every decision is timestamped and recorded — see <Code>Resources → Activity Log</Code>.
      </Step>

      <Step icon={Mail} title="4. Emails">
        Rejection (and other) emails sent from the app are logged under{" "}
        <Code>Resources → Email Log</Code> — useful if a candidate asks "did you get my CV" or
        disputes being contacted.
      </Step>

      <Step icon={CheckCircle2} title="5. Hired">
        Once someone accepts an offer, mark them <Code>Hired</Code> from their Approved page entry.
        This is the final stage — no further action needed.
      </Step>

      <Step icon={SlidersHorizontal} title="Dashboard filters">
        The <Code>Dashboard</Code> homepage shows live counts for every stage, the top 3 candidates
        waiting in Queue, and the top 3 interviews scheduled. Use the role and date filters at the
        top to narrow this down (e.g. "PM candidates added this month"). Below that, a{" "}
        <span className="font-medium text-neutral-200">Weekly Summary</span> gives you a plain-text
        recap of what happened this week and last week, so you can catch up in a glance.
      </Step>

      <Step icon={Search} title="Search">
        Every list page (Queue, Approved, Rejected, Hold, Hired) has a search box — search by name
        or serial number to jump straight to a candidate.
      </Step>

      <Step icon={ClipboardList} title="Rubrics">
        The <Code>Rubrics</Code> tab controls how CVs are scored for each role — criteria, weights,
        and descriptions. Changing a rubric only affects CVs scored after the change; it does not
        re-score anything already in the system. Edit this carefully — it&apos;s the source of
        truth for every future score.
      </Step>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
        <p className="font-medium text-neutral-200 mb-1">Stuck or something looks wrong?</p>
        <p>
          Check <Code>Resources → Activity Log</Code> to see exactly what decisions were made and when.
          If a score looks off, open the candidate and read the full AI reasoning before overriding
          it — the rubric is deliberately cautious and routes uncertain cases to Hold rather than
          auto-approving or auto-rejecting them.
        </p>
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Upload;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="font-semibold text-neutral-100 flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-neutral-400" />
        {title}
      </h2>
      <p className="text-sm text-neutral-300 leading-relaxed">{children}</p>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 text-xs font-mono">
      {children}
    </span>
  );
}
