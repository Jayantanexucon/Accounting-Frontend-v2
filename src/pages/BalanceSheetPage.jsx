import { useState, useEffect, useMemo } from "react";
import { getAccountBasedOnYearApi, getAccountByPeriodApi } from "../apis/accountApi";
import { formatCurrency } from "../utils/formatUtil";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "../components/LoadingComponent";
import { Download, Calendar, FileSpreadsheet, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
// Add these imports
import { Link } from "react-router-dom";
import LedgerDetailSidebar from "../components/LedgerDetailSidebar";
import { useCallback } from "react";
import { checkAuthorization } from "../utils/checkAuthorization";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReconciliationModal from "../modals/ReconciliationModal";

export default function BalanceSheetPage() {
  // const [accountData, setAccountData] = useState([]);
  // const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper function to get current financial year ending
  const getCurrentFinancialYearEnding = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12

    // Financial year runs from April (4) to March (3)
    // If month is January-March (1-3), financial year ending is current year
    // If month is April-December (4-12), financial year ending is next year
    if (month >= 1 && month <= 3) {
      return year; // FY ending in current year (e.g., Mar 2024 → FY 2023-24)
    } else {
      return year + 1; // FY ending in next year (e.g., Apr 2024 → FY 2024-25)
    }
  };

  // Helper function to get financial year range
  const getFinancialYearRange = (endingYear) => {
    return {
      startYear: endingYear - 1,
      endYear: endingYear,
      label: `FY ${endingYear - 1}-${String(endingYear).slice(2)}`,
    };
  };

  // Period selection states
  const currentFYEnding = getCurrentFinancialYearEnding();
  const [selectedYear, setSelectedYear] = useState(currentFYEnding); // This is the ENDING year of FY
  const [periodType, setPeriodType] = useState("yearly");
  const [selectedQuarter, setSelectedQuarter] = useState("Q4");
  const [selectedMonth, setSelectedMonth] = useState("3"); // Default to March (end of FY)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  // Add these with your existing state declarations
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);

  // Hoist authorization check here — never call hooks conditionally inside JSX
  const canViewBalanceSheet = checkAuthorization("BALANCE SHEET", "VIEW");

  // Generate years for dropdown (current FY and next 4 years)
  const generateYears = () => {
    const currentYear = getCurrentFinancialYearEnding();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  };

  const years = generateYears();

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setTimeout(() => setSelectedAccount(null), 300);
  }, []);
  // Helper function to handle account click
  const handleAccountClick = useCallback(
    (account) => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      if (selectedAccount && selectedAccount._id === account._id) {
        handleCloseSidebar();
      } else {
        // Otherwise, open sidebar with the new account
        setSelectedAccount(account);
        setIsSidebarOpen(true);
      }
    },
    [selectedAccount, handleCloseSidebar]
  );

  // Helper function to close sidebar

  // Quarter options for financial year
  const quarters = [
    { value: "Q1", label: "Q1 (Apr-Jun)" },
    { value: "Q2", label: "Q2 (Jul-Sep)" },
    { value: "Q3", label: "Q3 (Oct-Dec)" },
    { value: "Q4", label: "Q4 (Jan-Mar)" },
  ];

  // Month options - adjust labels for financial year
  const months = [
    { value: "4", label: "April (FY Start)" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March (FY End)" },
  ];

  // Get financial year info for selected year
  const getFYInfo = () => {
    return {
      startYear: selectedYear - 1,
      endYear: selectedYear,
      label: `FY ${selectedYear - 1}-${String(selectedYear).slice(2)}`,
      displayLabel: `Financial Year ${selectedYear - 1}-${selectedYear}`,
    };
  };
  const { data: accountData = [], isLoading: loading } = useQuery({
  queryKey: ["balanceSheet", user?.company?._id, periodType, selectedYear, selectedQuarter, selectedMonth],
  queryFn: async () => {
    const periodData = {
      periodType,
      year: selectedYear,
      ...(periodType === "quarterly" && { quarter: selectedQuarter }),
      ...(periodType === "monthly" && { month: selectedMonth }),
    };
    const res = await getAccountByPeriodApi(user?.company?._id, periodData);
    return res.data?.accounts || [];
  },
  enabled: !!user?.company?._id,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
});


  // useEffect(() => {
  //   const controller = new AbortController();
  //   async function getAccounts() {
  //     try {
  //       setLoading(true);
  //       let res;

  //       if (periodType === "yearly") {
  //         // Use getAccountByPeriodApi for yearly data
  //         const periodData = {
  //           periodType: "yearly",
  //           year: selectedYear, // This is the ending year of FY
  //         };

  //         res = await getAccountByPeriodApi(user?.company?._id, periodData, controller.signal);
  //         setAccountData(res.data?.accounts || []);
  //       } else {
  //         // For quarterly and monthly, use the period API
  //         const periodData = {
  //           periodType,
  //           year: selectedYear, // This is the ending year of FY
  //           ...(periodType === "quarterly" && { quarter: selectedQuarter }),
  //           ...(periodType === "monthly" && { month: selectedMonth }),
  //         };

  //         res = await getAccountByPeriodApi(user?.company?._id, periodData, controller.signal);
  //         setAccountData(res.data?.accounts || []);
  //       }
  //     } catch (error) {
  //       if (error.name !== "CanceledError") {
  //         console.error("Error fetching balance sheet data:", error);
  //         toast.error(error?.response?.data?.message || "Error getting balance sheet data...");
  //       }
  //     } finally {
  //       if (!controller?.signal?.aborted) setLoading(false);
  //     }
  //   }

  //   if (user?.company?._id) {
  //     getAccounts();
  //   }

  //   return () => controller.abort();
  // }, [selectedYear, periodType, selectedQuarter, selectedMonth, user?.company?._id]);

  // Helper function to get financial year label
  const getFinancialYearLabel = () => {
    const fy = getFYInfo();
    if (periodType === "yearly") {
      return fy.label;
    } else if (periodType === "quarterly") {
      const quarterLabel = quarters.find((q) => q.value === selectedQuarter)?.label;
      return `${quarterLabel}, ${fy.label}`;
    } else {
      const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
      return `${monthLabel}, ${fy.label}`;
    }
  };

  // Helper function to get period display label
  const getPeriodLabel = () => {
    const fy = getFYInfo();

    if (periodType === "yearly") {
      return `As of March 31, ${fy.endYear}`;
    } else if (periodType === "quarterly") {
      const quarterEndDates = {
        Q1: `June 30, ${fy.startYear}`,
        Q2: `September 30, ${fy.startYear}`,
        Q3: `December 31, ${fy.startYear}`,
        Q4: `March 31, ${fy.endYear}`,
      };
      return `As of ${quarterEndDates[selectedQuarter]}`;
    } else {
      const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
      const monthNum = parseInt(selectedMonth);
      // Determine which year the month belongs to in the financial year
      const yearForMonth = monthNum >= 4 ? fy.startYear : fy.endYear;
      return `As of ${monthLabel.split(" (")[0]} ${yearForMonth}`;
    }
  };
  // Function to get academic year date range for filtering
  const getAcademicYearDateRange = useCallback(() => {
    const fy = getFYInfo();

    // For financial year: April 1 of startYear to March 31 of endYear
    const fromDate = new Date(fy.startYear, 3, 1); // April 1 (month is 0-based, so 3 = April)
    const toDate = new Date(fy.endYear, 2, 31); // March 31 (month is 0-based, so 2 = March)

    return {
      from: fromDate,
      to: toDate,
    };
  }, [selectedYear]);

  // Create advanced filters for academic year
  const academicYearFilters = useMemo(() => {
    const dateRange = getAcademicYearDateRange();

    return {
      dateRange: {
        from: dateRange.from.toISOString().split("T")[0], // YYYY-MM-DD format
        to: dateRange.to.toISOString().split("T")[0],
      },
      amountRange: { min: "", max: "" },
      amountType: "both",
      accountGroups: [],
      journalIds: [],
      partyName: "",
    };
  }, [getAcademicYearDateRange]);

  // Categorize balance sheet accounts using groupNature and subType
  const categorizeAccounts = useMemo(() => {
    let currentAssets = [];
    let nonCurrentAssets = [];
    let currentLiabilities = [];
    let nonCurrentLiabilities = [];
    let equity = [];

    let totalCurrentAssets = 0;
    let totalNonCurrentAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalNonCurrentLiabilities = 0;
    let totalEquity = 0;

    // Filter only balance sheet accounts (Asset, Liability, Equity)
    accountData
      .filter((account) => ["Asset", "Liability", "Equity"].includes(account.groupNature))
      .forEach((account) => {
        // Get the amount from closingBalance (absolute value)
        const amount = account.closingBalance || 0;

        // Skip zero balances
        if (amount < 0.01) return;

        const accountInfo = {
          id: account._id,
          name: account.name,
          code: account.code,
          groupNature: account.groupNature,
          subType: account.subType,
          amount: amount,
          closingType: account.closingType,
          periodDebit: account.periodDebit || 0,
          periodCredit: account.periodCredit || 0,
          openingBalance: account.openingBalance || 0,
          openingType: account.openingType || "debit",
          fullAccount: account,
        };

        // Categorize based on groupNature and subType
        if (account.groupNature === "Asset") {
          if (account.subType === "current") {
            currentAssets.push(accountInfo);
            totalCurrentAssets += amount;
          } else {
            // Default to non-current if not specified as current
            nonCurrentAssets.push(accountInfo);
            totalNonCurrentAssets += amount;
          }
        } else if (account.groupNature === "Liability") {
          if (account.subType === "current") {
            currentLiabilities.push(accountInfo);
            totalCurrentLiabilities += amount;
          } else {
            // Default to non-current if not specified as current
            nonCurrentLiabilities.push(accountInfo);
            totalNonCurrentLiabilities += amount;
          }
        } else if (account.groupNature === "Equity") {
          equity.push(accountInfo);
          totalEquity += amount;
        }
      });

    // Sort by amount descending
    currentAssets.sort((a, b) => b.amount - a.amount);
    nonCurrentAssets.sort((a, b) => b.amount - a.amount);
    currentLiabilities.sort((a, b) => b.amount - a.amount);
    nonCurrentLiabilities.sort((a, b) => b.amount - a.amount);
    equity.sort((a, b) => b.amount - a.amount);

    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const difference = Math.abs(totalAssets - totalLiabilitiesAndEquity);
    const isBalanced = difference < 0.01;

    return {
      currentAssets,
      nonCurrentAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      equity,
      totals: {
        totalCurrentAssets,
        totalNonCurrentAssets,
        totalCurrentLiabilities,
        totalNonCurrentLiabilities,
        totalEquity,
        totalAssets,
        totalLiabilities,
        totalLiabilitiesAndEquity,
        difference,
        isBalanced,
      },
      hasData: accountData.filter((a) => ["Asset", "Liability", "Equity"].includes(a.groupNature)).length > 0,
    };
  }, [accountData]);

  // Handle year change
  const handleYearChange = (e) => {
    const year = parseInt(e.target.value);
    if (years.includes(year)) {
      setSelectedYear(year);
    }
  };

  // Handle period type change
  const handlePeriodTypeChange = (e) => {
    setPeriodType(e.target.value);
    // Reset quarter/month when changing period type
    if (e.target.value !== "quarterly") setSelectedQuarter("Q4");
    if (e.target.value !== "monthly") setSelectedMonth("3"); // Default to March
  };

  // Download as Excel
  const handleDownloadExcel = () => {
    if (!categorizeAccounts.hasData) {
      toast.warning("No data to export");
      return;
    }

    const wb = XLSX.utils.book_new();
    const rows = [];

    rows.push(["BALANCE SHEET STATEMENT"]);
    rows.push([`Company: ${user?.company?.name || ""}`]);
    rows.push([getPeriodLabel()]);
    rows.push([`Financial Year: ${getFYInfo().displayLabel}`]);
    rows.push([]);

    rows.push(["LIABILITIES"]);
    categorizeAccounts.currentLiabilities.forEach((a) => rows.push([a.name, a.amount]));
    categorizeAccounts.nonCurrentLiabilities.forEach((a) => rows.push([a.name, a.amount]));
    rows.push(["Total Liabilities", categorizeAccounts.totals.totalLiabilities]);
    rows.push([]);

    rows.push(["EQUITY"]);
    categorizeAccounts.equity.forEach((e) => rows.push([e.name, e.amount]));
    rows.push(["Total Equity", categorizeAccounts.totals.totalEquity]);
    rows.push([]);

    rows.push(["ASSETS"]);
    categorizeAccounts.currentAssets.forEach((a) => rows.push([a.name, a.amount]));
    categorizeAccounts.nonCurrentAssets.forEach((a) => rows.push([a.name, a.amount]));
    rows.push(["Total Assets", categorizeAccounts.totals.totalAssets]);
    rows.push([]);

    rows.push(["STATUS", categorizeAccounts.totals.isBalanced ? "BALANCED" : "UNBALANCED"]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 35 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");

    XLSX.writeFile(wb, `Balance_Sheet_${getFYInfo().label}.xlsx`);

    toast.success("Balance Sheet exported successfully");
    setShowDownloadMenu(false);
  };

  // Download as CSV
  const handleDownloadCSV = () => {
    if (!categorizeAccounts.hasData) {
      toast.warning("No data to export");
      return;
    }

    const rows = [];

    rows.push(["BALANCE SHEET STATEMENT"]);
    rows.push([`Company: ${user?.company?.name || ""}`]);
    rows.push([getPeriodLabel()]);
    rows.push([`Financial Year`, getFYInfo().displayLabel]);
    rows.push([]);

    rows.push(["LIABILITIES"]);
    categorizeAccounts.currentLiabilities.forEach((a) => rows.push([a.name, a.amount]));
    categorizeAccounts.nonCurrentLiabilities.forEach((a) => rows.push([a.name, a.amount]));
    rows.push(["Total Liabilities", categorizeAccounts.totals.totalLiabilities]);
    rows.push([]);

    rows.push(["EQUITY"]);
    categorizeAccounts.equity.forEach((e) => rows.push([e.name, e.amount]));
    rows.push(["Total Equity", categorizeAccounts.totals.totalEquity]);
    rows.push([]);

    rows.push(["ASSETS"]);
    categorizeAccounts.currentAssets.forEach((a) => rows.push([a.name, a.amount]));
    categorizeAccounts.nonCurrentAssets.forEach((a) => rows.push([a.name, a.amount]));
    rows.push(["Total Assets", categorizeAccounts.totals.totalAssets]);
    rows.push([]);

    rows.push(["STATUS", categorizeAccounts.totals.isBalanced ? "BALANCED" : "UNBALANCED"]);

    const csv = rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Balance_Sheet_${getFYInfo().label}.csv`;
    link.click();

    toast.success("Balance Sheet CSV downloaded");
    setShowDownloadMenu(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <LoadingComponent />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl shadow-md" style={{ background: "linear-gradient(135deg,#312e81,#7c3aed)" }}>
              <Download className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Balance Sheet Statement</h1>
              <p className="text-[11px] text-slate-400 font-medium">Financial position as of selected period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="px-6 py-4 bg-white border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Period:</span>
              <select value={periodType} onChange={handlePeriodTypeChange}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[120px]">
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select value={selectedYear} onChange={handleYearChange}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[140px]">
                {years.map((year) => {
                  const fyLabel = `FY ${year - 1}-${String(year).slice(2)}`;
                  return <option key={year} value={year}>{fyLabel} {year === currentFYEnding && "(Current)"}</option>;
                })}
              </select>
            </div>
            {periodType === "quarterly" && (
              <select value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[140px]">
                {quarters.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            )}
            {periodType === "monthly" && (
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 min-w-[140px]">
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="inline-flex items-center px-4 py-2.5 text-white text-xs font-bold rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
              <Download className="h-3.5 w-3.5 mr-2" />Export<ChevronDown className="h-3.5 w-3.5 ml-2" />
            </button>
            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <button onClick={handleDownloadExcel} className="flex items-center w-full px-4 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-green-600" />Download as Excel
                  </button>
                  <button onClick={handleDownloadCSV} className="flex items-center w-full px-4 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-blue-600" />Download as CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Total Assets */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
            style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}>
            <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
              style={{ background: "radial-gradient(ellipse,#93c5fd,transparent)" }} />
            <div className="absolute -bottom-5 -left-5 w-28 h-20 rounded-full opacity-20 blur-xl"
              style={{ background: "radial-gradient(ellipse,#bfdbfe,transparent)" }} />
            <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Assets</p>
                <p className="text-2xl font-black text-white leading-none">{formatCurrency(categorizeAccounts.totals.totalAssets)}</p>
                <p className="text-blue-200/60 text-[11px] font-medium mt-2">{categorizeAccounts.currentAssets.length + categorizeAccounts.nonCurrentAssets.length} accounts</p>
              </div>
              <div className="px-3 py-1.5 bg-white/20 rounded-xl border border-white/25 text-white font-black text-sm backdrop-blur-sm">A</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>

          {/* Total Liabilities */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
            style={{ background: "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)" }}>
            <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
              style={{ background: "radial-gradient(ellipse,#fde68a,transparent)" }} />
            <div className="absolute -bottom-5 -left-5 w-28 h-20 rounded-full opacity-20 blur-xl"
              style={{ background: "radial-gradient(ellipse,#fef3c7,transparent)" }} />
            <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />
            <div className="absolute top-6 right-6 w-7 h-7 rounded-full border border-white/10" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-amber-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Liabilities</p>
                <p className="text-2xl font-black text-white leading-none">{formatCurrency(categorizeAccounts.totals.totalLiabilities)}</p>
                <p className="text-amber-200/60 text-[11px] font-medium mt-2">{categorizeAccounts.currentLiabilities.length + categorizeAccounts.nonCurrentLiabilities.length} accounts</p>
              </div>
              <div className="px-3 py-1.5 bg-white/20 rounded-xl border border-white/25 text-white font-black text-sm backdrop-blur-sm">L</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>

          {/* Total Equity */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
            style={{ background: "linear-gradient(135deg,#312e81 0%,#7c3aed 55%,#a78bfa 100%)" }}>
            <div className="absolute -top-10 -right-10 w-44 h-32 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
              style={{ background: "radial-gradient(ellipse,#c4b5fd,transparent)" }} />
            <div className="absolute -bottom-8 -left-4 w-32 h-24 rounded-full opacity-20 blur-xl"
              style={{ background: "radial-gradient(ellipse,#ddd6fe,transparent)" }} />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full border-4 border-white/10" />
            <div className="absolute top-0 left-16 w-0.5 h-full bg-white/15 -rotate-12 scale-y-150" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-violet-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Equity</p>
                <p className="text-2xl font-black text-white leading-none">{formatCurrency(categorizeAccounts.totals.totalEquity)}</p>
                <p className="text-violet-200/60 text-[11px] font-medium mt-2">{categorizeAccounts.equity.length} accounts</p>
              </div>
              <div className="px-3 py-1.5 bg-white/20 rounded-xl border border-white/25 text-white font-black text-sm backdrop-blur-sm">E</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>
        </div>
      </div>

      {/* Period Info */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between px-5 py-3 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-700">{getPeriodLabel()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Financial Year: {getFinancialYearLabel()} · Generated {new Date().toLocaleDateString()}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black text-white`}
            style={{ background: categorizeAccounts.totals.isBalanced ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#dc2626,#f87171)" }}>
            {categorizeAccounts.totals.isBalanced ? "✓ BALANCED" : "⚠ UNBALANCED"}
          </span>
        </div>
      </div>

      {checkAuthorization(user, "CHART OF ACCOUNTS", "VIEW") && (

      <div className="flex">
        {/* Left Panel - Balance Sheet Content */}
        <div className={`${isSidebarOpen ? "w-full lg:w-1/2" : "w-full"} transition-all duration-300`}>
          <div className="max-w-7xl mx-auto px-6 pb-8 space-y-6">

            {/* ── ASSETS ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* section header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#eff6ff 0%,#dbeafe 100%)" }}>
                <div className="w-1 h-7 rounded-full" style={{ background: "linear-gradient(180deg,#1e3a8a,#60a5fa)" }} />
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Assets</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{categorizeAccounts.currentAssets.length + categorizeAccounts.nonCurrentAssets.length} accounts</p>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-black text-blue-700">{formatCurrency(categorizeAccounts.totals.totalAssets)}</span>
                </div>
              </div>

              {/* Current Assets */}
              <div className="px-5 py-4">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-blue-300 inline-block" />Current Assets
                </p>
                <div className="space-y-1">
                  {categorizeAccounts.currentAssets.map((item) => (
                    <div key={item.id} onClick={() => handleAccountClick(item.fullAccount)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-blue-50/60 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 group-hover:text-blue-700 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">#{item.code} · {item.closingType}</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-black text-slate-800 tabular-nums shrink-0 ml-4">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {categorizeAccounts.currentAssets.length === 0 && (
                    <p className="text-xs text-slate-300 italic pl-5 py-2">No current assets found</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-100 px-3">
                  <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider">Total Current Assets</span>
                  <span className="text-[13px] font-black text-blue-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalCurrentAssets)}</span>
                </div>
              </div>

              {/* Non-Current Assets */}
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-indigo-300 inline-block" />Non-Current Assets
                </p>
                <div className="space-y-1">
                  {categorizeAccounts.nonCurrentAssets.map((item) => (
                    <div key={item.id} onClick={() => handleAccountClick(item.fullAccount)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 group-hover:text-indigo-700 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">#{item.code} · {item.closingType}</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-black text-slate-800 tabular-nums shrink-0 ml-4">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {categorizeAccounts.nonCurrentAssets.length === 0 && (
                    <p className="text-xs text-slate-300 italic pl-5 py-2">No non-current assets found</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-indigo-100 px-3">
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">Total Non-Current Assets</span>
                  <span className="text-[13px] font-black text-indigo-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalNonCurrentAssets)}</span>
                </div>
              </div>

              {/* Total Assets footer */}
              <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between"
                style={{ background: "linear-gradient(90deg,#eff6ff 0%,#dbeafe 100%)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                    <span className="text-[10px] font-black text-white">A</span>
                  </div>
                  <span className="text-xs font-black text-blue-900 uppercase tracking-widest">Total Assets</span>
                </div>
                <span className="text-lg font-black text-blue-900 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalAssets)}</span>
              </div>
            </div>

            {/* ── LIABILITIES ──────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#fffbeb 0%,#fef3c7 100%)" }}>
                <div className="w-1 h-7 rounded-full" style={{ background: "linear-gradient(180deg,#92400e,#fbbf24)" }} />
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Liabilities</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{categorizeAccounts.currentLiabilities.length + categorizeAccounts.nonCurrentLiabilities.length} accounts</p>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-black text-amber-700">{formatCurrency(categorizeAccounts.totals.totalLiabilities)}</span>
                </div>
              </div>

              {/* Current Liabilities */}
              <div className="px-5 py-4">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-amber-300 inline-block" />Current Liabilities
                </p>
                <div className="space-y-1">
                  {categorizeAccounts.currentLiabilities.map((item) => (
                    <div key={item.id} onClick={() => handleAccountClick(item.fullAccount)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-amber-50/60 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 group-hover:text-amber-700 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">#{item.code} · {item.closingType}</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-black text-slate-800 tabular-nums shrink-0 ml-4">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {categorizeAccounts.currentLiabilities.length === 0 && (
                    <p className="text-xs text-slate-300 italic pl-5 py-2">No current liabilities found</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-amber-100 px-3">
                  <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider">Total Current Liabilities</span>
                  <span className="text-[13px] font-black text-amber-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalCurrentLiabilities)}</span>
                </div>
              </div>

              {/* Non-Current Liabilities */}
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-orange-300 inline-block" />Non-Current Liabilities
                </p>
                <div className="space-y-1">
                  {categorizeAccounts.nonCurrentLiabilities.map((item) => (
                    <div key={item.id} onClick={() => handleAccountClick(item.fullAccount)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-orange-50/60 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 group-hover:text-orange-700 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">#{item.code} · {item.closingType}</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-black text-slate-800 tabular-nums shrink-0 ml-4">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {categorizeAccounts.nonCurrentLiabilities.length === 0 && (
                    <p className="text-xs text-slate-300 italic pl-5 py-2">No non-current liabilities found</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-orange-100 px-3">
                  <span className="text-[11px] font-black text-orange-700 uppercase tracking-wider">Total Non-Current Liabilities</span>
                  <span className="text-[13px] font-black text-orange-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalNonCurrentLiabilities)}</span>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between"
                style={{ background: "linear-gradient(90deg,#fffbeb 0%,#fef3c7 100%)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#92400e,#d97706)" }}>
                    <span className="text-[10px] font-black text-white">L</span>
                  </div>
                  <span className="text-xs font-black text-amber-900 uppercase tracking-widest">Total Liabilities</span>
                </div>
                <span className="text-lg font-black text-amber-900 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalLiabilities)}</span>
              </div>
            </div>

            {/* ── EQUITY ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f5f3ff 0%,#ede9fe 100%)" }}>
                <div className="w-1 h-7 rounded-full" style={{ background: "linear-gradient(180deg,#312e81,#a78bfa)" }} />
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Shareholders' Equity</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{categorizeAccounts.equity.length} accounts</p>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-black text-violet-700">{formatCurrency(categorizeAccounts.totals.totalEquity)}</span>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-4 h-px bg-violet-300 inline-block" />Equity Accounts
                </p>
                <div className="space-y-1">
                  {categorizeAccounts.equity.map((item) => (
                    <div key={item.id} onClick={() => handleAccountClick(item.fullAccount)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-violet-50/60 transition-colors group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-slate-700 group-hover:text-violet-700 truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">#{item.code} · {item.closingType}</p>
                        </div>
                      </div>
                      <span className="text-[12px] font-black text-slate-800 tabular-nums shrink-0 ml-4">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  {categorizeAccounts.equity.length === 0 && (
                    <p className="text-xs text-slate-300 italic pl-5 py-2">No equity accounts found</p>
                  )}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-violet-100 px-3">
                  <span className="text-[11px] font-black text-violet-700 uppercase tracking-wider">Total Shareholders' Equity</span>
                  <span className="text-[13px] font-black text-violet-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalEquity)}</span>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between"
                style={{ background: "linear-gradient(90deg,#f5f3ff 0%,#ede9fe 100%)" }}>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#312e81,#7c3aed)" }}>
                    <span className="text-[10px] font-black text-white">E</span>
                  </div>
                  <span className="text-xs font-black text-violet-900 uppercase tracking-widest">Total Liabilities + Equity</span>
                </div>
                <span className="text-lg font-black text-violet-900 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>

            {/* ── BALANCE CHECK ─────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f8fafc 0%,#f1f5f9 100%)" }}>
                <div className="w-1 h-7 rounded-full" style={{ background: categorizeAccounts.totals.isBalanced ? "linear-gradient(180deg,#059669,#34d399)" : "linear-gradient(180deg,#dc2626,#f87171)" }} />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Balance Check</h3>
                <div className="ml-auto">
                  <span className="px-3 py-1.5 rounded-xl text-[10px] font-black text-white"
                    style={{ background: categorizeAccounts.totals.isBalanced ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#dc2626,#f87171)" }}>
                    {categorizeAccounts.totals.isBalanced ? "✓ BALANCED" : "⚠ UNBALANCED"}
                  </span>
                </div>
              </div>
              <div className="px-5 py-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Total Assets</p>
                      <p className="text-xl font-black text-blue-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalAssets)}</p>
                    </div>
                    <div className="text-2xl font-black text-slate-300">=</div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-1">Liabilities + Equity</p>
                      <p className="text-xl font-black text-violet-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.totalLiabilitiesAndEquity)}</p>
                    </div>
                  </div>
                  {!categorizeAccounts.totals.isBalanced && (
                    <div className="px-4 py-2 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-wider">Difference</p>
                      <p className="text-sm font-black text-red-700 tabular-nums">{formatCurrency(categorizeAccounts.totals.difference)}</p>
                    </div>
                  )}
                </div>

                {/* Accounting equation banner */}
                <div className="mt-5 rounded-xl px-5 py-3 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg,#eff6ff,#f5f3ff)" }}>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Assets = Liabilities + Equity</span>
                  <span className="text-[11px] font-bold text-slate-500">{getFYInfo().displayLabel}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
        <LedgerDetailSidebar
          account={selectedAccount}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          onUpdate={() => {
            // Optional: Refresh balance sheet data if ledger is updated
          }}
          advancedFilters={academicYearFilters}
        />
        <ReconciliationModal
          isOpen={isReconciliationModalOpen}
          onClose={() => setIsReconciliationModalOpen(false)}
          companyId={user?.company?._id}
          onReconciled={() => {
            queryClient.invalidateQueries({ queryKey: ["balanceSheet"] });
          }}
        />
      </div>

      )}
    </div>
  );
}