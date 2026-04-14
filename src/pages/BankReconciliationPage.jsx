import { useMemo, useState } from "react";
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
  PARTIALLY_MATCHED: "bg-amber-100 text-amber-700 border-amber-200",
  UNMATCHED: "bg-rose-100 text-rose-700 border-rose-200",
  EXACT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POTENTIAL: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
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

const readWorkbookRows = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

const getAvailablePaymentAmount = (payment) => {
  const total = Math.abs(Number(payment.amount || 0));
  const allocated = (payment.reconciliationAllocations || []).reduce(
    (sum, item) => sum + Number(item.allocatedAmount || 0),
    0,
  );
  return Math.max(0, total - allocated);
};

const getAvailableBankAmount = (bankTransaction) => {
  const total = Math.abs(Number(bankTransaction.amount || 0));
  const allocated = (bankTransaction.reconciliationAllocations || []).reduce(
    (sum, item) => sum + Number(item.allocatedAmount || 0),
    0,
  );
  return Math.max(0, total - allocated);
};

const StatusPill = ({ value }) => (
  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyles[value] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
    {value.replace(/_/g, " ")}
  </span>
);

export default function BankReconciliationPage() {
  const { user } = useAuth();
  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
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

  const queryKey = ["bank-reconciliation-v2", companyId, statusFilter, search, selectedLedgerId];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bank-reconciliation-v2", companyId] });

  const accountsQuery = useQuery({
    queryKey: ["accounts", companyId],
    queryFn: () => getAccountsApi(companyId),
    enabled: Boolean(companyId),
  });

  const allAccounts = accountsQuery.data?.data || [];
  const bankAccounts = allAccounts.filter(acc => 
    (acc.groupName || "").toLowerCase().includes("bank") || 
    (acc.groupName || "").toLowerCase().includes("cash")
  );

  const overviewQuery = useQuery({
    queryKey,
    queryFn: () => getReconciliationOverviewApi(companyId, { 
      status: statusFilter, 
      search,
      bankLedgerId: selectedLedgerId
    }),
    enabled: Boolean(companyId && selectedLedgerId),
  });

  const uploadMutation = useMutation({
    mutationFn: uploadBankStatementApi,
    onSuccess: () => {
      invalidate();
      toast.success("Bank statement imported");
    },
  });

  const autoMutation = useMutation({
    mutationFn: () => autoMatchBankTransactionsApi(companyId),
    onSuccess: (response) => {
      invalidate();
      const exactCount = response?.data?.exactMatches?.length || 0;
      const potentialCount = response?.data?.potentialMatches?.length || 0;
      toast.success(`Auto reconcile done. Exact: ${exactCount}, Potential: ${potentialCount}`);
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
  const bankTransactions = useMemo(() => rawData.bankTransactions || [], [rawData.bankTransactions]);
  const payments = useMemo(() => rawData.payments || [], [rawData.payments]);
  const openInvoices = rawData.openInvoices || [];
  const brs = rawData.brs || {};

  const selectedBank = useMemo(
    () => bankTransactions.find((item) => item._id === selectedBankId) || null,
    [bankTransactions, selectedBankId],
  );

  const filteredPayments = useMemo(() => {
    if (!selectedBank) return payments;
    return payments.filter(
      (payment) =>
        payment.reconciliationStatus !== "MATCHED" ||
        (payment.matchedBankTransactionIds || []).includes(selectedBank._id),
    );
  }, [payments, selectedBank]);

  const selectedAllocations = useMemo(
    () => Object.entries(allocationDrafts).filter(([, amount]) => Number(amount) > 0),
    [allocationDrafts],
  );

  const totalDraftAllocation = useMemo(
    () => selectedAllocations.reduce((sum, [, amount]) => sum + Number(amount || 0), 0),
    [selectedAllocations],
  );

  const availableSelectedBankAmount = selectedBank ? getAvailableBankAmount(selectedBank) : 0;

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;
    if (!selectedLedgerId) {
      toast.error("Please select a bank account first");
      return;
    }

    try {
      const rows = await readWorkbookRows(file);
      const transactions = rows.map((row) => ({
        transactionDate: row.transactionDate || row.date || row.Date,
        valueDate: row.valueDate || row["Value Date"],
        amount: Number(row.amount || row.Amount || 0),
        type: row.type || row.direction || row.Direction,
        reference: row.reference || row.Reference || row.UTR || row.utr,
        description: row.description || row.Description || row.Remarks,
        balance: row.balance || row.Balance,
        fileName: file.name,
        bankLedgerId: selectedLedgerId, // Added this
      }));
      await uploadMutation.mutateAsync({ companyId, transactions });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Upload failed");
    } finally {
      event.target.value = "";
    }
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
      paymentData: {
        amountPaid: Number(paymentForm.amountPaid || availableSelectedBankAmount || 0),
        paymentDate: paymentForm.paymentDate || selectedBank.transactionDate,
        reference: paymentForm.reference || selectedBank.reference,
        notes: paymentForm.notes || selectedBank.description,
      },
    });
  };

  return (
    <div className="container mx-auto px-4 space-y-5 max-w-[1600px]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tally Style BRS</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
            <div className="mt-4 w-full max-w-sm">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Select Bank Account
              </label>
              <AccountSearchDropdown
                value={selectedLedgerId}
                onChange={setSelectedLedgerId}
                options={bankAccounts}
                placeholder="Choose bank ledger..."
              />
            </div>
            <p className="mt-4 max-w-3xl text-sm text-slate-500">
              Match bank statement lines with posted payments, suggest exact and timing matches, allow partial allocation, and create missing payments without changing journals during reconciliation.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800">
              <Upload size={14} /> Import Bank Statement
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            </label>
            <button
              onClick={() => autoMutation.mutate()}
              disabled={autoMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={autoMutation.isPending ? "animate-spin" : ""} />
              Auto Reconcile
            </button>
          </div>
        </div>

        {overviewQuery.isError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Failed to load bank reconciliation data: {overviewError || "Unknown error"}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference or description"
              className="w-full rounded-xl border border-slate-200 px-9 py-2.5 text-sm outline-none transition focus:border-blue-300"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["ALL", "UNMATCHED", "PARTIALLY_MATCHED", "MATCHED"].map((item) => (
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

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Book Balance</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{fmtCurrency(brs.bookBalance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Bank Balance</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{fmtCurrency(brs.bankBalance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Difference</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{fmtCurrency(brs.difference)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Unmatched Items</p>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {(rawData.paymentSummary?.unmatched || 0) + (rawData.bankSummary?.unmatched || 0)}
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
        <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm max-w-full ${activePanel !== "bank" ? "hidden xl:block" : ""}`}>
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-slate-800">Bank Transactions</h2>
          </div>
          <div className="max-h-[700px] overflow-x-auto overflow-y-auto max-w-full">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {["Date", "Amount", "Reference", "Type", "Status"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-semibold text-slate-500">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bankTransactions.map((bankTransaction) => (
                  <tr
                    key={bankTransaction._id}
                    onClick={() => {
                      setSelectedBankId(bankTransaction._id === selectedBankId ? null : bankTransaction._id);
                      setAllocationDrafts({});
                      setMatchNote("");
                      setPaymentForm((current) => ({
                        ...current,
                        paymentDate: bankTransaction.transactionDate?.slice?.(0, 10) || "",
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
                    <td className="px-4 py-3 text-slate-600">{fmtDate(bankTransaction.transactionDate)}</td>
                    <td className="px-4 py-3 font-black text-slate-900">{fmtCurrency(bankTransaction.amount)}</td>
                    <td className="px-4 py-3 text-slate-600">{bankTransaction.reference || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{bankTransaction.type}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill value={bankTransaction.reconciliationStatus} />
                        {(bankTransaction.matchSuggestions || []).some((item) => item.matchType === "POTENTIAL") && (
                          <StatusPill value="POTENTIAL" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!bankTransactions.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No bank transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm max-w-full ${activePanel !== "payments" ? "hidden xl:block" : ""}`}>
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-slate-800">Book Payments</h2>
          </div>
          <div className="max-h-[700px] overflow-x-auto overflow-y-auto max-w-full">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {["Entry/Ref", "Date", "Amount", "Free", "Status", "Allocate"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left font-semibold text-slate-500">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.map((payment) => {
                  const suggestion = selectedSuggestions.find((item) => item.paymentId === payment._id);
                  const allocatedValue = allocationDrafts[payment._id] || "";
                  const freeAmount = getAvailablePaymentAmount(payment);

                  return (
                    <tr key={payment._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">
                          {payment.paymentDetails?.invoice?.invoiceNo || payment.reference || "Manual Entry"}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{payment.description || "No description"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDate(payment.date)}</td>
                      <td className="px-4 py-3 font-black text-slate-900">
                        {fmtCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtCurrency(freeAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusPill value={payment.reconciliationStatus} />
                          {suggestion && <StatusPill value={suggestion.matchType} />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={allocatedValue}
                            onChange={(event) => toggleDraft(payment, event.target.value)}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 outline-none focus:border-blue-300"
                          />
                          <button
                            onClick={() => addSuggestedAllocation(payment)}
                            disabled={!selectedBank || freeAmount <= 0}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                          >
                            Add
                          </button>
                          {(payment.reconciliationAllocations || []).map((allocation) => (
                            <button
                              key={`${payment._id}-${allocation.bankTransactionId}`}
                              onClick={() =>
                                unlinkMutation.mutate({
                                  companyId,
                                  paymentId: payment._id,
                                  bankTransactionId: allocation.bankTransactionId,
                                })
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                            >
                              <Unlink size={12} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredPayments.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No book entries available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`space-y-5 ${activePanel !== "actions" ? "hidden xl:block" : ""}`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Manual Reconcile</h2>
              <Link2 size={16} className="text-blue-600" />
            </div>

            {!selectedBank ? (
              <p className="mt-4 text-sm text-slate-500">Select a bank transaction to allocate payments.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">Selected Bank Row</p>
                  <p className="mt-1 font-bold text-slate-900">{selectedBank.reference || "No reference"}</p>
                  <p className="text-xs text-slate-500">{fmtDate(selectedBank.transactionDate)}</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{fmtCurrency(selectedBank.amount)}</p>
                  <p className="text-xs text-slate-500">Available: {fmtCurrency(availableSelectedBankAmount)}</p>
                </div>

                {selectedSuggestions.length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">Suggested Matches</p>
                    <div className="mt-2 space-y-2">
                      {selectedSuggestions.slice(0, 5).map((suggestion) => (
                        <div key={`${suggestion.paymentId}-${suggestion.matchType}`} className="rounded-lg border border-blue-100 bg-white p-2">
                          <div className="flex items-center justify-between gap-2">
                            <StatusPill value={suggestion.matchType} />
                            <span className="text-[11px] font-semibold text-blue-700">Score {suggestion.score}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-600">{(suggestion.reasons || []).join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Reconciliation Note</label>
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
                    <span className="font-semibold text-slate-600">Draft Allocation</span>
                    <span className="font-black text-slate-900">{fmtCurrency(totalDraftAllocation)}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Remaining after draft: {fmtCurrency(availableSelectedBankAmount - totalDraftAllocation)}
                  </div>
                </div>

                <button
                  onClick={submitManualMatch}
                  disabled={!selectedAllocations.length || manualMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check size={14} /> Save Match
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Create Missing Payment</h2>
              <FilePlus2 size={16} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Use this only when the bank entry exists but the payment is missing in books.
            </p>

            <div className="mt-4 space-y-3">
              <select
                value={paymentForm.invoiceId}
                onChange={(event) => setPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              >
                <option value="">Select invoice</option>
                {openInvoices.map((invoice) => (
                  <option key={invoice._id} value={invoice._id}>
                    {invoice.invoiceNo} | {invoice.billTo?.name} | {fmtCurrency(invoice.remainingAmount)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={paymentForm.amountPaid}
                onChange={(event) => setPaymentForm((current) => ({ ...current, amountPaid: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
              <input
                type="date"
                value={paymentForm.paymentDate ? paymentForm.paymentDate.slice(0, 10) : ""}
                onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
              <input
                placeholder="Reference"
                value={paymentForm.reference}
                onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-300"
              />
              <textarea
                rows={3}
                placeholder="Notes"
                value={paymentForm.notes}
                onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
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
                <span className="font-bold text-slate-900">{fmtCurrency(brs.bookBalance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bank Balance</span>
                <span className="font-bold text-slate-900">{fmtCurrency(brs.bankBalance)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Difference</span>
                <span className="font-bold text-slate-900">{fmtCurrency(brs.difference)}</span>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                Timing differences stay unmatched. Reconciliation only links entries; it does not rewrite journals.
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
