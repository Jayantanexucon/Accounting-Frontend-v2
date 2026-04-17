import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "../contexts/AuthContext";
import { getMonthlyReconciliationReportApi } from "../apis/reconciliationApi";
import { getAccountsApi } from "../apis/accountApi";
import AccountSearchDropdown from "../components/AccountSearchDropdown";
import TransactionDetailModal from "../components/TransactionDetailModal";
import { useLocation } from "react-router-dom";
import '../styles/tally-print-styles.css';
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

export default function MonthlyReconciliationReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
  const companyId = selectedCompany?._id || user?.company?._id;

 const [selectedBankLedgerId, setSelectedBankLedgerId] = useState(
  location.state?.selectedLedgerId || ""
);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const accountsQuery = useQuery({
    queryKey: ["accounts", companyId],
    queryFn: () => getAccountsApi(companyId),
    enabled: Boolean(companyId),
  });

  const allAccounts = accountsQuery.data?.data || [];
  const bankAccounts = allAccounts.filter((acc) =>
    (acc.groupName || "").toLowerCase().includes("bank")
  );

  const reportQuery = useQuery({
    queryKey: ["monthly-reconciliation-report", companyId, selectedBankLedgerId, startDate, endDate],
    queryFn: () =>
      getMonthlyReconciliationReportApi(companyId, {
        bankLedgerId: selectedBankLedgerId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: Boolean(companyId && selectedBankLedgerId),
  });

  const reportData = reportQuery.data?.data || {};
  const bankLedger = reportData.bankLedger || {};
  const summary = reportData.summary || {};
  const months = reportData.months || [];
  const filters = reportData.filters || {};

  // Set default date range to current financial year
  useEffect(() => {
    if (!startDate && !endDate) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Indian financial year starts from April
      let fyStart, fyEnd;
      if (currentMonth >= 3) {
        // April to December - current FY
        fyStart = new Date(currentYear, 3, 1); // April 1st
        fyEnd = new Date(currentYear + 1, 2, 31); // March 31st next year
      } else {
        // January to March - previous FY
        fyStart = new Date(currentYear - 1, 3, 1);
        fyEnd = new Date(currentYear, 2, 31);
      }
      
      setStartDate(fyStart.toISOString().slice(0, 10));
      setEndDate(fyEnd.toISOString().slice(0, 10));
    }
  }, [startDate, endDate]);

  const handleExportToExcel = () => {
    if (!months.length) return;

    const monthlyData = months.map((month) => ({
      Month: fmtMonthYear(month.month),
      "Bank Txns Count": month.bankTransactions.count,
      "Bank Total": month.bankTransactions.totalAmount,
      "Bank Matched": month.bankTransactions.matched.amount,
      "Bank Partial": month.bankTransactions.partial.amount,
      "Bank Unmatched": month.bankTransactions.unmatched.amount,
      "Journal Count": month.journalEntries.count,
      "Journal Total": month.journalEntries.totalAmount,
      "Journal Matched": month.journalEntries.matched.amount,
      "Journal Partial": month.journalEntries.partial.amount,
      "Journal Unmatched": month.journalEntries.unmatched.amount,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(monthlyData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Month
      { wch: 12 }, // Bank Txns Count
      { wch: 15 }, // Bank Total
      { wch: 15 }, // Bank Matched
      { wch: 15 }, // Bank Partial
      { wch: 15 }, // Bank Unmatched
      { wch: 12 }, // Journal Count
      { wch: 15 }, // Journal Total
      { wch: 15 }, // Journal Matched
      { wch: 15 }, // Journal Partial
      { wch: 15 }, // Journal Unmatched
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    XLSX.writeFile(
      wb,
      `BRS_Monthly_Report_${bankLedger.name || 'Report'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMonthClick = (month) => {
    setSelectedMonth(month);
    setShowTransactionModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Tally-style Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-white print:hidden">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/accounting/bank-reconciliation")}
              className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold transition hover:bg-blue-500"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="h-6 w-px bg-blue-400"></div>
            <h1 className="text-sm font-bold">Monthly Reconciliation Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToExcel}
              disabled={!months.length}
              className="flex items-center gap-2 rounded bg-blue-500 px-3 py-1.5 text-sm font-semibold transition hover:bg-blue-400 disabled:opacity-50"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={handlePrint}
              disabled={!months.length}
              className="flex items-center gap-2 rounded bg-blue-500 px-3 py-1.5 text-sm font-semibold transition hover:bg-blue-400 disabled:opacity-50"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1600px] p-4">
        {/* Filters Section */}
        {showFilters && (
          <div className="mb-4 rounded border border-slate-300 bg-slate-50 p-4 print:hidden">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Bank Ledger</label>
                <AccountSearchDropdown
                  value={selectedBankLedgerId}
                  onChange={setSelectedBankLedgerId}
                  options={bankAccounts}
                  placeholder="Select bank account..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {!selectedBankLedgerId ? (
          <div className="rounded border border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">Please select a bank ledger to view the report</p>
          </div>
        ) : reportQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="ml-3 text-sm font-semibold text-slate-700">Loading report...</span>
          </div>
        ) : reportQuery.isError ? (
          <div className="rounded border border-rose-300 bg-rose-50 p-4">
            <p className="text-sm text-rose-700">
              {reportQuery.error?.response?.data?.message || "Failed to load report"}
            </p>
          </div>
        ) : (
          <>
            {/* Report Header - Tally Style */}
            <div className="mb-4 rounded border border-slate-300 bg-white">
              <div className="border-b border-slate-300 bg-slate-100 px-4 py-2">
                <h2 className="text-sm font-bold text-slate-900">Bank Reconciliation Statement - Monthly Analysis</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-4">
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-700">Bank Ledger:</span>
                    <span className="font-bold text-slate-900">{bankLedger.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-700">Account Code:</span>
                    <span className="text-slate-900">{bankLedger.code || "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-700">From Date:</span>
                    <span className="text-slate-900">{filters.startDate ? fmtDate(filters.startDate) : "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-700">To Date:</span>
                    <span className="text-slate-900">{filters.endDate ? fmtDate(filters.endDate) : "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-700">Total Months:</span>
                    <span className="text-slate-900">{months.length}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-semibold text-slate-700">Report Date:</span>
                    <span className="text-slate-900">{fmtDate(new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Data Table - Tally Style */}
            <div className="rounded border border-slate-300 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-400 bg-slate-100">
                      <th className="border-r border-slate-300 px-3 py-2 text-left font-bold text-slate-800">
                        Sl No.
                      </th>
                      <th className="border-r border-slate-300 px-3 py-2 text-left font-bold text-slate-800">
                        Month
                      </th>
                      <th colSpan={5} className="border-r border-slate-300 px-3 py-2 text-center font-bold text-slate-800">
                        Bank Transactions
                      </th>
                      <th colSpan={5} className="border-r border-slate-300 px-3 py-2 text-center font-bold text-slate-800">
                        Journal Entries
                      </th>
                      <th className="px-3 py-2 text-center font-bold text-slate-800">Match %</th>
                    </tr>
                    <tr className="border-b border-slate-300 bg-slate-50 text-xs">
                      <th className="border-r border-slate-300 px-3 py-1.5"></th>
                      <th className="border-r border-slate-300 px-3 py-1.5"></th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-slate-700">Count</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-slate-700">Total</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-emerald-700">Matched</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-amber-700">Partial</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-rose-700">Unmatched</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-slate-700">Count</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-slate-700">Total</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-emerald-700">Matched</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-amber-700">Partial</th>
                      <th className="border-r border-slate-300 px-3 py-1.5 text-right font-semibold text-rose-700">Unmatched</th>
                      <th className="px-3 py-1.5 text-center font-semibold text-slate-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.length > 0 ? (
                      months.map((month, index) => {
                        const totalTransactions = month.bankTransactions.count + month.journalEntries.count;
                        const matchedCount = month.bankTransactions.matched.count + month.journalEntries.matched.count;
                        const matchRate = totalTransactions > 0 ? ((matchedCount / totalTransactions) * 100) : 0;
                        const isEven = index % 2 === 0;

                        return (
                          <tr
                            key={month.month}
                            onClick={() => handleMonthClick(month)}
                            className={`border-b border-slate-200 hover:bg-yellow-50 cursor-pointer transition ${
                              isEven ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <td className="border-r border-slate-200 px-3 py-2 text-slate-700">{index + 1}</td>
                            <td className="border-r border-slate-200 px-3 py-2 font-semibold text-slate-900">
                              {fmtMonthYear(month.month)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-700">
                              {month.bankTransactions.count}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right font-semibold text-slate-900">
                              {fmtCurrency(month.bankTransactions.totalAmount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-emerald-700">
                              {fmtCurrency(month.bankTransactions.matched.amount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-amber-700">
                              {fmtCurrency(month.bankTransactions.partial.amount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-rose-700">
                              {fmtCurrency(month.bankTransactions.unmatched.amount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-slate-700">
                              {month.journalEntries.count}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right font-semibold text-slate-900">
                              {fmtCurrency(month.journalEntries.totalAmount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-emerald-700">
                              {fmtCurrency(month.journalEntries.matched.amount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-amber-700">
                              {fmtCurrency(month.journalEntries.partial.amount)}
                            </td>
                            <td className="border-r border-slate-200 px-3 py-2 text-right text-rose-700">
                              {fmtCurrency(month.journalEntries.unmatched.amount)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-blue-700">
                              {matchRate.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
                          No data available for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {months.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-400 bg-yellow-50 font-bold">
                        <td className="border-r border-slate-300 px-3 py-2"></td>
                        <td className="border-r border-slate-300 px-3 py-2 text-slate-900">Total</td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-slate-900">
                          {summary.bankTransactions?.count || 0}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-slate-900">
                          {fmtCurrency(summary.bankTransactions?.totalAmount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-emerald-700">
                          {fmtCurrency(summary.bankTransactions?.matched?.amount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-amber-700">
                          {fmtCurrency(summary.bankTransactions?.partial?.amount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-rose-700">
                          {fmtCurrency(summary.bankTransactions?.unmatched?.amount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-slate-900">
                          {summary.journalEntries?.count || 0}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-slate-900">
                          {fmtCurrency(summary.journalEntries?.totalAmount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-emerald-700">
                          {fmtCurrency(summary.journalEntries?.matched?.amount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-amber-700">
                          {fmtCurrency(summary.journalEntries?.partial?.amount || 0)}
                        </td>
                        <td className="border-r border-slate-300 px-3 py-2 text-right text-rose-700">
                          {fmtCurrency(summary.journalEntries?.unmatched?.amount || 0)}
                        </td>
                        <td className="px-3 py-2 text-center text-blue-700">
                          {((((summary.bankTransactions?.matched?.count || 0) +
                            (summary.journalEntries?.matched?.count || 0)) /
                            Math.max(
                              1,
                              (summary.bankTransactions?.count || 0) + (summary.journalEntries?.count || 0)
                            )) *
                            100).toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Summary Section - Tally Style */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded border border-slate-300 bg-white">
                <div className="border-b border-slate-300 bg-slate-100 px-3 py-2">
                  <h3 className="text-sm font-bold text-slate-900">Bank Transactions Summary</h3>
                </div>
                <div className="p-3">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Total Transactions:</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">
                          {summary.bankTransactions?.count || 0}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Total Amount:</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">
                          {fmtCurrency(summary.bankTransactions?.totalAmount || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-emerald-50">
                        <td className="py-1.5 font-semibold text-emerald-700">Matched:</td>
                        <td className="py-1.5 text-right font-bold text-emerald-700">
                          {summary.bankTransactions?.matched?.count || 0} ({fmtCurrency(summary.bankTransactions?.matched?.amount || 0)})
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-amber-50">
                        <td className="py-1.5 font-semibold text-amber-700">Partial:</td>
                        <td className="py-1.5 text-right font-bold text-amber-700">
                          {summary.bankTransactions?.partial?.count || 0} ({fmtCurrency(summary.bankTransactions?.partial?.amount || 0)})
                        </td>
                      </tr>
                      <tr className="bg-rose-50">
                        <td className="py-1.5 font-semibold text-rose-700">Unmatched:</td>
                        <td className="py-1.5 text-right font-bold text-rose-700">
                          {summary.bankTransactions?.unmatched?.count || 0} ({fmtCurrency(summary.bankTransactions?.unmatched?.amount || 0)})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded border border-slate-300 bg-white">
                <div className="border-b border-slate-300 bg-slate-100 px-3 py-2">
                  <h3 className="text-sm font-bold text-slate-900">Journal Entries Summary</h3>
                </div>
                <div className="p-3">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Total Entries:</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">
                          {summary.journalEntries?.count || 0}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Total Amount:</td>
                        <td className="py-1.5 text-right font-bold text-slate-900">
                          {fmtCurrency(summary.journalEntries?.totalAmount || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-emerald-50">
                        <td className="py-1.5 font-semibold text-emerald-700">Matched:</td>
                        <td className="py-1.5 text-right font-bold text-emerald-700">
                          {summary.journalEntries?.matched?.count || 0} ({fmtCurrency(summary.journalEntries?.matched?.amount || 0)})
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-amber-50">
                        <td className="py-1.5 font-semibold text-amber-700">Partial:</td>
                        <td className="py-1.5 text-right font-bold text-amber-700">
                          {summary.journalEntries?.partial?.count || 0} ({fmtCurrency(summary.journalEntries?.partial?.amount || 0)})
                        </td>
                      </tr>
                      <tr className="bg-rose-50">
                        <td className="py-1.5 font-semibold text-rose-700">Unmatched:</td>
                        <td className="py-1.5 text-right font-bold text-rose-700">
                          {summary.journalEntries?.unmatched?.count || 0} ({fmtCurrency(summary.journalEntries?.unmatched?.amount || 0)})
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 rounded border border-slate-300 bg-slate-50 px-4 py-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Generated by: {user?.name || "User"}</span>
                <span>Company: {selectedCompany?.name || "—"}</span>
                <span>Date: {fmtDate(new Date().toISOString())}</span>
              </div>
            </div>

            {/* Transaction Detail Modal */}
            <TransactionDetailModal
              isOpen={showTransactionModal}
              onClose={() => setShowTransactionModal(false)}
              monthData={selectedMonth}
              allDetails={reportData.details}
              monthKey={selectedMonth?.month}
              bankLedgerName={bankLedger.name}
            />
          </>
        )}
      </div>
    </div>
  );
}