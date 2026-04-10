// components/InvoiceDetailModal.jsx (updated)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Printer,
  Download,
  Mail,
  Copy,
  FileText,
  Calendar,
  User,
  CreditCard,
  Building,
  MapPin,
  Percent,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  History,
  Receipt,
  Banknote,
  BookOpen,
  FileSignature,
  MessageSquare,
  Globe,
  Phone,
  Hash,
  DollarSign,
  TrendingUp,
  FileCheck,
  Calculator,
  Shield,
  Package,
} from "lucide-react";
import dayjs from "dayjs";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import PurchaseOrderDetailModal from "./PurchaseOrderDetailModal";
import JournalDetailsModal from "./JournalDetailsModal";
import { getJournalByIdApi } from "../apis/journalApi";
import PaymentReceiptModal from "./PaymentReceiptModal";
import CreateLedgerFromInvoiceModal from "./CreateLedgerFromInvoiceModal";
import {
  downloadInvoicePdfApi,
  downloadInvoiceWordApi,
  getInvoiceByIdApi,
} from "../apis/invoice.api";

const InvoiceDetailModal = ({ isOpen, onClose, invoiceId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [paymentReceiptModal, setPaymentReceiptModal] = useState(false);
  const [createLedgerModal, setCreateLedgerModal] = useState(false);
  const [showTdsDetails, setShowTdsDetails] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [showJournalModal, setShowJournalModal] = useState(false);

  // Fetch invoice details
  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetails();
    }
  }, [isOpen, invoiceId]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getInvoiceByIdApi(invoiceId);
      if (response?.data) {
        setInvoice(response.data);
      } else {
        setError("Failed to load invoice details");
      }
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      setError("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return dateString ? dayjs(dateString).format("DD MMM YYYY") : "-";
  };

  const formatDateTime = (dateString) => {
    return dateString ? dayjs(dateString).format("DD MMM YYYY, hh:mm A") : "-";
  };

  const formatCurrency = (amount, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const handleOpenJournal = async (journalId) => {
    if (!journalId || !user?.company?._id) return;
    try {
      const resolvedJournalId =
        typeof journalId === "object" && journalId !== null ? journalId._id : journalId;
      const response = await getJournalByIdApi(user.company._id, resolvedJournalId);
      setSelectedJournal(response.data || response);
      setShowJournalModal(true);
    } catch (err) {
      console.error("Error fetching journal details:", err);
      toast.error("Failed to load journal details");
    }
  };

  const getPaymentTermsText = (terms) => {
    const termsMap = {
      "net-30": "Net 30 Days",
      "net-60": "Net 60 Days",
      "net-90": "Net 90 Days",
      cod: "Cash on Delivery",
      advance: "Advance Payment",
      immediate: "Immediate Payment",
    };
    return termsMap[terms] || terms;
  };

  // Calculate payment information
  const calculatePaymentInfo = (invoice) => {
    const invoiceAmount = invoice.amountDue || invoice.netPayable || 0;
    const payments = invoice.payments || [];

    const paymentsTotal = payments.reduce(
      (sum, payment) =>
        sum +
        Number(
          payment.grossAmount ??
            payment.receivedAmount ??
            payment.amountReceived ??
            payment.amountPaid ??
            0,
        ),
      0,
    );
    const totalTDSAdjusted = payments.reduce(
      (sum, payment) => sum + Number(payment.tdsAdjusted || payment.tdsAmount || 0),
      0,
    );

    const totalReceived =
      payments.length > 0
        ? paymentsTotal
        : Number(invoice.paidAmount ?? Math.max(0, invoiceAmount - Number(invoice.remainingAmount ?? invoiceAmount)));
    const pendingAmount = Math.max(
      0,
      payments.length > 0
        ? invoiceAmount - totalReceived
        : Number(invoice.remainingAmount ?? invoiceAmount - totalReceived),
    );
    const completionPercentage = invoiceAmount > 0 ? (totalReceived / invoiceAmount) * 100 : 0;

    let paymentStatus = invoice.paymentStatus;
    if (!paymentStatus) {
      if (pendingAmount <= 0) {
        paymentStatus = "fully_paid";
      } else if (totalReceived > 0) {
        paymentStatus = "partially_paid";
      } else {
        paymentStatus = "unpaid";
      }
    }

    return {
      invoiceAmount,
      totalReceived,
      pendingAmount,
      totalTDSAdjusted,
      completionPercentage,
      paymentStatus,
      paymentCount: payments.length,
      lastPaymentDate: payments.length > 0 ? payments[payments.length - 1].paymentDate : null,
    };
  };

  const getPaymentStatusBadge = (paymentStatus, pendingAmount) => {
    switch (paymentStatus) {
      case "fully_paid":
        return {
          label: "Fully Paid",
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          iconColor: "text-green-600",
        };
      case "partially_paid":
        return {
          label: `₹${pendingAmount.toFixed(2)} Pending`,
          color: "bg-amber-100 text-amber-800",
          icon: Clock,
          iconColor: "text-amber-600",
        };
      case "unpaid":
      default:
        return {
          label: "Unpaid",
          color: "bg-red-100 text-red-800",
          icon: AlertTriangle,
          iconColor: "text-red-600",
        };
    }
  };

  const getDueDateStatus = (dueDate) => {
    const today = dayjs();
    const due = dayjs(dueDate);

    if (due.isBefore(today, "day")) {
      return {
        text: "Overdue",
        color: "text-red-600",
        bg: "bg-red-50",
        icon: AlertCircle,
      };
    } else if (due.diff(today, "day") <= 3) {
      return {
        text: "Due Soon",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        icon: Clock,
      };
    } else {
      return {
        text: "On Time",
        color: "text-green-600",
        bg: "bg-green-50",
        icon: CheckCircle,
      };
    }
  };

  const calculateTotalTax = (invoice) => {
    const cgst = invoice.totalCGSTAmount || 0;
    const sgst = invoice.totalSGSTAmount || 0;
    const igst = invoice.totalIGSTAmount || 0;
    return cgst + sgst + igst;
  };

  const getInvoiceTdsAmount = (invoice) =>
    Number(invoice?.totalTDSAmount || invoice?.tdsAmount || 0);

  const getPaymentTdsAmount = (payment = {}) =>
    Number(payment.tdsAmount || payment.tdsAdjusted || 0);

  const hasInvoiceTds = getInvoiceTdsAmount(invoice) > 0;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceNo = () => {
    if (invoice?.invoiceNo) {
      navigator.clipboard.writeText(invoice.invoiceNo);
      toast.success("Invoice number copied to clipboard!");
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      const response = await downloadInvoicePdfApi(invoice._id);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoice.invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadWord = async () => {
    if (!invoice) return;

    try {
      const response = await downloadInvoiceWordApi(invoice._id);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoice.invoiceNo}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Word document downloaded successfully");
    } catch (error) {
      console.error("Error downloading Word document:", error);
      toast.error("Failed to download Word document");
    }
  };

  const getInvoiceStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
      POSTED: { label: "Posted", color: "bg-blue-100 text-blue-800", icon: FileText },
      PARTIALLY_PAID: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      PAID: { label: "Paid", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
      RECONCILED: { label: "Reconciled", color: "bg-green-100 text-green-800", icon: Shield },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1.5" />
        {config.label}
      </span>
    );
  };

  const handleSendEmail = async () => {
    if (!invoice) return;

    try {
      // API call to send email would go here
      toast.info("Email functionality coming soon!");
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    }
  };

  const handleRecordPayment = () => {
    if (!invoice) return;
    if (invoice.approvalStatus !== "Approved") {
      toast.error("Payment can be recorded only after invoice approval");
      return;
    }

    // Check if sales journal is posted first
    if (!invoice.salesJournalId) {
      toast.error("Please post the sales journal first before recording payments");
      return;
    }

    // Check if already fully paid
    const paymentInfo = calculatePaymentInfo(invoice);
    if (paymentInfo.pendingAmount <= 0) {
      toast.info("This invoice is already fully paid");
      return;
    }

    setPaymentReceiptModal(true);
  };

  const handlePostSalesJournal = () => {
    if (!invoice) return;
    if (invoice.approvalStatus !== "Approved") {
      toast.error("Sales journal can be posted only after invoice approval");
      return;
    }

    if (invoice.salesJournalId) {
      toast.info("Sales journal already posted for this invoice");
      return;
    }

    setCreateLedgerModal(true);
  };

  // 👇 Helper to get the PO ID from invoice data
  const getPOId = () => {
    // Try to get from linkedPO object or direct ID field
    if (invoice?.linkedPO?._id) return invoice.linkedPO._id;
    if (invoice?.linkedPOId) return invoice.linkedPOId;
    return null;
  };

  // 👇 Handler for clicking the PO number
  const handlePOClick = () => {
    const poId = getPOId();
    if (poId) {
      setSelectedPOId(poId);
    } else {
      toast.info("PO details not available");
    }
  };

  if (!isOpen) return null;

  const paymentInfo = invoice ? calculatePaymentInfo(invoice) : {};
  const currency    = invoice?.currency || "INR";
  const isApprovedInvoice = invoice?.approvalStatus === "Approved";
  const TABS = ["overview","items","payments","accounting","documents"];

  /* ── small helpers ── */
  const F = ({ label, value, mono }) => (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-xs font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );

  const SectionCard = ({ title, icon: Icon, accent, children, extra }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
        style={{ background: "linear-gradient(90deg,#f8fafc,#eff6ff)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
          <Icon size={13} className="text-slate-500" />
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
        </div>
        {extra}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-6 overflow-y-auto">
        <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">

          {/* ── Header ── */}
          <div className="shrink-0 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl border border-white/25">
                  <Receipt size={16} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-extrabold text-white tracking-tight">
                      {invoice?.invoiceNo ? `Invoice #${invoice.invoiceNo}` : "Invoice Details"}
                    </h2>
                    {invoice && getInvoiceStatusBadge(invoice.status)}
                    {invoice && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        paymentInfo.paymentStatus === "fully_paid" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : paymentInfo.paymentStatus === "partially_paid" ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-100 text-red-700 border-red-200"
                      }`}>
                        {paymentInfo.paymentStatus === "fully_paid" ? "Fully Paid"
                          : paymentInfo.paymentStatus === "partially_paid" ? "Partial"
                          : "Unpaid"}
                      </span>
                    )}
                  </div>
                  {invoice && (
                    <p className="text-blue-200 text-[11px] mt-0.5">Created {formatDateTime(invoice.createdAt)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={handleCopyInvoiceNo} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Copy Invoice No"><Copy size={14} /></button>
                <button onClick={handlePrint}         className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Print"><Printer size={14} /></button>
                <button onClick={handleDownloadPDF}   className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Download PDF"><Download size={14} /></button>
                <button onClick={onClose}             className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Close"><X size={14} /></button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex bg-white border-b border-slate-200 px-2">
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === t
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}>
                  {t === "accounting" ? "Accounting" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Loading invoice details…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <button onClick={fetchInvoiceDetails}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl"
                  style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                  Try Again
                </button>
              </div>
            ) : invoice ? (
              <div className="space-y-4">

                {/* ══ OVERVIEW ══ */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Stat strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label:"Total Amount", value: formatCurrency(invoice.amountDue||0,currency), g:"linear-gradient(135deg,#1e3a8a,#2563eb)", blob:"#93c5fd", icon: Banknote },
                        { label:"Received",     value: formatCurrency(paymentInfo.totalReceived||0,currency), g:"linear-gradient(135deg,#064e3b,#059669)", blob:"#6ee7b7", icon: CheckCircle },
                        { label:"Pending",      value: formatCurrency(paymentInfo.pendingAmount||0,currency), g:"linear-gradient(135deg,#92400e,#d97706)", blob:"#fde68a", icon: Clock },
                        { label:"Due Date",     value: formatDate(invoice.dueDate),
                          sub: getDueDateStatus(invoice.dueDate).text,
                          g: getDueDateStatus(invoice.dueDate).text === "Overdue"
                            ? "linear-gradient(135deg,#7f1d1d,#dc2626)"
                            : getDueDateStatus(invoice.dueDate).text === "Due Soon"
                            ? "linear-gradient(135deg,#92400e,#d97706)"
                            : "linear-gradient(135deg,#312e81,#7c3aed)",
                          blob: "#c4b5fd", icon: Calendar },
                      ].map((s, i) => (
                        <div key={i} className="relative overflow-hidden rounded-2xl p-4 shadow-md group cursor-default"
                          style={{ background: s.g }}>
                          <div className="absolute -top-4 -right-4 w-14 h-10 rounded-full opacity-25 blur-xl"
                            style={{ background: `radial-gradient(ellipse,${s.blob},transparent)` }} />
                          <div className="absolute top-0 right-8 w-px h-full bg-white/15 rotate-12 scale-y-150" />
                          <div className="relative z-10 flex items-start justify-between">
                            <div>
                              <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">{s.label}</p>
                              <p className="text-sm font-black text-white leading-tight">{s.value}</p>
                              {s.sub && <span className="text-[9px] text-white/70 font-bold">{s.sub}</span>}
                            </div>
                            <div className="p-2 bg-white/20 rounded-xl border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
                              <s.icon size={13} className="text-white" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                        </div>
                      ))}
                    </div>

                    {/* Client + Invoice info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <SectionCard title="Client Details" icon={Building} accent="linear-gradient(180deg,#2563eb,#60a5fa)">
                        <div className="space-y-3">
                          <F label="Client Name" value={invoice.billTo?.name} />
                          <F label="Address"     value={invoice.billTo?.address} />
                          <div className="grid grid-cols-2 gap-3">
                            <F label="GSTIN"      value={invoice.billTo?.GSTIN} mono />
                            <F label="State Code" value={invoice.billTo?.stateCode} mono />
                          </div>
                        </div>
                      </SectionCard>

	                    <SectionCard title="Invoice Details" icon={FileText} accent="linear-gradient(180deg,#7c3aed,#a78bfa)">
	                      <div className="space-y-3">
	                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
	                          <F label="Invoice Date"  value={formatDate(invoice.invoiceDate)} />
	                          <F label="Payment Due Date" value={formatDate(invoice.paymentDueDate)} />
	                          <F label="Currency"      value={invoice.currency || "INR"} />
	                        </div>
	                        <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PO Number</p>
                              <button
                                type="button"
                                disabled={!invoice.linkedPO?._id}
                                onClick={() => setShowPOModal(true)}
                                className="text-xs font-semibold text-blue-700 underline underline-offset-2 disabled:text-slate-800 disabled:no-underline"
                              >
                                {invoice.linkedPO?.poNumber || invoice.linkedPORef || "—"}
                              </button>
                            </div>
	                          <F label="PO Reference" value={invoice.poreferencevalue} mono />
	                        </div>
	                        <F label="Payment Terms" value={getPaymentTermsText(invoice.paymentTerms)} />
	                        <F label="Shipping To"   value={invoice.shipTo?.name || "Same as billing"} />
                          {hasInvoiceTds && (
                            <button
                              type="button"
                              onClick={() => setShowTdsDetails(true)}
                              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700"
                            >
                              <Percent size={13} />
                              View TDS Details
                            </button>
                          )}
	                      </div>
	                    </SectionCard>
                  </div>

                  {/* Financial Breakdown */}
                  <SectionCard title="Financial Breakdown" icon={Calculator} accent="linear-gradient(180deg,#d97706,#fbbf24)">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { l:"Taxable Value", v: formatCurrency(invoice.totalTaxableValue||0,currency), cls:"bg-slate-50 border-slate-100" },
                          { l:"Total Tax",     v: formatCurrency(calculateTotalTax(invoice),currency),   cls:"bg-slate-50 border-slate-100" },
                          { l:"TDS (Reference Only)", v: formatCurrency(getInvoiceTdsAmount(invoice),currency), cls:"bg-violet-50 border-violet-100" },
                          { l:"Invoice Total", v: formatCurrency(invoice.amountDue || invoice.netPayable || 0,currency), cls:"bg-blue-50 border-blue-100" },
                        ].map(s => (
                          <div key={s.l} className={`p-3 rounded-xl border ${s.cls}`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                            <p className="text-xs font-black text-slate-800 tabular-nums">{s.v}</p>
                          </div>
                        ))}
                      </div>

                        {/* GST breakdown */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                          {[
                            { l:"CGST", v: formatCurrency(invoice.totalCGSTAmount||0,currency), cls:"bg-blue-50 border-blue-100 text-blue-700" },
                            { l:"SGST", v: formatCurrency(invoice.totalSGSTAmount||0,currency), cls:"bg-emerald-50 border-emerald-100 text-emerald-700" },
                            { l:"IGST", v: formatCurrency(invoice.totalIGSTAmount||0,currency), cls:"bg-violet-50 border-violet-100 text-violet-700" },
                          ].map(s => (
                            <div key={s.l} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${s.cls}`}>
                              <span className="text-[10px] font-black uppercase tracking-wider">{s.l}</span>
                              <span className="text-xs font-black tabular-nums">{s.v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-center mb-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Progress</p>
                            <p className="text-[10px] font-black text-blue-600">{(paymentInfo.completionPercentage||0).toFixed(1)}%</p>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(paymentInfo.completionPercentage||0)===100 ? "bg-emerald-500" : (paymentInfo.completionPercentage||0)>0 ? "bg-blue-500" : "bg-red-500"}`}
                              style={{ width: `${Math.min(paymentInfo.completionPercentage||0,100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1.5">
                            <span>₹{(paymentInfo.totalReceived||0).toLocaleString("en-IN")} received</span>
                            <span>₹{(paymentInfo.pendingAmount||0).toLocaleString("en-IN")} pending</span>
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {/* ══ ITEMS ══ */}
                {activeTab === "items" && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
                      style={{ background: "linear-gradient(90deg,#f8fafc,#eff6ff)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#1e3a8a,#60a5fa)" }} />
                        <Package size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Invoice Items</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                          {invoice.items?.length || 0}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "linear-gradient(90deg,#f1f5f9,#dbeafe)" }}>
                            {["Description","HSN/SAC","Qty","Rate","Taxable Value","GST %","GST Amt","Total"].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                            ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoice.items?.map((item, i) => (
                            <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{item.description}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">#{i+1}</p>
                              </td>
                              <td className="px-4 py-3"><span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.hsnSac||"—"}</span></td>
                              <td className="px-4 py-3 font-bold text-slate-700 tabular-nums">{item.quantity}</td>
                              <td className="px-4 py-3 tabular-nums text-slate-700">{formatCurrency(item.rate,currency)}</td>
                              <td className="px-4 py-3 tabular-nums text-slate-700">{formatCurrency(item.taxableValue,currency)}</td>
                              <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black">{item.gstRate}%</span></td>
                              <td className="px-4 py-3 tabular-nums text-amber-700 font-semibold">{formatCurrency(item.gstAmount,currency)}</td>
                              <td className="px-4 py-3 font-black text-slate-900 tabular-nums">{formatCurrency(item.total,currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "linear-gradient(90deg,#f1f5f9,#dbeafe)" }}>
                            <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Totals</td>
                            <td className="px-4 py-3 font-black text-slate-700 tabular-nums">{formatCurrency(invoice.totalTaxableValue||0,currency)}</td>
                            <td className="px-4 py-3" />
                            <td className="px-4 py-3 font-black text-amber-700 tabular-nums">{formatCurrency(calculateTotalTax(invoice),currency)}</td>
                            <td className="px-4 py-3 font-black text-blue-700 tabular-nums text-sm">{formatCurrency(invoice.amountDue||0,currency)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* ══ PAYMENTS ══ */}
                {activeTab === "payments" && (
                  <div className="space-y-4">
                    <SectionCard title="Payment Summary" icon={CreditCard} accent="linear-gradient(180deg,#059669,#34d399)"
                      extra={
                        paymentInfo.pendingAmount > 0 && invoice.salesJournalId ? (
                          <button onClick={handleRecordPayment}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white rounded-xl hover:opacity-90 transition-all"
                            style={{ background: "linear-gradient(135deg,#059669,#34d399)", boxShadow:"0 4px 10px rgba(5,150,105,0.25)" }}>
                            <Banknote size={11} /> Record Payment
                          </button>
                        ) : null
                      }>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { l:"Invoice Amount", v: formatCurrency(invoice.amountDue||0,currency), cls:"text-slate-800" },
                          { l:"Total Received", v: formatCurrency(paymentInfo.totalReceived||0,currency), cls:"text-emerald-700" },
                          { l:"Pending",        v: formatCurrency(paymentInfo.pendingAmount||0,currency), cls:"text-amber-700" },
                        ].map(s => (
                          <div key={s.l} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                            <p className={`text-sm font-black tabular-nums ${s.cls}`}>{s.v}</p>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                  {invoice.payments && invoice.payments.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc,#f0fdf4)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#059669,#34d399)" }} />
                        <History size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Payment History</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#059669,#34d399)" }}>{invoice.payments.length}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {[...invoice.payments].sort((a,b) => new Date(b.paymentDate)-new Date(a.paymentDate)).map((p,i) => (
                          <div key={p._id||i} className="flex items-center justify-between px-5 py-3.5 hover:bg-emerald-50/30 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0"
                                style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
                                <Banknote size={14} className="text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                                  Payment #{i+1}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400">
                                  <span>{formatDate(p.paymentDate)}</span>
                                  {p.paymentMode && <span>· {p.paymentMode}</span>}
                                  {p.referenceNumber && <span className="font-mono">· {p.referenceNumber}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-black text-emerald-700 tabular-nums">
                                {formatCurrency(p.amountReceived ?? p.receivedAmount ?? p.amountPaid, currency)}
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                                Pending impact: {formatCurrency(p.grossAmount ?? p.receivedAmount ?? p.amountPaid, currency)}
                              </p>
                              <div className="flex items-center justify-end gap-2 mt-0.5">
                                {p.tdsAdjusted>0 && <span className="text-[9px] text-violet-600 font-bold">TDS: {formatCurrency(p.tdsAdjusted,currency)}</span>}
                                {p.paymentJournal?.number && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenJournal(p.paymentJournal?._id || p.journalId)}
                                    className="text-[9px] text-blue-600 font-bold hover:text-blue-800"
                                  >
                                    Journal: {p.paymentJournal.number}
                                  </button>
                                )}
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${p.status==="posted" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                                  {p.status||"recorded"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-14 gap-3 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <div className="p-4 bg-slate-100 rounded-2xl"><Banknote size={24} className="text-slate-300" /></div>
                      <p className="text-sm font-bold text-slate-500">No payments recorded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ACCOUNTING ══ */}
              {activeTab === "accounting" && (
                <div className="space-y-4">
                  <SectionCard title="Sales Journal" icon={BookOpen} accent="linear-gradient(180deg,#7c3aed,#a78bfa)"
                    extra={
                      isApprovedInvoice && !invoice.salesJournalId ? (
                        <button onClick={handlePostSalesJournal}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white rounded-xl hover:opacity-90 transition-all"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow:"0 4px 10px rgba(124,58,237,0.25)" }}>
                          <BookOpen size={11} /> Post Journal
                        </button>
                      ) : null
                    }>
                    {invoice.salesJournalId ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-800">Sales Journal Posted</p>
                            <p className="text-[10px] font-mono text-emerald-600 mt-0.5">
                              {invoice.salesJournal?.number || invoice.salesJournalId?.number || invoice.salesJournalId?._id || invoice.salesJournalId}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <F label="Posted On" value={formatDateTime(invoice.salesJournalPostedAt)} />
                          <F label="Posted By"  value={invoice.salesJournalPostedBy?.name || "System"} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <F label="Journal Number" value={invoice.salesJournal?.number || invoice.salesJournalId?.number} mono />
                          <F label="Journal Date" value={formatDate(invoice.salesJournal?.date || invoice.salesJournalId?.date)} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-8 gap-3 text-center">
                        <div className="p-3 bg-slate-100 rounded-2xl"><BookOpen size={22} className="text-slate-300" /></div>
                        <p className="text-xs font-bold text-slate-500">Sales journal not posted yet</p>
                        <p className="text-[11px] text-slate-400">
                          {isApprovedInvoice
                            ? "Post the sales journal to enable payment recording and ledger integration."
                            : "Sales journal posting is available only after invoice approval."}
                        </p>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Payment Status" icon={CreditCard} accent="linear-gradient(180deg,#059669,#34d399)">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoice Amount</p>
                          <p className="text-sm font-black text-slate-800 tabular-nums">{formatCurrency(invoice.amountDue||0,currency)}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Received</p>
                          <p className="text-sm font-black text-emerald-700 tabular-nums">{formatCurrency(paymentInfo.totalReceived||0,currency)}</p>
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Amount</p>
                        <p className={`text-base font-black tabular-nums ${(paymentInfo.pendingAmount||0)>0 ? "text-amber-700" : "text-emerald-700"}`}>
                          {formatCurrency(paymentInfo.pendingAmount||0,currency)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement Status</p>
                        <p className={`text-sm font-black ${invoice.isFullyPaid ? "text-emerald-700" : "text-blue-700"}`}>
                          {invoice.isFullyPaid ? "Fully Settled" : "Pending Settlement"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${
                          paymentInfo.paymentStatus==="fully_paid" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : paymentInfo.paymentStatus==="partially_paid" ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-red-100 text-red-700 border-red-200"
                        }`}>
                          {paymentInfo.paymentStatus==="fully_paid" ? "Fully Paid"
                            : paymentInfo.paymentStatus==="partially_paid" ? "Partially Paid"
                            : "Unpaid"}
                        </span>
                        {isApprovedInvoice && invoice.salesJournalId && (paymentInfo.pendingAmount||0)>0 && (
                          <button onClick={handleRecordPayment}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                            Record Payment →
                          </button>
                        )}
                        {isApprovedInvoice && !invoice.salesJournalId && (
                          <button onClick={handlePostSalesJournal}
                            className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">
                            Post Journal →
                          </button>
                        )}
                      </div>
                      {invoice.payments?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          {invoice.payments.map((payment, index) => (
                            <div key={payment._id || index} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  Receipt #{index + 1}
                                </span>
                                <span className="text-xs font-black text-emerald-700">
                                  {formatCurrency(payment.amountReceived ?? payment.receivedAmount ?? payment.amountPaid, currency)}
                                </span>
                              </div>
                              <div className="mt-1 text-[10px] text-slate-500 flex flex-wrap gap-2">
                                <span>{formatDate(payment.paymentDate)}</span>
                                {payment.paymentJournal?.number && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenJournal(payment.paymentJournal?._id || payment.journalId)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    Journal: {payment.paymentJournal.number}
                                  </button>
                                )}
                                {payment.referenceNumber && <span>Ref: {payment.referenceNumber}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>
              )}

                {/* ══ DOCUMENTS ══ */}
                {activeTab === "documents" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SectionCard title="Generated Documents" icon={FileText} accent="linear-gradient(180deg,#1e3a8a,#60a5fa)">
                      <div className="space-y-2.5">
                        {[
                          { label:"Invoice PDF",   sub:"Professional formatted PDF",     onClick: handleDownloadPDF,   iconCls:"bg-red-50 border-red-100 text-red-600",   Icon: Download },
                          { label:"Invoice Word",  sub:"Editable Word document",          onClick: handleDownloadWord,  iconCls:"bg-blue-50 border-blue-100 text-blue-600",  Icon: Download },
                          { label:"Email Invoice", sub:"Send to client via email",        onClick: handleSendEmail,     iconCls:"bg-emerald-50 border-emerald-100 text-emerald-600", Icon: Mail },
                        ].map(d => (
                          <button key={d.label} onClick={d.onClick}
                            className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl border ${d.iconCls}`}><FileText size={14} /></div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{d.label}</p>
                                <p className="text-[10px] text-slate-400">{d.sub}</p>
                              </div>
                            </div>
                            <d.Icon size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard title="Additional Information" icon={MessageSquare} accent="linear-gradient(180deg,#7c3aed,#a78bfa)">
                      <div className="space-y-4">
                        {invoice.notes && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
                            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 italic">"{invoice.notes}"</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Approval Status</p>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                            invoice.approvalStatus==="Approved" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : invoice.approvalStatus==="Pending" ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-red-100 text-red-700 border-red-200"
                          }`}>
                            {invoice.approvalStatus==="Approved" ? <><CheckCircle size={10}/> Approved</>
                              : invoice.approvalStatus==="Pending" ? <><Clock size={10}/> Pending</>
                              : <><AlertCircle size={10}/> Rejected</>}
                          </span>
                          {invoice.approvalStatus==="Approved" && invoice.approvedBy && (
                            <p className="text-[10px] text-slate-400 mt-1.5">Approved by: {invoice.approvedBy.name||"System"}</p>
                          )}
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}
              </div>
            ) : null}
          </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 bg-white rounded-b-2xl flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium">
            {invoice ? <>Last updated: <span className="font-bold text-slate-600">{formatDateTime(invoice.updatedAt)}</span></> : ""}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all">
              Close
            </button>
            <button onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", boxShadow:"0 4px 12px rgba(37,99,235,0.3)" }}>
              <Printer size={13} /> Print Invoice
            </button>
          </div>
        </div>
      </div>

      {showTdsDetails && invoice && hasInvoiceTds && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">TDS Details</h3>
              <button type="button" onClick={() => setShowTdsDetails(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Taxable Base</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(invoice.totalTaxableValue || 0, invoice.currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Total</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(invoice.amountDue || invoice.invoiceAmount || 0, invoice.currency)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">TDS Collected</p>
                  <p className="mt-1 text-sm font-bold text-violet-700">
                    {formatCurrency((invoice.payments || []).reduce((sum, payment) => sum + Number(payment.tdsAmount || payment.tdsAdjusted || 0), 0), invoice.currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Received</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatCurrency((invoice.payments || []).reduce((sum, payment) => sum + Number(payment.amountPaid || payment.receivedAmount || 0), 0), invoice.currency)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Payment Date", "Reference", "Received", "TDS Amount", "Settlement"].map((label) => (
                        <th key={label} className="px-3 py-2 text-left font-semibold text-slate-500">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(invoice.payments || []).filter((payment) => getPaymentTdsAmount(payment) > 0).map((payment) => (
                      <tr key={payment._id}>
                        <td className="px-3 py-2 text-slate-700">{formatDate(payment.paymentDate)}</td>
                        <td className="px-3 py-2 text-slate-700">{payment.reference || payment.referenceNumber || "—"}</td>
                        <td className="px-3 py-2 text-slate-900">{formatCurrency(payment.amountPaid || payment.receivedAmount || 0, invoice.currency)}</td>
                        <td className="px-3 py-2 text-violet-700">{formatCurrency(payment.tdsAmount || payment.tdsAdjusted || 0, invoice.currency)}</td>
                        <td className="px-3 py-2 text-slate-900">{formatCurrency(payment.grossAmount || (Number(payment.amountPaid || 0) + Number(payment.tdsAmount || payment.tdsAdjusted || 0)), invoice.currency)}</td>
                      </tr>
                    ))}
                    {!((invoice.payments || []).filter((payment) => getPaymentTdsAmount(payment) > 0).length) && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">No TDS-adjusted payments recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <PurchaseOrderDetailModal
        isOpen={showPOModal}
        onClose={() => setShowPOModal(false)}
        purchaseOrderId={invoice?.linkedPO?._id}
      />
      <JournalDetailsModal
        open={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        journal={selectedJournal}
      />
      {paymentReceiptModal && invoice && (
        <PaymentReceiptModal
          open={paymentReceiptModal}
          onClose={() => setPaymentReceiptModal(false)}
          onSuccess={() => {
            setPaymentReceiptModal(false);
            fetchInvoiceDetails();
          }}
          invoiceData={invoice}
        />
      )}
      {createLedgerModal && invoice && (
        <CreateLedgerFromInvoiceModal
          open={createLedgerModal}
          onClose={() => setCreateLedgerModal(false)}
          onSuccess={() => {
            setCreateLedgerModal(false);
            fetchInvoiceDetails();
          }}
          initialInvoiceNo={invoice.invoiceNo}
          invoiceData={invoice}
        />
      )}
    </div>
    </>
  );
};

export default InvoiceDetailModal;
