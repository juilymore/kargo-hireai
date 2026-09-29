import { getCandidatesByStatus } from "@/lib/queries";
import CandidateCard from "@/components/CandidateCard";

export default async function QueuePage() {
  const candidates = await getCandidatesByStatus("NEW");
  const schedulingLink = process.env.SCHEDULING_LINK ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Queue</h1>
        <p className="text-sm text-neutral-500">
          New candidates, newest first. Approve, Reject or Hold each one — a comment is required.
        </p>
      </div>

      {candidates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} candidate={c} schedulingLink={schedulingLink} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
      <p className="font-medium">Queue is empty</p>
      <p className="text-sm mt-1">Upload a CV to get started — click “+ Add CVs” above.</p>
    </div>
  );
}
