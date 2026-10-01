import { getCandidatesByStatus } from "@/lib/queries";
import HiredRow from "@/components/HiredRow";
import SearchableTable from "@/components/SearchableTable";

export default async function HiredPage() {
  const candidates = await getCandidatesByStatus("HIRED");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Hired</h1>
        <p className="text-sm text-neutral-400">Reached only via Convert to Hired from Approved.</p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
          <p className="font-medium text-neutral-200">No hires yet</p>
        </div>
      ) : (
        <SearchableTable
          placeholder="Search by candidate name…"
          headerRow={
            <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
              <th className="py-2 pr-3 font-medium">Sr</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Added</th>
              <th className="py-2 pr-3 font-medium">Hired</th>
              <th className="py-2 pr-3 font-medium"></th>
            </tr>
          }
          items={candidates.map((c) => ({
            id: c.id,
            name: c.name ?? "",
            node: <HiredRow key={c.id} candidate={c} />,
          }))}
        />
      )}
    </div>
  );
}
