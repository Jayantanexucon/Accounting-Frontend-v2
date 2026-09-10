import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Download, Edit3, FileSpreadsheet, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { useFinancialYear } from "../contexts/FinancialYearContext";
import { getFinancialYearInfo } from "../utils/scheduleReportUtil";
import {
  createAuditIdentifierApi,
  deleteAuditIdentifierApi,
  getExpenseAuditOverviewApi,
  listAuditIdentifiersApi,
  updateAuditIdentifierApi,
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

export default function ExpenseAuditPage() {
  const { user } = useAuth();
  const { selectedFinancialYearEnding, setSelectedFinancialYearEnding, financialYearInfo, financialYearOptions } = useFinancialYear();
  const companyId = JSON.parse(localStorage.getItem("selectedCompany") || "{}")._id || user?.company?._id;
  const queryClient = useQueryClient();
  const [identifierForm, setIdentifierForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState("");
  const [preview, setPreview] = useState(null);

  const identifiersQuery = useQuery({ queryKey: ["audit-identifiers", companyId], queryFn: () => listAuditIdentifiersApi(companyId), enabled: Boolean(companyId) });
  const overviewQuery = useQuery({ queryKey: ["expense-audit", companyId, selectedFinancialYearEnding], queryFn: () => getExpenseAuditOverviewApi(companyId, selectedFinancialYearEnding), enabled: Boolean(companyId) });
  const identifiers = identifiersQuery.data?.data || [];
  const overview = overviewQuery.data?.data || { groups: [], unmatched: [], summary: {} };
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["audit-identifiers", companyId] }); queryClient.invalidateQueries({ queryKey: ["expense-audit", companyId] }); };

  const saveIdentifier = useMutation({ mutationFn: editingId ? updateAuditIdentifierApi : createAuditIdentifierApi, onSuccess: () => { invalidate(); setIdentifierForm({ name: "", description: "" }); setEditingId(""); toast.success("Identifier saved"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not save identifier") });
  const deleteIdentifier = useMutation({ mutationFn: deleteAuditIdentifierApi, onSuccess: () => { invalidate(); toast.success("Identifier deleted"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not delete identifier") });
  const uploadMutation = useMutation({ mutationFn: uploadExpenseAuditApi, onSuccess: (response) => { invalidate(); setPreview(null); toast.success(response?.message || "Audit statement imported"); }, onError: (error) => toast.error(error?.response?.data?.message || "Could not import statement") });

  const grouped = useMemo(() => overview.groups || [], [overview.groups]);
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
      setPreview({ fileName: file.name, transactions });
    } catch (error) { toast.error(error.message || "Could not read workbook"); }
  };
  const confirmUpload = () => {
    if (!preview?.transactions?.length) return;
    if (preview.transactions.some((row) => !row.transactionDate || !row.description || (!row.debitAmount && !row.creditAmount))) {
      toast.error("Every row needs a valid date, description, and debit or credit amount");
      return;
    }
    uploadMutation.mutate({ companyId, financialYearEnding: selectedFinancialYearEnding, fileName: preview.fileName, replaceExistingFile: true, transactions: preview.transactions });
  };
  const submitIdentifier = (event) => {
    event.preventDefault();
    const name = identifierForm.name.trim();
    if (!name) return toast.error("Enter an identifier");
    saveIdentifier.mutate(editingId ? { id: editingId, companyId, ...identifierForm } : { companyId, ...identifierForm });
  };

  return <div className="mx-auto w-full max-w-[1900px] space-y-6 px-4 pb-8 xl:px-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Accounting control</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Expense Audit</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Import statement rows, match descriptions to your identifiers, and review debit and credit totals by financial year.</p></div>
        <div className="flex flex-wrap gap-2"><select value={selectedFinancialYearEnding} onChange={(event) => setSelectedFinancialYearEnding(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">{financialYearOptions.map((endingYear) => <option key={endingYear} value={endingYear}>{getFinancialYearInfo(endingYear).label}</option>)}</select><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"><Upload size={15} /> Import Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={readFile} /></label></div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-4"><Metric label="Rows" value={overview.summary.totalRows || 0} /><Metric label="Identified" value={overview.summary.identifiedRows || 0} /><Metric label="Unidentified" value={overview.summary.unmatchedRows || 0} tone="rose" /><Metric label="Net movement" value={formatCurrency(overview.summary.netAmount || 0)} /></div>

    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold text-slate-800">Identifiers</h2><ClipboardCheck size={17} className="text-blue-600" /></div><p className="mt-1 text-xs text-slate-500">A description containing an identifier is grouped under it.</p><form onSubmit={submitIdentifier} className="mt-4 space-y-2"><input value={identifierForm.name} onChange={(event) => setIdentifierForm({ ...identifierForm, name: event.target.value })} placeholder="Identifier e.g. SAL" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><input value={identifierForm.description} onChange={(event) => setIdentifierForm({ ...identifierForm, description: event.target.value })} placeholder="Optional description" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><div className="flex gap-2"><button className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white"><Plus size={15} /> {editingId ? "Update" : "Add"}</button>{editingId && <button type="button" onClick={() => { setEditingId(""); setIdentifierForm({ name: "", description: "" }); }} className="rounded-xl border px-3"><X size={15} /></button>}</div></form><div className="mt-5 space-y-2">{identifiers.map((item) => <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"><div><p className="font-bold text-slate-800">{item.name}</p><p className="text-[11px] text-slate-500">{item.description || "No description"}</p></div><div className="flex gap-1"><button onClick={() => { setEditingId(item._id); setIdentifierForm({ name: item.name, description: item.description || "" }); }} className="rounded-lg p-2 text-slate-500 hover:bg-white"><Edit3 size={14} /></button><button onClick={() => deleteIdentifier.mutate({ id: item._id, companyId })} className="rounded-lg p-2 text-rose-600 hover:bg-white"><Trash2 size={14} /></button></div></div>)}{!identifiers.length && <p className="py-4 text-center text-xs text-slate-400">Add your first identifier.</p>}</div></section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-800">{financialYearInfo.label} Audit Summary</h2><p className="text-xs text-slate-500">Grouped by identifier and transaction direction</p></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Identifier</th><th className="px-5 py-3">Debit rows</th><th className="px-5 py-3">Debit total</th><th className="px-5 py-3">Credit rows</th><th className="px-5 py-3">Credit total</th></tr></thead><tbody className="divide-y divide-slate-100">{grouped.map((group) => <tr key={group.identifierId || group.identifierName}><td className="px-5 py-3 font-bold text-slate-800">{group.identifierName}</td><td className="px-5 py-3">{group.debit.count}</td><td className="px-5 py-3 font-semibold text-rose-700">{formatCurrency(group.debit.total)}</td><td className="px-5 py-3">{group.credit.count}</td><td className="px-5 py-3 font-semibold text-emerald-700">{formatCurrency(group.credit.total)}</td></tr>)}{!grouped.length && <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-400">No imported rows for this financial year.</td></tr>}</tbody></table></div></section>
    </div>

    <section className="rounded-2xl border border-rose-200 bg-white shadow-sm"><div className="border-b border-rose-100 bg-rose-50 px-5 py-4"><h2 className="font-bold text-rose-900">Unidentified Transactions</h2><p className="text-xs text-rose-700">Add an identifier and re-import or use these descriptions to improve your master list.</p></div><div className="max-h-[360px] overflow-auto"><table className="min-w-[720px] w-full text-sm"><thead className="sticky top-0 bg-white text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Debit</th><th className="px-5 py-3">Credit</th></tr></thead><tbody className="divide-y divide-slate-100">{(overview.unmatched || []).map((row) => <tr key={row._id}><td className="px-5 py-3 whitespace-nowrap">{new Date(row.transactionDate).toLocaleDateString("en-IN")}</td><td className="px-5 py-3 font-medium">{row.description}</td><td className="px-5 py-3 text-rose-700">{formatCurrency(row.debitAmount)}</td><td className="px-5 py-3 text-emerald-700">{formatCurrency(row.creditAmount)}</td></tr>)}{!overview.unmatched?.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400">All rows are identified.</td></tr>}</tbody></table></div></section>

    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-bold text-slate-900">Preview import</h2><p className="text-xs text-slate-500">{preview.fileName} · {preview.transactions.length} rows</p></div><button onClick={() => setPreview(null)}><X /></button></div><div className="max-h-[60vh] overflow-auto"><table className="min-w-[700px] w-full text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="px-4 py-3 text-left">Row</th><th className="px-4 py-3 text-left">Date</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th></tr></thead><tbody>{preview.transactions.map((row) => <tr key={row.rowNumber} className="border-t"><td className="px-4 py-2">{row.rowNumber}</td><td className="px-4 py-2">{row.transactionDate ? new Date(row.transactionDate).toLocaleDateString("en-IN") : "Invalid"}</td><td className="max-w-[360px] truncate px-4 py-2">{row.description || "Missing"}</td><td className="px-4 py-2 text-right">{formatCurrency(row.debitAmount)}</td><td className="px-4 py-2 text-right">{formatCurrency(row.creditAmount)}</td></tr>)}</tbody></table></div><div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={() => setPreview(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><button onClick={confirmUpload} disabled={uploadMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><FileSpreadsheet size={15} /> Confirm import</button></div></div></div>}
  </div>;
}

const Metric = ({ label, value, tone = "slate" }) => <div className={`rounded-2xl border p-5 shadow-sm ${tone === "rose" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${tone === "rose" ? "text-rose-900" : "text-slate-900"}`}>{value}</p></div>;
