import { getCandidatesByStatus } from "@/lib/queries";
import CandidateCard from "@/components/CandidateCard";
import SearchableList from "@/components/SearchableList";

export default async function HoldPage() {
  const candidates = await getCandidatesByStatus("HOLD");
  const schedulingLink = process.env.SCHEDULING_LINK ?? "";
  const defaultTestEmail = process.env.DEFAULT_TEST_EMAIL ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Hold</h1>
        <p className="text-sm text-neutral-400">
          Held candidates aren&apos;t a dead end — Approve, Reject or Hold again whenever you revisit them.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
          <p className="font-medium text-neutral-200">No one on hold</p>
        </div>
      ) : (
        <SearchableList
          placeholder="Search by candidate name…"
          items={candidates.map((c) => ({
            id: c.id,
            name: c.name ?? "",
            node: (
              <CandidateCard
                key={c.id}
                candidate={c}
                schedulingLink={schedulingLink}
                defaultTestEmail={defaultTestEmail}
              />
            ),
          }))}
        />
      )}
    </div>
  );
}
