import React from "react";
import dayjs from "dayjs";
import {
  X, FileText, BookOpen, CheckCircle, ArrowUpRight,
  ArrowDownRight, Hash, Tag, CalendarDays, Clock,
} from "lucide-react";

const formatDate = (d) => dayjs(d).format("DD MMM YYYY");
const formatTime = (d) => dayjs(d).format("hh:mm A");

const calculateTotalDebit  = (j) => j.lines?.reduce((s, l) => s + (l.debit  || 0), 0) || 0;
const calculateTotalCredit = (j) => j.lines?.reduce((s, l) => s + (l.credit || 0), 0) || 0;

const VOUCHER_COLORS = {
  payment:  { cls: "bg-red-50 text-red-700 border-red-200",     g: "linear-gradient(135deg,#7f1d1d,#dc2626)", blob: "#fca5a5" },
  receipt:  { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", g: "linear-gradient(135deg,#064e3b,#059669)", blob: "#6ee7b7" },
  journal:  { cls: "bg-blue-50 text-blue-700 border-blue-200",   g: "linear-gradient(135deg,#1e3a8a,#2563eb)", blob: "#93c5fd" },
  contra:   { cls: "bg-violet-50 text-violet-700 border-violet-200", g: "linear-gradient(135deg,#312e81,#7c3aed)", blob: "#c4b5fd" },
  sales:    { cls: "bg-amber-50 text-amber-700 border-amber-200",  g: "linear-gradient(135deg,#92400e,#d97706)", blob: "#fde68a" },
  purchase: { cls: "bg-indigo-50 text-indigo-700 border-indigo-200", g: "linear-gradient(135deg,#1e3a8a,#4f46e5)", blob: "#a5b4fc" },
};
const getVoucherStyle = (type) =>
  VOUCHER_COLORS[type?.toLowerCase()] ||
  { cls: "bg-slate-100 text-slate-600 border-slate-200", g: "linear-gradient(135deg,#1e3a8a,#2563eb)", blob: "#93c5fd" };

const JournalDetailsModal = ({ open, onClose, journal, voucherNo = null }) => {
  if (!open || !journal) return null;

  const totalDebit  = calculateTotalDebit(journal);
  const totalCredit = calculateTotalCredit(journal);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;
  const vs          = getVoucherStyle(journal.voucherType);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-8">
        <div
          className="relative bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="sticky top-0 z-10 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: vs.g }}>
              <div className="flex items-center gap-3">
                {/* Blob decoration */}
                <div className="absolute -top-6 -right-6 w-24 h-20 rounded-full opacity-20 blur-2xl pointer-events-none"
                  style={{ background: `radial-gradient(ellipse,${vs.blob},transparent)` }} />
                <div className="p-2 bg-white/20 rounded-xl border border-white/25">
                  <BookOpen size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">Journal Entry Details</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[11px] text-white/70">
                      <CalendarDays size={10} /> {formatDate(journal.date)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-white/70">
                      <Clock size={10} /> {formatDate(journal.createdAt)} · {formatTime(journal.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all relative z-10">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* ── Voucher info strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Voucher Type",   value: journal.voucherType || "Journal",   badge: true },
                { label: "Voucher No",     value: voucherNo || journal.voucherNumber || journal.sequentialVoucherNo || "—", mono: true },
                { label: "Journal Date",   value: formatDate(journal.date) },
                { label: "Party",          value: journal.partyName || "—" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  {s.badge ? (
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${vs.cls}`}>
                      {s.value}
                    </span>
                  ) : (
                    <p className={`text-xs font-bold text-slate-800 ${s.mono ? "font-mono" : ""}`}>{s.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* ── Narration + Reference ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f8fafc,#eff6ff)" }}>
                <div className="w-1 h-5 rounded-full shrink-0" style={{ background: vs.g }} />
                <FileText size={13} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Narration</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  {journal.narration || <span className="text-slate-400 italic">No narration provided</span>}
                </p>
                {journal.referenceNumber && (
                  <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl w-fit">
                    <Hash size={11} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ref:</span>
                    <span className="text-[11px] font-mono font-semibold text-slate-700">{journal.referenceNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Journal Lines Table ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f8fafc,#eff6ff)" }}>
                <div className="w-1 h-5 rounded-full shrink-0" style={{ background: vs.g }} />
                <BookOpen size={13} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Journal Entry Lines</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white ml-1"
                  style={{ background: vs.g }}>{journal.lines?.length || 0}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "linear-gradient(90deg,#f1f5f9,#dbeafe)" }}>
                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Particulars</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Debit (₹)</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journal.lines?.map((line, i) => (
                      <tr key={line._id || i} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            {line.credit > 0
                              ? <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                              : <ArrowDownRight size={14} className="text-red-500 shrink-0" />}
                            <div>
                              <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                {line.credit > 0 ? "To " : "By "}
                                {line.account?.name || "Unknown Account"}
                              </p>
                              {line.account?.group && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{line.account.group}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {line.debit > 0
                            ? <span className="font-black text-red-600 tabular-nums">₹{line.debit.toLocaleString()}</span>
                            : <span className="text-slate-200 select-none">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {line.credit > 0
                            ? <span className="font-black text-emerald-600 tabular-nums">₹{line.credit.toLocaleString()}</span>
                            : <span className="text-slate-200 select-none">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* Totals row */}
                  <tfoot>
                    <tr style={{ background: "linear-gradient(90deg,#f1f5f9,#dbeafe)" }}>
                      <td className="px-5 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Totals</td>
                      <td className="px-5 py-3 text-right font-black text-red-600 tabular-nums">
                        ₹{totalDebit.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-black text-emerald-600 tabular-nums">
                        ₹{totalCredit.toLocaleString()}
                      </td>
                    </tr>
                    {/* Balance status */}
                    <tr style={{ background: isBalanced ? "linear-gradient(90deg,#f0fdf4,#dcfce7)" : "linear-gradient(90deg,#fef2f2,#fee2e2)" }}>
                      <td colSpan={2} className="px-5 py-2.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Balance Status
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black ${isBalanced ? "text-emerald-700" : "text-red-600"}`}>
                          {isBalanced
                            ? <><CheckCircle size={11} /> Balanced</>
                            : <><X size={11} /> Not Balanced</>}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="sticky bottom-0 px-5 py-3 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end">
            <button onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default JournalDetailsModal;