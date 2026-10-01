import Link from "next/link";
import { ClipboardList, ArrowRight, Check, X, Pause } from "lucide-react";
import { getActivityLog } from "@/lib/queries";
import { TAB_FOR_STATUS } from "@/lib/status-tabs";
import { REJECT_REASON_LABEL } from "@/lib/types";
import { formatDateTime } from "@/lib/format-date";

const ACTION_STYLE: Record<string, { badge: string; icon: typeof Check }> = {
  APPROVE: { badge: "bg-green-500/10 text-green-300 border border-green-800/40", icon: Check },
  REJECT: { badge: "bg-red-500/10 text-red-300 border border-red-800/40", icon: X },
  HOLD: { badge: "bg-amber-500/10 text-amber-300 border border-amber-800/40", icon: Pause },
};

export default async function ActivityLogPage() {
  const log = await getActivityLog();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Activity Log
        </h1>
        <p className="text-sm text-neutral-400">
          Every Approve/Reject/Hold decision, across every candidate — a timestamped record, not
          editable here.
        </p>
      </div>

      {log.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
          <p className="font-medium text-neutral-200">No decisions recorded yet</p>
        </div>
      ) : (
        <table className="w-full text-sm text-neutral-200">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
              <th className="py-2 pr-3 font-medium">Sr</th>
              <th className="py-2 pr-3 font-medium">Candidate</th>
              <th className="py-2 pr-3 font-medium">Action</th>
              <th className="py-2 pr-3 font-medium">Comment</th>
              <th className="py-2 pr-3 font-medium">When</th>
              <th className="py-2 pr-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {log.map((row) => {
              const style = ACTION_STYLE[row.action];
              const ActionIcon = style.icon;
              return (
                <tr key={row.id} className="border-b border-neutral-800">
                  <td className="py-2 pr-3 text-xs text-neutral-500">#{row.candidate_srno}</td>
                  <td className="py-2 pr-3 font-medium text-neutral-100">
                    {row.candidate_name || "Unnamed"}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}
                    >
                      <ActionIcon className="w-3.5 h-3.5" />
                      {row.action}
                    </span>
                  </td>
                  <td className="py-2 pr-3 max-w-xs truncate text-neutral-300" title={row.comment}>
                    {row.reason && (
                      <span className="mr-1.5 px-1.5 py-0.5 rounded bg-neutral-800 text-xs text-neutral-300 whitespace-nowrap">
                        {REJECT_REASON_LABEL[row.reason]}
                      </span>
                    )}
                    {row.comment}
                  </td>
                  <td className="py-2 pr-3 text-neutral-500">
                    {formatDateTime(row.created_at)}
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
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
