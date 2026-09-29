import { getCandidatesByStatus } from "@/lib/queries";
import ApprovedRow from "@/components/ApprovedRow";

export default async function ApprovedPage() {
  const candidates = await getCandidatesByStatus("APPROVED");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Approved</h1>
        <p className="text-sm text-neutral-500">
          Track interview scheduling manually. Convert to Hired once the interview is Done.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          <p className="font-medium">No approved candidates yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <ApprovedRow key={c.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
