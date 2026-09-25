import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Download, Edit3, FileSpreadsheet, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { useFinancialYear } from "../contexts/FinancialYearContext";
import { getFinancialYearInfo } from "../utils/scheduleReportUtil";
import {
  checkoutAuditVersionApi,
  createAuditIdentifierApi,
  createAuditCategoryApi,
  deleteAuditIdentifierApi,
  deleteAuditCategoryApi,
  getExpenseAuditOverviewApi,
  listAuditCategoriesApi,
  listAuditIdentifiersApi,
  listAuditVersionsApi,
  updateAuditCategoryApi,
  updateAuditIdentifierApi,
  updateAuditTransactionApi,
  updateAuditTransactionCategoryApi,
  uploadExpenseAuditApi,
} from "../apis/expenseAuditApi";

const aliases = {
  date: ["date", "transaction date", "txn date", "value date", "posting date", "transaction value date"],
  description: ["description", "transaction description", "particulars", "transaction particulars", "narration", "transaction narration", "remarks", "details", "transaction details"],
  debit: ["debit", "debit amount", "debit amount inr", "debit (dr)", "withdrawal", "withdrawals", "withdrawal amt", "withdrawal amount", "dr amount"],
  credit: ["credit", "credit amount", "credit amount inr", "credit (cr)", "deposit", "deposits", "deposit amt", "deposit amount", "cr amount"],
  amount: ["amount", "transaction amount", "amount inr", "amount (inr)", "value", "transaction value", "net amount", "debit credit amount"],
  direction: ["type", "transaction type", "cr dr", "dr cr", "debit credit", "transaction mode", "credit debit"],
};
const normalize = (value) => String(value || "").replace(/\uFEFF/g, "").trim().toLowerCase().replace(/[\r\n_\-()/]+/g, " ").replace(/\s+/g, " ");
const duplicateNormalize = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const getDuplicateKey = (row) => {
  const date = row.transactionDate ? new Date(row.transactionDate).toISOString().slice(0, 10) : "";
  return [date, duplicateNormalize(row.description), Number(row.debitAmount || 0).toFixed(2), Number(row.creditAmount || 0).toFixed(2)].join("|");
};
const parseAmount = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return Math.abs(value);
  const text = String(value).trim();
  const numericText = text
    .replace(/[₹$€£,\s]/g, "")
    .replace(/[()]/g, "")
    .replace(/(?:CR|DR|CREDIT|DEBIT)$/i, "");
  const directValue = Number(numericText);
  if (Number.isFinite(directValue)) return Math.abs(directValue);
  const numberMatch = text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return numberMatch ? Math.abs(Number(numberMatch[0])) : 0;
};
const getDirection = (value) => {
  const normalized = normalize(value);
  if (/(credit|deposit|receipt|\bcr\b)/.test(normalized)) return "CREDIT";
  if (/(debit|withdrawal|payment|\bdr\b)/.test(normalized)) return "DEBIT";
  return "";
};
const getAmountDirection = (value, columnName = "") => {
  const valueDirection = getDirection(value);
  if (valueDirection) return valueDirection;
  return getDirection(columnName);
};
const toDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString();
  const text = String(value || "").trim().replace(/[./]/g, "-");
  const parts = text.split("-");
  if (parts.length === 3 && parts[2].length >= 4) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);
    const dayFirst = new Date(Date.UTC(year, month - 1, day));
    if (dayFirst.getUTCFullYear() === year && dayFirst.getUTCMonth() === month - 1 && dayFirst.getUTCDate() === day) return dayFirst.toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const mapColumns = (columns) => Object.fromEntries(Object.keys(aliases).map((key) => {
  const normalizedColumns = columns.map((column) => ({ column, normalized: normalize(column) }));
  const exactMatch = normalizedColumns.find(({ normalized }) =>
    aliases[key].some((alias) => normalized === normalize(alias)),
  );
  if (exactMatch) return [key, exactMatch.column];

  const containsMatches = normalizedColumns.flatMap(({ column, normalized }) =>
    aliases[key]
      .map((alias) => normalize(alias))
      .filter((normalizedAlias) => normalizedAlias.length > 2 && normalized.includes(normalizedAlias))
      .map((normalizedAlias) => ({ column, specificity: normalizedAlias.length })),
  );
  const bestMatch = containsMatches.sort((left, right) => right.specificity - left.specificity)[0];
  return [key, bestMatch?.column || ""];
}));

const readTransactionRows = (sheet) => {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  const headerIndex = matrix.slice(0, 20).findIndex((row) => {
    const columns = row.map(normalize).filter(Boolean);
    const hasDate = columns.some((column) => aliases.date.some((alias) => column === normalize(alias) || column.includes(normalize(alias))));
    const hasDescription = columns.some((column) => aliases.description.some((alias) => column === normalize(alias) || column.includes(normalize(alias))));
    return hasDate && hasDescription;
  });
  if (headerIndex < 0) return [];
  return XLSX.utils.sheet_to_json(sheet, { range: headerIndex, defval: "", raw: false });
};
const formatCurrency = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
const isValidDraftTransaction = (row) => {
  const description = String(row?.description || "").trim();
  const debitAmount = Number(row?.debitAmount || 0);
  const creditAmount = Number(row?.creditAmount || 0);
  const rawDate = row?.transactionDate;
  const transactionDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
  const hasValidDate = rawDate && !Number.isNaN(transactionDate.getTime());
  return hasValidDate && description.length > 0 && (debitAmount > 0 || creditAmount > 0);
};

