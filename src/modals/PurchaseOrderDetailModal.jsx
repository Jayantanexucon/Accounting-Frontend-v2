// components/PurchaseOrderDetailModal.jsx
import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Download,
  Copy,
  FileText,
  Calendar,
  Package,
  CreditCard,
  Truck,
  AlertCircle,
  CheckCircle,
  Building,
  Clock,
  FileSignature,
  MessageSquare,
  Tag,
  ShoppingBag,
  Percent,
  Hash,
  User,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";
import { getPOProgressApi, getPurchaseOrderApi, downloadPdfPurchaseOrderApi } from "../apis/purchaseOrderApi";
import { motion, AnimatePresence } from "framer-motion";
import InvoiceDetailsModal from "./InvoiceDetailsModal";
import { useNavigate } from "react-router-dom";

/* ── helpers ──────────────────────────────────────────── */
const fmt = (d) => (d ? dayjs(d).format("DD MMM YYYY") : "—");
const fmtT = (d) => (d ? dayjs(d).format("DD MMM YYYY, hh:mm A") : "—");
const fmtC = (amt, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amt || 0);

const roundMoney = (value = 0) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getNormalizedPaymentTermType = (po = {}) => {
  const paymentTerms = String(po.paymentTerms || "").toLowerCase();
  if (["milestone", "monthly", "weekly"].includes(paymentTerms)) {
    return paymentTerms;
  }

  if (String(po.billingModel || "").toLowerCase() === "milestone") {
    return "milestone";
  }

  return "";
};

const distributeAmountAcrossTerms = (totalAmount = 0, totalTerms = 1) => {
  const normalizedTotal = roundMoney(totalAmount);
  const count = Math.max(1, Number(totalTerms || 1));
  const baseAmount = roundMoney(normalizedTotal / count);
  const distribution = Array.from({ length: count }, () => baseAmount);
  const assigned = roundMoney(distribution.reduce((sum, amount) => sum + amount, 0));
  distribution[count - 1] = roundMoney(distribution[count - 1] + (normalizedTotal - assigned));
  return distribution;
};

const buildRecurringTermSchedule = (po = {}) => {
  const paymentTermType = getNormalizedPaymentTermType(po);
  if (!["monthly", "weekly"].includes(paymentTermType)) {
    return null;
  }

  const start = dayjs(po.poDate || po.referenceDate);
  const end = dayjs(po.deliveryDate || po.dueDate || po.poDate || po.referenceDate);
  if (!start.isValid() || !end.isValid()) {
    return null;
  }

  const totalDays = Math.max(1, end.diff(start, "day") + 1);
  const totalTerms =
    paymentTermType === "monthly"
      ? Math.max(1, Math.ceil(totalDays / 30))
      : Math.max(1, Math.ceil(totalDays / 7));
  const scheduledAmounts = distributeAmountAcrossTerms(po.totalAmount || 0, totalTerms);
  const terms = [];
  let cursor = start.clone();

  for (let index = 0; index < totalTerms; index += 1) {
    let termEnd =
      paymentTermType === "monthly"
        ? cursor.add(1, "month").subtract(1, "day")
        : cursor.add(6, "day");

    if (termEnd.isAfter(end)) {
      termEnd = end.clone();
    }

    terms.push({
      termNumber: index + 1,
      amount: scheduledAmounts[index] || 0,
      startDate: cursor.format("YYYY-MM-DD"),
      endDate: termEnd.format("YYYY-MM-DD"),
      label:
        paymentTermType === "monthly"
          ? `Month ${index + 1} of ${totalTerms}`
          : `Week ${index + 1} of ${totalTerms}`,
    });

    cursor = paymentTermType === "monthly" ? cursor.add(1, "month") : termEnd.add(1, "day");
  }

  return {
    paymentTermType,
    totalTerms,
    terms,
  };
};

