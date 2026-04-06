import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { getAccountByPeriodApi } from "../apis/accountApi";
import LoadingComponent from "../components/LoadingComponent";
import EmptyComponent from "../components/EmptyComponent";
import { formatCurrency } from "../utils/formatUtil";
import { Download, Calendar, FileSpreadsheet, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import LedgerDetailSidebar from "../components/LedgerDetailSidebar";
import { useQuery } from "@tanstack/react-query";


export default function ProfitLossStatement() {
  // const [accountData, setAccountData] = useState([]);
  // const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  // Add these with your existing state declarations
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Generate years for dropdown (current FY and next 4 years)
  const generateYears = () => {
    const currentYear = getCurrentFinancialYearEnding();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  };

  const years = generateYears();
  
  // Helper function to close sidebar
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

  // // Fetch accounts for the selected period
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

  //       const res = await getAccountByPeriodApi(user?.company?._id, periodData, controller.signal);
  //       setAccountData(res.data?.accounts || []);
  //     } catch (error) {
  //       if (error.name !== "CanceledError") {
  //         console.error("Error fetching P&L data:", error);
  //         toast.error(error?.response?.data?.message || "Error getting trial balance...");
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
  queryKey: ["profitLoss", user?.company?._id, periodType, selectedYear, selectedQuarter, selectedMonth],
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

  // Get financial year info for selected year
  const getFYInfo = () => {
    return {
      startYear: selectedYear - 1,
      endYear: selectedYear,
      label: `FY ${selectedYear - 1}-${String(selectedYear).slice(2)}`,
      displayLabel: `Financial Year ${selectedYear - 1}-${selectedYear}`,
    };
  };

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
      return `For the financial year ${fy.startYear}-${String(fy.endYear).slice(2)} (Apr 1, ${fy.startYear} - Mar 31, ${fy.endYear})`;
    } else if (periodType === "quarterly") {
      const quarterPeriods = {
        Q1: `April 1 - June 30, ${fy.startYear}`,
        Q2: `July 1 - September 30, ${fy.startYear}`,
        Q3: `October 1 - December 31, ${fy.startYear}`,
        Q4: `January 1 - March 31, ${fy.endYear}`,
      };
      return `For the quarter ${quarterPeriods[selectedQuarter]}`;
    } else {
      const monthLabel = months.find((m) => m.value === selectedMonth)?.label;
      const monthNum = parseInt(selectedMonth);
      // Determine which year the month belongs to in the financial year
      const yearForMonth = monthNum >= 4 ? fy.startYear : fy.endYear;
      return `For the month of ${monthLabel.split(" (")[0]} ${yearForMonth}`;
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
  }, [selectedYear, getFYInfo]);

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

  // Filter and categorize accounts
  const categorizeAccounts = useMemo(() => {
    const incomeAccounts = [];
    const expenseAccounts = [];

    accountData.forEach((account) => {
      // Only include accounts with Income or Expense groupNature
      if (account.groupNature === "Income" || account.groupNature === "Expense") {
        // Calculate net amount based on closing balance
        const amount = Math.abs(account.closingBalance || 0);

        // Skip if amount is zero
        if (amount < 0.01) return;

        const accountInfo = {
          id: account._id,
          name: account.name,
          code: account.code,
          amount: amount,
          closingType: account.closingType,
          groupNature: account.groupNature,
          periodDebit: account.periodDebit || 0,
          periodCredit: account.periodCredit || 0,
          fullAccount: account,
        };

        // Categorize based on groupNature
        if (account.groupNature === "Income") {
          incomeAccounts.push(accountInfo);
        } else if (account.groupNature === "Expense") {
          expenseAccounts.push(accountInfo);
        }
      }
    });

    // Sort by amount (descending)
    incomeAccounts.sort((a, b) => b.amount - a.amount);
    expenseAccounts.sort((a, b) => b.amount - a.amount);

    // Calculate totals
    const totalIncome = incomeAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const totalExpense = expenseAccounts.reduce((sum, acc) => sum + acc.amount, 0);
    const netIncome = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0;

    return {
      incomeAccounts,
      expenseAccounts,
      totalIncome,
      totalExpense,
      netIncome,
      profitMargin,
      isProfitable: netIncome >= 0,
      hasData: incomeAccounts.length > 0 || expenseAccounts.length > 0,
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

    // Header
    rows.push(["PROFIT & LOSS STATEMENT"]);
    rows.push([`Company: ${user?.company?.name || ""}`]);
    rows.push([`Financial Year: ${getFYInfo().displayLabel}`]);
    rows.push([`Period: ${getPeriodLabel()}`]);
    rows.push([`Generated On: ${new Date().toLocaleDateString()}`]);
    rows.push([]);

    // EXPENSES
    rows.push(["EXPENSES (Dr.)"]);
    rows.push(["Account Code", "Account Name", "Amount"]);

    categorizeAccounts.expenseAccounts.forEach((acc) => {
      rows.push([acc.code, acc.name, acc.amount]);
    });

    rows.push(["", "Total Expenses", categorizeAccounts.totalExpense]);
    rows.push([]);

    // INCOME
    rows.push(["INCOME (Cr.)"]);
    rows.push(["Account Code", "Account Name", "Amount"]);

    categorizeAccounts.incomeAccounts.forEach((acc) => {
      rows.push([acc.code, acc.name, acc.amount]);
    });

    rows.push(["", "Total Income", categorizeAccounts.totalIncome]);
    rows.push([]);

    // NET PROFIT / LOSS
    rows.push([categorizeAccounts.isProfitable ? "Net Profit" : "Net Loss", "", Math.abs(categorizeAccounts.netIncome)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 18 }];

    XLSX.utils.book_append_sheet(wb, ws, "P&L Statement");

    XLSX.writeFile(wb, `Profit_Loss_${getFYInfo().label}_${periodType}.xlsx`);

    toast.success("Excel downloaded successfully");
    setShowDownloadMenu(false);
  };

  // Download as CSV
  const handleDownloadCSV = () => {
    if (!categorizeAccounts.hasData) {
      toast.warning("No data to export");
      return;
    }

    const rows = [];
    rows.push(["PROFIT & LOSS STATEMENT"]);
    rows.push([`Company: ${user?.company?.name || ""}`]);
    rows.push([`Financial Year`, getFYInfo().displayLabel]);
    rows.push([`Period`, getPeriodLabel()]);
    rows.push([`Generated On`, new Date().toLocaleDateString()]);
    rows.push([]);

    rows.push(["EXPENSES (Dr.)"]);
    rows.push(["Account Code", "Account Name", "Amount"]);

    categorizeAccounts.expenseAccounts.forEach((acc) => {
      rows.push([acc.code, acc.name, acc.amount]);
    });

    rows.push(["", "Total Expenses", categorizeAccounts.totalExpense]);
    rows.push([]);

    rows.push(["INCOME (Cr.)"]);
    rows.push(["Account Code", "Account Name", "Amount"]);

    categorizeAccounts.incomeAccounts.forEach((acc) => {
      rows.push([acc.code, acc.name, acc.amount]);
    });

    rows.push(["", "Total Income", categorizeAccounts.totalIncome]);
    rows.push([]);

    rows.push([categorizeAccounts.isProfitable ? "Net Profit" : "Net Loss", "", Math.abs(categorizeAccounts.netIncome)]);

    const csv = rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Profit_Loss_${getFYInfo().label}_${periodType}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success("CSV downloaded successfully");
    setShowDownloadMenu(false);
  };

  // Custom Empty Component content
  const emptyComponentSubtitle = (
    <div className="text-sm text-gray-600">
      <p>No income or expense accounts found for the selected period.</p>
      <p className="mt-2">Add accounts with "Income" or "Expense" group to see data here.</p>
    </div>
  );

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl shadow-md" style={{ background: "linear-gradient(135deg,#064e3b,#059669)" }}>
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">Profit &amp; Loss Statement</h1>
              <p className="text-[11px] text-slate-400 font-medium">Financial performance for selected period</p>
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
              style={{ background: "linear-gradient(135deg,#059669,#34d399)", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}>
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

          {/* Total Revenue */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
            style={{ background: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)" }}>
            <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
              style={{ background: "radial-gradient(ellipse,#6ee7b7,transparent)" }} />
            <div className="absolute -bottom-5 -left-5 w-28 h-20 rounded-full opacity-20 blur-xl"
              style={{ background: "radial-gradient(ellipse,#a7f3d0,transparent)" }} />
            <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Revenue</p>
                <p className="text-2xl font-black text-white leading-none">{formatCurrency(categorizeAccounts.totalIncome)}</p>
                <p className="text-emerald-200/60 text-[11px] font-medium mt-2">{categorizeAccounts.incomeAccounts.length} accounts</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <TrendingUp size={20} className="text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>

          {/* Total Expenses */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
            style={{ background: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#fca5a5 100%)" }}>
            <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
              style={{ background: "radial-gradient(ellipse,#fca5a5,transparent)" }} />
            <div className="absolute -bottom-5 -left-5 w-28 h-20 rounded-full opacity-20 blur-xl"
              style={{ background: "radial-gradient(ellipse,#fecaca,transparent)" }} />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full border-4 border-white/10" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-red-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Expenses</p>
                <p className="text-2xl font-black text-white leading-none">{formatCurrency(categorizeAccounts.totalExpense)}</p>
                <p className="text-red-200/60 text-[11px] font-medium mt-2">{categorizeAccounts.expenseAccounts.length} accounts</p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <TrendingDown size={20} className="text-white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </div>

          {/* Net Profit / Loss */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
            style={{ background: categorizeAccounts.isProfitable
              ? "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)"
              : "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)" }}>
            <div className="absolute -top-8 -right-8 w-40 h-28 rounded-full opacity-25 blur-2xl group-hover:scale-110 transition-transform duration-700"
              style={{ background: `radial-gradient(ellipse,${categorizeAccounts.isProfitable ? "#93c5fd" : "#fde68a"},transparent)` }} />
            <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />
            <div className="absolute top-6 right-6 w-7 h-7 rounded-full border border-white/10" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${categorizeAccounts.isProfitable ? "text-blue-200" : "text-amber-200"}`}>
                  Net {categorizeAccounts.isProfitable ? "Profit" : "Loss"}
                </p>
                <p className="text-2xl font-black text-white leading-none">{formatCurrency(Math.abs(categorizeAccounts.netIncome))}</p>
                <p className={`text-[11px] font-medium mt-2 ${categorizeAccounts.isProfitable ? "text-blue-200/60" : "text-amber-200/60"}`}>
                  Margin: {categorizeAccounts.profitMargin.toFixed(2)}%
                </p>
              </div>
              <div className="p-2.5 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform">
                {categorizeAccounts.isProfitable ? <TrendingUp size={20} className="text-white" /> : <TrendingDown size={20} className="text-white" />}
              </div>
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
            style={{ background: categorizeAccounts.isProfitable ? "linear-gradient(135deg,#059669,#34d399)" : "linear-gradient(135deg,#dc2626,#f87171)" }}>
            {categorizeAccounts.isProfitable ? "✓ PROFITABLE" : "⚠ NET LOSS"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6">
        {loading && <LoadingComponent message="Loading profit & loss statement..." />}

        {!loading && !categorizeAccounts.hasData && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
            <EmptyComponent title="No profit & loss data found" subtitle={emptyComponentSubtitle} />
          </div>
        )}

        {!loading && categorizeAccounts.hasData && (
          <div className="flex">
  {/* Left Panel - P&L Statement */}
  <div className={`${isSidebarOpen ? "w-full lg:w-1/2" : "w-full"} transition-all duration-300`}>
    <div className="px-4 py-6 sm:px-6">
          <div className="max-w-7xl mx-auto">
            {/* Main P&L Statement */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f8fafc 0%,#f0fdf4 100%)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg,#059669,#34d399)" }} />
                  <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Profit &amp; Loss Statement</p>
                  <span className="text-[10px] text-slate-400 font-medium">Traditional Format · {getFYInfo().displayLabel}</span>
                </div>
                <span className="text-[10px] text-slate-400">All amounts in ₹</span>
              </div>

              <div className="w-full px-4 sm:px-6 lg:px-8 py-4 space-y-8">
                {/* ================= INCOME SECTION ================= */}
                <div className="w-full">
                  <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase">### OPERATIONAL REVENUES(Cr.)</h2>

                  <div className="relative overflow-x-auto max-w-full">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-50">
                        <tr className="border-b-2 border-gray-900">
                          <th className="px-3 py-2 text-left text-xs font-bold text-gray-900 uppercase w-[65%]">Income Account</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-900 uppercase w-[35%]">Amount (₹)</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {categorizeAccounts.incomeAccounts.map((account) => (
                          <tr key={`income-${account.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2 break-words">
                              <div className="flex items-start space-x-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></span>
                                <div className="min-w-0">
                                  <div onClick={() => handleAccountClick(account.fullAccount)} className="cursor-pointer group">
                                    <p className="text-sm font-medium text-gray-700 break-words group-hover:text-blue-600">
                                      {account.name}
                                      <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {account.code} • {account.closingType}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-right whitespace-normal">
                              <span className="text-sm font-medium text-green-600 break-all">{formatCurrency(account.amount)}</span>
                            </td>
                          </tr>
                        ))}

                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                          <td className="px-3 py-2 text-sm font-bold text-gray-900">Total Operational Revenues</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-green-600">{formatCurrency(categorizeAccounts.totalIncome)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ================= EXPENSES SECTION ================= */}
                <div className="w-full">
                  <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase">### OPERATIONAL EXPENSES (Dr.)</h2>

                  <div className="relative overflow-x-auto max-w-full">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-50">
                        <tr className="border-b-2 border-gray-900">
                          <th className="px-3 py-2 text-left text-xs font-bold text-gray-900 uppercase w-[65%]">Expense Account</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-900 uppercase w-[35%]">Amount (₹)</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {categorizeAccounts.expenseAccounts.map((account) => (
                          <tr key={`expense-${account.id}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2 break-words">
                              <div className="flex items-start space-x-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0"></span>
                                <div className="min-w-0">
                                  <div onClick={() => handleAccountClick(account.fullAccount)} className="cursor-pointer group">
                                    <p className="text-sm font-medium text-gray-700 break-words group-hover:text-blue-600">
                                      {account.name}
                                      <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {account.code} • {account.closingType}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-right whitespace-normal">
                              <span className="text-sm font-medium text-red-600 break-all">{formatCurrency(account.amount)}</span>
                            </td>
                          </tr>
                        ))}

                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                          <td className="px-3 py-2 text-sm font-bold text-gray-900">Total Operational Expenses</td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-red-600">{formatCurrency(categorizeAccounts.totalExpense)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ================= NET PROFIT/LOSS SECTION ================= */}
                <div className="w-full">
                  <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase">Operating {categorizeAccounts.isProfitable ? "Profit" : "Loss"}</h2>
                  <div className="relative overflow-x-auto max-w-full">
                    <table className="w-full table-fixed">
                      <tbody>
                        <tr className={`border-t-2 border-gray-900 ${categorizeAccounts.isProfitable ? "bg-green-50" : "bg-red-50"}`}>
                          <td className="px-3 py-2 font-semibold text-gray-900 uppercase"> OPERATIONAL {categorizeAccounts.isProfitable ? "Profit" : "Loss"}</td>
                          <td className="px-3 py-2 text-right font-bold">
                            <span className={categorizeAccounts.isProfitable ? "text-green-600" : "text-red-600"}>{formatCurrency(Math.abs(categorizeAccounts.netIncome))}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Accounting Note:</span> Income - Expenses = Net Profit/Loss. Net amount is transferred to Capital Account in Balance Sheet.
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Performance Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-3">Top 5 Income Sources</h5>
                  <div className="space-y-3">
                    {categorizeAccounts.incomeAccounts.slice(0, 5).map((income, index) => {
                      const percentage = categorizeAccounts.totalIncome > 0 ? (income.amount / categorizeAccounts.totalIncome) * 100 : 0;
                      return (
                        <div key={income.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${index < 3 ? "bg-green-500" : "bg-green-300"}`}></div>
                            <span className="text-sm text-gray-700 truncate max-w-[180px]">{income.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(income.amount)}</div>
                            <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-600 mb-3">Top 5 Expenses</h5>
                  <div className="space-y-3">
                    {categorizeAccounts.expenseAccounts.slice(0, 5).map((expense, index) => {
                      const percentage = categorizeAccounts.totalExpense > 0 ? (expense.amount / categorizeAccounts.totalExpense) * 100 : 0;
                      return (
                        <div key={expense.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${index < 3 ? "bg-red-500" : "bg-red-300"}`}></div>
                            <span className="text-sm text-gray-700 truncate max-w-[180px]">{expense.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</div>
                            <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          

          

    </div>
  </div>
  
  {/* Right Panel - Ledger Detail Sidebar */}
  <LedgerDetailSidebar
    account={selectedAccount}
    isOpen={isSidebarOpen}
    onClose={handleCloseSidebar}
    onUpdate={() => {
      // Optional: Refresh P&L data if ledger is updated
    }}
    advancedFilters={academicYearFilters}
  />
</div>

          

        )}
      </div>
    </div>
  );
}