import { getCandidatesByStatus } from "@/lib/queries";
import CandidateCard from "@/components/CandidateCard";
import UploadForm from "@/components/UploadForm";
import SearchableList from "@/components/SearchableList";

export default async function QueuePage() {
  const candidates = await getCandidatesByStatus("NEW");
  const schedulingLink = process.env.SCHEDULING_LINK ?? "";
  const defaultTestEmail = process.env.DEFAULT_TEST_EMAIL ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Queue</h1>
        <p className="text-sm text-neutral-400">
          New candidates, newest first. Approve, Reject or Hold each one.
        </p>
      </div>

      {candidates.length === 0 ? (
        // The empty state IS the uploader, not a link to it — a separate
        // "click here to upload" box that then opens /upload meant two
        // clicks to do one thing.
        <div className="max-w-2xl">
          <UploadForm />
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