const getInvoiceTimelineBreakdown = (invoice = {}) => {
  const lineItems = Array.isArray(invoice.items) ? invoice.items : [];
  const termInvoiceAmount = lineItems.length > 0
    ? lineItems.reduce((sum, item) => sum + Number(item.total || item.totalAmount || 0), 0)
    : Number(invoice.invoiceAmount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const remainingAmount = Math.max(0, termInvoiceAmount - paidAmount);

  return {
    termInvoiceAmount,
    paidAmount,
    remainingAmount,
  };
};

const getTermTimelineSummary = ({ po, invoice, invoiceIndex, orderedInvoices }) => {
  const recurringSchedule = buildRecurringTermSchedule(po);
  if (!recurringSchedule) {
    return null;
  }

  const currentTerm = recurringSchedule.terms[invoiceIndex] || null;
  const actualRaisedAmounts = orderedInvoices.map((entry) => getInvoiceTimelineBreakdown(entry).termInvoiceAmount);
  const actualRaisedTillPrevious = roundMoney(
    actualRaisedAmounts.slice(0, invoiceIndex).reduce((sum, amount) => sum + amount, 0),
  );
  const scheduledTillPrevious = roundMoney(
    recurringSchedule.terms
      .slice(0, invoiceIndex)
      .reduce((sum, term) => sum + Number(term.amount || 0), 0),
  );
  const scheduledTermAmount = roundMoney(Number(currentTerm?.amount || 0));
  const carryForwardFromPrevious = roundMoney(
    Math.max(0, scheduledTillPrevious - actualRaisedTillPrevious),
  );
  const currentTermRaisedAmount = roundMoney(
    Math.max(0, actualRaisedAmounts[invoiceIndex] - carryForwardFromPrevious),
  );
  const remainingFromThisTerm = roundMoney(
    Math.max(0, scheduledTermAmount - currentTermRaisedAmount),
  );
  const nextScheduledTermAmount = roundMoney(
    Number(recurringSchedule.terms[invoiceIndex + 1]?.amount || 0),
  );

  return {
    installmentNo: currentTerm?.termNumber || invoiceIndex + 1,
    totalInstallments: recurringSchedule.totalTerms,
    scheduledTermAmount,
    carryForwardFromPrevious,
    actualRaisedAmount: actualRaisedAmounts[invoiceIndex],
    currentTermRaisedAmount,
    remainingFromThisTerm,
    nextExpectedInvoiceAmount: roundMoney(nextScheduledTermAmount + remainingFromThisTerm),
  };
};

const getMilestoneOpenAmountBeforeInvoice = (milestone = {}) => {
  const explicitRemainingBefore = Number(milestone.remainingAmountBefore);
  if (Number.isFinite(explicitRemainingBefore) && explicitRemainingBefore >= 0) {
    return roundMoney(explicitRemainingBefore);
  }

  const raisedNow = Number(milestone.invoicedAmount || milestone.amount || 0);
  const remainingAfter = Number(milestone.remainingAmountAfter || 0);
  return roundMoney(Math.max(0, raisedNow + remainingAfter));
};

const getMilestoneTimelineSummary = ({ po, invoice, invoiceIndex, orderedInvoices }) => {
  const milestones = Array.isArray(invoice?.milestones) ? invoice.milestones : [];
  if (!milestones.length) return null;

  const normalizedMilestones = milestones.map((milestone) => {
    const originalAmount = Number(milestone.originalAmount || milestone.amount || 0);
    const raisedNow = Number(milestone.invoicedAmount || milestone.amount || 0);
    const remainingAfter = Number(milestone.remainingAmountAfter || 0);
    const openAmountBefore = getMilestoneOpenAmountBeforeInvoice(milestone);
    const alreadyInvoicedBefore = Number.isFinite(Number(milestone.alreadyInvoicedAmount))
      ? Number(milestone.alreadyInvoicedAmount)
      : Math.max(0, originalAmount - openAmountBefore);

    return {
      title: milestone.title,
      originalAmount: roundMoney(originalAmount),
      raisedNow: roundMoney(raisedNow),
      remainingAfter: roundMoney(Math.max(0, remainingAfter)),
      openAmountBefore,
      alreadyInvoicedBefore: roundMoney(Math.max(0, alreadyInvoicedBefore)),
    };
  });

  const scheduledTermAmount = roundMoney(
    normalizedMilestones.reduce((sum, milestone) => sum + milestone.openAmountBefore, 0),
  );
  const actualRaisedAmount = roundMoney(
    normalizedMilestones.reduce((sum, milestone) => sum + milestone.raisedNow, 0),
  );
  const remainingFromThisTerm = roundMoney(
    normalizedMilestones.reduce((sum, milestone) => sum + milestone.remainingAfter, 0),
  );
  const carryForwardFromPrevious = roundMoney(
    normalizedMilestones.reduce(
      (sum, milestone) => sum + (milestone.alreadyInvoicedBefore > 0 ? milestone.openAmountBefore : 0),
      0,
    ),
  );

  let nextExpectedInvoiceAmount = 0;
  const nextInvoice = orderedInvoices?.[invoiceIndex + 1];
  if (Array.isArray(nextInvoice?.milestones) && nextInvoice.milestones.length > 0) {
    nextExpectedInvoiceAmount = roundMoney(
      nextInvoice.milestones.reduce(
        (sum, milestone) => sum + getMilestoneOpenAmountBeforeInvoice(milestone),
        0,
      ),
    );
  } else if (Array.isArray(po?.milestones) && po.milestones.length > 0) {
    const currentInvoiceMilestoneIds = new Set(
      normalizedMilestones.map((milestone) => String(milestone.title || "")),
    );
    nextExpectedInvoiceAmount = roundMoney(
      po.milestones.reduce((sum, milestone) => {
        const milestoneRemaining = Number(milestone.remainingAmount ?? milestone.amount ?? 0);
        const milestoneKey = String(milestone.title || "");
        if (currentInvoiceMilestoneIds.has(milestoneKey)) {
          return sum;
        }
        return sum + Math.max(0, milestoneRemaining);
      }, remainingFromThisTerm),
    );
  }

  const previousMilestoneRemaining = normalizedMilestones
    .filter((milestone) => milestone.remainingAfter > 0)
    .map((milestone) => ({
      title: milestone.title,
      remainingAmount: milestone.remainingAfter,
    }));

  return {
    scheduledTermAmount,
    actualRaisedAmount,
    carryForwardFromPrevious,
    remainingFromThisTerm,
    nextExpectedInvoiceAmount,
    previousMilestoneRemaining,
  };
};

const STATUS_CFG = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  issued: { label: "Issued", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  acknowledged: { label: "Acknowledged", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  partially_received: { label: "Partially Received", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  fully_received: { label: "Fully Received", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700 border-red-200" },
  closed: { label: "Closed", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  OPEN: { label: "Open", cls: "bg-red-100 text-red-700 border-red-200" },
  PARTIALLY_INVOICED: { label: "Partially Invoiced", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  FULLY_INVOICED: { label: "Fully Invoiced", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  CLOSED: { label: "Closed", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const deliveryStatus = (d) => {
  const diff = dayjs(d).diff(dayjs(), "day");
  if (diff < 0) return { text: "Overdue", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
  if (diff <= 3) return { text: "Due Soon", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
  return { text: "On Track", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
};

/* Small field */
const F = ({ label, value, mono }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <p className={`text-xs font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
  </div>
);

/* Section wrapper */
const Card = ({ title, icon: Icon, accent, children, extra }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
      style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-5 rounded-full" style={{ background: accent }} />
        <Icon size={13} className="text-slate-500" />
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
      </div>
      {extra}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const canCreateInvoice = (status) =>
  !["FULLY_INVOICED", "Fully Invoiced", "CLOSED", "Closed"].includes(status);

const hasMeaningfulItemData = (item) => {
  if (!item) return false;

  const description = typeof item.description === "string" ? item.description.trim() : "";
  const hsnSac = typeof item.hsnSac === "string" ? item.hsnSac.trim() : "";

  return (
    description.length > 0 ||
    hsnSac.length > 0 ||
    Number(item.rate || 0) > 0 ||
    Number(item.taxableValue || 0) > 0 ||
    Number(item.total || 0) > 0 ||
    Number(item.totalAmount || 0) > 0 ||
    Number(item.gstAmount || 0) > 0 ||
    Number(item.gstRate || 0) > 0
  );
};

const getDerivedPoTotalAmount = (po = {}) => {
  if (!po) return 0;

  const explicitTotal = Number(po.totalAmount || 0);
  if (explicitTotal > 0) return explicitTotal;

  const itemTotal = Array.isArray(po.items)
    ? po.items.reduce((sum, item) => sum + Number(item.totalAmount || item.total || 0), 0)
    : 0;
  if (itemTotal > 0) return roundMoney(itemTotal);

  const milestoneTotal = Array.isArray(po.milestones)
    ? po.milestones.reduce((sum, milestone) => sum + Number(milestone.amount || 0), 0)
    : 0;
  if (milestoneTotal > 0) return roundMoney(milestoneTotal);

  return 0;
};

const getDerivedPoInvoicedAmount = (po = {}) => {
  if (!po) return 0;

  const explicitInvoiced = Number(po.totalInvoicedAmount || 0);
  if (explicitInvoiced > 0) return explicitInvoiced;

  const linkedInvoiceAmount = Array.isArray(po.linkedInvoices)
    ? po.linkedInvoices.reduce(
        (sum, invoice) => sum + getInvoiceTimelineBreakdown(invoice).termInvoiceAmount,
        0,
      )
    : 0;
  if (linkedInvoiceAmount > 0) return roundMoney(linkedInvoiceAmount);

  const milestoneInvoiced = Array.isArray(po.milestones)
    ? po.milestones.reduce((sum, milestone) => sum + Number(milestone.invoicedAmount || 0), 0)
    : 0;

  return roundMoney(milestoneInvoiced);
};

/* ── Derive which tabs are meaningful for a given PO ── */
const getAvailableTabs = (po) => {
  if (!po) return ["overview"];
  const tabs = ["overview"];

  const hasItems = Array.isArray(po?.items) && po.items.some(hasMeaningfulItemData);
  const hasResources = Array.isArray(po.resources) && po.resources.length > 0;
  const hasMilestones = Array.isArray(po.milestones) && po.milestones.length > 0;
  const hasAttendance = Array.isArray(po.attendanceRecords) && po.attendanceRecords.length > 0;
  const isRetainer = po.poCategory === "retainer";

  // Show the details/items tab only when there's actually something to display
  const hasRetainerData =
    po?.poCategory === "retainer" &&
    (
      po?.totalAmount > 0 ||
      po?.paymentSchedule ||
      po?.paymentTerms
    );

  if (hasItems || hasResources || hasMilestones || hasAttendance || hasRetainerData) {
    tabs.push("details");
  }

  // Timeline always makes sense
  tabs.push("timeline");

  // Documents always makes sense
  tabs.push("documents");

  return tabs;
};

const TAB_LABELS = {
  overview: "Overview",
  details: "Details",
  timeline: "Timeline",
  documents: "Documents",
};

const PurchaseOrderDetailModal = ({ isOpen, onClose, purchaseOrderId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [po, setPo] = useState(null);
  const [tab, setTab] = useState("overview");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const orderedInvoices = [...(po?.linkedInvoices || [])]
    .sort((a, b) => new Date(a?.invoiceDate || 0) - new Date(b?.invoiceDate || 0));

  useEffect(() => {
    if (isOpen && purchaseOrderId) fetchPO();
  }, [isOpen, purchaseOrderId]);

  // Reset tab to overview whenever the modal opens (so stale "details" tab is not shown
  // if the newly-opened PO has no details tab)
  useEffect(() => {
    if (isOpen) setTab("overview");
  }, [isOpen, purchaseOrderId]);

  const fetchPO = async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      try {
        res = await getPOProgressApi(purchaseOrderId);
      } catch {
        res = await getPurchaseOrderApi(purchaseOrderId);
      }
      const data = res?.data?.data || res?.data || res;
      setPo(data);
    } catch {
      setError("Failed to load purchase order details");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!po) return;
    try {
      const res = await downloadPdfPurchaseOrderApi(po._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PO_${po.poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      alert("Failed to download PDF");
    }
  };

  const handleCreateInvoice = () => {
    if (po?._id) {
      onClose?.();
      navigate(`/master-data/manual-invoice?poId=${po._id}`);
    }
  };

  const handleCopy = () => {
    if (po?.poNumber) navigator.clipboard.writeText(po.poNumber);
  };

  if (!isOpen) return null;

  const status = po ? STATUS_CFG[po.status] || STATUS_CFG.draft : null;
  const delSt = po?.deliveryDate ? deliveryStatus(po.deliveryDate) : null;
  const currency = po?.currency || "INR";
  const totalPoAmount = roundMoney(getDerivedPoTotalAmount(po));
  const totalInvoicedAmount = roundMoney(
    Math.min(totalPoAmount || Number.MAX_SAFE_INTEGER, getDerivedPoInvoicedAmount(po)),
  );
  const openAmount = roundMoney(Math.max(0, totalPoAmount - totalInvoicedAmount));
  const invoicedPercentage = totalPoAmount > 0
    ? ((totalInvoicedAmount / totalPoAmount) * 100).toFixed(1)
    : "0.0";

  // ── Precompute what this PO actually has ──────────────────────
  const lineItems = Array.isArray(po?.items) ? po.items.filter(hasMeaningfulItemData) : [];
  const hasItems = lineItems.length > 0;
  const hasResources = Array.isArray(po?.resources) && po.resources.length > 0;
  const hasMilestones = Array.isArray(po?.milestones) && po.milestones.length > 0;
  const hasAttendance = Array.isArray(po?.attendanceRecords) && po.attendanceRecords.length > 0;
  const isStaffing = po?.poCategory === "staffing";
  const isProject = po?.poCategory === "project";
  const isRetainer = po?.poCategory === "retainer";

  const hasRetainerData =
    isRetainer &&
    (
      po?.totalAmount > 0 ||
      po?.paymentSchedule ||
      po?.paymentTerms
    );

  const hasAnyDetailsData =
    hasItems ||
    hasResources ||
    hasMilestones ||
    hasAttendance ||
    hasRetainerData;
  const showRatePerDay = hasResources && po.resources.some((r) => Number(r?.ratePerDay || 0) > 0);
  const showRatePerHour = hasResources && po.resources.some((r) => Number(r?.ratePerHour || 0) > 0);
  const showRatePerMonth = hasResources && po.resources.some((r) => Number(r?.ratePerMonth || 0) > 0);
  // Tax values — only "real" if non-zero
  const hasTaxValues = po
    ? (po.totalCGSTAmount || 0) + (po.totalSGSTAmount || 0) + (po.totalIGSTAmount || 0) > 0
    : false;
  const hasTaxableValue = po ? (po.totalTaxableValue || 0) > 0 : false;

  const availableTabs = getAvailableTabs(po);

  // Badge helpers used in details tab
  const catBadge = {
    staffing: "bg-violet-100 text-violet-700 border-violet-200",
    project: "bg-blue-100 text-blue-700 border-blue-200",
    retainer: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  const modelBadge = {
    daily: "bg-amber-100 text-amber-700 border-amber-200",
    monthly: "bg-amber-100 text-amber-700 border-amber-200",
    hourly: "bg-amber-100 text-amber-700 border-amber-200",
    milestone: "bg-indigo-100 text-indigo-700 border-indigo-200",
    headcount: "bg-cyan-100 text-cyan-700 border-cyan-200",
    fixed: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const msCfg = {
    pending: "bg-slate-100 text-slate-600 border-slate-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    partially_invoiced: "bg-amber-100 text-amber-700 border-amber-200",
    invoiced: "bg-violet-100 text-violet-700 border-violet-200",
  };


  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-6 overflow-y-auto">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* ── Modal Header ── */}
        <div className="shrink-0 rounded-t-2xl overflow-hidden">
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl border border-white/25">
                <ShoppingBag size={16} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-extrabold text-white tracking-tight">
                    {po?.poNumber ? `Purchase Order #${po.poNumber}` : "Purchase Order"}
                  </h2>
                  {status && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${status.cls}`}>
                      {status.label}
                    </span>
                  )}
                  {delSt && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${delSt.bg} ${delSt.color} ${delSt.border}`}>
                      {delSt.text}
                    </span>
                  )}
                </div>
                {po && (
                  <p className="text-blue-200 text-[11px] mt-0.5">Created {fmtT(po.createdAt)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {po?._id && canCreateInvoice(po.status) && (
                <button
                  onClick={handleCreateInvoice}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all text-xs font-bold flex items-center gap-1.5"
                  title="Create Invoice"
                >
                  <FileText size={13} /> Create Invoice
                </button>
              )}
              <button onClick={handleCopy} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Copy PO Number">
                <Copy size={14} />
              </button>
              <button onClick={() => window.print()} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Print">
                <Printer size={14} />
              </button>
              <button onClick={handleDownloadPDF} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Download PDF">
                <Download size={14} />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all" title="Close">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tabs — only render tabs that are relevant for this PO */}
          <div className="flex bg-white border-b border-slate-200 px-2">
            {availableTabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading purchase order…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={36} className="text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                onClick={fetchPO}
                className="px-4 py-2 text-xs font-bold text-white rounded-xl"
                style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)" }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && po && (
            <>
              {/* ══ OVERVIEW ══════════════════════════════════════════ */}
              {tab === "overview" && (
                <div className="space-y-4">

                  {/* Top stat strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[
                      {
                        label: "Total Amount",
                        value: fmtC(totalPoAmount, currency),
                        g: "linear-gradient(135deg,#1e3a8a,#2563eb)",
                        blob: "#93c5fd",
                      },
                      {
                        label: "Invoiced %",
                        value: `${invoicedPercentage}%`,
                        g: "linear-gradient(135deg,#064e3b,#059669)",
                        blob: "#6ee7b7",
                      },
                      {
                        label: "Reconciled %",
                        value: `${Number(po.progress?.reconciledPct || ((po.totalReconciledAmount || 0) / Math.max(po.totalAmount || 1, 1)) * 100).toFixed(1)}%`,
                        g: "linear-gradient(135deg,#0f766e,#14b8a6)",
                        blob: "#99f6e4",
                      },
                      {
                        label: "Open Amount",
                        value: `${fmtC(openAmount, currency)} / ${fmtC(totalPoAmount, currency)}`,
                        g: "linear-gradient(135deg,#7f1d1d,#dc2626)",
                        blob: "#fca5a5",
                      },
                      po.deliveryDate
                        ? {
                          label: "Delivery Date",
                          value: fmt(po.deliveryDate),
                          sub: delSt?.text,
                          g: "linear-gradient(135deg,#312e81,#7c3aed)",
                          blob: "#c4b5fd",
                        }
                        : null,
                    ]
                      .filter(Boolean)
                      .map((s, i) => (
                        <div
                          key={i}
                          className="relative overflow-hidden rounded-2xl p-4 shadow-md group cursor-default"
                          style={{ background: s.g }}
                        >
                          <div
                            className="absolute -top-4 -right-4 w-16 h-12 rounded-full opacity-25 blur-xl"
                            style={{ background: `radial-gradient(ellipse,${s.blob},transparent)` }}
                          />
                          <div className="absolute top-0 right-10 w-px h-full bg-white/15 rotate-12 scale-y-150" />
                          <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 relative z-10">{s.label}</p>
                          <p className="text-sm font-black text-white relative z-10">{s.value}</p>
                          {s.sub && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 text-white text-[9px] font-black rounded-full relative z-10">
                              {s.sub}
                            </span>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                        </div>
                      ))}
                  </div>

                  {/* ── PO Category / Billing info strip (only shown when fields exist) ── */}
                  {(po.poCategory || po.billingModel || po.paymentTerms || po.paymentSchedule) && (
                    <div className="flex items-center gap-2 flex-wrap px-1">
                      {po.poCategory && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${catBadge[po.poCategory] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {po.poCategory.charAt(0).toUpperCase() + po.poCategory.slice(1)}
                        </span>
                      )}
                      {po.billingModel && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${modelBadge[po.billingModel] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {po.billingModel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      )}
                      {po.paymentTerms && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-slate-100 text-slate-600 border-slate-200">
                          {po.paymentTerms.replace(/-/g, " ").toUpperCase()}
                        </span>
                      )}
                      {po.paymentSchedule && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-teal-50 text-teal-700 border-teal-200">
                          {po.paymentSchedule.replace(/_/g, " ").toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Client + Deliver To */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {po.client?.name && (
                      <Card title="Client Details" icon={Building} accent="linear-gradient(180deg,#2563eb,#60a5fa)">
                        <div className="grid grid-cols-2 gap-3">
                          <F label="Company" value={po.client?.name} />
                          {po.client?.stateCode && <F label="State Code" value={po.client?.stateCode} />}
                          {po.client?.address && (
                            <div className="col-span-2">
                              <F label="Address" value={po.client?.address} />
                            </div>
                          )}
                          {(po.client?.GSTIN || po.client?.taxNumber) && (
                            <F label="GSTIN" value={po.client?.GSTIN || po.client?.taxNumber} mono />
                          )}
                          {po.client?.taxIdentifierType && (
                            <F label="Tax Type" value={po.client?.taxIdentifierType} />
                          )}
                        </div>
                      </Card>
                    )}

                    {po.deliverTo?.name && (
                      <Card title="Deliver To" icon={Truck} accent="linear-gradient(180deg,#059669,#34d399)">
                        <div className="grid grid-cols-2 gap-3">
                          <F label="Name" value={po.deliverTo?.name} />
                          {po.deliverTo?.stateCode && <F label="State Code" value={po.deliverTo?.stateCode} />}
                          {po.deliverTo?.address && (
                            <div className="col-span-2">
                              <F label="Address" value={po.deliverTo?.address} />
                            </div>
                          )}
                          {(po.deliverTo?.GSTIN || po.deliverTo?.taxNumber) && (
                            <F label="GSTIN" value={po.deliverTo?.GSTIN || po.deliverTo?.taxNumber} mono />
                          )}
                          {po.deliverTo?.taxIdentifierType && (
                            <F label="Tax Type" value={po.deliverTo?.taxIdentifierType} />
                          )}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Key dates */}
                  {(po.poDate || po.deliveryDate || po.referenceDate) && (
                    <Card title="Key Dates" icon={Calendar} accent="linear-gradient(180deg,#0f766e,#14b8a6)">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {po.poDate && <F label="PO Date" value={fmt(po.poDate)} />}
                        {po.deliveryDate && <F label="Delivery / End Date" value={fmt(po.deliveryDate)} />}
                        {po.referenceDate && <F label="Reference Date" value={fmt(po.referenceDate)} />}
                        {po.poreferencevalue && <F label="Reference No." value={po.poreferencevalue} mono />}
                        {po.currency && po.currency !== "INR" && <F label="Currency" value={po.currency} />}
                      </div>
                    </Card>
                  )}

                  {/* Financial Summary — only shown when there's meaningful tax/total data */}
                  {(po.totalAmount > 0) && (
                    <Card title="Financial Summary" icon={CreditCard} accent="linear-gradient(180deg,#d97706,#fbbf24)">
                      <div className="space-y-3">

                        {/* Tax row — only when any tax value is non-zero */}
                        {hasTaxValues && (
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { l: "CGST", v: fmtC(po.totalCGSTAmount, currency), cls: "border-blue-100 bg-blue-50/80 text-blue-700", show: (po.totalCGSTAmount || 0) > 0 },
                              { l: "SGST", v: fmtC(po.totalSGSTAmount, currency), cls: "border-violet-100 bg-violet-50/80 text-violet-700", show: (po.totalSGSTAmount || 0) > 0 },
                              { l: "IGST", v: fmtC(po.totalIGSTAmount, currency), cls: "border-emerald-100 bg-emerald-50/80 text-emerald-700", show: (po.totalIGSTAmount || 0) > 0 },
                            ]
                              .filter((t) => t.show)
                              .map((t) => (
                                <div key={t.l} className={`flex flex-col items-center px-3 py-2.5 rounded-xl border ${t.cls}`}>
                                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{t.l}</span>
                                  <span className="text-sm font-black">{t.v}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Taxable value row */}
                        {hasTaxableValue && (
                          <div className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxable Value</span>
                            <span className="text-xs font-black text-slate-700 tabular-nums">{fmtC(po.totalTaxableValue, currency)}</span>
                          </div>
                        )}

                        {/* Total bar */}
                        <div
                          className="flex items-center justify-between rounded-xl px-5 py-3 border border-blue-200"
                          style={{ background: "linear-gradient(90deg,#eff6ff,#dbeafe)" }}
                        >
                          <div>
                            <p className="text-xs font-black text-blue-900">Total Amount</p>
                            {po.valueInWords && (
                              <p className="text-[10px] text-blue-600 mt-0.5 italic">{po.valueInWords}</p>
                            )}
                          </div>
                          <p className="text-xl font-black text-blue-900 tabular-nums">{fmtC(po.totalAmount, currency)}</p>
                        </div>

                        {/* Invoiced / paid breakdown — only when values exist */}
                        {((po.totalInvoicedAmount || 0) > 0 || (po.totalPaidAmount || 0) > 0) && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                            {(po.totalInvoicedAmount || 0) > 0 && (
                              <div className="flex flex-col items-center px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50/80">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5 text-amber-700">Invoiced</span>
                                <span className="text-sm font-black text-amber-700">{fmtC(po.totalInvoicedAmount, currency)}</span>
                              </div>
                            )}
                            {(po.totalPaidAmount || 0) > 0 && (
                              <div className="flex flex-col items-center px-3 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50/80">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5 text-emerald-700">Paid</span>
                                <span className="text-sm font-black text-emerald-700">{fmtC(po.totalPaidAmount, currency)}</span>
                              </div>
                            )}
                            {(po.totalReconciledAmount || 0) > 0 && (
                              <div className="flex flex-col items-center px-3 py-2.5 rounded-xl border border-teal-100 bg-teal-50/80">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5 text-teal-700">Reconciled</span>
                                <span className="text-sm font-black text-teal-700">{fmtC(po.totalReconciledAmount, currency)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* ══ DETAILS ════════════════════════════════════════════ */}
              {tab === "details" && hasAnyDetailsData && (
                <div className="space-y-4">

                  {/* ── PO type / model badge strip ── */}
                  {(po.poCategory || po.billingModel || po.paymentTerms || po.paymentSchedule) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {po.poCategory && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${catBadge[po.poCategory] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {po.poCategory.charAt(0).toUpperCase() + po.poCategory.slice(1)}
                        </span>
                      )}
                      {po.billingModel && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${modelBadge[po.billingModel] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {po.billingModel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      )}
                      {po.paymentTerms && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-slate-100 text-slate-600 border-slate-200">
                          {po.paymentTerms.replace(/-/g, " ").toUpperCase()}
                        </span>
                      )}
                      {po.paymentSchedule && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-teal-50 text-teal-700 border-teal-200">
                          {po.paymentSchedule.replace(/_/g, " ").toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ════════════════════════════════════════════
                      STANDARD LINE ITEMS
                      Only rendered when this PO actually has items
                  ════════════════════════════════════════════ */}
                  {hasItems && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#1e3a8a,#60a5fa)" }} />
                        <Package size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Line Items</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                          {lineItems.length}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)" }}>
                              {["#", "Description", "HSN/SAC", "Qty", "Rate", "Taxable Value", "GST %", "GST Amt", "Total"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {lineItems.map((item, i) => (
                              <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{i + 1}</td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{item.description || "—"}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{item.hsnSac || "—"}</span>
                                </td>
                                <td className="px-4 py-3 font-black text-slate-700 tabular-nums">{item.quantity ?? "—"}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-700">{item.rate != null ? fmtC(item.rate, currency) : "—"}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-700">{item.taxableValue != null ? fmtC(item.taxableValue, currency) : "—"}</td>
                                <td className="px-4 py-3">
                                  {item.gstRate != null
                                    ? <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black">{item.gstRate}%</span>
                                    : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="px-4 py-3 tabular-nums text-amber-700 font-semibold">{item.gstAmount != null ? fmtC(item.gstAmount, currency) : "—"}</td>
                                <td className="px-4 py-3 font-black text-slate-900 tabular-nums">
                                  {fmtC(item.total ?? item.totalAmount ?? 0, currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)" }}>
                              <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Totals</td>
                              <td className="px-4 py-3 font-black text-slate-700 tabular-nums">{fmtC(po.totalTaxableValue, currency)}</td>
                              <td className="px-4 py-3" />
                              <td className="px-4 py-3 font-black text-amber-700 tabular-nums">
                                {fmtC((po.totalCGSTAmount || 0) + (po.totalSGSTAmount || 0) + (po.totalIGSTAmount || 0), currency)}
                              </td>
                              <td className="px-4 py-3 font-black text-blue-700 tabular-nums text-sm">{fmtC(po.totalAmount, currency)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════
                      RESOURCES / HEADCOUNT
                      Shown for staffing POs and project-headcount POs
                  ════════════════════════════════════════════ */}
                  {hasResources && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc 0%,#f5f3ff 100%)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#7c3aed,#a78bfa)" }} />
                        <User size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Resources / Headcount</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                          {po.resources.length}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#ede9fe 100%)" }}>
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">#</th>
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Name</th>
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Role</th>
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Employee ID</th>
                              {showRatePerDay && (
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Rate/Day</th>
                              )}
                              {showRatePerHour && (
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Rate/Hour</th>
                              )}
                              {showRatePerMonth && (
                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Rate/Month</th>
                              )}
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Start Date</th>
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">End Date</th>
                              <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {po.resources.map((r, i) => (
                              <tr key={i} className="hover:bg-violet-50/30 transition-colors group">
                                <td className="px-4 py-3 text-[10px] font-mono text-slate-400">{i + 1}</td>
                                <td className="px-4 py-3 font-bold text-slate-800 group-hover:text-violet-700 transition-colors">{r.name}</td>
                                <td className="px-4 py-3 text-slate-600">{r.role || "—"}</td>
                                <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{r.employeeId || "—"}</td>
                                {showRatePerDay && (
                                  <td className="px-4 py-3 tabular-nums text-slate-700">{Number(r.ratePerDay || 0) > 0 ? fmtC(r.ratePerDay, currency) : "—"}</td>
                                )}
                                {showRatePerHour && (
                                  <td className="px-4 py-3 tabular-nums text-slate-700">{Number(r.ratePerHour || 0) > 0 ? fmtC(r.ratePerHour, currency) : "—"}</td>
                                )}
                                {showRatePerMonth && (
                                  <td className="px-4 py-3 tabular-nums text-slate-700">{Number(r.ratePerMonth || 0) > 0 ? fmtC(r.ratePerMonth, currency) : "—"}</td>
                                )}
                                <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">{fmt(r.startDate)}</td>
                                <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">{fmt(r.endDate)}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${r.isActive !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                    {r.isActive !== false ? "Active" : "Inactive"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Staffing config — only if present AND has non-default meaningful data */}
                      {po.staffingConfig && (isStaffing || po.billingModel === "headcount") && (
                        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Staffing Configuration</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {po.staffingConfig.defaultWorkingDaysPerMonth != null && (
                              <F label="Working Days / Month" value={String(po.staffingConfig.defaultWorkingDaysPerMonth)} />
                            )}
                            {po.staffingConfig.billingUnit && (
                              <F label="Billing Unit" value={po.staffingConfig.billingUnit.toUpperCase()} />
                            )}
                            {po.staffingConfig.overtimeRateMultiplier != null && (
                              <F label="OT Multiplier" value={`${po.staffingConfig.overtimeRateMultiplier}×`} />
                            )}
                            {po.staffingConfig.holidayRateMultiplier != null && (
                              <F label="Holiday Rate" value={`${po.staffingConfig.holidayRateMultiplier}×`} />
                            )}
                            {po.staffingConfig.leavePolicy && (
                              <F label="Leave Policy" value={po.staffingConfig.leavePolicy.replace(/_/g, " ")} />
                            )}
                            <F label="Public Holidays as Working" value={po.staffingConfig.countPublicHolidaysAsWorking ? "Yes" : "No"} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ════════════════════════════════════════════
                      ATTENDANCE RECORDS
                      Shown when any attendance data exists
                  ════════════════════════════════════════════ */}
                  {hasAttendance && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc 0%,#ecfdf5 100%)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#059669,#34d399)" }} />
                        <Calendar size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Attendance Records</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                          {po.attendanceRecords.length}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#d1fae5 100%)" }}>
                              {["#", "Resource", "Period", "Std. Days", "Leaves", "Unpaid", "Holiday Work", "Worked Days", "Billable Days", "Billable Hrs", "Billable Amt", "Invoiced"].map((h) => (
                                <th key={h} className="px-3 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {po.attendanceRecords.map((a, i) => (
                              <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                <td className="px-3 py-3 text-[10px] font-mono text-slate-400">{i + 1}</td>
                                <td className="px-3 py-3 font-bold text-slate-800">{a.resourceName || "—"}</td>
                                <td className="px-3 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                                  {a.periodStart || a.periodEnd ? `${fmt(a.periodStart)} → ${fmt(a.periodEnd)}` : "—"}
                                </td>
                                <td className="px-3 py-3 tabular-nums text-center text-slate-700">{a.standardWorkingDays ?? "—"}</td>
                                <td className="px-3 py-3 tabular-nums text-center text-amber-700">{a.leaveDays ?? 0}</td>
                                <td className="px-3 py-3 tabular-nums text-center text-red-600">{a.unpaidLeaveDays ?? 0}</td>
                                <td className="px-3 py-3 tabular-nums text-center text-blue-700">{a.holidayWorkedDays ?? 0}</td>
                                <td className="px-3 py-3 tabular-nums text-center font-bold text-slate-800">{a.actualWorkedDays ?? "—"}</td>
                                <td className="px-3 py-3 tabular-nums text-center font-bold text-emerald-700">{a.billableDays ?? "—"}</td>
                                <td className="px-3 py-3 tabular-nums text-center text-slate-700">{a.billableHours ?? "—"}</td>
                                <td className="px-3 py-3 tabular-nums font-black text-slate-900">{a.billableAmount != null ? fmtC(a.billableAmount, currency) : "—"}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${a.isInvoiced ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                    {a.isInvoiced ? "Invoiced" : "Pending"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════
                      MILESTONES
                      Shown only when this PO actually has milestones
                  ════════════════════════════════════════════ */}
                  {hasMilestones && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eef2ff 100%)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#4f46e5,#818cf8)" }} />
                        <CheckCircle size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Milestones</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                          {po.milestones.length}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        {po.milestones.map((m, i) => (
                          <div key={i} className="border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70">
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                  style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                                  {i + 1}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{m.title}</p>
                                  {m.description && <p className="text-[10px] text-slate-400 mt-0.5">{m.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${msCfg[m.status] || msCfg.pending}`}>
                                  {m.status ? m.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Pending"}
                                </span>
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-indigo-50 text-indigo-700 border-indigo-200">
                                  {m.percentage ?? 0}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-100">
                              <div className="h-full rounded-full" style={{ width: `${m.percentage ?? 0}%`, background: "linear-gradient(90deg,#4f46e5,#818cf8)" }} />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-3">
                              <F label="Amount" value={fmtC(m.amount, currency)} />
                              <F label="Invoiced" value={fmtC(m.invoicedAmount || 0, currency)} />
                              <F label="Remaining" value={fmtC(Math.max(0, (m.amount || 0) - (m.invoicedAmount || 0)), currency)} />
                              {m.dueDate && <F label="Due Date" value={fmt(m.dueDate)} />}
                              {m.completedDate && <F label="Completed" value={fmt(m.completedDate)} />}
                              {m.notes && <F label="Notes" value={m.notes} />}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex gap-4 text-[10px] text-slate-500">
                          <span>Fully Invoiced: <strong className="text-emerald-700">{po.milestones.filter((m) => (m.invoicedAmount || 0) >= (m.amount || 0) && (m.amount || 0) > 0).length}</strong></span>
                          <span>Partially Invoiced: <strong className="text-indigo-700">{po.milestones.filter((m) => (m.invoicedAmount || 0) > 0 && (m.invoicedAmount || 0) < (m.amount || 0)).length}</strong></span>
                          <span>Pending: <strong className="text-amber-700">{po.milestones.filter((m) => !(m.invoicedAmount > 0)).length}</strong></span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Milestone Value</p>
                          <p className="text-sm font-black text-slate-800">{fmtC(po.milestones.reduce((s, m) => s + (m.amount || 0), 0), currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════
                      RETAINER — config card only for retainer POs
                  ════════════════════════════════════════════ */}
                  {isRetainer && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc 0%,#ecfdf5 100%)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#0f766e,#14b8a6)" }} />
                        <CreditCard size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Retainer Configuration</p>
                      </div>
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {po.billingModel && <F label="Billing Model" value={po.billingModel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />}
                        {po.paymentSchedule && <F label="Payment Schedule" value={po.paymentSchedule.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />}
                        {po.paymentTerms && <F label="Payment Terms" value={po.paymentTerms.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} />}
                        <F label="Total PO Value" value={fmtC(po.totalAmount, currency)} />
                        {(po.totalInvoicedAmount || 0) > 0 && <F label="Invoiced to Date" value={fmtC(po.totalInvoicedAmount, currency)} />}
                        <F label="Remaining" value={fmtC(Math.max(0, (po.totalAmount || 0) - (po.totalInvoicedAmount || 0)), currency)} />
                        {po.poDate && <F label="Start Date" value={fmt(po.poDate)} />}
                        {po.deliveryDate && <F label="End / Delivery" value={fmt(po.deliveryDate)} />}
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════
                      TAX SUMMARY — shown when values exist
                  ════════════════════════════════════════════ */}
                  {(hasTaxableValue || hasTaxValues) && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100"
                        style={{ background: "linear-gradient(90deg,#f8fafc 0%,#fffbeb 100%)" }}>
                        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#d97706,#fbbf24)" }} />
                        <Percent size={13} className="text-slate-500" />
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Tax & Financial Summary</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { l: "Taxable Value", v: fmtC(po.totalTaxableValue, currency), cls: "border-slate-200 bg-slate-50 text-slate-700", show: hasTaxableValue },
                            { l: "CGST", v: fmtC(po.totalCGSTAmount, currency), cls: "border-blue-100 bg-blue-50/80 text-blue-700", show: (po.totalCGSTAmount || 0) > 0 },
                            { l: "SGST", v: fmtC(po.totalSGSTAmount, currency), cls: "border-violet-100 bg-violet-50/80 text-violet-700", show: (po.totalSGSTAmount || 0) > 0 },
                            { l: "IGST", v: fmtC(po.totalIGSTAmount, currency), cls: "border-emerald-100 bg-emerald-50/80 text-emerald-700", show: (po.totalIGSTAmount || 0) > 0 },
                          ]
                            .filter((t) => t.show)
                            .map((t) => (
                              <div key={t.l} className={`flex flex-col items-center px-3 py-2.5 rounded-xl border ${t.cls}`}>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{t.l}</span>
                                <span className="text-sm font-black">{t.v}</span>
                              </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between rounded-xl px-5 py-3 border border-blue-200"
                          style={{ background: "linear-gradient(90deg,#eff6ff,#dbeafe)" }}>
                          <div>
                            <p className="text-xs font-black text-blue-900">Grand Total</p>
                            {po.valueInWords && <p className="text-[10px] text-blue-600 mt-0.5 italic">{po.valueInWords}</p>}
                          </div>
                          <p className="text-xl font-black text-blue-900 tabular-nums">{fmtC(po.totalAmount, currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TIMELINE ══════════════════════════════════════════ */}
              {tab === "timeline" && (
                <div className="space-y-4">
                  <Card
                    title="PO Timeline & Audit Trail"
                    icon={Clock}
                    accent="linear-gradient(180deg,#2563eb,#60a5fa)"
                  >
                    <div className="relative pl-8">
                      {/* vertical line */}
                      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-300 via-slate-200 to-transparent rounded-full" />

                      <div className="space-y-5">
                        {/* Created */}
                        <div className="relative flex gap-4">
                          <div className="absolute -left-8 w-6 h-6 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
                            <FileText size={10} className="text-white" />
                          </div>
                          <div className="flex-1 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-slate-800">Purchase Order Created</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">PO #{po.poNumber} was created</p>
                                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                  <Calendar size={10} /> {fmtT(po.createdAt)}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full border border-blue-200">Created</span>
                            </div>
                          </div>
                        </div>

                        {/* Status update */}
                        {po.status !== "draft" && (
                          <div className="relative flex gap-4">
                            <div className="absolute -left-8 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center">
                              <CheckCircle size={10} className="text-white" />
                            </div>
                            <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">Status Updated</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Changed to <span className="font-black text-slate-700">{po.status.replace("_", " ").toUpperCase()}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <Calendar size={10} /> {fmtT(po.updatedAt)}
                                  </p>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200">Updated</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {orderedInvoices.map((invoice, index) => {
                            const breakdown = getInvoiceTimelineBreakdown(invoice);
                            const isMilestoneInvoice =
                              getNormalizedPaymentTermType(po) === "milestone" &&
                              Array.isArray(invoice?.milestones) &&
                              invoice.milestones.length > 0;

                            const termSummary =
                              !isMilestoneInvoice && index >= 0
                                ? getTermTimelineSummary({
                                  po,
                                  invoice,
                                  invoiceIndex: index,
                                  orderedInvoices,
                                })
                                : null;

                            const milestoneSummary = isMilestoneInvoice
                              ? getMilestoneTimelineSummary({
                                po,
                                invoice,
                                invoiceIndex: index,
                                orderedInvoices,
                              })
                              : null;

                            const timelineSummary = milestoneSummary || termSummary;

                            return (
                              <div key={invoice._id || index} className="relative flex gap-4">
                                <div className="absolute -left-8 w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-md flex items-center justify-center">
                                  <FileSignature size={10} className="text-white" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoiceId(invoice._id)}
                                  className="flex-1 text-left bg-amber-50 border border-amber-100 rounded-2xl p-4 hover:border-amber-300 hover:bg-amber-100/60 transition-all"
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <div>
                                      <p className="text-xs font-bold text-slate-800">Invoice Generated</p>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        {invoice.invoiceNo} · {fmtC(breakdown.termInvoiceAmount, currency)}
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                        <Calendar size={10} /> {fmtT(invoice.invoiceDate || invoice.createdAt)}
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-1.5">
                                        Status: <span className="font-black text-slate-700">{invoice.status?.replaceAll("_", " ")}</span>
                                      </p>

                                      {timelineSummary && (
                                        <div className="mt-1.5 space-y-1.5">
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <p className="text-[10px] text-slate-500">
                                              {termSummary
                                                ? `Scheduled For Term ${termSummary.installmentNo}/${termSummary.totalInstallments}`
                                                : "Scheduled For Term"}
                                              :{" "}
                                              <span className="font-black text-blue-700">{fmtC(timelineSummary.scheduledTermAmount, currency)}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                              Raised In This Invoice:{" "}
                                              <span className="font-black text-slate-700">{fmtC(timelineSummary.actualRaisedAmount, currency)}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                              Remaining From This Term:{" "}
                                              <span className="font-black text-amber-700">{fmtC(timelineSummary.remainingFromThisTerm, currency)}</span>
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <p className="text-[10px] text-slate-500">
                                          Paid till date: <span className="font-black text-emerald-700">{fmtC(breakdown.paidAmount, currency)}</span>
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                          Remaining Amount: <span className="font-black text-amber-700">{fmtC(breakdown.remainingAmount, currency)}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-white text-amber-700 text-[10px] font-black rounded-full border border-amber-200 whitespace-nowrap">View Invoice</span>
                                  </div>
                                </button>
                              </div>
                            );
                          })}

                        {/* Delivery — only if a delivery date exists */}
                        {po.deliveryDate && (
                          <div className="relative flex gap-4">
                            <div className="absolute -left-8 w-6 h-6 rounded-full bg-violet-500 border-2 border-white shadow-md flex items-center justify-center">
                              <Truck size={10} className="text-white" />
                            </div>
                            <div className="flex-1 bg-violet-50 border border-violet-100 rounded-2xl p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-slate-800">Delivery Schedule</p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">Expected: {fmt(po.deliveryDate)}</p>
                                  {delSt && (
                                    <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border ${delSt.bg} ${delSt.color} ${delSt.border}`}>
                                      {delSt.text}
                                    </span>
                                  )}
                                </div>
                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-black rounded-full border border-violet-200">Scheduled</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* ══ DOCUMENTS ════════════════════════════════════════ */}
              {tab === "documents" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card
                      title="Generated Documents"
                      icon={FileText}
                      accent="linear-gradient(180deg,#1e3a8a,#60a5fa)"
                    >
                      <div className="space-y-2.5">
                        {[
                          {
                            label: "Purchase Order PDF",
                            sub: "Official document with signature",
                            accent: "bg-red-50 border-red-100",
                            icon: <FileText size={16} className="text-red-600" />,
                          },
                          {
                            label: "Purchase Order Word",
                            sub: "Editable Word document",
                            accent: "bg-blue-50 border-blue-100",
                            icon: <FileText size={16} className="text-blue-600" />,
                          },
                        ].map((d) => (
                          <button
                            key={d.label}
                            onClick={handleDownloadPDF}
                            className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl border ${d.accent}`}>{d.icon}</div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{d.label}</p>
                                <p className="text-[10px] text-slate-400">{d.sub}</p>
                              </div>
                            </div>
                            <Download size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </Card>

                    <Card
                      title="Additional Information"
                      icon={MessageSquare}
                      accent="linear-gradient(180deg,#7c3aed,#a78bfa)"
                    >
                      <div className="space-y-4">
                        {po.notes && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
                            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 italic">"{po.notes}"</p>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Digital Signature</p>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${po.withSignature ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {po.withSignature ? <CheckCircle size={10} /> : <X size={10} />}
                            {po.withSignature ? "Signature included" : "No signature"}
                          </span>
                        </div>
                        {po.poreferencevalue && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference</p>
                            <p className="text-xs font-mono font-semibold text-slate-800">{po.poreferencevalue}</p>
                          </div>
                        )}
                        {!po.notes && !po.poreferencevalue && (
                          <p className="text-xs text-slate-400 italic text-center py-4">No additional information available</p>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-200 px-6 py-3 bg-white rounded-b-2xl flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {po ? (
              <>Last updated: <span className="font-semibold text-slate-600">{fmtT(po.updatedAt)}</span></>
            ) : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#2563eb,#4f46e5)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
            >
              <Printer size={13} /> Print PO
            </button>
          </div>
        </div>
      </div>

      <InvoiceDetailsModal
        isOpen={Boolean(selectedInvoiceId)}
        onClose={() => setSelectedInvoiceId(null)}
        invoiceId={selectedInvoiceId}
      />
    </div>
  );
};

export default PurchaseOrderDetailModal;
