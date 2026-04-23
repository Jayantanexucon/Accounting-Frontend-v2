import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { getJournalByIdApi } from "../apis/journalApi";
import JournalDetailsModal from "./JournalDetailsModal";
import {
  getInvoicePaymentsApi,
  recordInvoicePaymentApi,
  validateInvoiceAccountsApi,
} from "../apis/invoice.api";

// Lucide Icons
import { X, Loader2, CheckCircle, AlertCircle, Calendar, CreditCard, Banknote, Calculator, Receipt, FileText, User, ChevronDown } from "lucide-react";

const PaymentReceiptModal = ({ open, onClose, onSuccess, invoiceData }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [accountValidation, setAccountValidation] = useState(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("bank_transfer");
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({
    totalAmount: 0,
    totalReceived: 0,
    pendingAmount: 0,
  });

  const getPaymentReceivedAmount = (payment = {}) =>
    Number(payment.receivedAmount ?? payment.amountReceived ?? payment.amountPaid ?? 0);

  const getPaymentTdsAmount = (payment = {}) =>
    Number(payment.tdsAdjusted ?? payment.tdsAmount ?? 0);

  const getPaymentSettledAmount = (payment = {}) =>
    Number(payment.grossAmount ?? getPaymentReceivedAmount(payment) + getPaymentTdsAmount(payment));

  const getJournalId = (journalRef) =>
    typeof journalRef === "object" && journalRef !== null ? journalRef._id : journalRef;

  // Payment form state
  const [formData, setFormData] = useState({
    paymentDate: dayjs().format("YYYY-MM-DD"),
    amountPaid: 0,
    paymentMode: "bank_transfer",
    referenceNumber: "",
    bankAccountId: "",
    tdsAmount: 0,
    remarks: "",
    createJournal: true,
  });

  useEffect(() => {
    if (open && invoiceData) {
      if (invoiceData.approvalStatus !== "Approved") {
        setError("Invoice must be approved before recording payments");
        toast.error("Please approve the invoice first");
        return;
      }

      resetState();
      loadInvoiceData();
    }
  }, [open, invoiceData]);

  useEffect(() => {
    if (open && invoiceData) {
      if (invoiceData.approvalStatus !== "Approved") {
        setError("Invoice must be approved before recording payments");
        toast.error("Please approve the invoice first");
        return;
      }

      // Check if sales journal is posted
      if (!invoiceData.salesJournalId) {
        setError("Sales journal must be posted before recording payments");
        toast.error("Please post the sales journal first");
        return;
      }

      resetState();
      loadInvoiceData();
    }
  }, [open, invoiceData]);

  const resetState = () => {
    setLoading(false);
    setError(null);
    setPaymentHistory([]);
    setAccountValidation(null);
    setShowAdvanced(true);
    setSelectedJournal(null);
    setJournalModalOpen(false);
    setFormData({
      paymentDate: dayjs().format("YYYY-MM-DD"),
      amountPaid: calculateDefaultAmount(),
      paymentMode: "bank_transfer",
      referenceNumber: "",
      bankAccountId: "",
      tdsAmount: 0,
      remarks: "",
      createJournal: true,
    });
    setPaymentSummary({
      totalAmount: 0,
      totalReceived: 0,
      pendingAmount: 0,
    });
  };

  const calculateDefaultAmount = () => {
    if (!invoiceData) return 0;

    // Use paymentSummary if available, otherwise calculate from invoiceData
    if (paymentSummary.pendingAmount > 0) {
      return paymentSummary.pendingAmount;
    }

    // Calculate pending amount from invoiceData
    const totalReceived = invoiceData.payments?.reduce((sum, payment) => sum + getPaymentSettledAmount(payment), 0) || 0;

    const totalAmount = invoiceData.amountDue || invoiceData.invoiceAmount || 0;
    const pendingAmount = totalAmount - totalReceived;

    return Math.max(0, pendingAmount);
  };

  const loadInvoiceData = async () => {
    if (!invoiceData || !user?.company?._id) return;

    setLoading(true);
    try {
      // Load payment history
      const paymentRes = await getInvoicePaymentsApi(
        user.company._id,
        invoiceData._id,
      );

      if (paymentRes?.data) {
        const payments = Array.isArray(paymentRes.data) ? paymentRes.data : [];
        setPaymentHistory(Array.isArray(payments) ? payments : []);

        const totalReceived = payments.reduce(
          (sum, payment) => sum + getPaymentReceivedAmount(payment),
          0,
        );
        const totalAmount = Number(invoiceData.amountDue || invoiceData.invoiceAmount || 0);
        const invoiceTds = Number(invoiceData?.tdsAmount || invoiceData?.totalTDSAmount || 0);
        const netPayable = Number(invoiceData?.netPayable || totalAmount - invoiceTds);
        const pendingAmount = Math.max(0, netPayable - totalReceived);

        setPaymentSummary({
          totalAmount,
          totalReceived,
          pendingAmount,
          netPayable,
          invoiceTds,
        });
        setFormData((prev) => ({
          ...prev,
          amountPaid: pendingAmount,
          tdsAmount: 0,
        }));
      }
      const accountRes = await validateInvoiceAccountsApi(user.company._id);
      setAccountValidation(accountRes.data);
    } catch (error) {
      console.error("Error loading invoice data:", error);
      setError("Failed to load invoice details");
      toast.error("Failed to load payment information");
    } finally {
      setLoading(false);
    }
  };

  const validateAccountsForPayment = async () => {
    if (!user?.company?._id) return;

    setLoading(true);
    try {
      const response = await validateInvoiceAccountsApi(user.company._id);
      setAccountValidation(response.data);

      if (response.data?.allRequiredAccountsExist) {
        toast.success("All payment accounts are configured");
      } else {
        const missing = response.data?.missingAccounts?.filter((acc) => !acc.optional) || [];
        if (missing.length > 0) {
          toast.error(`${missing.length} required accounts missing`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error validating accounts:", error);
      toast.error("Failed to validate accounts");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!invoiceData || !user?.company?._id) return;

    if (invoiceData.approvalStatus !== "Approved") {
      toast.error("Payment can be recorded only after invoice approval");
      return;
    }

    // Double-check sales journal is posted
    if (!invoiceData.salesJournalId) {
      toast.error("Sales journal must be posted before recording payments");
      return;
    }

    // Validation
    if (formData.amountPaid < 0) {
      toast.error("Payment amount cannot be negative");
      return;
    }

    const pendingAmount = paymentSummary.pendingAmount || calculateDefaultAmount();

    if (formData.amountPaid <= 0) {
      toast.error("Enter a payment amount");
      return;
    }

    if (formData.amountPaid > pendingAmount) {
      toast.error(`Payment exceeds outstanding amount of ₹${pendingAmount.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate accounts if journal creation is requested
      if (formData.createJournal && !(Number(formData.amountPaid || 0) === 0 && Number(formData.tdsAmount || 0) > 0)) {
        const accountsValid = await validateAccountsForPayment();
        if (!accountsValid) {
          setLoading(false);
          return;
        }
      }

      const response = await recordInvoicePaymentApi({
        invoiceId: invoiceData._id,
        companyId: user.company._id,
        clientId: invoiceData?.billTo?._id || invoiceData?.billTo?.clientId || "",
        amountPaid: formData.amountPaid,
        tdsAmount: formData.tdsAmount,
        paymentDate: formData.paymentDate,
        referenceNumber: formData.referenceNumber,
        remarks: formData.remarks,
        paymentMode: Number(formData.amountPaid || 0) > 0 ? formData.paymentMode : "other",
      });

      toast.success("Payment recorded successfully!");

      if (onSuccess) {
        onSuccess({
          ...(response?.payment?.data || {}),
          receivedAmount: Number(formData.amountPaid || 0),
          tdsAmount: Number(formData.tdsAmount || 0),
        });
      }

      onClose();
    } catch (error) {
      console.error("Error recording payment:", error);
      const errorMessage = error.response?.data?.message || "Failed to record payment";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    // Use paymentSummary if available
    if (paymentSummary.totalAmount > 0) {
      return paymentSummary;
    }

    // Fallback calculation
    if (!invoiceData) return { totalAmount: 0, totalReceived: 0, pendingAmount: 0, netPayable: 0, invoiceTds: 0 };

    const totalAmount = Number(invoiceData.amountDue || invoiceData.invoiceAmount || 0);
    const invoiceTds = Number(invoiceData?.tdsAmount || invoiceData?.totalTDSAmount || 0);
    const netPayable = Number(invoiceData?.netPayable || totalAmount - invoiceTds);
    
    const totalReceived = Array.isArray(paymentHistory)
      ? paymentHistory.reduce((sum, payment) => sum + getPaymentReceivedAmount(payment), 0)
      : 0;
    const pendingAmount = Math.max(0, netPayable - totalReceived);

    return { totalAmount, totalReceived, pendingAmount, netPayable, invoiceTds };
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleOpenJournal = async (journalId) => {
    if (!journalId || !user?.company?._id) return;
    try {
      const response = await getJournalByIdApi(user.company._id, getJournalId(journalId));
      setSelectedJournal(response.data || response);
      setJournalModalOpen(true);
    } catch (error) {
      console.error("Error loading journal details:", error);
      toast.error("Failed to load journal details");
    }
  };

  const paymentModes = [
    { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
    { value: "cash", label: "Cash", icon: "💵" },
    { value: "cheque", label: "Cheque", icon: "📄" },
    { value: "online", label: "Online Payment", icon: "🌐" },
    { value: "upi", label: "UPI", icon: "📱" },
    { value: "card", label: "Credit/Debit Card", icon: "💳" },
  ];

  if (!open) return null;

  const totals = calculateTotals();
  const invoiceTds = Number(invoiceData?.tdsAmount || invoiceData?.totalTDSAmount || 0);
  const netPayable = totals.totalAmount - invoiceTds;
  const paymentAmount = Number(formData.amountPaid || 0);
  const remainingAfterPayment = Math.max(0, totals.pendingAmount - paymentAmount);
  const paymentExceedsOutstanding = paymentAmount > totals.pendingAmount;
  const hasNegativeValues = formData.amountPaid < 0;
  const submitDisabled =
    loading ||
    totals.pendingAmount <= 0 ||
    hasNegativeValues ||
    paymentAmount <= 0 ||
    paymentExceedsOutstanding;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-700 to-green-500 text-white p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Banknote className="h-6 w-6 mr-3" />
              <div>
                <h2 className="text-lg font-semibold">Record Payment Receipt</h2>
                <p className="text-sm opacity-90">Invoice: {invoiceData?.invoiceNo}</p>
                {!invoiceData?.salesJournalId && <p className="text-xs bg-red-500 text-white px-2 py-1 rounded mt-1">⚠️ Sales journal not posted</p>}
              </div>
            </div>
            <button onClick={handleClose} disabled={loading} className="hover:bg-green-600 p-1 rounded-full disabled:opacity-50">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading && !paymentHistory.length ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin h-10 w-10 text-green-600 mb-4" />
              <p className="text-gray-600">Loading invoice details...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="font-semibold text-red-700">Error</h3>
              </div>
              <p className="text-red-600 text-sm">{error}</p>
              <button onClick={loadInvoiceData} className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm">
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Invoice Summary */}
              {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className={`grid gap-3 ${hasTdsReference ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-1 md:grid-cols-3"}`}>
                  <div className="rounded-lg border border-blue-200 bg-white/70 p-3 text-center">
                    <div className="break-words text-l font-bold text-blue-700 md:text-xl">₹{totals.totalAmount.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-blue-600">Invoice Total</div>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-white/70 p-3 text-center">
                    <div className="break-words text-l font-bold text-green-600 md:text-xl">₹{totals.totalReceived.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-green-600">Settled</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white/70 p-3 text-center">
                    <div className={`break-words text-l font-bold md:text-xl ${totals.pendingAmount > 0 ? "text-red-600" : "text-green-600"}`}>₹{totals.pendingAmount.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-gray-600">Outstanding</div>
                  </div>
                  {hasTdsReference && (
                    <>
                      <div className="rounded-lg border border-violet-200 bg-white/70 p-3 text-center">
                        <div className="break-words text-l font-bold text-violet-700 md:text-xl">₹{totalReferenceTds.toFixed(2)}</div>
                        <div className="mt-1 text-xs text-violet-600">Total TDS</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white/70 p-3 text-center">
                        <div className="break-words text-l font-bold text-violet-500 md:text-xl">₹{usedReferenceTds.toFixed(2)}</div>
                        <div className="mt-1 text-xs text-violet-500">Used TDS</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white/70 p-3 text-center">
                        <div className={`break-words text-l font-bold md:text-xl ${remainingReferenceTds > 0 ? "text-violet-700" : "text-slate-500"}`}>₹{remainingReferenceTds.toFixed(2)}</div>
                        <div className="mt-1 text-xs text-gray-600">TDS Left</div>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-3 text-sm text-blue-700">
                  Client: <span className="font-semibold">{invoiceData?.billTo?.name}</span>
                  {invoiceData?.billTo?.GSTIN && <span className="ml-3">GSTIN: {invoiceData.billTo.GSTIN}</span>}
                </div>
              </div> */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
  <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
    {/* Total Invoice Amount */}
    <div className="rounded-md border border-blue-200 bg-white/80 p-2 text-center">
      <div className="text-sm font-bold text-blue-700">₹{totals.totalAmount.toFixed(2)}</div>
      <div className="text-[11px] text-blue-600">Total Invoice Amount</div>
    </div>

    {/* Net Payable Amount */}
    <div className="rounded-md border border-green-200 bg-white/80 p-2 text-center">
      <div className="text-sm font-bold text-green-600">₹{netPayable.toFixed(2)}</div>
      <div className="text-[11px] text-green-600">Net Payable Amount</div>
    </div>

    {/* Pending Amount */}
    <div className="rounded-md border border-slate-200 bg-white/80 p-2 text-center">
      <div className={`text-sm font-bold ${totals.pendingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
        ₹{totals.pendingAmount.toFixed(2)}
      </div>
      <div className="text-[11px] text-gray-600">Pending Amount</div>
    </div>
  </div>

  {/* Client Info - Compact */}
  <div className="mt-2 text-xs text-blue-700 flex flex-wrap items-center gap-x-3 gap-y-1">
    <span>Client: <span className="font-semibold">{invoiceData?.billTo?.name}</span></span>
    {invoiceData?.billTo?.GSTIN && <span>GSTIN: <span className="font-mono">{invoiceData.billTo.GSTIN}</span></span>}
  </div>
</div>
              

              {/* Payment Form */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <Receipt className="h-5 w-5 text-green-500 mr-2" />
                  Payment Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Banknote className="h-4 w-4 inline mr-1" />
                      Payment Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={formData.amountPaid}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amountPaid: Math.min(parseFloat(e.target.value) || 0, totals.pendingAmount) }))}
                        min="0"
                        max={totals.pendingAmount}
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="text-xs text-gray-500 mt-1">Max: ₹{totals.pendingAmount.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  {Number(formData.amountPaid || 0) > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CreditCard className="h-4 w-4 inline mr-1" />
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {paymentModes.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => {
                            setSelectedPaymentMode(mode.value);
                            setFormData((prev) => ({ ...prev, paymentMode: mode.value }));
                          }}
                          className={`p-3 rounded-lg border text-sm flex flex-col items-center justify-center ${
                            selectedPaymentMode === mode.value ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-lg mb-1">{mode.icon}</span>
                          <span>{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                  {/* Reference Number */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                      placeholder="e.g., UPI Ref No, Cheque No, Transaction ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Additional notes about this payment..."
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="border-t pt-4">
                  <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center text-sm text-gray-600 hover:text-gray-800">
                    <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                    Advanced Options
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="createJournal"
                          checked={formData.createJournal}
                          onChange={(e) => setFormData((prev) => ({ ...prev, createJournal: e.target.checked }))}
                          className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <label htmlFor="createJournal" className="ml-2 text-sm text-gray-700">
                          Create RECEIPT journal for this payment (recommended)
                        </label>
                      </div>

                      {formData.createJournal && accountValidation && (
                        <div className="text-sm">
                          {accountValidation.allRequiredAccountsExist ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              All required accounts are configured
                            </div>
                          ) : (
                            <div className="text-amber-600">
                              <AlertCircle className="h-4 w-4 inline mr-1" />
                              Some accounts need configuration
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Pending Amount</span>
                          <span className="font-semibold text-slate-900">₹{totals.pendingAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-gray-600">Payment Amount</span>
                          <span className="font-semibold text-slate-900">₹{paymentAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 border-t border-emerald-200 pt-2">
                          <span className="font-medium text-gray-700">Remaining After Payment</span>
                          <span className={`font-bold ${paymentExceedsOutstanding ? "text-red-600" : "text-slate-900"}`}>
                            ₹{remainingAfterPayment.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(paymentExceedsOutstanding || hasNegativeValues) && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {hasNegativeValues
                      ? "Negative payment values are not allowed."
                      : "Payment cannot exceed the pending amount."}
                  </div>
                )}

                {/* Payment History */}
                {paymentHistory.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Previous Payments ({paymentHistory.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {paymentHistory.map((payment, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-sm">₹{getPaymentReceivedAmount(payment).toFixed(2)}</div>
                              <div className="text-xs text-gray-600">
                                {dayjs(payment.paymentDate).format("DD MMM YYYY")}
                                {payment.referenceNumber && ` • ${payment.referenceNumber}`}
                              </div>
                              {Number(payment.tdsAdjusted || payment.tdsAmount || 0) > 0 && (
                                <div className="text-xs text-violet-600 mt-1">
                                  TDS: ₹{getPaymentTdsAmount(payment).toFixed(2)} | Settlement: ₹{getPaymentSettledAmount(payment).toFixed(2)}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 text-xs rounded-full ${payment.status === "posted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                {payment.paymentMode || "bank_transfer"}
                              </span>
                              {payment.journalId && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenJournal(payment.journalId)}
                                  className="text-xs text-blue-600 mt-1 font-semibold hover:text-blue-800"
                                >
                                  Journal: {payment.paymentJournal?.number || payment.journalNumber || "View"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex justify-between">
            <button onClick={handleClose} disabled={loading} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50">
              Cancel
            </button>

            <div className="space-x-3">
              <button
                onClick={handleSubmitPayment}
                disabled={submitDisabled}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 inline mr-2" />
                    Processing...
                  </>
                ) : (
                  `Record Settlement (₹${paymentAmount.toFixed(2)})`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <JournalDetailsModal
        open={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        journal={selectedJournal}
      />
    </div>
  );
};

export default PaymentReceiptModal;
