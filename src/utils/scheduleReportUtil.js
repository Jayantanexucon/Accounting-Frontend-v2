import { formatCurrency } from "./formatUtil";

const formatLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const FINANCIAL_YEAR_QUARTERS = [
  { value: "Q1", label: "Q1 (Apr-Jun)" },
  { value: "Q2", label: "Q2 (Jul-Sep)" },
  { value: "Q3", label: "Q3 (Oct-Dec)" },
  { value: "Q4", label: "Q4 (Jan-Mar)" },
];

export const FINANCIAL_YEAR_MONTHS = [
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

export const getCurrentFinancialYearEnding = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  return month >= 1 && month <= 3 ? year : year + 1;
};

export const getFinancialYearInfo = (endingYear) => ({
  startYear: endingYear - 1,
  endYear: endingYear,
  label: `FY ${endingYear - 1}-${String(endingYear).slice(2)}`,
  displayLabel: `Financial Year ${endingYear - 1}-${endingYear}`,
});

export const getFinancialYearOptions = () => {
  const currentYear = getCurrentFinancialYearEnding();
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
};

export const getReportPeriodParams = (periodType, year, quarter, month) => ({
  periodType,
  year,
  ...(periodType === "quarterly" ? { quarter } : {}),
  ...(periodType === "monthly" ? { month } : {}),
});

export const getFinancialYearDateRange = (endingYear) => {
  const fy = getFinancialYearInfo(endingYear);
  return {
    from: new Date(fy.startYear, 3, 1),
    to: new Date(fy.endYear, 2, 31),
  };
};

export const getReportDateRange = (periodType, endingYear, selectedQuarter = "Q4", selectedMonth = "3") => {
  const fy = getFinancialYearInfo(endingYear);

  if (periodType === "quarterly") {
    const quarterRanges = {
      Q1: { from: new Date(fy.startYear, 3, 1), to: new Date(fy.startYear, 5, 30) },
      Q2: { from: new Date(fy.startYear, 6, 1), to: new Date(fy.startYear, 8, 30) },
      Q3: { from: new Date(fy.startYear, 9, 1), to: new Date(fy.startYear, 11, 31) },
      Q4: { from: new Date(fy.endYear, 0, 1), to: new Date(fy.endYear, 2, 31) },
    };
    return quarterRanges[selectedQuarter] || quarterRanges.Q4;
  }

  if (periodType === "monthly") {
    const monthNumber = Number.parseInt(selectedMonth, 10);
    const actualYear = monthNumber >= 4 ? fy.startYear : fy.endYear;
    return {
      from: new Date(actualYear, monthNumber - 1, 1),
      to: new Date(actualYear, monthNumber, 0),
    };
  }

  return getFinancialYearDateRange(endingYear);
};

export const getLedgerSidebarFilters = (
  endingYear,
  periodType = "yearly",
  selectedQuarter = "Q4",
  selectedMonth = "3"
) => {
  const dateRange = getReportDateRange(periodType, endingYear, selectedQuarter, selectedMonth);
  return {
    dateRange: {
      from: formatLocalDateInput(dateRange.from),
      to: formatLocalDateInput(dateRange.to),
    },
    amountRange: { min: "", max: "" },
    amountType: "both",
    accountGroups: [],
    journalIds: [],
    partyName: "",
  };
};

export const getPeriodDisplayLabel = (reportType, periodType, selectedYear, selectedQuarter, selectedMonth) => {
  const fy = getFinancialYearInfo(selectedYear);

  if (periodType === "yearly") {
    return reportType === "balance_sheet"
      ? `As of March 31, ${fy.endYear}`
      : `For the financial year ${fy.startYear}-${String(fy.endYear).slice(2)} (Apr 1, ${fy.startYear} - Mar 31, ${fy.endYear})`;
  }

  if (periodType === "quarterly") {
    if (reportType === "balance_sheet") {
      const quarterEndDates = {
        Q1: `June 30, ${fy.startYear}`,
        Q2: `September 30, ${fy.startYear}`,
        Q3: `December 31, ${fy.startYear}`,
        Q4: `March 31, ${fy.endYear}`,
      };
      return `As of ${quarterEndDates[selectedQuarter]}`;
    }

    const quarterPeriods = {
      Q1: `April 1 - June 30, ${fy.startYear}`,
      Q2: `July 1 - September 30, ${fy.startYear}`,
      Q3: `October 1 - December 31, ${fy.startYear}`,
      Q4: `January 1 - March 31, ${fy.endYear}`,
    };
    return `For the quarter ${quarterPeriods[selectedQuarter]}`;
  }

  const monthLabel = FINANCIAL_YEAR_MONTHS.find((item) => item.value === selectedMonth)?.label || "";
  const monthNum = Number.parseInt(selectedMonth, 10);
  const yearForMonth = monthNum >= 4 ? fy.startYear : fy.endYear;

  return reportType === "balance_sheet"
    ? `As of ${monthLabel.split(" (")[0]} ${yearForMonth}`
    : `For the month of ${monthLabel.split(" (")[0]} ${yearForMonth}`;
};

export const formatStatementAmount = (amount) => {
  const value = Number(amount || 0);
  if (value < 0) {
    return `(${formatCurrency(Math.abs(value))})`;
  }
  return formatCurrency(value);
};

export const buildReportExportRows = (report) => {
  const rows = [
    [report?.title || ""],
    [`Financial Year: ${report?.financialYear || ""}`],
    ...(report?.reportPeriodLabel ? [[`Period: ${report.reportPeriodLabel}`]] : []),
    [],
    ["Particulars", "Note No", "Amount"],
  ];

  (report?.rows || []).forEach((row) => {
    const indent = "  ".repeat(row.level || 0);
    rows.push([
      `${indent}${row.label}`,
      row.noteNo || "",
      row.amount ?? 0,
    ]);
  });

  rows.push([]);
  rows.push(["Notes"]);
  rows.push(["Title", "Note No", "Particulars", "Amount"]);

  (report?.notes || []).forEach((note) => {
    if (!note.items?.length) return;
    note.items.forEach((item) => {
      rows.push([
        note.title,
        note.noteNo,
        item.kind === "ledger" ? item.ledgerName : item.label,
        item.amount ?? 0,
      ]);
    });
  });

  return rows;
};
