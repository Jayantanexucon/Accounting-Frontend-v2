import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import {
  Calendar, FileText, Package, CheckCircle, Clock,
  XCircle, AlertCircle, BookOpen, ShoppingCart,
  TrendingUp, TrendingDown, Activity, ArrowRight,
  History, BarChart2, Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardCharts from "../components/DashboardCharts";
import { getMonthlyFinancialSummaryFYApi } from "../apis/accountApi";
import HomeInvoiceDetails from "../modals/HomeInvoiceDetails";
import JournalDetailsModal from "../modals/JournalDetailsModal";
import PurchaseOrderDetailsModal from "../modals/PurchaseOrderDetailsModal";
import AuditLogSidebar from "../components/AuditLogSidebar";
import { getPurchaseOrdersApi } from "../apis/purchaseOrderApi";
import { getInvoicesApi } from "../apis/invoice.api";
import NotificationBell from "../modules/notification/NotificationBell";
import LatestJournals from "../components/LatestJournals";
import JournalList from "../components/JournalListComponent";

/* ─── data fetchers ───────────────────────────────────── */
const fetchRecentInvoices = async (companyId) => {
  const res = await getInvoicesApi(companyId, { page: 1, limit: 1000 });
  const data =
    res.data ||
    res.invoices ||
    res.result ||
    (Array.isArray(res) ? res : []);
  return data
    .sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt))
    .slice(0, 5);
};

const fetchRecentPOs = async (companyId) => {
  const res = await getPurchaseOrdersApi(companyId, { limit: 100 });
  const data =
    res.data?.data ||
    res.data?.purchaseOrders ||
    res.data?.result ||
    (Array.isArray(res.data) ? res.data : []);
  return data
    .sort((a, b) => new Date(b.poDate || b.createdAt) - new Date(a.poDate || a.createdAt))
    .slice(0, 5);
};

const fetchMonthlyFinance = async (companyId) => {
  const res = await getMonthlyFinancialSummaryFYApi(companyId, new Date().getFullYear());
  return res.data.summary || [];
};

