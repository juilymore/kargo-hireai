import { getCandidatesByStatus } from "@/lib/queries";
import HiredRow from "@/components/HiredRow";

export default async function HiredPage() {
  const candidates = await getCandidatesByStatus("HIRED");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Hired</h1>
        <p className="text-sm text-neutral-500">Reached only via Convert to Hired from Approved.</p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
          <p className="font-medium">No hires yet</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
              <th className="py-2 pr-3 font-medium">Sr</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Added</th>
              <th className="py-2 pr-3 font-medium">Hired</th>
              <th className="py-2 pr-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <HiredRow key={c.id} candidate={c} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
