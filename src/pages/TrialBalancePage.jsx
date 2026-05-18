import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { getAccountByPeriodApi } from "../apis/accountApi";
import LoadingComponent from "../components/LoadingComponent";
import EmptyComponent from "../components/EmptyComponent";
import { formatCurrency } from "../utils/formatUtil";
import { Scale, TrendingUp, CheckCircle, AlertCircle, Calendar, Download, FileSpreadsheet, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import LedgerDetailSidebar from "../components/LedgerDetailSidebar";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLedgerSidebarFilters } from "../utils/scheduleReportUtil";

const formatLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function TrialBalancePage() {
  // const [accountData, setAccountData] = useState([]);
  // const [loading, setLoading] = useState(false);
  const { user, hasPermission } = useAuth();
  const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "superAdmin";
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const company=localStorage.getItem("selectedCompany") ? JSON.parse(localStorage.getItem("selectedCompany")) : null;
  const canViewReport = hasPermission("TRIAL BALANCE", "VIEW");

  // Helper function to close sidebar
  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setTimeout(() => setSelectedAccount(null), 300);
  }, []);
  // Helper function to handle account click
  const handleAccountClick = useCallback(
    (account) => {
      if (!account?._id) return;
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

  // Period selection states
  const currentFYEnding = getCurrentFinancialYearEnding();
  const [selectedYear, setSelectedYear] = useState(currentFYEnding); // This is the ENDING year of FY
  const [periodType, setPeriodType] = useState("yearly"); // 'yearly', 'quarterly', 'monthly'
  const [selectedQuarter, setSelectedQuarter] = useState("Q4");
  const [selectedMonth, setSelectedMonth] = useState("3"); // Default to March (end of FY)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Generate years for dropdown (current FY and next 4 years)
  const generateYears = () => {
    const currentYear = getCurrentFinancialYearEnding();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  };

  const years = generateYears();

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

  const fyInfo = useMemo(() => ({
    startYear: selectedYear - 1,
    endYear: selectedYear,
    label: `FY ${selectedYear - 1}-${String(selectedYear).slice(2)}`,
    displayLabel: `Financial Year ${selectedYear - 1}-${selectedYear}`,
  }), [selectedYear]);

  // Helper function to get financial year label
  const getFinancialYearLabel = () => {
    if (periodType === "yearly") {
      return fyInfo.label;
    } else if (periodType === "quarterly") {
      const quarterLabel = quarters.find((q) => q.value === selectedQuarter)?.label;
      return `${quarterLabel}, ${fyInfo.label}`;
    } else {
      const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
      return `${monthLabel}, ${fyInfo.label}`;
    }
  };

  // Helper function to get period display label
  const getPeriodLabel = () => {
    if (periodType === "yearly") {
      return `As of March 31, ${fyInfo.endYear}`;
    } else if (periodType === "quarterly") {
      const quarterEndDates = {
        Q1: `June 30, ${fyInfo.startYear}`,
        Q2: `September 30, ${fyInfo.startYear}`,
        Q3: `December 31, ${fyInfo.startYear}`,
        Q4: `March 31, ${fyInfo.endYear}`,
      };
      return `As of ${quarterEndDates[selectedQuarter]}`;
    } else {
      const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
      const monthNum = parseInt(selectedMonth);
      // Determine which year the month belongs to in the financial year
      const yearForMonth = monthNum >= 4 ? fyInfo.startYear : fyInfo.endYear;
      return `As of ${monthLabel.split(" (")[0]} ${yearForMonth}`;
    }
  };
  const academicYearFilters = useMemo(
    () => getLedgerSidebarFilters(selectedYear, periodType, selectedQuarter, selectedMonth),
    [selectedYear, periodType, selectedQuarter, selectedMonth]
  );

  // Fetch all accounts for selected period
  // useEffect(() => {
  //   const controller = new AbortController();
  //   async function getAccounts() {
  //     try {
  //       setLoading(true);

  //       // Prepare period data based on selection
  //       const periodData = {
  //         periodType,
  //         year: selectedYear, // This is the ending year of FY
  //         ...(periodType === "quarterly" && { quarter: selectedQuarter }),
  //         ...(periodType === "monthly" && { month: selectedMonth }),
  //       };


  //       const res = await getAccountByPeriodApi(company?._id, periodData, controller.signal);
  //       setAccountData(res.data?.accounts || []);
  //     } catch (error) {
  //       if (error.name !== "CanceledError") {
  //         console.error(error);
  //         toast.error(error?.response?.data?.message);
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

  const { data: accountData = [], isLoading: loading } = useQuery({
  queryKey: ["trialBalance", company?._id, periodType, selectedYear, selectedQuarter, selectedMonth],
  queryFn: async () => {
    const periodData = {
      periodType,
      year: selectedYear,
      ...(periodType === "quarterly" && { quarter: selectedQuarter }),
      ...(periodType === "monthly" && { month: selectedMonth }),
    };
    const res = await getAccountByPeriodApi(company?._id, periodData);
    return res.data?.accounts || [];
  },
  enabled: !!user?.company?._id,
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
});

  // Helper function to determine if account has debit normal balance
  const isDebitNormalBalance = (groupName, accountName = "") => {
    if (!groupName) return true;

    const groupLower = groupName.toLowerCase();
    const accountLower = (accountName || "").toLowerCase();

    // CREDIT NORMAL BALANCE (show in CREDIT column)
    const creditGroups = [
      "liability",
      "liabilities",
      "current liability",
      "current liabilities",
      "long term liability",
      "long term liabilities",
      "equity",
      "capital",
      "revenue",
      "income",
      "sales",
      "creditor",
      "creditors",
      "payable",
      "payables",
      "sundry creditor",
      "loan payable",
      "provisions",
    ];

    const creditAccountNames = ["capital", "sales", "revenue", "income"];

    // Check if it's a credit group or credit account name
    const isCreditGroup = creditGroups.some((creditGroup) => groupLower.includes(creditGroup));

    const isCreditAccountName = creditAccountNames.some((name) => accountLower.includes(name));

    if (isCreditGroup || isCreditAccountName) {
      return false;
    }

    // DEBIT NORMAL BALANCE (show in DEBIT column) - default
    return true;
  };

  // Calculate trial balance from account data (using closing balance from API)
  const trialBalance = useMemo(() => {
    if (!accountData.length) return [];

    return accountData.map((acc) => {
      // Use the account data from getAccountByPeriodApi which already has closing balance for the period
      const closingBalance = acc.closingBalance || 0;
      const closingType = acc.closingType || "debit";

      const isDebitAccount = isDebitNormalBalance(acc.groupNature, acc.name);

      let debitAmount = 0;
      let creditAmount = 0;

      // For trial balance: always show debit accounts with debit balance in debit column,
      // credit accounts with credit balance in credit column
      if (isDebitAccount) {
        // Debit account: if closingType is debit, show in debit column
        if (closingType === "debit") {
          debitAmount = closingBalance;
          creditAmount = 0;
        } else {
          // Debit account with credit balance (unusual) - show in credit column
          debitAmount = 0;
          creditAmount = closingBalance;
        }
      } else {
        // Credit account: if closingType is credit, show in credit column
        if (closingType === "credit") {
          debitAmount = 0;
          creditAmount = closingBalance;
        } else {
          // Credit account with debit balance (unusual) - show in debit column
          debitAmount = closingBalance;
          creditAmount = 0;
        }
      }

      return {
        accountName: acc.name,
        group: acc.groupNature,
        accountCode: acc.code,
        debit: debitAmount,
        credit: creditAmount,
        isDebitAccount: isDebitAccount,
        closingBalance: closingBalance,
        closingType: closingType,
        openingBalance: acc.openingBalance || 0,
        openingType: acc.openingType || "debit",
        fullAccount: acc,
      };
    });
  }, [accountData]);

  const totals = useMemo(() => {
    return trialBalance.reduce(
      (acc, curr) => ({
        debit: acc.debit + (curr.debit || 0),
        credit: acc.credit + (curr.credit || 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [trialBalance]);

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

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
    if (!trialBalance.length) {
      toast.warning("No data to export");
      return;
    }

    const wb = XLSX.utils.book_new();
    const rows = [];

    rows.push(["TRIAL BALANCE STATEMENT"]);
    rows.push([`Company: ${user?.company?.name || ""}`]);
    rows.push([getPeriodLabel()]);
    rows.push([`Financial Year: ${fyInfo.displayLabel}`]);
    rows.push([`Generated On: ${new Date().toLocaleDateString()}`]);
    rows.push([]);

    rows.push(["Account Code", "Account Name", "Group", "Debit", "Credit"]);

    trialBalance.forEach((acc) => {
      rows.push([acc.accountCode || "", acc.accountName, acc.group, acc.debit || "", acc.credit || ""]);
    });

    rows.push([]);
    rows.push(["TOTAL", "", "", totals.debit, totals.credit]);
    rows.push([]);
    rows.push(["STATUS", isBalanced ? "BALANCED" : "UNBALANCED"]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");

    XLSX.writeFile(wb, `Trial_Balance_${fyInfo.label}.xlsx`);

    toast.success("Trial Balance exported successfully");
    setShowDownloadMenu(false);
  };

  // Download as CSV
  const handleDownloadCSV = () => {
    if (!trialBalance.length) {
      toast.warning("No data to export");
      return;
    }

    const rows = [];

    rows.push(["TRIAL BALANCE STATEMENT"]);
    rows.push([`Company: ${user?.company?.name || ""}`]);
    rows.push([getPeriodLabel()]);
    rows.push([`Financial Year`, fyInfo.displayLabel]);
    rows.push([]);

    rows.push(["Account Code", "Account Name", "Group", "Debit", "Credit"]);

    trialBalance.forEach((acc) => {
      rows.push([acc.accountCode || "", acc.accountName, acc.group, acc.debit || "", acc.credit || ""]);
    });

    rows.push([]);
    rows.push(["TOTAL", "", "", totals.debit, totals.credit]);
    rows.push(["STATUS", isBalanced ? "BALANCED" : "UNBALANCED"]);

    const csv = rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Trial_Balance_${fyInfo.label}.csv`;
    link.click();

    toast.success("Trial Balance CSV downloaded");
    setShowDownloadMenu(false);
  };

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shadow-md" style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Trial Balance Statement</h1>
                <p className="text-[11px] text-slate-400 font-medium">{getPeriodLabel()} · {trialBalance.length} accounts</p>
              </div>
            </div>
            {isAdminOrSuperAdmin && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                {formatCurrency(totals.debit)} Dr / {formatCurrency(totals.credit)} Cr
              </div>
            )}
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
              style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
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

      {/* Stats Cards */}
      {isAdminOrSuperAdmin && (
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Total Debit */}
            <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
              style={{ background: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#fca5a5 100%)" }}>
              <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
                style={{ background: "radial-gradient(ellipse,#fca5a5,transparent)" }} />
              <div className="absolute -bottom-5 -left-5 w-28 h-20 rounded-full opacity-20 blur-xl"
                style={{ background: "radial-gradient(ellipse,#fecaca,transparent)" }} />
              <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-red-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Debit</p>
                  <p className="text-2xl font-black text-white leading-none">{formatCurrency(totals.debit)}</p>
                  <p className="text-red-200/60 text-[11px] font-medium mt-2">{trialBalance.filter(a => a.debit > 0).length} accounts</p>
                </div>
                <div className="px-3 py-1.5 bg-white/20 rounded-xl border border-white/25 text-white font-black text-sm backdrop-blur-sm">Dr</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            {/* Total Credit */}
            <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
              style={{ background: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)" }}>
              <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
                style={{ background: "radial-gradient(ellipse,#6ee7b7,transparent)" }} />
              <div className="absolute -bottom-5 -left-5 w-28 h-20 rounded-full opacity-20 blur-xl"
                style={{ background: "radial-gradient(ellipse,#a7f3d0,transparent)" }} />
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full border-4 border-white/10" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Credit</p>
                  <p className="text-2xl font-black text-white leading-none">{formatCurrency(totals.credit)}</p>
                  <p className="text-emerald-200/60 text-[11px] font-medium mt-2">{trialBalance.filter(a => a.credit > 0).length} accounts</p>
                </div>
                <div className="px-3 py-1.5 bg-white/20 rounded-xl border border-white/25 text-white font-black text-sm backdrop-blur-sm">Cr</div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            {/* Balance Status */}
            <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
              style={{ background: isBalanced ? "linear-gradient(135deg,#064e3b 0%,#16a34a 55%,#4ade80 100%)" : "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)" }}>
              <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
                style={{ background: `radial-gradient(ellipse,${isBalanced ? "#86efac" : "#fde68a"},transparent)` }} />
              <div className="absolute top-3 right-3 w-12 h-12 rounded-full border-2 border-white/15" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isBalanced ? "text-green-200" : "text-amber-200"}`}>Balance Status</p>
                  <p className="text-xl font-black text-white leading-none">{isBalanced ? "Balanced ✓" : `Diff: ${formatCurrency(Math.abs(totals.debit - totals.credit))}`}</p>
                  <p className={`text-[11px] font-medium mt-2 ${isBalanced ? "text-green-200/60" : "text-amber-200/60"}`}>{trialBalance.length} total accounts</p>
                </div>
                <div className={`p-2.5 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm`}>
                  {isBalanced ? <CheckCircle size={20} className="text-white" /> : <AlertCircle size={20} className="text-white" />}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
        </div>
      )}

      {/* Period Info */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between px-5 py-3 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-700">{getPeriodLabel()}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Financial Year: {getFinancialYearLabel()} · Generated {new Date().toLocaleDateString()}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black border ${isBalanced ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {isBalanced ? "✓ BALANCED" : "⚠ REVIEW REQUIRED"}
          </span>
        </div>
      </div>

      {/* Content */}
      {/* Main Content with Flex Layout */}
      <div className="flex">
        {/* Left Panel - Trial Balance Table */}
        <div className={`${isSidebarOpen ? "w-full lg:w-1/2" : "w-full"} transition-all duration-300`}>
          <div className="px-6 pb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {loading && <LoadingComponent message="Loading trial balance..." />}

              {!loading && !canViewReport && (
                <div className="p-12">
                  <EmptyComponent title="Permission Required" subtitle="You do not have permission to view this report" />
                </div>
              )}

              {!loading && canViewReport && trialBalance.length === 0 && (
                <div className="p-12">
                  <EmptyComponent title="No trial balance data" subtitle="Add accounts and journals to generate trial balance" />
                </div>
              )}

              {!loading && canViewReport && trialBalance.length > 0 && (
                <>
                  {/* Table header bar */}
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
                    style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg,#1e3a8a,#60a5fa)" }} />
                      <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Trial Balance</p>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white"
                        style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>{trialBalance.length}</span>
                    </div>
                  </div>
                  {/* Enhanced Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)" }}>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Name</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Group</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Debit (₹)</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Credit (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trialBalance.map((item, index) => {
                          const isUnusual = (item.isDebitAccount && item.closingType === "credit") || (!item.isDebitAccount && item.closingType === "debit");
                          return (
                          <tr key={index} className="group hover:bg-indigo-50/30 transition-colors">
                            {/* Account Name cell */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {/* coloured left dot — blue for Dr, violet for Cr */}
                                <div className={`w-2 h-2 rounded-full shrink-0 ${item.isDebitAccount ? "bg-blue-500" : "bg-violet-500"}`} />
                                <div className="min-w-0">
                                  <div onClick={() => handleAccountClick(item.fullAccount)} className="cursor-pointer">
                                    <p className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">
                                      {item.accountName}
                                      <span className="ml-1.5 text-slate-300 group-hover:text-indigo-400 transition-colors text-xs">→</span>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      #{String(item.accountCode || "").padStart(3, "0")}
                                    </span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${item.isDebitAccount ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-violet-50 text-violet-700 border-violet-100"}`}>
                                      {item.isDebitAccount ? "Debit " : "Credit "}  Normal 
                                    </span>
                                    {isUnusual && (
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                        ⚠ Unusual
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Group cell */}
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${item.isDebitAccount ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-violet-50 text-violet-700 border-violet-100"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.isDebitAccount ? "bg-blue-500" : "bg-violet-500"}`} />
                                {item.group}
                              </span>
                            </td>

                            {/* Debit cell */}
                            <td className="px-5 py-3.5 text-right">
                              {item.debit > 0 ? (
                                <div className="inline-flex flex-col items-end">
                                  <span className="text-[13px] font-black text-red-600 tabular-nums">{formatCurrency(item.debit)}</span>
                                  {!item.isDebitAccount && (
                                    <span className="text-[9px] font-bold text-amber-500 mt-0.5">credit a/c</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-200 text-sm select-none">—</span>
                              )}
                            </td>

                            {/* Credit cell */}
                            <td className="px-5 py-3.5 text-right">
                              {item.credit > 0 ? (
                                <div className="inline-flex flex-col items-end">
                                  <span className="text-[13px] font-black text-emerald-600 tabular-nums">{formatCurrency(item.credit)}</span>
                                  {item.isDebitAccount && (
                                    <span className="text-[9px] font-bold text-amber-500 mt-0.5">debit a/c</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-200 text-sm select-none">—</span>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)" }}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                                <Scale className="h-3.5 w-3.5 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-extrabold text-slate-900">Totals</p>
                                <p className="text-[10px] text-slate-400">{trialBalance.length} Accounts</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-base font-black text-red-600">{formatCurrency(totals.debit)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Total Debit</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-base font-black text-emerald-600">{formatCurrency(totals.credit)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Total Credit</p>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Balance Status */}
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isBalanced ? "bg-emerald-100" : "bg-amber-100"}`}>
                        {isBalanced ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Trial Balance Status</p>
                        <p className="text-[11px] text-slate-400">
                          {isBalanced ? "All accounts are properly balanced" : `Difference of ${formatCurrency(Math.abs(totals.debit - totals.credit))} requires adjustment`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Difference</p>
                        <p className={`text-sm font-black ${isBalanced ? "text-emerald-600" : "text-amber-600"}`}>{formatCurrency(Math.abs(totals.debit - totals.credit))}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black text-white ${isBalanced ? "" : ""}`}
                        style={{ background: isBalanced ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#d97706,#fbbf24)" }}>
                        {isBalanced ? "BALANCED" : "REVIEW REQUIRED"}
                      </span>
                    </div>
                  </div>
                  {/* Period Info footer */}
                  <div className="px-6 py-3 border-t border-slate-100 bg-white">
                    <p className="text-[10px] text-slate-400">
                      <span className="font-bold text-slate-600">Period:</span> {getPeriodLabel()} &nbsp;|&nbsp;
                      <span className="font-bold text-slate-600">FY:</span> {getFinancialYearLabel()} &nbsp;|&nbsp;
                      <span className="font-bold text-slate-600">Report:</span> Trial Balance
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      <LedgerDetailSidebar
        account={selectedAccount}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onUpdate={() => {
          // Optional: Refresh trial balance data if ledger is updated
        }}
        advancedFilters={academicYearFilters}
      />
      </div>
    </div>
  );
}
