import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  FiArrowLeft,
  FiUploadCloud,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
  FiSave,
  FiLoader,
} from "react-icons/fi";
import { TbTableImport } from "react-icons/tb";
import { useAuth } from "../contexts/AuthContext";
import {
  uploadJournalExcelApi,
  confirmJournalExcelApi,
} from "../apis/journalApi";

// ─────────────────────────────────────────────────────────
// Helper: Format currency
// ─────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

// ─────────────────────────────────────────────────────────
// Badge colours for voucher types
// ─────────────────────────────────────────────────────────
const voucherColor = {
  SALES: "bg-emerald-100 text-emerald-800",
  PURCHASE: "bg-rose-100 text-rose-800",
  PAYMENT: "bg-blue-100 text-blue-800",
  RECEIPT: "bg-violet-100 text-violet-800",
  CONTRA: "bg-amber-100 text-amber-800",
  JOURNAL: "bg-indigo-100 text-indigo-800",
};

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function StepBadge({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-md transition-all duration-300 ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-blue-600 text-white ring-4 ring-blue-200"
            : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? <FiCheckCircle size={16} /> : n}
      </div>
      <span
        className={`text-sm font-semibold tracking-wide ${
          active ? "text-blue-700" : done ? "text-emerald-700" : "text-slate-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-5 shadow-lg text-center ${color}`}>
      <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
}

