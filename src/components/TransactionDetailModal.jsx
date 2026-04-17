import React, { useState } from "react";
import { X, Filter, ChevronDown, ChevronRight } from "lucide-react";


const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtMonthYear = (monthKey) => {
  if (!monthKey || monthKey === "unknown") return "Unknown";
  const [year, month] = monthKey.split("-");
  const date = new Date(year, parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const getStatusBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case "MATCHED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PARTIAL":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "UNMATCHED":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};



export default function TransactionDetailModal({ isOpen, onClose, monthData, allDetails, monthKey, bankLedgerName }) {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [expandedBankTxns, setExpandedBankTxns] = useState(new Set());

  if (!isOpen || !monthData || !allDetails) return null;

  const { bankTransactions = [], journalEntries = [], allocations = [] } = allDetails;

  const monthBankTransactions = bankTransactions.filter((tx) => tx.month === monthKey);
  const monthJournalEntries = journalEntries.filter((tx) => tx.month === monthKey);
  const monthAllocations = allocations.filter((a) => a.month === monthKey);

  const getLinkedJournalEntries = (bankTxId) => {
    const linkedAllocations = monthAllocations.filter((a) => String(a.bankTransactionId) === String(bankTxId));
    return linkedAllocations
      .map((alloc) => monthJournalEntries.find((je) => String(je._id) === String(alloc.bankLedgerTransactionId)))
      .filter(Boolean);
  };

  const filteredBankTransactions =
    filterStatus === "ALL"
      ? monthBankTransactions
      : monthBankTransactions.filter((tx) => tx.classification?.toUpperCase() === filterStatus);

  const totalCounts = {
    MATCHED: monthBankTransactions.filter((tx) => tx.classification === "MATCHED").length,
    PARTIAL: monthBankTransactions.filter((tx) => tx.classification === "PARTIAL").length,
    UNMATCHED: monthBankTransactions.filter((tx) => tx.classification === "UNMATCHED").length,
  };

  const filteredCounts = {
    MATCHED: filteredBankTransactions.filter((tx) => tx.classification === "MATCHED").length,
    PARTIAL: filteredBankTransactions.filter((tx) => tx.classification === "PARTIAL").length,
    UNMATCHED: filteredBankTransactions.filter((tx) => tx.classification === "UNMATCHED").length,
  };

  const toggleExpandBankTxn = (bankTxId) => {
    setExpandedBankTxns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(bankTxId)) newSet.delete(bankTxId);
      else newSet.add(bankTxId);
      return newSet;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-[1400px] flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">Bank vs Book Reconciliation - {fmtMonthYear(monthKey)}</h2>
            <p className="text-sm text-blue-100">{bankLedgerName}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 transition hover:bg-blue-500">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-6 py-3">
          <Filter size={16} className="mt-2 text-slate-500" />
          {["ALL", "MATCHED", "PARTIAL", "UNMATCHED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                filterStatus === status
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {status === "ALL"
                ? `All (${monthBankTransactions.length})`
                : `${status} (${totalCounts[status] || 0})`}
            </button>
          ))}
        </div>

        {/* Table with fixed layout */}
        <div className="flex-1 overflow-auto">
          {filteredBankTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <p>No bank transactions found for the selected filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm table-fixed">
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                  <tr className="border-b-2 border-slate-300">
                    <th className="w-10 px-2 py-3 text-left"></th>                 {/* Expand */}
                    <th className="w-24 px-3 py-3 text-left font-semibold text-slate-800">Date</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-800">Reference / Description</th>
                    <th className="w-28 px-3 py-3 text-right font-semibold text-slate-800">Amount</th>
                    <th className="w-28 px-3 py-3 text-right font-semibold text-slate-800">Matched</th>
                    <th className="w-28 px-3 py-3 text-center font-semibold text-slate-800">Status</th>
                    <th className="w-16 px-3 py-3 text-center font-semibold text-slate-800">Linked</th>
                   </tr>
                </thead>
                <tbody>
                  {filteredBankTransactions.map((bankTx) => {
                    const linkedJournals = getLinkedJournalEntries(bankTx._id);
                    const isExpanded = expandedBankTxns.has(bankTx._id);
                    const hasMatches = linkedJournals.length > 0;
                    const isMatchedZero = (bankTx.allocatedAmount || 0) === 0;

                    return (
                      <React.Fragment key={bankTx._id}>
                        {/* Main bank row */}
                        <tr className="border-b border-slate-200 even:bg-white odd:bg-slate-50">
                          <td className="px-2 py-3 text-center">
                            {hasMatches && (
                              <button
                                onClick={() => toggleExpandBankTxn(bankTx._id)}
                                className="inline-flex items-center justify-center rounded p-1 hover:bg-slate-200"
                              >
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">
                            {fmtDate(bankTx.date)}
                          </td>
                          <td className="px-3 py-3 truncate">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-900">{bankTx.referenceNo || "—"}</span>
                              {bankTx.description && (
                                <span className="text-xs text-slate-500 truncate">{bankTx.description}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {fmtCurrency(bankTx.amount)}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${isMatchedZero ? "text-rose-600" : "text-emerald-700"}`}>
                            {fmtCurrency(bankTx.allocatedAmount || 0)}
                            {!isMatchedZero && bankTx.allocatedAmount < bankTx.amount && (
                              <span className="ml-1 text-xs text-amber-600" title="Partially matched">⚠️</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${getStatusBadgeClass(bankTx.classification)}`}>
                              {bankTx.classification}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {linkedJournals.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                {linkedJournals.length}
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded journal rows */}
                        {isExpanded && hasMatches && linkedJournals.map((journal) => (
                          <tr key={journal._id} className="border-b border-slate-200 bg-emerald-50/50">
                            <td className="px-2 py-3">
                              <div className="flex justify-center">
                                <div className="h-6 w-px bg-emerald-400"></div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
                              {fmtDate(journal.date)}
                            </td>
                            <td className="px-3 py-3 truncate pl-6">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-slate-900">📓 {journal.journalNumber || "—"}</span>
                                {journal.narration && (
                                  <span className="text-xs text-slate-500 truncate">{journal.narration}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900 whitespace-nowrap">
                              {fmtCurrency(journal.amount)}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-bold text-emerald-700 whitespace-nowrap">
                              {fmtCurrency(journal.allocatedAmount || 0)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                {journal.classification}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                Linked
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-700">Matched: {filteredCounts.MATCHED}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                <span className="font-semibold text-slate-700">Partial: {filteredCounts.PARTIAL}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                <span className="font-semibold text-slate-700">Unmatched: {filteredCounts.UNMATCHED}</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md bg-slate-200 px-4 py-1.5 font-semibold text-slate-800 hover:bg-slate-300">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}