/* ─── invoice status helper ───────────────────────────── */
const getStatusInfo = (status, pendingAmount) => {
  switch (status?.toLowerCase()) {
    case "fully_paid":
    case "paid":
      return { icon: <CheckCircle size={11} />, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "Paid" };
    case "partially_paid":
      return { icon: <Clock size={11} />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", label: "Partial" };
    case "unpaid":
      return { icon: <AlertCircle size={11} />, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", label: "Unpaid" };
    case "inprogress":
    case "pending":
      return { icon: <Clock size={11} />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", label: "Pending" };
    case "inactive":
    case "cancelled":
      return { icon: <XCircle size={11} />, color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", label: "Cancelled" };
    default:
      return { icon: <AlertCircle size={11} />, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", dot: "bg-slate-400", label: "Draft" };
  }
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n ?? 0);

const fmtShort = (n) => {
  const abs = Math.abs(n ?? 0);
  if (abs >= 1_00_00_000) return `₹${(abs / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000)    return `₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000)       return `₹${(abs / 1_000).toFixed(1)}K`;
  return `₹${abs}`;
};

/* ══════════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { user } = useAuth();

  const [journalDialogOpen, setJournalDialogOpen]   = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId]   = useState(null);
  const [showInvoiceModal, setShowInvoiceModal]     = useState(false);
  const [showJournalModal, setShowJournalModal]     = useState(false);
  const [selectedJournal, setSelectedJournal]       = useState(null);
  const [showPOModal, setShowPOModal]               = useState(false);
  const [selectedPO, setSelectedPO]                 = useState(null);
  const [openLogs, setOpenLogs]                     = useState(false);

  const company   = localStorage.getItem("selectedCompany")
    ? JSON.parse(localStorage.getItem("selectedCompany")) : null;
  const companyId = company?._id || user?.company?._id;

  /* ── queries ─────────────────────────────────────────── */
  const { data: recentInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["recentInvoices", companyId],
    queryFn: () => fetchRecentInvoices(companyId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: recentPOs = [], isLoading: loadingPOs } = useQuery({
    queryKey: ["recentPOs", companyId],
    queryFn: () => fetchRecentPOs(companyId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: monthlyFinance = [], isLoading: loadingFinance } = useQuery({
    queryKey: ["monthlyFinance", companyId],
    queryFn: () => fetchMonthlyFinance(companyId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  /* ── derived totals (summing all months in FY) ───────── */
  const totalRevenue  = monthlyFinance.reduce((s, m) => s + (m.revenue  ?? 0), 0);
  const totalExpense  = monthlyFinance.reduce((s, m) => s + (m.expense  ?? 0), 0);
  const totalProfit   = monthlyFinance.reduce((s, m) => s + (m.profit   ?? 0), 0);
  const isProfitable  = totalProfit >= 0;

  /* ── stat card definitions ───────────────────────────── */
  const STATS = [
    {
      label: "Total Revenue",
      value: fmtShort(totalRevenue),
      fullValue: fmt(totalRevenue),
      sub: `${monthlyFinance.length} months`,
      icon: <TrendingUp size={22} className="text-white" />,
      gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
      glow: "#93c5fd",
      loading: loadingFinance,
    },
    {
      label: "Total Expenses",
      value: fmtShort(totalExpense),
      fullValue: fmt(totalExpense),
      sub: `${monthlyFinance.length} months`,
      icon: <TrendingDown size={22} className="text-white" />,
      gradient: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#f87171 100%)",
      glow: "#fca5a5",
      loading: loadingFinance,
    },
    {
      label: isProfitable ? "Net Profit" : "Net Loss",
      value: fmtShort(Math.abs(totalProfit)),
      fullValue: fmt(Math.abs(totalProfit)),
      sub: `Margin: ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
      icon: isProfitable
        ? <TrendingUp size={22} className="text-white" />
        : <TrendingDown size={22} className="text-white" />,
      gradient: isProfitable
        ? "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)"
        : "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)",
      glow: isProfitable ? "#6ee7b7" : "#fde68a",
      loading: loadingFinance,
    },
  ];

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── STICKY HEADER ───────────────────────────── */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between gap-4">

              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl shadow-md"
                  style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}>
                  <BarChart2 size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    Financial Overview
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {user?.company?.name || "Your Company"} · Real-time dashboard
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <NotificationBell
                  buttonClassName="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
                  align="right"
                />
                <button
                  onClick={() => setOpenLogs(true)}
                  title="Audit Trail"
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"
                >
                  <History size={15} />
                </button>
                <a
                  href="https://help-desk.nexucon.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                  style={{
                    background: "linear-gradient(135deg,#1e40af,#3b82f6)",
                    boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                  }}
                >
                  Help Center
                </a>
              </div>
            </div>

            {/* ── STAT CARDS ────────────────────────────── */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STATS.map((s, idx) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
                  style={{ background: s.gradient }}
                >
                  {/* Glow blob */}
                  <div
                    className="absolute -top-8 -right-8 w-44 h-32 rounded-full opacity-30 blur-2xl group-hover:scale-125 transition-transform duration-700"
                    style={{ background: `radial-gradient(ellipse,${s.glow},transparent)` }}
                  />
                  <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
                  <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />

                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-2">
                        {s.label}
                      </p>
                      {s.loading ? (
                        <div className="w-20 h-7 rounded-lg bg-white/20 animate-pulse" />
                      ) : (
                        <p className="text-3xl font-black text-white leading-none" title={s.fullValue}>
                          {s.value}
                        </p>
                      )}
                      <p className="text-white/50 text-[11px] font-medium mt-2">{s.sub}</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-lg">
                      {s.icon}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────── */}
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

          {/* ── CHART SECTION ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
              style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full"
                  style={{ background: "linear-gradient(180deg,#1e40af,#60a5fa)" }} />
                <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  Growth Analytics
                </p>
                <span className="text-[10px] text-slate-400 font-medium">Monthly FY breakdown</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-slate-500">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-[10px] font-bold text-slate-500">Expenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500">Profit</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <DashboardCharts companyId={companyId} />
            </div>
          </div>

          {/* ── INVOICES + PURCHASE ORDERS ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Recent Invoices */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Card header bar */}
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full"
                    style={{ background: "linear-gradient(180deg,#1e40af,#60a5fa)" }} />
                  <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Recent Invoices
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                    style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}>
                    {recentInvoices.length}
                  </span>
                </div>
                <a
                  href="/invoice-data"
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View All <ArrowRight size={12} />
                </a>
              </div>

              <div className="divide-y divide-slate-50">
                {loadingInvoices ? (
                  <div className="flex justify-center py-10">
                    <div className="w-7 h-7 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : recentInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="p-3 rounded-2xl" style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)" }}>
                      <FileText size={22} className="text-blue-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">No invoices yet</p>
                  </div>
                ) : recentInvoices.map((inv, i) => {
                  const invoiceAmount = inv.netPayable || inv.amountDue || inv.totalTaxableValue || 0;
                  const totalReceived = (inv.payments || []).reduce((s, p) => s + (p.receivedAmount || 0), 0);
                  const pendingAmount = Math.max(0, invoiceAmount - totalReceived);
                  
                  let paymentStatus = inv.status;
                  if (inv.status?.toLowerCase() === "active" || inv.status?.toLowerCase() === "paid") {
                    if (pendingAmount <= 0) paymentStatus = "fully_paid";
                    else if (totalReceived > 0) paymentStatus = "partially_paid";
                    else paymentStatus = "unpaid";
                  }

                  const st = getStatusInfo(paymentStatus, pendingAmount);
                  return (
                    <motion.div
                      key={inv._id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setSelectedInvoiceId(inv._id); setShowInvoiceModal(true); }}
                      className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-blue-50/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status dot + icon */}
                        <div className={`flex items-center justify-center w-7 h-7 rounded-xl shrink-0 border ${st.bg} ${st.border} ${st.color}`}>
                          {st.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                            {inv.invoiceNo || "INV-NEW"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {inv.billTo?.name || "Client"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black text-slate-800 tabular-nums">
                          ₹{(invoiceAmount).toLocaleString("en-IN")}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black ${st.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Recent Purchase Orders */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
                style={{ background: "linear-gradient(90deg,#f8fafc 0%,#f0fdf4 100%)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full"
                    style={{ background: "linear-gradient(180deg,#059669,#34d399)" }} />
                  <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Purchase Orders
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                    style={{ background: "linear-gradient(135deg,#059669,#34d399)" }}>
                    {recentPOs.length}
                  </span>
                </div>
                <a
                  href="/purchaseorder-data"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  View All <ArrowRight size={12} />
                </a>
              </div>

              <div className="divide-y divide-slate-50">
                {loadingPOs ? (
                  <div className="flex justify-center py-10">
                    <div className="w-7 h-7 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                ) : recentPOs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="p-3 rounded-2xl" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
                      <ShoppingCart size={22} className="text-emerald-300" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">No purchase orders yet</p>
                  </div>
                ) : recentPOs.map((po, i) => {
                  const st = getStatusInfo(po.status);
                  return (
                    <motion.div
                      key={po._id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setSelectedPO(po); setShowPOModal(true); }}
                      className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-emerald-50/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0 bg-emerald-50 border border-emerald-100 text-emerald-600">
                          <Package size={11} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                            {po.poNumber || "PO-NEW"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            {po.vendor?.name || "Vendor"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black text-slate-800 tabular-nums">
                          ₹{(po.totalAmount ?? 0).toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {po.status || "Draft"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RECENT JOURNALS ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
              style={{ background: "linear-gradient(90deg,#f8fafc 0%,#f5f3ff 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full"
                  style={{ background: "linear-gradient(180deg,#4f46e5,#a78bfa)" }} />
                <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                  Recent Journals
                </p>
              </div>
            </div>
            <div className="p-5">
              <LatestJournals
                onJournalClick={(j) => { setSelectedJournal(j); setShowJournalModal(true); }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── MODALS ──────────────────────────────────────── */}
      {showInvoiceModal && (
        <HomeInvoiceDetails
          open={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          invoiceId={selectedInvoiceId}
          refreshInvoices={() => {}}
        />
      )}
      {showJournalModal && (
        <JournalDetailsModal
          open={showJournalModal}
          onClose={() => setShowJournalModal(false)}
          journal={selectedJournal}
        />
      )}
      {showPOModal && (
        <PurchaseOrderDetailsModal
          open={showPOModal}
          onClose={() => setShowPOModal(false)}
          purchaseOrder={selectedPO}
        />
      )}
      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={user?.company?._id}
        title="System Activity"
        subtitle="Tracking all system-wide activities"
      />
      <JournalList
        open={journalDialogOpen}
        onClose={() => setJournalDialogOpen(false)}
      />
    </>
  );
}