function EntryCard({ entry, index }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border shadow-md overflow-hidden ${
        entry.isValid
          ? "border-slate-200 bg-white"
          : "border-red-200 bg-red-50/40"
      }`}
    >
      {/* Card header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Voucher type badge */}
            <span
              className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                voucherColor[entry.voucherType] || "bg-gray-100 text-gray-700"
              }`}
            >
              {entry.voucherType || "—"}
            </span>

            {/* Date */}
            <span className="text-sm font-semibold text-slate-700">
              {entry.date}
            </span>

            {/* Entry ID if any */}
            {entry.entryId && (
              <span className="text-[11px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                ID: {entry.entryId}
              </span>
            )}

            {/* Status badge */}
            {entry.isValid ? (
              <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <FiCheckCircle size={11} /> Valid
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-black text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                <FiXCircle size={11} /> Error
              </span>
            )}
          </div>

          {entry.narration && (
            <p className="text-sm text-slate-500 truncate pr-4">{entry.narration}</p>
          )}

          {/* Entry-level errors */}
          {!entry.isValid && entry.errors?.length > 0 && (
            <div className="flex flex-col gap-0.5 mt-1">
              {entry.errors.map((e, i) => (
                <span key={i} className="text-xs text-red-600 flex items-start gap-1">
                  <FiAlertTriangle size={11} className="mt-0.5 shrink-0" />
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 mt-0.5">
          {open ? <FiChevronUp size={18} className="text-slate-400" /> : <FiChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2.5 text-left">Row</th>
                      <th className="px-4 py-2.5 text-left">Account</th>
                      <th className="px-4 py-2.5 text-right">Debit (₹)</th>
                      <th className="px-4 py-2.5 text-right">Credit (₹)</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entry.lines.map((line, li) => (
                      <tr
                        key={li}
                        className={
                          line.isValid
                            ? "hover:bg-slate-50"
                            : "bg-red-50 hover:bg-red-100/60"
                        }
                      >
                        <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">
                          #{line.rowNumber}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          <span>{line.accountName || line.accountCode}</span>
                          {line.accountCode !== line.accountName && (
                            <span className="ml-1.5 text-xs text-slate-400 font-mono">
                              ({line.accountCode})
                            </span>
                          )}
                          {line.errors?.map((e, ei) => (
                            <div key={ei} className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                              <FiAlertTriangle size={10} /> {e}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">
                          {line.debit > 0 ? fmt(line.debit) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">
                          {line.credit > 0 ? fmt(line.credit) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {line.isValid ? (
                            <FiCheckCircle size={14} className="text-emerald-500" />
                          ) : (
                            <FiXCircle size={14} className="text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black text-sm border-t-2 border-slate-200">
                      <td className="px-4 py-2.5 text-slate-500 text-xs" colSpan={2}>
                        Totals
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                        {fmt(entry.totalDebit)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-800">
                        {fmt(entry.totalCredit)}
                      </td>
                      <td className="px-4 py-2.5">
                        {entry.isBalanced ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Balanced
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            Unbalanced
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────

export default function JournalExcelUploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const companyId = user?.company?._id;

  const fileInputRef = useRef(null);
  const previewRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);   // { totalRows, totalEntries, validCount, invalidCount, validEntries, invalidEntries }

  // ── Step tracking ──────────────────────────────────────
  const step = preview ? 3 : file ? 1 : 1;

  // ── Drag & Drop ────────────────────────────────────────
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) acceptFile(dropped);
  }, []);

  const acceptFile = (f) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      toast.error("Only .xlsx and .xls files are accepted");
      return;
    }
    setFile(f);
    setPreview(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
    e.target.value = "";
  };

  // ── Download Sample Template ───────────────────────────
  const downloadTemplate = () => {
    const headers = [
      "Entry ID",
      "Date",
      "Voucher Type",
      "Narration",
      "Account Code",
      "Debit",
      "Credit",
    ];

    const rows = [
      ["JE001", "01/04/2026", "JOURNAL", "Opening stock entry", "ACC001", 50000, ""],
      ["JE001", "01/04/2026", "JOURNAL", "Opening stock entry", "ACC002", "", 50000],
      ["JE002", "02/04/2026", "PURCHASE", "Supplier invoice #INV-100", "ACC003", 25000, ""],
      ["JE002", "02/04/2026", "PURCHASE", "Supplier invoice #INV-100", "ACC004", "", 25000],
      ["", "03/04/2026", "RECEIPT", "Customer payment received", "ACC005", 12000, ""],
      ["", "03/04/2026", "RECEIPT", "Customer payment received", "ACC006", "", 12000],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal Template");
    XLSX.writeFile(wb, "Journal_Upload_Template.xlsx");
    toast.success("Template downloaded!");
  };

  // ── Upload & Preview ───────────────────────────────────
  const handleUpload = async () => {
    if (!file) return toast.warning("Please select a file first");
    if (!companyId) return toast.error("No company selected");

    try {
      setUploading(true);
      setPreview(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadJournalExcelApi(companyId, formData);
      setPreview(res.preview);

      // Scroll to preview after a tick
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);

      if (res.preview.validCount === 0) {
        toast.warning("No valid journal entries found — fix the errors and re-upload.");
      } else {
        toast.success(
          `Preview ready: ${res.preview.validCount} valid, ${res.preview.invalidCount} with errors`
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  // ── Confirm & Save ─────────────────────────────────────
  const handleConfirm = async () => {
    if (!preview?.validEntries?.length) return toast.warning("No valid entries to save");
    if (!companyId) return toast.error("No company selected");

    try {
      setSaving(true);
      const res = await confirmJournalExcelApi(companyId, {
        validEntries: preview.validEntries,
      });

      if (res.savedCount > 0) {
        toast.success(
          `✅ ${res.savedCount} journal ${res.savedCount === 1 ? "entry" : "entries"} saved successfully!`
        );
        navigate("/accounting/journals/list");
      } else {
        toast.error("No journals were saved. " + (res.failedEntries?.[0]?.reason || ""));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed — please try again");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setDragActive(false);
  };

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 pb-24">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/accounting/journals/list")}
              className="p-2.5 bg-white/60 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-200 group"
            >
              <FiArrowLeft size={18} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Upload Journal Entries via Excel
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Upload and validate journal entries in bulk before posting
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Progress Steps ── */}
        <div className="flex items-center gap-4 px-2">
          <StepBadge n="1" label="Upload File" active={!preview} done={!!preview} />
          <div className="flex-1 h-px bg-slate-200" />
          <StepBadge n="2" label="Processing" active={uploading} done={!!preview} />
          <div className="flex-1 h-px bg-slate-200" />
          <StepBadge n="3" label="Preview & Save" active={!!preview} done={false} />
        </div>

        {/* ── Step 1: Upload Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden"
        >
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #60a5fa 100%)" }}
          >
            <TbTableImport size={22} className="text-white" />
            <div>
              <h2 className="text-base font-black text-white">Step 1 — Upload Excel File</h2>
              <p className="text-blue-100 text-xs">Accepts .xlsx and .xls formats only</p>
            </div>
          </div>

          <div className="p-6">
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-blue-500 bg-blue-50 scale-[1.01]"
                  : file
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center shadow-md">
                    <FiFileText size={26} className="text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800 text-lg">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp;
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="text-red-500 hover:underline font-medium"
                    >
                      Remove
                    </button>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center shadow-md">
                    <FiUploadCloud size={30} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-base">
                      Drag & drop your Excel file here
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      or <span className="text-blue-600 font-semibold">click to browse</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">Supported: .xlsx, .xls · Max 10 MB</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button
                onClick={downloadTemplate}
                className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all shadow-sm"
              >
                <FiDownload size={16} />
                Download Sample Template
              </button>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing file…
                  </>
                ) : (
                  <>
                    <FiUploadCloud size={16} />
                    Upload & Preview
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Format Guide ── */}
        {!preview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <FiFileText size={16} className="text-blue-600" />
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Required Excel Format
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column reference table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2.5 text-left">Column</th>
                        <th className="px-3 py-2.5 text-center">Required</th>
                        <th className="px-3 py-2.5 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ["Entry ID", "No", "Groups rows into one entry (highest priority)"],
                        ["Date", "Yes", "DD/MM/YYYY or DD-MM-YYYY"],
                        ["Voucher Type", "Yes", "SALES / PURCHASE / PAYMENT / RECEIPT / CONTRA / JOURNAL"],
                        ["Narration", "No", "Fallback grouping key if Entry ID is absent"],
                        ["Account Code", "Yes", "Must exist in your account master"],
                        ["Debit", "No", "Numeric. Leave blank if credit entry"],
                        ["Credit", "No", "Numeric. Leave blank if debit entry"],
                      ].map(([col, req, note]) => (
                        <tr key={col} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-mono text-blue-700 text-xs font-semibold">{col}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`text-xs font-bold ${req === "Yes" ? "text-rose-600" : "text-slate-400"}`}>
                              {req}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 text-xs">{note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grouping rules */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Grouping & Validation Rules
                  </h4>
                  {[
                    ["🔑 Grouping — Primary", "Rows with the same Entry ID are grouped into one journal entry."],
                    ["🔑 Grouping — Fallback", "If Entry ID is blank, rows with the same Date + Voucher Type + Narration are grouped."],
                    ["⚖️ Balance Check", "Total Debit must equal Total Credit for each grouped entry."],
                    ["🏦 Account Lookup", "Account Code must match a code in your Account master."],
                    ["🎟️ Voucher Type", "All rows in one group must have the same Voucher Type."],
                    ["📋 Minimum Lines", "Each entry must have at least 2 lines."],
                    ["✅ Partial Save", "Only valid entries are saved — invalid ones are clearly shown."],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-2.5 text-sm">
                      <span className="text-base">{title.split(" ")[0]}</span>
                      <div>
                        <span className="font-semibold text-slate-700">{title.slice(2)} — </span>
                        <span className="text-slate-500">{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Preview Section ── */}
        <AnimatePresence>
          {preview && (
            <motion.div
              ref={previewRef}
              key="preview"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryCard
                  label="Total Rows"
                  value={preview.totalRows}
                  color="bg-slate-700 text-white"
                />
                <SummaryCard
                  label="Entries Found"
                  value={preview.totalEntries}
                  color="bg-blue-600 text-white"
                />
                <SummaryCard
                  label="✅ Valid"
                  value={preview.validCount}
                  color="bg-emerald-500 text-white"
                />
                <SummaryCard
                  label="❌ Errors"
                  value={preview.invalidCount}
                  color={preview.invalidCount > 0 ? "bg-red-500 text-white" : "bg-slate-200 text-slate-500"}
                />
              </div>

              {/* Invalid entries */}
              {preview.invalidEntries?.length > 0 && (
                <div className="bg-red-50/60 border border-red-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-red-200 flex items-center gap-2">
                    <FiXCircle size={18} className="text-red-600" />
                    <h3 className="font-black text-red-800">
                      Entries with Errors ({preview.invalidEntries.length})
                    </h3>
                    <span className="ml-auto text-xs text-red-500">
                      These will NOT be saved
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {preview.invalidEntries.map((entry, i) => (
                      <EntryCard key={entry.entryKey} entry={entry} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Valid entries */}
              {preview.validEntries?.length > 0 && (
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-emerald-200 flex items-center gap-2">
                    <FiCheckCircle size={18} className="text-emerald-600" />
                    <h3 className="font-black text-emerald-800">
                      Valid Entries ({preview.validEntries.length})
                    </h3>
                    <span className="ml-auto text-xs text-emerald-600">
                      Click any entry to expand · All will be saved
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {preview.validEntries.map((entry, i) => (
                      <EntryCard key={entry.entryKey} entry={entry} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* No valid entries message */}
              {preview.validCount === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
                  <FiAlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800">No valid entries to save</p>
                    <p className="text-sm text-amber-600 mt-1">
                      Please fix the highlighted errors and re-upload your file.
                    </p>
                  </div>
                </div>
              )}

              {/* Sticky action bar */}
              <div className="sticky bottom-6 flex flex-col sm:flex-row gap-3 justify-end bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-4">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all"
                >
                  Upload Different File
                </button>

                {preview.validCount > 0 && (
                  <button
                    onClick={handleConfirm}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm transition-all shadow-lg shadow-emerald-600/25"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Saving journals…
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        Confirm & Save {preview.validCount} {preview.validCount === 1 ? "Entry" : "Entries"}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
