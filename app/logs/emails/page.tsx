import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { getEmailHistory } from "@/lib/queries";
import { TAB_FOR_STATUS } from "@/lib/status-tabs";
import { formatDateTime } from "@/lib/format-date";

const STATUS_STYLE: Record<string, string> = {
  SENT: "bg-green-500/10 text-green-300 border border-green-800/40",
  FAILED: "bg-red-500/10 text-red-300 border border-red-800/40",
  DRAFTED: "bg-neutral-800 text-neutral-400",
};

const TYPE_LABEL: Record<string, string> = {
  APPROVE_INVITE: "Interview invite (Approve)",
  REJECT_NOTICE: "Decline notice (Reject)",
};

export default async function EmailHistoryPage() {
  const history = await getEmailHistory();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Log
        </h1>
        <p className="text-sm text-neutral-400">
          Every Approve/Reject email ever sent, as a log — not a mailbox.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
          <p className="font-medium text-neutral-200">No emails sent yet</p>
        </div>
      ) : (
        <table className="w-full text-sm text-neutral-200">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
              <th className="py-2 pr-3 font-medium">Sr</th>
              <th className="py-2 pr-3 font-medium">Candidate</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Sent on</th>
              <th className="py-2 pr-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-neutral-800">
                <td className="py-2 pr-3 text-xs text-neutral-500">#{row.candidate_srno}</td>
                <td className="py-2 pr-3 font-medium text-neutral-100">
                  {row.candidate_name || "Unnamed"}
                </td>
                <td className="py-2 pr-3 text-neutral-300">{TYPE_LABEL[row.email_type]}</td>
                <td className="py-2 pr-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[row.status]}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-2 pr-3 text-neutral-500">
                  {row.sent_at ? formatDateTime(row.sent_at) : "—"}
                </td>
                <td className="py-2 pr-3">
                  <Link
                    href={TAB_FOR_STATUS[row.candidate_status]}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-800 text-indigo-300 hover:bg-neutral-700 hover:text-indigo-200 transition-colors"
                  >
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
