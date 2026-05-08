import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FilePlus2,
  Filter,
  Landmark,
  Link2,
  RefreshCw,
  Search,
  Unlink,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  autoMatchBankTransactionsApi,
  createPaymentFromBankTransactionApi,
  getReconciliationOverviewApi,
  manualMatchApi,
  unmatchApi,
  uploadBankStatementApi,
} from "../apis/reconciliationApi";
import { getAccountsApi } from "../apis/accountApi";
import AccountSearchDropdown from "../components/AccountSearchDropdown";

const statusStyles = {
  MATCHED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-100 text-amber-700 border-amber-200",
  UNMATCHED: "bg-rose-100 text-rose-700 border-rose-200",
  EXACT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POTENTIAL: "bg-blue-50 text-blue-700 border-blue-200",
};

const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
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

const getBookEntryDate = (payment) =>
  payment?.date ||
  payment?.paymentDate ||
  payment?.journalDate ||
  payment?.paymentDetails?.paymentDate ||
  payment?.paymentDetails?.date ||
  null;

const getBookEntryReference = (payment) =>
  payment?.paymentDetails?.invoice?.invoiceNo ||
  payment?.reference ||
  payment?.paymentDetails?.reference ||
  payment?.journalNumber ||
  payment?.journalLineId ||
  "Manual Entry";

const getBookEntryDescription = (payment) =>
  payment?.description ||
  payment?.paymentDetails?.notes ||
  payment?.paymentDetails?.invoice?.clientName ||
  payment?.paymentDetails?.invoice?.customerName ||
  "No description";

const getBookEntryTotalAmount = (payment) =>
  Number(
    payment?.totalAmount ??
      payment?.grossAmount ??
      payment?.paymentDetails?.amountPaid ??
      payment?.amount ??
      0,
  );

const getJournalLines = (payment) =>
  Array.isArray(payment?.journalLines) ? payment.journalLines : [];

const readWorkbookRows = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
};

const excelEpoch = Date.UTC(1899, 11, 30);

const parseUploadedDate = (value) => {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(excelEpoch + value * 24 * 60 * 60 * 1000).toISOString();
  }

  const text = String(value).trim();
  if (!text) return null;

  const directDate = new Date(text);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const normalized = text.replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const year = Number(c.length === 2 ? `20${c}` : c);
    const day = Number(a);
    const month = Number(b);
    const parsed = new Date(year, month - 1, day);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed.toISOString();
    }
  }

  return null;
};

const getAvailablePaymentAmount = (payment) => {
  return Math.max(
    0,
    Number(
      payment.unreconciledAmount ??
        payment.availableAmount ??
        payment.amount ??
        0,
    ),
  );
};

const getAvailableBankAmount = (bankTransaction) => {
  return Math.max(
    0,
    Number(bankTransaction.availableAmount ?? bankTransaction.amount ?? 0),
  );
};