export default function ExpenseAuditPage() {
  const { user } = useAuth();
  const { selectedFinancialYearEnding, setSelectedFinancialYearEnding, financialYearInfo, financialYearOptions } = useFinancialYear();
  const companyId = JSON.parse(localStorage.getItem("selectedCompany") || "{}")._id || user?.company?._id;
  const queryClient = useQueryClient();
  const [identifierForm, setIdentifierForm] = useState({ name: "", description: "", categoryId: "" });
  const [editingId, setEditingId] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [rowView, setRowView] = useState("ALL");
  const [selectedSummaryRows, setSelectedSummaryRows] = useState([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [expandedCategoryKeys, setExpandedCategoryKeys] = useState([]);
  const [preview, setPreview] = useState(null);
  const [draftUpload, setDraftUpload] = useState(null);
  const [saveNameModalOpen, setSaveNameModalOpen] = useState(false);
  const [saveNameDraft, setSaveNameDraft] = useState("");
  const showLegacyMasterData = import.meta.env.VITE_SHOW_LEGACY_AUDIT_MASTER_DATA === "true";

  const draftStorageKey = useMemo(() => `expense-audit-draft-${companyId || "unknown"}-${selectedFinancialYearEnding || "fy"}`, [companyId, selectedFinancialYearEnding]);
  const persistDraft = useCallback((nextDraft) => {
    if (!companyId || !selectedFinancialYearEnding) return;
    if (!nextDraft) {
      localStorage.removeItem(draftStorageKey);
      return;
    }
    localStorage.setItem(draftStorageKey, JSON.stringify(nextDraft));
  }, [companyId, draftStorageKey, selectedFinancialYearEnding]);
  const discardDraft = useCallback(() => {
    if (!draftUpload) return;
    const shouldDiscard = window.confirm("This upload is not saved yet. Discard the draft instance?");
    if (shouldDiscard) {
      setDraftUpload(null);
      setPreview(null);
      persistDraft(null);
    }
  }, [draftUpload, persistDraft]);

  useEffect(() => {
    if (!companyId || !selectedFinancialYearEnding) return;
    const savedDraft = localStorage.getItem(draftStorageKey);
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft);
      if (parsed?.transactions?.length) {
        setDraftUpload(parsed);
        setPreview(parsed);
        toast.info("Unsaved upload draft restored. Save it before leaving this page.");
      }
    } catch (error) {
      localStorage.removeItem(draftStorageKey);
    }
  }, [companyId, selectedFinancialYearEnding, draftStorageKey]);

  useEffect(() => {
    persistDraft(draftUpload);
  }, [draftUpload, persistDraft]);

  useEffect(() => {
    if (!draftUpload) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "You have an unsaved Excel upload. Save it before leaving this page.";
      return event.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftUpload]);

  const versionsQuery = useQuery({
    queryKey: ["audit-versions", companyId, selectedFinancialYearEnding],
    queryFn: () => listAuditVersionsApi(companyId, selectedFinancialYearEnding),
    enabled: Boolean(companyId),
  });
  const versions = versionsQuery.data?.data || [];
  const activeVersion = versionsQuery.data?.data?.find((version) => version.active) || null;

  const identifiersQuery = useQuery({ queryKey: ["audit-identifiers", companyId], queryFn: () => listAuditIdentifiersApi(companyId), enabled: Boolean(companyId) });
  const categoriesQuery = useQuery({ queryKey: ["audit-categories", companyId], queryFn: () => listAuditCategoriesApi(companyId), enabled: Boolean(companyId) });
  const overviewQuery = useQuery({
    queryKey: ["expense-audit", companyId, selectedFinancialYearEnding, activeVersion?._id],
    queryFn: () => getExpenseAuditOverviewApi(companyId, selectedFinancialYearEnding, activeVersion?._id),
    enabled: Boolean(companyId),
  });
  const identifiers = identifiersQuery.data?.data || [];
  const categories = useMemo(() => categoriesQuery.data?.data || [], [categoriesQuery.data?.data]);
  const overview = overviewQuery.data?.data || { groups: [], unmatched: [], summary: {} };
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-identifiers", companyId] });
    queryClient.invalidateQueries({ queryKey: ["audit-categories", companyId] });
    queryClient.invalidateQueries({ queryKey: ["expense-audit", companyId, selectedFinancialYearEnding] });
    queryClient.invalidateQueries({ queryKey: ["audit-versions", companyId, selectedFinancialYearEnding] });
  };

  const saveIdentifier = useMutation({ mutationFn: editingId ? updateAuditIdentifierApi : createAuditIdentifierApi, onSuccess: () => { invalidate(); setIdentifierForm({ name: "", description: "", categoryId: "" }); setEditingId(""); toast.success("Identifier saved"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not save identifier") });
  const deleteIdentifier = useMutation({ mutationFn: deleteAuditIdentifierApi, onSuccess: () => { invalidate(); toast.success("Identifier deleted"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not delete identifier") });
  const saveCategory = useMutation({ mutationFn: editingCategoryId ? updateAuditCategoryApi : createAuditCategoryApi, onSuccess: () => { invalidate(); setCategoryForm({ name: "", description: "" }); setEditingCategoryId(""); toast.success("Category saved"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not save category") });
  const deleteCategory = useMutation({ mutationFn: deleteAuditCategoryApi, onSuccess: () => { invalidate(); toast.success("Category deleted"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not delete category") });
  const updateTransactionCategory = useMutation({ mutationFn: updateAuditTransactionCategoryApi, onSuccess: () => { invalidate(); toast.success("Transaction category updated"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not update transaction") });
  const updateTransaction = useMutation({ mutationFn: updateAuditTransactionApi, onSuccess: () => { invalidate(); toast.success("Transaction updated"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not update transaction") });
  const uploadMutation = useMutation({ mutationFn: uploadExpenseAuditApi, onSuccess: (response) => { invalidate(); setPreview(null); setDraftUpload(null); persistDraft(null); toast.success(response?.message || "Audit statement imported"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not import statement") });
  const checkoutVersionMutation = useMutation({
    mutationFn: checkoutAuditVersionApi,
    onSuccess: () => {
      invalidate();
      toast.success("Upload instance opened");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not restore this version"),
  });

  const getVersionDisplayName = (version) => version?.label || version?.fileName || `Upload ${version?.versionNumber || "new"}`;

  const formatVersionTimestamp = (value) => {
    if (!value) return "No timestamp";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "No timestamp";
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
  };

  const categoryGroups = useMemo(() => overview.categoryGroups || [], [overview.categoryGroups]);
  const draftRows = useMemo(() => {
    if (!draftUpload?.transactions?.length) return [];
    const categoryMap = new Map(categories.map((category) => [String(category._id), category.name]));
    return draftUpload.transactions
      .filter((row) => !row.duplicate)
      .map((row, index) => {
        const categoryId = row.categoryId || "";
        return {
          _id: `draft-${row.rowNumber || index}`,
          transactionDate: row.transactionDate,
          description: row.description || "",
          debitAmount: Number(row.debitAmount || 0),
          creditAmount: Number(row.creditAmount || 0),
          amount: Number(row.debitAmount || row.creditAmount || 0),
          direction: row.debitAmount ? "DEBIT" : row.creditAmount ? "CREDIT" : "",
          categoryId,
          categoryName: row.categoryName || (categoryId ? categoryMap.get(String(categoryId)) || "Uncategorized" : "Uncategorized"),
          identifierName: row.identifierName || "",
        };
      });
  }, [categories, draftUpload]);
  const auditRows = useMemo(() => {
    if (draftRows.length) return draftRows;
    return (overview.rows?.length ? overview.rows : overview.unmatched || []);
  }, [draftRows, overview.rows, overview.unmatched]);
  const rowCounts = useMemo(() => ({
    all: auditRows.length,
    categorized: auditRows.filter((row) => row.categoryId).length,
    uncategorized: auditRows.filter((row) => !row.categoryId).length,
  }), [auditRows]);
  const visibleRows = useMemo(() => {
    const rows = auditRows;
    if (rowView === "IDENTIFIED") return rows.filter((row) => row.categoryId);
    if (rowView === "UNIDENTIFIED") return rows.filter((row) => !row.categoryId);
    return rows;
  }, [auditRows, rowView]);
  const totals = useMemo(() => auditRows.reduce((summary, row) => ({
    debit: summary.debit + Number(row.debitAmount || 0),
    credit: summary.credit + Number(row.creditAmount || 0),
  }), { debit: 0, credit: 0 }), [auditRows]);
  const financialYearLabel = `FY ${Number(selectedFinancialYearEnding) - 1}-${selectedFinancialYearEnding}`;
  const categorySummary = useMemo(() => {
    if (draftRows.length) {
      const groupedDraftRows = new Map();

      draftRows.forEach((row) => {
        const categoryId = row.categoryId || "__UNCATEGORIZED__";
        const key = String(categoryId);
        if (!groupedDraftRows.has(key)) {
          groupedDraftRows.set(key, {
            categoryId: row.categoryId || null,
            categoryName: row.categoryId ? (categories.find((category) => String(category._id) === String(row.categoryId))?.name || row.categoryName || "Uncategorized") : "Uncategorized",
            debit: { count: 0, total: 0 },
            credit: { count: 0, total: 0 },
          });
        }

        const group = groupedDraftRows.get(key);
        if (Number(row.debitAmount || 0) > 0) {
          group.debit.count += 1;
          group.debit.total += Number(row.debitAmount || 0);
        }
        if (Number(row.creditAmount || 0) > 0) {
          group.credit.count += 1;
          group.credit.total += Number(row.creditAmount || 0);
        }
      });

      const baseGroups = categories.map((category) => {
        const key = String(category._id);
        return groupedDraftRows.get(key) || {
          categoryId: category._id,
          categoryName: category.name,
          debit: { count: 0, total: 0 },
          credit: { count: 0, total: 0 },
        };
      });

      const uncategorizedGroup = groupedDraftRows.get("__UNCATEGORIZED__") || {
        categoryId: null,
        categoryName: "Uncategorized",
        debit: { count: 0, total: 0 },
        credit: { count: 0, total: 0 },
      };

      return [...baseGroups, uncategorizedGroup];
    }
    return categories.map((category) => {
      const group = categoryGroups.find((item) => String(item.categoryId) === String(category._id));
      return group || {
        categoryId: category._id,
        categoryName: category.name,
        debit: { count: 0, total: 0 },
        credit: { count: 0, total: 0 },
      };
    });
  }, [categories, categoryGroups, draftRows]);
  const getRowsForScope = (scope) => scope === "CATEGORIZED"
    ? auditRows.filter((row) => row.categoryId)
    : scope === "UNCATEGORIZED"
      ? auditRows.filter((row) => !row.categoryId)
      : auditRows;
  const getSummaryKey = (group) => String(group.categoryId || group.categoryName || "");
  const getCategoryRows = (group) => {
    const key = getSummaryKey(group);
    const rows = auditRows.filter((row) => {
      if (group.categoryName === "Uncategorized") return !row.categoryId;
      if (row.categoryId) return String(row.categoryId) === String(group.categoryId);
      return row.categoryName === group.categoryName;
    });
    return { key, rows };
  };
  const toggleCategoryExpansion = (group) => {
    const key = getSummaryKey(group);
    setExpandedCategoryKeys((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  };
  const totalForRows = (rows) => rows.reduce((summary, row) => ({
    debit: summary.debit + Number(row.debitAmount || 0),
    credit: summary.credit + Number(row.creditAmount || 0),
  }), { debit: 0, credit: 0 });
  const toggleSummaryRow = (group) => {
    const key = getSummaryKey(group);
    setSelectedSummaryRows((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]);
  };
  const toggleAllSummaryRows = () => {
    if (selectedSummaryRows.length === categorySummary.length) {
      setSelectedSummaryRows([]);
      return;
    }
    setSelectedSummaryRows(categorySummary.map((group) => getSummaryKey(group)));
  };
  const updateDraftRowCategory = useCallback((rowId, categoryId) => {
    if (!draftUpload?.transactions?.length) return;
    const selectedCategory = categories.find((category) => String(category._id) === String(categoryId));
    const nextTransactions = draftUpload.transactions.map((transaction) => {
      const draftId = `draft-${transaction.rowNumber || 0}`;
      if (draftId !== String(rowId)) return transaction;
      return {
        ...transaction,
        categoryId: categoryId || "",
        categoryName: categoryId ? (selectedCategory?.name || "Uncategorized") : "Uncategorized",
      };
    });
    const nextDraft = { ...draftUpload, transactions: nextTransactions };
    setDraftUpload(nextDraft);
    setPreview((current) => (current ? { ...current, transactions: nextTransactions } : null));
    persistDraft(nextDraft);
  }, [categories, draftUpload, persistDraft]);
  const handleTransactionCategoryChange = (row, event) => {
    const nextCategoryId = event.target.value;
    const isDraftRow = String(row?._id || "").startsWith("draft-") || row?.source === "draft";
    if (isDraftRow) {
      updateDraftRowCategory(row._id, nextCategoryId);
      return;
    }
    updateTransactionCategory.mutate({ id: row._id, companyId, categoryId: nextCategoryId, versionId: activeVersion?._id });
  };
  const downloadTransactions = (scope, selectedRows = []) => {
    const rows = selectedRows.length ? selectedRows : getRowsForScope(scope);
    if (!rows.length) {
      toast.info("No rows available to download");
      return;
    }
    const exportRows = rows.map((row) => ({
      Date: row.transactionDate ? new Date(row.transactionDate).toLocaleDateString("en-IN") : "",
      Description: row.description || "",
      Direction: row.direction || "",
      Amount: Number(row.amount || 0),
      Debit: Number(row.debitAmount || 0),
      Credit: Number(row.creditAmount || 0),
      Identifier: row.identifierName || "",
      Category: row.categoryName || "Uncategorized",
    }));
    const totalsForSelectedRows = totalForRows(rows);
    exportRows.push({});
    exportRows.push({ Description: "TOTAL", Debit: totalsForSelectedRows.debit, Credit: totalsForSelectedRows.credit });
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [
      { wch: 14 }, { wch: 55 }, { wch: 12 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, selectedRows.length ? "expense-audit-selected-transactions.xlsx" : `expense-audit-transactions-${scope.toLowerCase()}.xlsx`);
    toast.success(`${rows.length} transaction rows downloaded`);
  };
  const downloadSummary = (selectedGroups = categorySummary) => {
    const groupsToExport = selectedGroups.length ? selectedGroups : categorySummary;
    if (!groupsToExport.length) {
      toast.info("No category rows available to download");
      return;
    }
    const exportRows = [{ Summary: financialYearLabel }, {}, ...groupsToExport.map((group) => ({
      Category: group.categoryName,
      "Debit rows": group.debit.count,
      "Debit total": Number(group.debit.total || 0),
      "Credit rows": group.credit.count,
      "Credit total": Number(group.credit.total || 0),
    }))];
    const selectedTotals = groupsToExport.reduce((summary, group) => ({
      debitRows: summary.debitRows + Number(group.debit.count || 0),
      debitTotal: summary.debitTotal + Number(group.debit.total || 0),
      creditRows: summary.creditRows + Number(group.credit.count || 0),
      creditTotal: summary.creditTotal + Number(group.credit.total || 0),
    }), { debitRows: 0, debitTotal: 0, creditRows: 0, creditTotal: 0 });
    exportRows.push({});
    exportRows.push({ Category: "TOTAL", "Debit rows": selectedTotals.debitRows, "Debit total": selectedTotals.debitTotal, "Credit rows": selectedTotals.creditRows, "Credit total": selectedTotals.creditTotal });
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Category Summary");
    XLSX.writeFile(workbook, selectedGroups.length ? "expense-audit-selected-category-summary.xlsx" : "expense-audit-category-summary.xlsx");
    toast.success(`${groupsToExport.length} category rows downloaded`);
  };
  const readFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !companyId) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = readTransactionRows(sheet);
      if (!rows.length) throw new Error("The workbook has no transaction rows");
      const columns = Object.keys(rows[0]);
      const mapping = mapColumns(columns);
      if (!mapping.description || !mapping.date) throw new Error(`Could not detect Date and Description columns. Detected columns: ${columns.join(", ")}`);
      if (!mapping.debit && !mapping.credit && !mapping.amount) {
        throw new Error(`Could not detect a Debit, Credit, or Amount column. Available columns: ${columns.join(", ")}`);
      }
      const transactions = rows.map((row, index) => {
        let debitAmount = parseAmount(row[mapping.debit]);
        let creditAmount = parseAmount(row[mapping.credit]);
        let singleAmount = parseAmount(row[mapping.amount]);
        let rowDirection = getDirection(row[mapping.direction]);

        if (!rowDirection && singleAmount) {
          rowDirection = getAmountDirection(row[mapping.amount], mapping.amount);
        }
        const direction = debitAmount || creditAmount
          ? debitAmount > 0 ? "DEBIT" : "CREDIT"
          : rowDirection || (mapping.amount && normalize(mapping.amount).includes("credit") ? "CREDIT" : "DEBIT");
        return {
          rowNumber: index + 2,
          transactionDate: toDate(row[mapping.date]),
          description: String(row[mapping.description] || "").trim(),
          debitAmount: debitAmount || (direction === "DEBIT" ? singleAmount : 0),
          creditAmount: creditAmount || (direction === "CREDIT" ? singleAmount : 0),
          originalRowData: row,
        };
      });
      const previewTransactions = transactions
        .filter(isValidDraftTransaction)
        .map((transaction) => ({
          ...transaction,
          duplicate: false,
          duplicateReason: "",
        }));
      const skippedCount = transactions.length - previewTransactions.length;
      const draft = { fileName: file.name, transactions: previewTransactions, createdAt: new Date().toISOString(), skippedRowsCount: skippedCount };
      if (skippedCount > 0) {
        toast.info(`${skippedCount} non-transaction rows were skipped from this draft (for example totals or blank entries).`);
      }
      setDraftUpload(draft);
      setPreview(draft);
    } catch (error) { toast.error(error.message || "Could not read workbook"); }
  };
  const openSaveNameModal = () => {
    const uploadData = preview || draftUpload;
    if (!uploadData?.transactions?.length) {
      toast.error("No valid transaction rows were detected in this draft. Please review the uploaded file.");
      return;
    }
    const filteredTransactions = uploadData.transactions.filter(isValidDraftTransaction);
    if (!filteredTransactions.length) {
      toast.error("No valid transaction rows were detected in this draft. Please review the uploaded file.");
      return;
    }
    const suggestedLabel = (uploadData.fileName || "Upload").replace(/\.[^.]+$/, "") || "Upload";
    setSaveNameDraft(suggestedLabel);
    setSaveNameModalOpen(true);
  };
  const confirmUpload = () => {
    const uploadData = preview || draftUpload;
    if (!uploadData?.transactions?.length) {
      toast.error("No valid transaction rows were detected in this draft. Please review the uploaded file.");
      return;
    }
    const filteredTransactions = uploadData.transactions.filter(isValidDraftTransaction);
    if (!filteredTransactions.length) {
      toast.error("No valid transaction rows were detected in this draft. Please review the uploaded file.");
      return;
    }
    const trimmedLabel = saveNameDraft.trim();
    if (!trimmedLabel) {
      toast.info("Instance name is required before saving.");
      setSaveNameModalOpen(true);
      return;
    }

    const skippedCount = uploadData.transactions.length - filteredTransactions.length;
    if (skippedCount > 0) {
      toast.info(`${skippedCount} rows were skipped before saving to keep only valid transactions.`);
    }

    const transactions = filteredTransactions.map((row) => ({
      ...row,
      duplicate: false,
      duplicateReason: "",
    }));

    uploadMutation.mutate({
      companyId,
      financialYearEnding: selectedFinancialYearEnding,
      fileName: uploadData.fileName,
      label: trimmedLabel,
      replaceExistingFile: true,
      transactions,
    });
    setSaveNameModalOpen(false);
    setSaveNameDraft("");
  };
  const submitIdentifier = (event) => {
    event.preventDefault();
    const name = identifierForm.name.trim();
    if (!name) return toast.error("Enter an identifier");
    if (!identifierForm.categoryId) return toast.error("Select a category for this identifier");
    saveIdentifier.mutate(editingId ? { id: editingId, companyId, ...identifierForm } : { companyId, ...identifierForm });
  };
  const submitCategory = (event) => {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) return toast.error("Enter a category");
    saveCategory.mutate(editingCategoryId ? { id: editingCategoryId, companyId, ...categoryForm } : { companyId, ...categoryForm });
  };

  return <div className="mx-auto w-full max-w-[1900px] space-y-6 px-4 pb-8 xl:px-6">
    {saveNameModalOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-md rounded-3xl border border-violet-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-600">Save checkpoint</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Name this instance</h3>
            </div>
            <button type="button" onClick={() => { setSaveNameModalOpen(false); setSaveNameDraft(""); }} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"><X size={16} /></button>
          </div>
          <p className="mt-3 text-sm text-slate-500">This label will be shown in all saved checkpoints for this upload.</p>
          <label className="mt-5 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Instance name</label>
          <input
            autoFocus
            value={saveNameDraft}
            onChange={(event) => setSaveNameDraft(event.target.value)}
            placeholder="eg. Salary - May 2026"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-inner outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
          />
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => { setSaveNameModalOpen(false); setSaveNameDraft(""); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={confirmUpload} disabled={!saveNameDraft.trim() || uploadMutation.isPending} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300">Save instance</button>
          </div>
        </div>
      </div>
    )}
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Accounting control</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Expense Audit</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Import statement rows, match descriptions to your identifiers, and review debit and credit totals by financial year.</p></div>
        <div className="flex flex-wrap gap-2"><select value={selectedFinancialYearEnding} onChange={(event) => setSelectedFinancialYearEnding(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">{financialYearOptions.map((endingYear) => <option key={endingYear} value={endingYear}>{getFinancialYearInfo(endingYear).label}</option>)}</select><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"><Upload size={15} /> Import Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={readFile} /></label></div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-4"><Metric label="Rows" value={rowCounts.all} /><Metric label="Categorized" value={rowCounts.categorized} /><Metric label="Uncategorized" value={rowCounts.uncategorized} tone="rose" /><Metric label="Net movement (all rows)" value={formatCurrency(totals.credit - totals.debit)} /></div>

    {draftUpload && (
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Unsaved draft</p>
            <h3 className="mt-1 text-lg font-bold text-slate-800">{draftUpload.fileName || "Excel upload draft"}</h3>
            <p className="mt-1 text-xs text-slate-600">This upload has not been saved to the database yet.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPreview(draftUpload)} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50">Review draft</button>
            <button type="button" onClick={openSaveNameModal} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">Save instance</button>
            <button type="button" onClick={discardDraft} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Discard</button>
          </div>
        </div>
      </section>
    )}

    <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-bold text-slate-800">Upload checkpoints</h2>
          <p className="mt-1 text-xs text-slate-600">Each saved upload becomes a separate instance. Open any saved checkpoint to restore that version.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draftUpload && (
            <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
              Draft in progress: {draftUpload.fileName || "New upload"}
            </span>
          )}
          {activeVersion && (
            <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">
              Current instance: {getVersionDisplayName(activeVersion)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {versions.map((version) => {
          const isCurrent = Boolean(version.active);
          const versionName = getVersionDisplayName(version);
          return (
            <button
              key={version._id}
              type="button"
              onClick={() => !isCurrent && checkoutVersionMutation.mutate({ companyId, financialYearEnding: selectedFinancialYearEnding, versionId: version._id })}
              disabled={isCurrent || checkoutVersionMutation.isPending}
              className={`w-full rounded-2xl border p-3 text-left transition ${isCurrent ? "border-violet-400 bg-violet-100/80" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/60"} ${isCurrent ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{version.label ? "Saved instance" : `Upload ${version.versionNumber || ""}`}</span>
                    {isCurrent && <span className="rounded-full bg-violet-500 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">Current</span>}
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">{versionName}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatVersionTimestamp(version.createdAt)} · {version.summary?.totalRows || 0} rows</p>
                </div>
                {!isCurrent && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">Open</span>}
              </div>
            </button>
          );
        })}
        {!versions.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-400">No upload checkpoints yet for this financial year.</div>}
      </div>
    </section>

    <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-slate-800">Audit classification masters</h2><p className="mt-1 text-xs text-slate-600">Categories and identifiers are managed from Accounting Master Data.</p></div>
        <ClipboardCheck size={18} className="text-blue-600" />
      </div>
      <a href="/accounting/master-data" className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Manage audit categories and identifiers</a>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="font-bold text-slate-800">{financialYearLabel} Category Summary</h2><p className="mt-1 text-xs text-slate-500">Transactions grouped by their automatically or manually assigned category.</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Debit: {formatCurrency(totals.debit)}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Credit: {formatCurrency(totals.credit)}</span><button type="button" onClick={() => downloadSummary(categorySummary.filter((group) => selectedSummaryRows.includes(getSummaryKey(group))))} disabled={!selectedSummaryRows.length} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={14} /> Download selected</button><button type="button" onClick={downloadSummary} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Download size={14} /> Download all</button></div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[720px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-3"><input type="checkbox" checked={categorySummary.length > 0 && selectedSummaryRows.length === categorySummary.length} onChange={toggleAllSummaryRows} className="h-4 w-4 rounded border-slate-300" /></th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Debit rows</th><th className="px-4 py-3">Debit total</th><th className="px-4 py-3">Credit rows</th><th className="px-4 py-3">Credit total</th><th className="px-4 py-3 text-center">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{categorySummary.map((group) => { const key = getSummaryKey(group); const isSelected = selectedSummaryRows.includes(key); const expanded = expandedCategoryKeys.includes(key); const { rows } = getCategoryRows(group); return <>
            <tr key={key} className={isSelected ? "bg-blue-50/60" : ""}>
              <td className="px-3 py-3"><input type="checkbox" checked={isSelected} onChange={() => toggleSummaryRow(group)} className="h-4 w-4 rounded border-slate-300" /></td>
              <td className="px-4 py-3 font-bold text-slate-800"><button type="button" onClick={() => toggleCategoryExpansion(group)} className="inline-flex items-center gap-2 text-left"> <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-[10px] font-bold text-slate-600">{expanded ? "−" : "+"}</span> {group.categoryName}</button></td>
              <td className="px-4 py-3">{group.debit.count}</td>
              <td className="px-4 py-3 font-semibold text-rose-700">{formatCurrency(group.debit.total)}</td>
              <td className="px-4 py-3">{group.credit.count}</td>
              <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(group.credit.total)}</td>
              <td className="px-4 py-3 text-center text-xs font-semibold text-slate-500">{rows.length} rows</td>
            </tr>
            {expanded && (
              <tr key={`${key}-detail`}>
                <td colSpan="7" className="bg-slate-50 px-4 py-3">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2 text-right">Debit</th>
                          <th className="px-3 py-2 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.length ? rows.map((row) => <tr key={row._id || `${row.transactionDate}-${row.description}`}>
                          <td className="px-3 py-2">{row.transactionDate ? new Date(row.transactionDate).toLocaleDateString("en-IN") : "-"}</td>
                          <td className="px-3 py-2">{row.description || "-"}</td>
                          <td className="px-3 py-2 text-right text-rose-700">{formatCurrency(row.debitAmount || 0)}</td>
                          <td className="px-3 py-2 text-right text-emerald-700">{formatCurrency(row.creditAmount || 0)}</td>
                        </tr>) : <tr><td colSpan="4" className="px-3 py-3 text-center text-slate-400">No rows available for this category in the current draft.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            )}
          </>; })}{!categorySummary.length && <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-400">Create audit categories in Master Data to build this summary.</td></tr>}</tbody></table></div>
    </section>
    {showLegacyMasterData && <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
      <form onSubmit={submitCategory} className="mt-4 grid gap-2 md:grid-cols-[1fr_1.5fr_auto]">
        <input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Category e.g. Salary" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
        <input value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Category description" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
        <div className="flex gap-2"><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> {editingCategoryId ? "Update category" : "Add category"}</button>{editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(""); setCategoryForm({ name: "", description: "" }); }} className="rounded-xl border border-slate-200 bg-white px-3"><X size={15} /></button>}</div>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <div key={`category-${category._id}`} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs"><span className="font-bold text-slate-800">{category.name}</span><button type="button" onClick={() => { setEditingCategoryId(category._id); setCategoryForm({ name: category.name, description: category.description || "" }); }} className="text-slate-500 hover:text-slate-900"><Edit3 size={13} /></button><button type="button" onClick={() => deleteCategory.mutate({ id: category._id, companyId })} className="text-rose-600 hover:text-rose-800"><Trash2 size={13} /></button></div>)}</div>
      <form onSubmit={submitIdentifier} className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_1.5fr_auto]">
        <select value={identifierForm.categoryId} onChange={(event) => setIdentifierForm({ ...identifierForm, categoryId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select>
        <input value={identifierForm.name} onChange={(event) => setIdentifierForm({ ...identifierForm, name: event.target.value })} placeholder="Identifier: SAL, salary, pay" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
        <input value={identifierForm.description} onChange={(event) => setIdentifierForm({ ...identifierForm, description: event.target.value })} placeholder="Optional description" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
        <div className="flex gap-2"><button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> {editingId ? "Update" : "Add"}</button>{editingId && <button type="button" onClick={() => { setEditingId(""); setIdentifierForm({ name: "", description: "", categoryId: "" }); }} className="rounded-xl border border-slate-200 bg-white px-3"><X size={15} /></button>}</div>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-[620px] w-full text-sm"><thead className="bg-slate-100 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Identifier</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{identifiers.map((item) => <tr key={`master-${item._id}`}><td className="px-4 py-3 font-semibold text-slate-800">{categories.find((category) => category._id === item.categoryId)?.name || item.categoryName || "Unmapped"}</td><td className="px-4 py-3 font-bold text-blue-700">{item.name}</td><td className="px-4 py-3 text-slate-500">{item.description || "-"}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => { setEditingId(item._id); setIdentifierForm({ name: item.name, description: item.description || "", categoryId: item.categoryId || "" }); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Edit3 size={14} /></button><button type="button" onClick={() => deleteIdentifier.mutate({ id: item._id, companyId })} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button></td></tr>)}{!identifiers.length && <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400">Create a category, then add its identifiers.</td></tr>}</tbody></table></div>
      <div className="mt-6 border-t border-blue-100 pt-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-bold text-slate-800">{financialYearInfo.label} Category Summary</h3><p className="mt-1 text-xs text-slate-600">Transactions grouped by their automatically or manually assigned category.</p></div><div className="flex flex-wrap items-center gap-2"><div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Debit: {formatCurrency(totals.debit)}</div><div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Credit: {formatCurrency(totals.credit)}</div><button type="button" onClick={downloadSummary} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><Download size={14} /> Download summary</button></div></div><div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-[720px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Debit rows</th><th className="px-4 py-3">Debit total</th><th className="px-4 py-3">Credit rows</th><th className="px-4 py-3">Credit total</th></tr></thead><tbody className="divide-y divide-slate-100">{categoryGroups.map((group) => <tr key={group.categoryId || group.categoryName}><td className="px-4 py-3 font-bold text-slate-800">{group.categoryName}</td><td className="px-4 py-3">{group.debit.count}</td><td className="px-4 py-3 font-semibold text-rose-700">{formatCurrency(group.debit.total)}</td><td className="px-4 py-3">{group.credit.count}</td><td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(group.credit.total)}</td></tr>)}{!categoryGroups.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400">Categorized transactions will appear here.</td></tr>}</tbody></table></div></div>
    </section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-800">Download Transactions</h3><p className="text-xs text-slate-500">Export the transaction rows with totals.</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Debit: {formatCurrency(totals.debit)}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Credit: {formatCurrency(totals.credit)}</span><button type="button" onClick={() => downloadTransactions("ALL")} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><Download size={14} /> All</button><button type="button" onClick={() => downloadTransactions("CATEGORIZED")} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"><Download size={14} /> Categorized</button><button type="button" onClick={() => downloadTransactions("UNCATEGORIZED")} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700"><Download size={14} /> Uncategorized</button></div></div></section>

    {showLegacyMasterData && <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-800">Identifiers</h2><ClipboardCheck size={17} className="text-blue-600" /></div><p className="mt-1 text-xs text-slate-500">Identifiers help suggest a category when rows are imported.</p><form onSubmit={submitIdentifier} className="mt-4 space-y-2"><input value={identifierForm.name} onChange={(event) => setIdentifierForm({ ...identifierForm, name: event.target.value })} placeholder="Identifier e.g. SAL" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input value={identifierForm.description} onChange={(event) => setIdentifierForm({ ...identifierForm, description: event.target.value })} placeholder="Optional description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><div className="flex gap-2"><button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> {editingId ? "Update" : "Add"}</button>{editingId && <button type="button" onClick={() => { setEditingId(""); setIdentifierForm({ name: "", description: "" }); }} className="rounded-xl border px-3"><X size={15} /></button>}</div></form><div className="mt-5 space-y-2">{identifiers.map((item) => <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><div><p className="font-bold text-slate-800">{item.name}</p><p className="text-[11px] text-slate-500">{item.description || "No description"}</p></div><div className="flex gap-1"><button onClick={() => { setEditingId(item._id); setIdentifierForm({ name: item.name, description: item.description || "" }); }} className="rounded-lg p-2 text-slate-500 hover:bg-white"><Edit3 size={14} /></button><button onClick={() => deleteIdentifier.mutate({ id: item._id, companyId })} className="rounded-lg p-2 text-rose-600 hover:bg-white"><Trash2 size={14} /></button></div></div>)}{!identifiers.length && <p className="py-4 text-center text-xs text-slate-400">Add your first identifier.</p>}</div><div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-bold text-slate-800">Categories</h3><p className="mt-1 text-xs text-slate-500">Categories are the final classification shown in the audit.</p><form onSubmit={submitCategory} className="mt-3 space-y-2"><input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Category e.g. Salary" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Optional description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><div className="flex gap-2"><button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> {editingCategoryId ? "Update" : "Add"}</button>{editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(""); setCategoryForm({ name: "", description: "" }); }} className="rounded-xl border px-3"><X size={15} /></button>}</div></form><div className="mt-4 space-y-2">{categories.map((item) => <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><div><p className="font-bold text-slate-800">{item.name}</p><p className="text-[11px] text-slate-500">{item.description || "No description"}</p></div><div className="flex gap-1"><button onClick={() => { setEditingCategoryId(item._id); setCategoryForm({ name: item.name, description: item.description || "" }); }} className="rounded-lg p-2 text-slate-500 hover:bg-white"><Edit3 size={14} /></button><button onClick={() => deleteCategory.mutate({ id: item._id, companyId })} className="rounded-lg p-2 text-rose-600 hover:bg-white"><Trash2 size={14} /></button></div></div>)}{!categories.length && <p className="py-4 text-center text-xs text-slate-400">Add your first category.</p>}</div></div></section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-800">{financialYearInfo.label} Category Summary</h2><p className="text-xs text-slate-500">Only categorized rows are included in these totals.</p></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Category</th><th className="px-5 py-3">Debit rows</th><th className="px-5 py-3">Debit total</th><th className="px-5 py-3">Credit rows</th><th className="px-5 py-3">Credit total</th></tr></thead><tbody className="divide-y divide-slate-100">{categoryGroups.map((group) => <tr key={group.categoryId || group.categoryName}><td className="px-5 py-3 font-bold text-slate-800">{group.categoryName}</td><td className="px-5 py-3">{group.debit.count}</td><td className="px-5 py-3 font-semibold text-rose-700">{formatCurrency(group.debit.total)}</td><td className="px-5 py-3">{group.credit.count}</td><td className="px-5 py-3 font-semibold text-emerald-700">{formatCurrency(group.credit.total)}</td></tr>)}{!categoryGroups.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">Categorize transactions to build the summary.</td></tr>}</tbody></table></div></section>
    </div>}

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-bold text-slate-800">Transaction Review</h2><p className="text-xs text-slate-500">Assign or change a category on every imported row.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => downloadTransactions("ALL", auditRows.filter((row) => selectedTransactionIds.includes(row._id)))} disabled={!selectedTransactionIds.length} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={14} /> Download selected</button><button type="button" onClick={() => { const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedTransactionIds.includes(row._id)); if (allVisibleSelected) { setSelectedTransactionIds((current) => current.filter((id) => !visibleRows.some((row) => row._id === id))); return; } setSelectedTransactionIds((current) => Array.from(new Set([...current, ...visibleRows.map((row) => row._id)]))); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{visibleRows.length > 0 && visibleRows.every((row) => selectedTransactionIds.includes(row._id)) ? "Clear visible" : "Select all visible"}</button>{[["ALL", `All (${rowCounts.all})`], ["IDENTIFIED", `Categorized (${rowCounts.categorized})`], ["UNIDENTIFIED", `Uncategorized (${rowCounts.uncategorized})`]].map(([value, label]) => <button key={value} onClick={() => setRowView(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${rowView === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}</div></div><div className="max-h-[620px] overflow-auto"><table className="min-w-[1050px] w-full text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-3"><input type="checkbox" checked={visibleRows.length > 0 && visibleRows.every((row) => selectedTransactionIds.includes(row._id))} onChange={() => { const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedTransactionIds.includes(row._id)); if (allVisibleSelected) { setSelectedTransactionIds((current) => current.filter((id) => !visibleRows.some((row) => row._id === id))); return; } setSelectedTransactionIds((current) => Array.from(new Set([...current, ...visibleRows.map((row) => row._id)]))); }} className="h-4 w-4 rounded border-slate-300" /></th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Identifier</th><th className="px-4 py-3">Category</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleRows.map((row) => { const isSelected = selectedTransactionIds.includes(row._id); return <tr key={row._id} className={`${!row.categoryId ? "bg-amber-50/50" : "hover:bg-slate-50"} ${isSelected ? "ring-1 ring-blue-200" : ""}`}><td className="px-3 py-3"><input type="checkbox" checked={isSelected} onChange={() => setSelectedTransactionIds((current) => current.includes(row._id) ? current.filter((id) => id !== row._id) : [...current, row._id])} className="h-4 w-4 rounded border-slate-300" /></td><td className="whitespace-nowrap px-4 py-3">{new Date(row.transactionDate).toLocaleDateString("en-IN")}</td><td className="max-w-[390px] px-4 py-3 font-medium text-slate-800">{row.description}</td><td className={`px-4 py-3 text-xs font-bold ${row.direction === "DEBIT" ? "text-rose-700" : "text-emerald-700"}`}>{row.direction}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(row.amount)}</td><td className="px-4 py-3 text-xs text-slate-500">{row.identifierName || "-"}</td><td className="px-4 py-3"><select value={row.categoryId || ""} onChange={(event) => handleTransactionCategoryChange(row, event)} disabled={updateTransactionCategory.isPending} className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold"><option value="">Uncategorized</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></td></tr>; })}{!visibleRows.length && <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-400">No imported transactions for this financial year.</td></tr>}</tbody></table></div></section>

    {/* <section className="rounded-2xl border border-rose-200 bg-white shadow-sm"><div className="border-b border-rose-100 bg-rose-50 px-5 py-4"><h2 className="font-bold text-rose-900">Uncategorized Transactions</h2><p className="text-xs text-rose-700">Rows remain here until a category is selected. Categorizing a row moves it into the categorized view and summary.</p></div><div className="max-h-[360px] overflow-auto"><table className="min-w-[720px] w-full text-sm"><thead className="sticky top-0 bg-white text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Debit</th><th className="px-5 py-3">Credit</th></tr></thead><tbody className="divide-y divide-slate-100">{(overview.unmatched || []).map((row) => <tr key={row._id}><td className="px-5 py-3 whitespace-nowrap">{new Date(row.transactionDate).toLocaleDateString("en-IN")}</td><td className="px-5 py-3 font-medium">{row.description}</td><td className="px-5 py-3 text-rose-700">{formatCurrency(row.debitAmount)}</td><td className="px-5 py-3 text-emerald-700">{formatCurrency(row.creditAmount)}</td></tr>)}{!overview.unmatched?.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400">All rows are categorized.</td></tr>}</tbody></table></div></section> */}

    {preview && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold text-slate-900">Preview import</h2><p className="mt-1 text-xs text-slate-500">{preview.fileName} · {preview.transactions.length} rows · {preview.transactions.filter((row) => row.duplicate).length} duplicates will be skipped</p></div><button onClick={() => setPreview(null)}><X /></button></div><div className="max-h-[60vh] overflow-auto"><table className="min-w-[820px] w-full text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="px-4 py-3 text-left">Row</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-left">Import status</th></tr></thead><tbody>{preview.transactions.map((row) => <tr key={row.rowNumber} className={`border-t ${row.duplicate ? "bg-amber-50" : ""}`}><td className="px-4 py-2">{row.rowNumber}</td><td className="px-4 py-2">{row.transactionDate ? new Date(row.transactionDate).toLocaleDateString("en-IN") : "Invalid"}</td><td className="max-w-[360px] truncate px-4 py-2">{row.description || "Missing"}</td><td className="px-4 py-2 text-right">{formatCurrency(row.debitAmount)}</td><td className="px-4 py-2 text-right">{formatCurrency(row.creditAmount)}</td><td className={`px-4 py-2 font-semibold ${row.duplicate ? "text-amber-700" : "text-emerald-700"}`}>{row.duplicate ? row.duplicateReason : "Will import"}</td></tr>)}</tbody></table></div><div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setPreview(null)} className="rounded-xl border px-4 py-2 text-sm">Continue editing</button><button type="button" onClick={openSaveNameModal} disabled={uploadMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save instance</button></div></div></div>}
  </div>;
}

const Metric = ({ label, value, tone = "slate" }) => <div className={`rounded-2xl border p-5 shadow-sm ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${tone === "rose" ? "text-rose-900" : "text-slate-900"}`}>{value}</p></div>;
