import { Fragment, useMemo } from "react";
import { ChevronDown, ChevronRight, FileStack } from "lucide-react";

export default function ScheduleStatementTable({
  report,
  expandedNotes,
  onToggleNote,
  onLedgerClick,
  formatAmount,
}) {
  const notesByCode = useMemo(
    () => Object.fromEntries((report?.notes || []).map((note) => [note.noteCode, note])),
    [report]
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">
              Particulars
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 w-28">
              Note No
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-500 w-44">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(report?.rows || []).map((row) => {
            const note = row.noteCode ? notesByCode[row.noteCode] : null;
            const isExpanded = note?.noteCode ? expandedNotes.has(note.noteCode) : false;
            const canExpand = row.nodeType === "line_item" && !!note?.items?.length;
            const paddingLeft = 16 + (row.level || 0) * 22;

            return (
              <Fragment key={row.code}>
                <tr
                  className={
                    row.nodeType === "section"
                      ? "bg-slate-100"
                      : row.nodeType === "subsection"
                        ? "bg-slate-50"
                        : "bg-white"
                  }
                >
                  <td className="px-4 py-3 text-sm text-slate-800" style={{ paddingLeft }}>
                    <div className="flex items-center gap-2">
                      {canExpand ? (
                        <button
                          type="button"
                          onClick={() => onToggleNote(note.noteCode)}
                          className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                          title="Toggle note details"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <span className="w-6" />
                      )}
                      <span
                        className={
                          row.nodeType === "section"
                            ? "font-black uppercase tracking-wide"
                            : row.nodeType === "subsection"
                              ? "font-bold"
                              : "font-medium"
                        }
                      >
                        {row.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {row.noteNo ? (
                      <button
                        type="button"
                        onClick={() => canExpand && onToggleNote(note.noteCode)}
                        className={`inline-flex min-w-10 items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-black ${
                          canExpand
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {row.noteNo}
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-slate-800">
                    {formatAmount(row.amount)}
                  </td>
                </tr>

                {canExpand && isExpanded && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 bg-blue-50/40">
                      <div className="rounded-2xl border border-blue-100 bg-white p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                            <FileStack size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{note.title}</p>
                            <p className="text-xs font-medium text-slate-500">
                              Note {note.noteNo} • {note.items.length} item(s)
                            </p>
                          </div>
                          <div className="ml-auto text-sm font-black text-slate-900 tabular-nums">
                            {formatAmount(note.total)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {note.items.map((item, index) => (
                            <div
                              key={`${note.noteCode}-${index}`}
                              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <div className="min-w-0">
                                {item.kind === "ledger" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onLedgerClick(item.account)}
                                      className="truncate text-left text-sm font-semibold text-slate-700 hover:text-blue-600"
                                    >
                                      {item.ledgerName}
                                    </button>
                                    <p className="text-[11px] text-slate-400">
                                      #{item.ledgerCode} • {item.sourceGroup}
                                      {item.reclassification?.type ? ` • Reclassified from ${item.reclassification.fromLineItemLabel}` : ""}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                                    <p className="text-[11px] text-slate-400">Reporting level adjustment</p>
                                  </>
                                )}
                              </div>
                              <div className="ml-4 text-right text-sm font-black tabular-nums text-slate-900">
                                {formatAmount(item.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