const StatusPill = ({ value }) => (
  <span
    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyles[value] || "bg-slate-100 text-slate-600 border-slate-200"}`}
  >
    {value.replace(/_/g, " ")}
  </span>
);

const operationToneStyles = {
  loading: {
    badge: "bg-blue-100 text-blue-700",
    panel: "border-blue-200 bg-blue-50",
  },
  success: {
    badge: "bg-emerald-100 text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50",
  },
  info: {
    badge: "bg-amber-100 text-amber-700",
    panel: "border-amber-200 bg-amber-50",
  },
  error: {
    badge: "bg-rose-100 text-rose-700",
    panel: "border-rose-200 bg-rose-50",
  },
};

const OperationStatusModal = ({ state, onClose }) => {
  if (!state.open) return null;

  const tone = operationToneStyles[state.variant] || operationToneStyles.info;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${tone.panel}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.badge}`}
          >
            {state.variant === "loading" ? (
              <RefreshCw size={22} className="animate-spin" />
            ) : state.variant === "success" ? (
              <CheckCircle2 size={22} />
            ) : state.variant === "error" ? (
              <AlertTriangle size={22} />
            ) : (
              <Landmark size={22} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">{state.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {state.message}
            </p>
            {state.details ? (
              <p className="mt-2 text-xs font-medium text-slate-500">
                {state.details}
              </p>
            ) : null}
          </div>
        </div>

        {state.variant !== "loading" ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default function BankReconciliationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const selectedCompany = JSON.parse(
    localStorage.getItem("selectedCompany") || "{}",
  );
  const companyId = selectedCompany?._id || user?.company?._id;
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [allocationDrafts, setAllocationDrafts] = useState({});
  const [matchNote, setMatchNote] = useState("");
  const [activePanel, setActivePanel] = useState("bank");
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    amountPaid: "",
    paymentDate: "",
    reference: "",
    notes: "",
  });
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const [operationStatus, setOperationStatus] = useState({
    open: false,
    source: null,
    variant: "loading",
    title: "",
    message: "",
    details: "",
  });

  const queryKey = [
    "bank-reconciliation-v2",
    companyId,
    statusFilter,
    search,
    selectedLedgerId,
  ];
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["bank-reconciliation-v2", companyId],
    });

  const accountsQuery = useQuery({
    queryKey: ["accounts", companyId],
    queryFn: () => getAccountsApi(companyId),
    enabled: Boolean(companyId),
  });

  const allAccounts = accountsQuery.data?.data || [];
  const bankAccounts = allAccounts.filter((acc) =>
    (acc.groupName || "").toLowerCase().includes("bank"),
  );

  const overviewQuery = useQuery({
    queryKey,
    queryFn: () =>
      getReconciliationOverviewApi(companyId, {
        status: statusFilter,
        search,
        bankLedgerId: selectedLedgerId,
      }),
    enabled: Boolean(companyId && selectedLedgerId),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadBankStatementApi,
    onMutate: () => {
      setOperationStatus({
        open: true,
        source: "upload",
        variant: "loading",
        title: "Uploading bank statement",
        message: "Your bank statement is being uploaded and validated.",
        details: "Please wait while bank rows are imported.",
      });
    },
    onSuccess: (response) => {
      invalidate();
      setActivePanel("bank");
      const importedCount =
        response?.data?.importedCount || response?.data?.count || 0;
      setOperationStatus({
        open: true,
        source: "upload",
        variant: "success",
        title: "Bank statement uploaded",
        message: response?.message || "Bank statement uploaded successfully.",
        details: importedCount
          ? `${importedCount} transaction row${importedCount === 1 ? "" : "s"} imported.`
          : "",
      });
      toast.success(
        response?.message || "Bank statement uploaded successfully",
      );
    },
    onError: (error) => {
      setOperationStatus({
        open: true,
        source: "upload",
        variant: "error",
        title: "Upload failed",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Bank statement upload failed.",
        details: "Check the file and try again.",
      });
    },
  });

  const autoMutation = useMutation({
    mutationFn: () => autoMatchBankTransactionsApi(companyId, selectedLedgerId),
    onSuccess: (response) => {
      invalidate();
      const exactCount =
        response?.data?.summary?.exactMatchCount ??
        response?.data?.exactMatches?.length ??
        0;
      const potentialCount =
        response?.data?.summary?.potentialMatchCount ??
        response?.data?.potentialMatches?.length ??
        0;
      const noMatches =
        response?.data?.noMatches ?? (exactCount === 0 && potentialCount === 0);

      setOperationStatus({
        open: true,
        source: "auto",
        variant: noMatches ? "info" : "success",
        title: noMatches ? "No matches found" : "Auto reconciliation completed",
        message: noMatches
          ? response?.message ||
            "No matching transactions were found for the selected account."
          : response?.message || "Auto reconciliation completed successfully.",
        details: noMatches
          ? "No exact or potential matches were identified. Review the imported bank rows and book entries, then reconcile manually if needed."
          : `Exact matches: ${exactCount} • Potential matches: ${potentialCount}`,
      });

      if (noMatches) {
        toast.info(response?.message || "No matching transactions found");
        return;
      }

      toast.success(
        `Auto reconciliation completed. Exact: ${exactCount}, Potential: ${potentialCount}`,
      );
    },
    onMutate: () => {
      setOperationStatus({
        open: true,
        source: "auto",
        variant: "loading",
        title: "Auto reconciliation in progress",
        message: "Matching bank statement rows with book entries.",
        details: "This may take a few seconds.",
      });
    },
    onError: (error) => {
      setOperationStatus({
        open: true,
        source: "auto",
        variant: "error",
        title: "Auto reconciliation failed",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Auto reconciliation could not be completed.",
        details:
          "Try again after reviewing the selected ledger and imported statement rows.",
      });
    },
  });

  const manualMutation = useMutation({
    mutationFn: manualMatchApi,
    onSuccess: () => {
      invalidate();
      setAllocationDrafts({});
      setMatchNote("");
      toast.success("Reconciliation saved");
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unmatchApi,
    onSuccess: () => {
      invalidate();
      toast.success("Link removed");
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: createPaymentFromBankTransactionApi,
    onSuccess: () => {
      invalidate();
      setPaymentForm({
        invoiceId: "",
        amountPaid: "",
        paymentDate: "",
        reference: "",
        notes: "",
      });
      toast.success("Payment created and linked");
    },
  });

  const rawData = overviewQuery.data?.data || {};
  const overviewError =
    overviewQuery.error?.response?.data?.message ||
    overviewQuery.error?.message ||
    "";
  const bankTransactions = useMemo(
    () => rawData.bankTransactions || [],
    [rawData.bankTransactions],
  );
  const payments = useMemo(() => rawData.payments || [], [rawData.payments]);
  const openInvoices = rawData.openInvoices || [];
  const brs = rawData.brs || {};
  const selectedLedger = useMemo(
    () => bankAccounts.find((item) => item._id === selectedLedgerId) || null,
    [bankAccounts, selectedLedgerId],
  );

  const selectedBank = useMemo(
    () => bankTransactions.find((item) => item._id === selectedBankId) || null,
    [bankTransactions, selectedBankId],
  );

  useEffect(() => {
    if (!selectedLedgerId) {
      setOperationStatus((current) =>
        current.source === "ledger"
          ? { ...current, open: false, source: null }
          : current,
      );
      return;
    }

    if (overviewQuery.isFetching) {
      setOperationStatus((current) => {
        if (current.open && current.source && current.source !== "ledger") {
          return current;
        }

        return {
          open: true,
          source: "ledger",
          variant: "loading",
          title: "Loading ledger data",
          message:
            "Fetching bank transactions and book entries for the selected ledger.",
          details: "Book Entries will appear once the ledger data is ready.",
        };
      });
      return;
    }

    setOperationStatus((current) =>
      current.source === "ledger"
        ? { ...current, open: false, source: null }
        : current,
    );
  }, [overviewQuery.isFetching, selectedLedgerId]);

  useEffect(() => {
    if (!operationStatus.open || operationStatus.variant === "loading")
      return undefined;

    const timer = window.setTimeout(() => {
      setOperationStatus((current) => ({
        ...current,
        open: false,
        source: null,
      }));
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [operationStatus.open, operationStatus.variant]);

  useEffect(() => {
    setSelectedBankId(null);
    setAllocationDrafts({});
    setMatchNote("");
  }, [selectedLedgerId]);

  const filteredPayments = useMemo(() => {
    if (!selectedBank) return payments;
    return payments.filter(
      (payment) =>
        payment.reconciliationStatus !== "MATCHED" ||
        (payment.matchedBankTransactionIds || []).includes(selectedBank._id),
    );
  }, [payments, selectedBank]);

  const selectedAllocations = useMemo(
    () =>
      Object.entries(allocationDrafts).filter(
        ([, amount]) => Number(amount) > 0,
      ),
    [allocationDrafts],
  );

  const totalDraftAllocation = useMemo(
    () =>
      selectedAllocations.reduce(
        (sum, [, amount]) => sum + Number(amount || 0),
        0,
      ),
    [selectedAllocations],
  );

  const availableSelectedBankAmount = selectedBank
    ? getAvailableBankAmount(selectedBank)
    : 0;

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;
    if (!selectedLedgerId) {
      toast.error("Please select a bank account first");
      return;
    }

    try {
      const rows = await readWorkbookRows(file);
      if (!rows.length) {
        throw new Error(
          "The selected file does not contain any transaction rows",
        );
      }

      const transactions = rows.map((row, index) => {
        const transactionDate = parseUploadedDate(
          row.transactionDate ||
            row.date ||
            row.Date ||
            row["Transaction Date"],
        );
        const valueDate = parseUploadedDate(row.valueDate || row["Value Date"]);

        if (!transactionDate) {
          throw new Error(
            `Invalid transaction date in uploaded file at row ${index + 2}`,
          );
        }

        return {
          transactionDate,
          valueDate,
          amount: Number(row.amount || row.Amount || 0),
          type: row.type || row.direction || row.Direction,
          reference: row.reference || row.Reference || row.UTR || row.utr,
          description: row.description || row.Description || row.Remarks,
          balance: row.balance || row.Balance,
          fileName: file.name,
          bankLedgerId: selectedLedgerId, // Added this
        };
      });
      await uploadMutation.mutateAsync({ companyId, transactions });
    } catch (error) {
      setOperationStatus({
        open: true,
        source: "upload",
        variant: "error",
        title: "Upload failed",
        message:
          error?.response?.data?.message || error.message || "Upload failed",
        details: "Use a valid bank statement file and try again.",
      });
      toast.error(
        error?.response?.data?.message || error.message || "Upload failed",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const rows = [
      {
        "Transaction Date": "06-05-2026",
        "Value Date": "06-05-2026",
        Amount: 5900,
        Direction: "CREDIT",
        Reference: "UTR123456789",
        Description: "NEFT from ABC Pvt Ltd",
        Balance: 125000.5,
      },
      {
        "Transaction Date": "07-05-2026",
        "Value Date": "07-05-2026",
        Amount: 2500,
        Direction: "DEBIT",
        Reference: "CHG998877",
        Description: "Bank charges",
        Balance: 122500.5,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Transaction Date",
        "Value Date",
        "Amount",
        "Direction",
        "Reference",
        "Description",
        "Balance",
      ],
    });
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Statement");
    XLSX.writeFile(workbook, "bank-reconciliation-upload-template.xlsx");
  };

  const toggleDraft = (payment, value) => {
    setAllocationDrafts((current) => ({
      ...current,
      [payment._id]: value,
    }));
  };

  const addSuggestedAllocation = (payment) => {
    if (!selectedBank) return;
    const suggested = Math.min(
      getAvailablePaymentAmount(payment),
      getAvailableBankAmount(selectedBank) - totalDraftAllocation,
    );
    if (suggested <= 0) return;
    toggleDraft(payment, suggested.toFixed(2));
  };

  const submitManualMatch = () => {
    if (!selectedBank) {
      toast.error("Select a bank transaction first");
      return;
    }

    if (!selectedAllocations.length) {
      toast.error("Add at least one payment allocation");
      return;
    }

    if (totalDraftAllocation - availableSelectedBankAmount > 0.001) {
      toast.error("Allocation exceeds available bank amount");
      return;
    }

    manualMutation.mutate({
      companyId,
      bankTransactionId: selectedBank._id,
      note: matchNote,
      matches: selectedAllocations.map(([paymentId, amount]) => ({
        paymentId,
        allocatedAmount: Number(amount),
      })),
    });
  };

  const selectedSuggestions = selectedBank?.matchSuggestions || [];

  const createPaymentFromBank = () => {
    if (!selectedBank) {
      toast.error("Select a bank transaction first");
      return;
    }
    if (!paymentForm.invoiceId) {
      toast.error("Choose an invoice");
      return;
    }

    createPaymentMutation.mutate({
      companyId,
      bankTransactionId: selectedBank._id,
      invoiceId: paymentForm.invoiceId,
      bankLedgerId: selectedLedgerId,
      paymentData: {
        amountPaid: Number(
          paymentForm.amountPaid || availableSelectedBankAmount || 0,
        ),
        paymentDate: paymentForm.paymentDate || selectedBank.transactionDate,
        paymentMode: "BANK_TRANSFER",
        reference: paymentForm.reference || selectedBank.reference,
        notes: paymentForm.notes || selectedBank.description,
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1900px] space-y-6 px-4 pb-6 xl:px-6 2xl:px-8">
      <OperationStatusModal
        state={operationStatus}
        onClose={() =>
          setOperationStatus((current) => ({
            ...current,
            open: false,
            source: null,
          }))
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Tally Style BRS
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Bank Reconciliation
            </h1>
            <div className="mt-4 w-full max-w-xl">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Select Bank Account
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <AccountSearchDropdown
                    value={selectedLedgerId}
                    onChange={setSelectedLedgerId}
                    options={bankAccounts}
                    placeholder="Choose bank ledger..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLedgerId("")}
                  disabled={!selectedLedgerId}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={14} />
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-3 min-h-6">
              {selectedLedger ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <span>{selectedLedger.name}</span>
                  <span className="text-blue-400">•</span>
                  <span>{selectedLedger.groupName || "BANK"}</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No bank ledger selected
                </p>
              )}
            </div>

            <p className="mt-4 max-w-3xl text-sm text-slate-500">
              Match bank statement lines with posted payments, suggest exact and
              timing matches, allow partial allocation, and create missing
              payments without changing journals during reconciliation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                navigate("/accounting/bank-reconciliation/report", {
                  state: { selectedLedgerId },
                })
              }
              disabled={!selectedLedgerId}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="View monthly reconciliation analysis report"
            >
              <FileText size={14} />
              Monthly Report
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800">
              <Upload size={14} /> Import Bank Statement
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                disabled={!selectedLedgerId}
                onChange={handleFileUpload}
              />
            </label>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <FileText size={14} />
              Download Excel Format
            </button>

            <button
              onClick={() => autoMutation.mutate()}
              disabled={autoMutation.isPending || !selectedLedgerId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={autoMutation.isPending ? "animate-spin" : ""}
              />
              Auto Reconcile
            </button>
          </div>
          {/* <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800">
              <Upload size={14} /> Import Bank Statement
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                disabled={!selectedLedgerId}
                onChange={handleFileUpload}
              />
            </label>
            <button
              onClick={() => autoMutation.mutate()}
              disabled={autoMutation.isPending || !selectedLedgerId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={autoMutation.isPending ? "animate-spin" : ""} />
              Auto Reconcile
            </button>
          </div> */}
        </div>

        {overviewQuery.isError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Failed to load bank reconciliation data:{" "}
            {overviewError || "Unknown error"}
          </div>
        )}

        {!selectedLedgerId && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Select a bank ledger first to load bank statement rows and book
            entries.
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference or description"
              className="w-full rounded-xl border border-slate-200 px-9 py-2.5 text-sm outline-none transition focus:border-blue-300"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", "UNMATCHED", "PARTIAL", "MATCHED"].map((item) => (
              <button
                key={item}
                onClick={() => setStatusFilter(item)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  statusFilter === item
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Filter size={12} />
                {item.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Bank Balance</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {fmtCurrency(Math.abs(brs.bankBalance || 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Book Balance</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {fmtCurrency(Math.abs(brs.bookBalance || 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Difference</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {fmtCurrency(Math.abs(brs.difference || 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            Unmatched Items
          </p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {(rawData.paymentSummary?.unmatched || 0) +
              (rawData.bankSummary?.unmatched || 0)}
          </p>
        </div>
      </div>

      <div className="xl:hidden flex flex-wrap gap-2">
        {[
          { key: "bank", label: "Bank Transactions" },
          { key: "payments", label: "Book Payments" },
          { key: "actions", label: "Match Panel" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActivePanel(item.key)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              activePanel === item.key
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.55fr)_minmax(300px,0.72fr)]">
        <section
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm max-w-full ${activePanel !== "bank" ? "hidden xl:block" : ""}`}
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-slate-800">
              Bank Transactions
            </h2>
            <p className="text-xs text-slate-400">
              Uploaded bank statement rows for the selected ledger
            </p>
          </div>
          <div className="max-h-[760px] overflow-x-auto overflow-y-auto max-w-full">
            <table className="min-w-[640px] divide-y divide-slate-100 text-[12px]">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {["Date", "Amount", "Reference", "Type", "Status"].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bankTransactions.map((bankTransaction) => (
                  <tr
                    key={bankTransaction._id}
                    onClick={() => {
                      setSelectedBankId(
                        bankTransaction._id === selectedBankId
                          ? null
                          : bankTransaction._id,
                      );
                      setAllocationDrafts({});
                      setMatchNote("");
                      setPaymentForm((current) => ({
                        ...current,
                        paymentDate:
                          bankTransaction.transactionDate?.slice?.(0, 10) || "",
                        reference: bankTransaction.reference || "",
                        notes: bankTransaction.description || "",
                      }));
                    }}
                    className={`cursor-pointer transition ${
                      selectedBankId === bankTransaction._id
                        ? "bg-blue-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {fmtDate(bankTransaction.transactionDate)}
                    </td>
                    <td className="px-3 py-2.5 font-black text-slate-900 whitespace-nowrap">
                      {fmtCurrency(bankTransaction.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[180px] truncate">
                      {bankTransaction.reference || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {bankTransaction.type}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill
                          value={bankTransaction.reconciliationStatus}
                        />
                        {(bankTransaction.matchSuggestions || []).some(
                          (item) => item.matchType === "POTENTIAL",
                        ) && <StatusPill value="POTENTIAL" />}
                      </div>
                    </td>
                  </tr>
                ))}
                {!bankTransactions.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      No bank transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm max-w-full ${activePanel !== "payments" ? "hidden xl:block" : ""}`}
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-slate-800">Book Entries</h2>
            <p className="text-xs text-slate-400">
              All journal debit and credit lines related to the selected bank
              account
            </p>
          </div>
          <div className="max-h-[760px] overflow-x-auto overflow-y-auto max-w-full">
            <table className="min-w-[920px] divide-y divide-slate-100 text-[12px]">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {[
                    "Entry/Ref",
                    "Date",
                    "Journal Lines",
                    "Unreconciled",
                    "Total",
                    "Status",
                    "Allocate",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.map((payment) => {
                  const suggestion = selectedSuggestions.find(
                    (item) => item.paymentId === payment._id,
                  );
                  const allocatedValue = allocationDrafts[payment._id] || "";
                  const freeAmount = getAvailablePaymentAmount(payment);
                  const bookEntryDate = getBookEntryDate(payment);
                  const bookEntryReference = getBookEntryReference(payment);
                  const bookEntryDescription = getBookEntryDescription(payment);
                  const bookEntryTotalAmount = getBookEntryTotalAmount(payment);
                  const journalLines = getJournalLines(payment);

                  return (
                    <tr key={payment._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 min-w-[150px]">
                        <div className="font-bold text-slate-800">
                          {bookEntryReference}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2">
                          {bookEntryDescription}
                        </div>
                        {payment.journalNumber && (
                          <div className="mt-1 text-[11px] font-medium text-slate-400">
                            {payment.journalNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {fmtDate(bookEntryDate)}
                      </td>
                      <td className="px-3 py-2.5 min-w-[260px]">
                        <div className="space-y-1.5">
                          {journalLines.length ? (
                            journalLines.map((line) => (
                              <div
                                key={line._id}
                                className={`rounded-lg border px-2.5 py-2 ${
                                  line.isBankLedgerLine
                                    ? "border-blue-400 bg-blue-100"
                                    : "border-slate-200 bg-slate-50  "
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] font-semibold text-slate-800">
                                      {line.accountName || "Unknown Account"}
                                    </div>
                                    {/* <div className="text-xs text-slate-500">
                                      {line.accountCode || "—"}
                                      {line.isBankLedgerLine ? " • Selected bank ledger line" : ""}
                                    </div> */}
                                    {line.description ? (
                                      <div className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                                        {line.description}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-[10px] font-semibold text-slate-700 whitespace-nowrap">
                                    {Number(line.debitAmount || 0) > 0 ? (
                                      <div>
                                        Dr {fmtCurrency(line.debitAmount)}
                                      </div>
                                    ) : null}
                                    {Number(line.creditAmount || 0) > 0 ? (
                                      <div>
                                        Cr {fmtCurrency(line.creditAmount)}
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">
                              No related journal lines found
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-black text-slate-900 whitespace-nowrap">
                        {fmtCurrency(
                          payment.unreconciledAmount ?? payment.amount,
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                        {fmtCurrency(bookEntryTotalAmount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <StatusPill value={payment.reconciliationStatus} />
                          {suggestion && (
                            <StatusPill value={suggestion.matchType} />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={allocatedValue}
                            onChange={(event) =>
                              toggleDraft(payment, event.target.value)
                            }
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] outline-none focus:border-blue-300"
                          />
                          <button
                            onClick={() => addSuggestedAllocation(payment)}
                            disabled={!selectedBank || freeAmount <= 0}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Add
                          </button>
                          {(payment.reconciliationAllocations || []).map(
                            (allocation) => (
                              <button
                                key={`${payment._id}-${allocation.bankTransactionId}`}
                                onClick={() =>
                                  unlinkMutation.mutate({
                                    companyId,
                                    paymentId: payment._id,
                                    bankTransactionId:
                                      allocation.bankTransactionId,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                              >
                                <Unlink size={12} />
                              </button>
                            ),
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredPayments.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-8 text-center text-slate-400"
                    >
                      {selectedLedgerId
                        ? "No book entries available for this bank ledger"
                        : "Select a bank ledger to view book entries"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className={`space-y-5 ${activePanel !== "actions" ? "hidden xl:block" : ""}`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Manual Reconcile
              </h2>
              <Link2 size={16} className="text-blue-600" />
            </div>

            {!selectedBank ? (
              <p className="mt-4 text-sm text-slate-500">
                Select a bank transaction to allocate payments.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Selected Bank Row
                  </p>
                  <p className="mt-1 font-bold text-slate-900">
                    {selectedBank.reference || "No reference"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmtDate(selectedBank.transactionDate)}
                  </p>
                  <p className="mt-2 text-base font-black text-slate-900">
                    {fmtCurrency(selectedBank.amount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Available: {fmtCurrency(availableSelectedBankAmount)}
                  </p>
                </div>

                {selectedSuggestions.length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">
                      Suggested Matches And Diagnostics
                    </p>
                    <div className="mt-2 space-y-2">
                      {selectedSuggestions.slice(0, 5).map((suggestion) => (
                        <div
                          key={`${suggestion.paymentId}-${suggestion.matchType}`}
                          className="rounded-lg border border-blue-100 bg-white p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <StatusPill value={suggestion.matchType} />
                            <span className="text-[11px] font-semibold text-blue-700">
                              Score {suggestion.score}
                            </span>
                          </div>
                          {suggestion.reference || suggestion.amount ? (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {suggestion.reference || "No ref"} •{" "}
                              {fmtCurrency(suggestion.amount)} •{" "}
                              {fmtDate(suggestion.date)}
                            </div>
                          ) : null}
                          {(suggestion.reasons || []).length > 0 ? (
                            <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2">
                              <p className="text-[11px] font-semibold text-emerald-700">
                                Why it matched
                              </p>
                              <p className="mt-1 text-[11px] text-slate-600">
                                {suggestion.reasons.join(", ")}
                              </p>
                            </div>
                          ) : null}
                          {(suggestion.failures || []).length > 0 ? (
                            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-2">
                              <p className="text-[11px] font-semibold text-amber-700">
                                Why it did not become exact
                              </p>
                              <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600">
                                {suggestion.failures
                                  .slice(0, 4)
                                  .map((failure) => (
                                    <li key={failure}>{failure}</li>
                                  ))}
                              </ul>
                            </div>
                          ) : null}
                          {(suggestion.sharedTokens || []).length > 0 ? (
                            <p className="mt-2 text-[11px] text-blue-700">
                              Shared tokens:{" "}
                              {suggestion.sharedTokens.slice(0, 5).join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    Reconciliation Note
                  </label>
                  <textarea
                    value={matchNote}
                    onChange={(event) => setMatchNote(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                    placeholder="Optional audit note"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">
                      Draft Allocation
                    </span>
                    <span className="font-black text-slate-900">
                      {fmtCurrency(totalDraftAllocation)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Remaining after draft:{" "}
                    {fmtCurrency(
                      availableSelectedBankAmount - totalDraftAllocation,
                    )}
                  </div>
                </div>

                <button
                  onClick={submitManualMatch}
                  disabled={
                    !selectedAllocations.length || manualMutation.isPending
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={14} /> Save Match
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Create Missing Payment
              </h2>
              <FilePlus2 size={16} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Use this only when the bank entry exists but the payment is
              missing in books.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={paymentForm.invoiceId}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    invoiceId: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              >
                <option value="">Select invoice</option>
                {openInvoices.map((invoice) => (
                  <option key={invoice._id} value={invoice._id}>
                    {invoice.invoiceNo} | {invoice.billTo?.name} |{" "}
                    {fmtCurrency(invoice.remainingAmount)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={paymentForm.amountPaid}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    amountPaid: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
              <input
                type="date"
                value={
                  paymentForm.paymentDate
                    ? paymentForm.paymentDate.slice(0, 10)
                    : ""
                }
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    paymentDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
              <input
                placeholder="Reference"
                value={paymentForm.reference}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    reference: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
              <textarea
                rows={3}
                placeholder="Notes"
                value={paymentForm.notes}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />

              <button
                onClick={createPaymentFromBank}
                disabled={!selectedBank || createPaymentMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Create Payment And Link
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">BRS Snapshot</h2>
              <Landmark size={16} className="text-slate-600" />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Book Balance</span>
                <span className="font-bold text-slate-900">
                  {fmtCurrency(Math.abs(brs.bookBalance || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bank Balance</span>
                <span className="font-bold text-slate-900">
                  {fmtCurrency(Math.abs(brs.bankBalance || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Difference</span>
                <span className="font-bold text-slate-900">
                  {fmtCurrency(Math.abs(brs.difference || 0))}
                </span>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                Timing differences stay unmatched. Reconciliation only links
                entries; it does not rewrite journals.
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Flow:</span>
          <span>1. Import bank statement.</span>
          <span>2. Auto reconcile exact matches.</span>
          <span>3. Review potential and partial candidates.</span>
          <span>4. Manually allocate, unlink, or create missing payment.</span>
        </div>
      </div>
    </div>
  );
}
