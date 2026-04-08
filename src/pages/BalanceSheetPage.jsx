import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import {
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Landmark,
  Scale,
  Wallet,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getScheduleIIIBalanceSheetApi } from "../apis/reportApi";
import { checkAuthorization } from "../utils/checkAuthorization";
import LoadingComponent from "../components/LoadingComponent";
import EmptyComponent from "../components/EmptyComponent";
import LedgerDetailSidebar from "../components/LedgerDetailSidebar";
import ScheduleStatementTable from "../components/ScheduleStatementTable";
import {
  FINANCIAL_YEAR_MONTHS,
  FINANCIAL_YEAR_QUARTERS,
  buildReportExportRows,
  formatStatementAmount,
  getCurrentFinancialYearEnding,
  getFinancialYearInfo,
  getFinancialYearOptions,
  getLedgerSidebarFilters,
  getPeriodDisplayLabel,
  getReportPeriodParams,
} from "../utils/scheduleReportUtil";

const hasMeaningfulBalanceSheetData = (report) =>
  Math.abs(report?.summary?.totalAssets || 0) > 0.009 ||
  Math.abs(report?.summary?.totalEquityLiabilities || 0) > 0.009;

export default function BalanceSheetPage() {
  const { user } = useAuth();
  const currentFYEnding = getCurrentFinancialYearEnding();
  const years = getFinancialYearOptions();

  const [selectedYear, setSelectedYear] = useState(currentFYEnding);
  const [periodType, setPeriodType] = useState("yearly");
  const [selectedQuarter, setSelectedQuarter] = useState("Q4");
  const [selectedMonth, setSelectedMonth] = useState("3");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  const periodParams = useMemo(
    () => getReportPeriodParams(periodType, selectedYear, selectedQuarter, selectedMonth),
    [periodType, selectedYear, selectedQuarter, selectedMonth]
  );

  const { data: reportData, isLoading: loading } = useQuery({
    queryKey: ["schedule3-balance-sheet", user?.company?._id, periodParams],
    queryFn: async () => {
      const res = await getScheduleIIIBalanceSheetApi(user?.company?._id, periodParams);
      return res.data;
    },
    enabled: !!user?.company?._id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const canViewReport = checkAuthorization(user, "CHART OF ACCOUNTS", "VIEW");
  const sidebarFilters = useMemo(
    () => getLedgerSidebarFilters(selectedYear, periodType, selectedQuarter, selectedMonth),
    [selectedYear, periodType, selectedQuarter, selectedMonth]
  );
  const fyInfo = getFinancialYearInfo(selectedYear);
  const periodLabel =
    reportData?.reportPeriodLabel ||
    getPeriodDisplayLabel("balance_sheet", periodType, selectedYear, selectedQuarter, selectedMonth);

  const handleAccountClick = useCallback((account) => {
    if (!account?._id) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSelectedAccount(account);
    setIsSidebarOpen(true);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setTimeout(() => setSelectedAccount(null), 250);
  }, []);

  const handleToggleNote = useCallback((noteCode) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteCode)) next.delete(noteCode);
      else next.add(noteCode);
      return next;
    });
  }, []);

  const handlePeriodTypeChange = (event) => {
    const nextType = event.target.value;
    setPeriodType(nextType);
    if (nextType !== "quarterly") setSelectedQuarter("Q4");
    if (nextType !== "monthly") setSelectedMonth("3");
    setExpandedNotes(new Set());
  };

  const handleDownloadExcel = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();
    const rows = buildReportExportRows(reportData);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 60 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, "Schedule III Balance Sheet");
    XLSX.writeFile(wb, `Schedule_III_Balance_Sheet_${fyInfo.label}_${periodType}.xlsx`);
    toast.success("Balance Sheet exported successfully");
    setShowDownloadMenu(false);
  };

  const handleDownloadCSV = () => {
    if (!reportData) return;
    const rows = buildReportExportRows(reportData);
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Schedule_III_Balance_Sheet_${fyInfo.label}_${periodType}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Balance Sheet CSV downloaded");
    setShowDownloadMenu(false);
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2 shadow-md" style={{ background: "linear-gradient(135deg,#312e81,#7c3aed)" }}>
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Balance Sheet</h1>
              <p className="text-[11px] font-medium text-slate-400">Fixed statutory template with backend note mapping and reclassification rules</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Period:</span>
              <select
                value={periodType}
                onChange={handlePeriodTypeChange}
                className="min-w-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
              >
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number.parseInt(event.target.value, 10))}
                className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {`FY ${year - 1}-${String(year).slice(2)}`} {year === currentFYEnding ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {periodType === "quarterly" && (
              <select
                value={selectedQuarter}
                onChange={(event) => setSelectedQuarter(event.target.value)}
                className="min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
              >
                {FINANCIAL_YEAR_QUARTERS.map((quarter) => (
                  <option key={quarter.value} value={quarter.value}>
                    {quarter.label}
                  </option>
                ))}
              </select>
            )}

            {periodType === "monthly" && (
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
              >
                {FINANCIAL_YEAR_MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu((prev) => !prev)}
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Export
              <ChevronDown className="ml-2 h-3.5 w-3.5" />
            </button>

            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)} />
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="flex w-full items-center px-4 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-green-600" />
                    Download as Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="flex w-full items-center px-4 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-blue-600" />
                    Download as CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl p-5 shadow-xl" style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-200">Assets</p>
            <p className="text-2xl font-black text-white">{formatStatementAmount(reportData?.summary?.totalAssets || 0)}</p>
            <p className="mt-2 text-[11px] font-medium text-blue-200/70">Schedule III asset heads</p>
          </div>
          <div className="rounded-2xl p-5 shadow-xl" style={{ background: "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)" }}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-200">Equity & Liabilities</p>
            <p className="text-2xl font-black text-white">{formatStatementAmount(reportData?.summary?.totalEquityLiabilities || 0)}</p>
            <p className="mt-2 text-[11px] font-medium text-amber-200/70">Includes P&amp;L transfer to reserves</p>
          </div>
          <div className="rounded-2xl p-5 shadow-xl" style={{ background: "linear-gradient(135deg,#312e81 0%,#7c3aed 55%,#a78bfa 100%)" }}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-violet-200">P&amp;L to Reserves</p>
            <p className="text-2xl font-black text-white">{formatStatementAmount(reportData?.summary?.profitTransferredToReserves || 0)}</p>
            <p className="mt-2 text-[11px] font-medium text-violet-200/70">Reporting-level statutory adjustment</p>
          </div>
          <div
            className="rounded-2xl p-5 shadow-xl"
            style={{
              background:
                reportData?.summary?.isBalanced
                  ? "linear-gradient(135deg,#065f46 0%,#059669 55%,#34d399 100%)"
                  : "linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#fca5a5 100%)",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/75">Balance Check</p>
                <p className="text-2xl font-black text-white">{formatStatementAmount(reportData?.summary?.difference || 0)}</p>
                <p className="mt-2 text-[11px] font-medium text-white/70">
                  {reportData?.summary?.isBalanced ? "Assets equal Equity and Liabilities" : "Difference after aggregation"}
                </p>
              </div>
              <Scale size={20} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 px-6">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-700">{periodLabel}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {fyInfo.displayLabel} • Generated {new Date().toLocaleDateString()}
            </p>
          </div>
          <span
            className={`rounded-xl px-3 py-1.5 text-[10px] font-black ${
              reportData?.summary?.isBalanced
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {reportData?.summary?.isBalanced ? "✓ BALANCED" : "⚠ REVIEW DIFFERENCE"}
          </span>
        </div>
      </div>

      <div className="px-4 pb-8 sm:px-6">
        {loading && <LoadingComponent message="Generating Schedule III balance sheet..." />}

        {!loading && !canViewReport && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <EmptyComponent
              title="Access denied"
              subtitle={<div className="text-sm text-slate-600">You do not have permission to view this report.</div>}
            />
          </div>
        )}

        {!loading && canViewReport && !hasMeaningfulBalanceSheetData(reportData) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <EmptyComponent
              title="No balance sheet data found"
              subtitle={
                <div className="text-sm text-slate-600">
                  The fixed Schedule III report did not find any mapped asset, liability, or equity balances for this period.
                </div>
              }
            />
          </div>
        )}

        {!loading && canViewReport && hasMeaningfulBalanceSheetData(reportData) && (
          <div className="flex gap-6">
            <div className={`${isSidebarOpen ? "w-full lg:w-1/2" : "w-full"} transition-all duration-300`}>
              {/* <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Report Engine</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Backend aggregated report</p>
                  <p className="mt-1 text-xs text-slate-500">Static template, mapped ledgers, negative reclassification, and note references.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-violet-600" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Statutory Render</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">Template-driven frontend</p>
                  <p className="mt-1 text-xs text-slate-500">Frontend renders Particulars, Note No, and Amount directly from report JSON.</p>
                </div>
              </div> */}

              {(reportData?.issues?.length > 0 || reportData?.warnings?.length > 0 || !reportData?.summary?.isBalanced) && (
                <div className="mb-5 space-y-3">
                  {!reportData?.summary?.isBalanced && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-black text-red-800">Balance mismatch detected</p>
                      <p className="mt-1 text-xs text-red-700">
                        Assets and Equity/Liabilities differ by {formatStatementAmount(reportData?.summary?.difference || 0)}.
                      </p>
                    </div>
                  )}

                  {reportData?.issues?.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="text-sm font-black text-red-800">Blocking mapping issues</p>
                      <div className="mt-2 space-y-1">
                        {reportData.issues.map((issue, index) => (
                          <p key={`${issue.code}-${index}`} className="text-xs text-red-700">
                            {issue.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* {reportData?.warnings?.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-black text-amber-800">Mapping warnings</p>
                      <div className="mt-2 space-y-1">
                        {reportData.warnings.slice(0, 6).map((warning, index) => (
                          <p key={`${warning.code}-${index}`} className="text-xs text-amber-700">
                            {warning.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  )} */}
                </div>
              )}

              <ScheduleStatementTable
                report={reportData}
                expandedNotes={expandedNotes}
                onToggleNote={handleToggleNote}
                onLedgerClick={handleAccountClick}
                formatAmount={formatStatementAmount}
              />
            </div>

            <LedgerDetailSidebar
              account={selectedAccount}
              isOpen={isSidebarOpen}
              onClose={handleCloseSidebar}
              onUpdate={() => {}}
              advancedFilters={sidebarFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
