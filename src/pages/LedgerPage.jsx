import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Search, CirclePlus, X, Filter, BookOpen, Layers,
  History, SlidersHorizontal, TrendingUp, ChevronUp,
  ChevronDown, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ManageLedgerModal from "../modals/ManageLedgerModal";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { getAccountsApi, getLedgerApi } from "../apis/accountApi";
import LoadingComponent from "../components/LoadingComponent";
import LedgerDetailModal from "../components/LedgerDetailSidebar";
import AdvancedSearchModal from "../modals/AdvancedSearchModal";
import FilterBadge from "../components/FilterBadge";
import { checkAuthorization } from "../utils/checkAuthorization";
import AuditLogSidebar from "../components/AuditLogSidebar";

/* ── balance-type colour map ───────────────────────────── */
const BALANCE_COLORS = {
  DEBIT:   { pill: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500",   row: "hover:bg-blue-50/50"   },
  CREDIT:  { pill: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500", row: "hover:bg-violet-50/50" },
  NEUTRAL: { pill: "bg-slate-100 text-slate-600 border-slate-200",   dot: "bg-slate-400",  row: "hover:bg-slate-50/70"  },
};
const getBC = (t) => BALANCE_COLORS[(t || "").toUpperCase()] || BALANCE_COLORS.NEUTRAL;

const SortIcon = ({ field, sort }) =>
  sort.key === field
    ? sort.dir === "asc"
      ? <ChevronUp   size={11} className="text-blue-500" />
      : <ChevronDown size={11} className="text-blue-500" />
    : <ChevronDown size={11} className="text-slate-300" />;

const TABLE_COLS = [
  { key: "code",           label: "Code"         },
  { key: "name",           label: "Account Name" },
  { key: "groupName",      label: "Group"        },
  { key: "balanceType",    label: "Balance Type" },
  { key: "closingBalance", label: "Current Bal." },
];

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function LedgerPage() {
  const { user } = useAuth();

  const [ledgerData, setLedgerData]             = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [searchQuery, setSearchQuery]           = useState("");
  const [filterGroup, setFilterGroup]           = useState("All");
  const [sort, setSort]                         = useState({ key: "name", dir: "asc" });
  const [currentPage, setCurrentPage]           = useState(1);
  const [pageSize, setPageSize]                 = useState(10);
  const [selectedAccount, setSelectedAccount]   = useState(null);
  const [accountTransactions, setAccountTransactions] = useState({});
  const [openLogs, setOpenLogs]                 = useState(false);
  const [openModel, setOpenModal]               = useState({ addLedger: false, editLedger: false, advancedSearch: false });
  const [advancedFilters, setAdvancedFilters]   = useState({
    dateRange: { from: null, to: null },
    amountRange: { min: "", max: "" },
    amountType: "both",
    accountGroups: [],
    journalIds: [],
    partyName: "",
  });

  /* ── fetch accounts ────────────────────────────────── */
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const accounts = (await getAccountsApi(user?.company?._id))?.data || [];
        setLedgerData(accounts);
      } catch (err) {
        toast.error(err?.response?.data?.message);
      } finally { setLoading(false); }
    })();
    return () => ctrl.abort();
  }, []);

  const toggleModal = useCallback(
    (key) => setOpenModal((p) => ({ ...p, [key]: !p[key] })), []
  );

  /* ── open ledger modal (row click OR button click) ── */
  const openLedgerModal = useCallback((account, e) => {
    if (e) e.stopPropagation();
    if (!checkAuthorization(user, "CHART OF ACCOUNTS", "VIEW")) return;
    setSelectedAccount(account);
  }, [user]);

  /* ── advanced filter check ─────────────────────────── */
  const hasActiveFilters = useCallback(() =>
    Object.values(advancedFilters).some((f) => {
      if (Array.isArray(f)) return f.length > 0;
      if (typeof f === "object" && f) return Object.values(f).some((v) => v !== null && v !== "");
      return f !== "" && f !== "both";
    }), [advancedFilters]);

  /* ── fetch transactions when advanced filters active ── */
  useEffect(() => {
    if (!ledgerData.length || !hasActiveFilters()) return;
    (async () => {
      const map = {};
      for (const acct of ledgerData) {
        try {
          const ctrl = new AbortController();
          const res  = await getLedgerApi(acct._id, user?.company?._id, ctrl.signal);
          map[acct._id] = res.data?.entries || [];
        } catch { map[acct._id] = []; }
      }
      setAccountTransactions(map);
    })();
  }, [ledgerData, advancedFilters]);

  const matchesAdvancedFilters = useCallback((tx) => {
    const af = advancedFilters;
    if (af.dateRange.from || af.dateRange.to) {
      const d = new Date(tx.date);
      if (af.dateRange.from && d < new Date(af.dateRange.from)) return false;
      if (af.dateRange.to) {
        const to = new Date(af.dateRange.to);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
    }
    if (af.amountRange.min !== "" || af.amountRange.max !== "") {
      const amt = tx.debit > 0 ? tx.debit : tx.credit;
      if (af.amountRange.min !== "" && amt < af.amountRange.min) return false;
      if (af.amountRange.max !== "" && amt > af.amountRange.max) return false;
    }
    if (af.amountType !== "both") {
      if (af.amountType === "debit"  && tx.debit  <= 0) return false;
      if (af.amountType === "credit" && tx.credit <= 0) return false;
    }
    if (af.journalIds?.length > 0 && tx.referenceNumber) {
      if (!af.journalIds.some((j) => tx.referenceNumber.toLowerCase().includes(j.toLowerCase()))) return false;
    }
    if (af.partyName && tx.partyName &&
        !tx.partyName.toLowerCase().includes(af.partyName.toLowerCase())) return false;
    return true;
  }, [advancedFilters]);

  const accountHasMatchingTransactions = useCallback(
    (id) => (accountTransactions[id] || []).some(matchesAdvancedFilters),
    [accountTransactions, matchesAdvancedFilters]
  );

  /* ── groups list for dropdown ──────────────────────── */
  const accountGroups = useMemo(() => {
    const g = new Set(ledgerData.map((a) => a.groupName).filter(Boolean));
    return ["All", ...Array.from(g).sort()];
  }, [ledgerData]);

  /* ── filtering ─────────────────────────────────────── */
  const filteredAccounts = useMemo(() => ledgerData.filter((a) => {
    const ms = !searchQuery
      || a.name.toLowerCase().includes(searchQuery.toLowerCase())
      || (a.groupName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const mg = filterGroup === "All" || a.groupName === filterGroup;
    const ma = !advancedFilters.accountGroups.length ||
               advancedFilters.accountGroups.includes(a.groupName);
    if (!hasActiveFilters()) return ms && mg && ma;
    return ms && mg && ma && accountHasMatchingTransactions(a._id);
  }), [ledgerData, searchQuery, filterGroup, advancedFilters.accountGroups, accountHasMatchingTransactions, hasActiveFilters]);

  /* ── sorting ───────────────────────────────────────── */
  const sorted = useMemo(() => [...filteredAccounts].sort((a, b) => {
    let av = a[sort.key] ?? "", bv = b[sort.key] ?? "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    return av < bv ? (sort.dir === "asc" ? -1 : 1)
         : av > bv ? (sort.dir === "asc" ?  1 : -1) : 0;
  }), [filteredAccounts, sort]);

  const toggleSort = (key) => {
    setSort((p) => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" }));
    setCurrentPage(1); // reset to page 1 on sort change
  };

  /* ── pagination derived values ─────────────────────── */
  const totalPages   = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage     = Math.min(currentPage, totalPages);
  const pageStart    = (safePage - 1) * pageSize;          // 0-based index
  const pageEnd      = Math.min(pageStart + pageSize, sorted.length);
  const paginated    = sorted.slice(pageStart, pageEnd);

  /* keep currentPage in bounds if filters shrink results */
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  /* reset to page 1 whenever search/filter changes */
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterGroup, advancedFilters]);

  /* ── account update ────────────────────────────────── */
  const handleAccountUpdate = useCallback((updated) => {
    setLedgerData((prev) => {
      const i = prev.findIndex((a) => a._id === updated._id);
      if (i >= 0) { const n = [...prev]; n[i] = updated; return n; }
      return [...prev, updated];
    });
    if (selectedAccount?._id === updated._id) setSelectedAccount(updated);
  }, [selectedAccount]);

  const openLedgerEditModal = useCallback((account) => {
    setSelectedAccount(account);
    setOpenModal((prev) => ({ ...prev, editLedger: true }));
  }, []);

  /* ── filter helpers ────────────────────────────────── */
  const handleAdvancedFilterChange = useCallback((f) => {
    setAdvancedFilters(f);
    setSelectedAccount(null);
  }, []);

  const removeFilter = useCallback((key) => {
    setAdvancedFilters((prev) => {
      const n = { ...prev };
      if (key === "dateRange")      n.dateRange      = { from: null, to: null };
      else if (key === "amountRange")   n.amountRange   = { min: "", max: "" };
      else if (key === "accountGroups") n.accountGroups = [];
      else if (key === "journalIds")    n.journalIds    = [];
      else if (key === "amountType")    n.amountType    = "both";
      else n[key] = "";
      return n;
    });
  }, []);

  const clearAllAdvancedFilters = useCallback(() => {
    setAdvancedFilters({
      dateRange: { from: null, to: null },
      amountRange: { min: "", max: "" },
      amountType: "both",
      accountGroups: [],
      journalIds: [],
      partyName: "",
    });
    setAccountTransactions({});
    toast.info("All advanced filters cleared");
  }, []);

  /* ── stat: unique groups ───────────────────────────── */
  const uniqueGroups = useMemo(
    () => new Set(ledgerData.map((a) => a.groupName).filter(Boolean)).size,
    [ledgerData]
  );

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── STICKY HEADER ─────────────────────────── */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-6 py-5">

            {/* Title row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl shadow-md"
                  style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}>
                  <BookOpen size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    Chart of Accounts
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Manage and organise all ledger accounts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Advanced filter */}
                <button onClick={() => toggleModal("advancedSearch")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-bold">
                  <SlidersHorizontal size={14} />
                  <span className="hidden sm:inline">Advanced</span>
                  {hasActiveFilters() && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                </button>

                {/* Audit trail */}
                <button onClick={() => setOpenLogs(true)} title="Audit Trail"
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <History size={15} />
                </button>

                {/* Count badge */}
                <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <Layers size={12} /> {ledgerData.length} accounts
                </span>

                {/* Add ledger */}
                {checkAuthorization(user, "CHART OF ACCOUNTS", "CREATE") && (
                  <button onClick={() => toggleModal("addLedger")}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>
                    <CirclePlus size={14} /> Add Ledger
                  </button>
                )}
              </div>
            </div>

            {/* ── Stat cards ─────────────────────────── */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {/* Total Ledgers */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
                style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}>
                <div className="absolute -top-8 -right-8 w-44 h-32 rounded-full opacity-30 blur-2xl group-hover:scale-125 transition-transform duration-700"
                  style={{ background: "radial-gradient(ellipse,#93c5fd,transparent)" }} />
                <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
                <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Total Ledgers</p>
                    <p className="text-4xl font-black text-white leading-none">{ledgerData.length}</p>
                    <p className="text-blue-200/60 text-[11px] font-medium mt-2">All registered accounts</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-lg">
                    <BookOpen size={22} className="text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </motion.div>

              {/* Account Groups */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
                style={{ background: "linear-gradient(135deg,#312e81 0%,#4f46e5 55%,#a78bfa 100%)" }}>
                <div className="absolute -top-10 -right-10 w-48 h-36 rounded-full opacity-25 blur-2xl group-hover:scale-125 transition-transform duration-700"
                  style={{ background: "radial-gradient(ellipse,#c4b5fd,transparent)" }} />
                <div className="absolute -bottom-5 -right-5 w-28 h-28 rounded-full border-4 border-white/15" />
                <div className="absolute top-0 left-20 w-0.5 h-full bg-white/15 -rotate-12 scale-y-150" />
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="text-violet-200 text-[10px] font-black uppercase tracking-widest mb-2">Account Groups</p>
                    <p className="text-4xl font-black text-white leading-none">{uniqueGroups}</p>
                    <p className="text-violet-200/60 text-[11px] font-medium mt-2">Unique group categories</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-lg">
                    <TrendingUp size={22} className="text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── BODY ──────────────────────────────────── */}
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

          {/* Filter badges */}
          <FilterBadge filters={advancedFilters} onRemove={removeFilter} onClearAll={clearAllAdvancedFilters} />

          {/* Search + group filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search by name or group…" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all font-medium placeholder-slate-400" />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-44">
              <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none font-medium text-slate-700">
                {accountGroups.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronDown size={13} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* ── TABLE CARD ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            {/* Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
              style={{ background: "linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 rounded-full"
                  style={{ background: "linear-gradient(180deg,#1e40af,#60a5fa)" }} />
                <p className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">All Ledger Accounts</p>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}>
                  {sorted.length}
                </span>
                {hasActiveFilters() && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">
                    <Filter size={9} /> Filtered
                  </span>
                )}
              </div>
              {(searchQuery || filterGroup !== "All" || hasActiveFilters()) && (
                <button
                  onClick={() => { setSearchQuery(""); setFilterGroup("All"); clearAllAdvancedFilters(); }}
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                  <X size={10} /> Clear all
                </button>
              )}
            </div>

            {/* Hint for row-click */}
            {!loading && sorted.length > 0 && (
              <div className="px-5 py-2 bg-blue-50/50 border-b border-blue-100/60 flex items-center gap-2">
                <Eye size={11} className="text-blue-400" />
                <p className="text-[10px] text-blue-500 font-medium">
                  Click any row or the <span className="font-black">View</span> button to open ledger details
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && <div className="p-10"><LoadingComponent message="Loading accounts…" /></div>}

            {/* No data */}
            {!loading && ledgerData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)" }}>
                  <BookOpen size={28} className="text-blue-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">No ledger accounts yet</p>
                <p className="text-xs text-slate-400">Click 'Add Ledger' to get started</p>
                {checkAuthorization(user, "CHART OF ACCOUNTS", "CREATE") && (
                  <button onClick={() => toggleModal("addLedger")}
                    className="mt-2 flex items-center gap-1.5 px-5 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>
                    <CirclePlus size={13} /> Create First Account
                  </button>
                )}
              </div>
            )}

            {/* No results */}
            {!loading && ledgerData.length > 0 && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 rounded-2xl" style={{ background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)" }}>
                  <Search size={26} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">No matching accounts</p>
                <p className="text-xs text-slate-400">
                  {hasActiveFilters()
                    ? "No accounts have transactions matching your filters"
                    : "Try a different search or group"}
                </p>
              </div>
            )}

            {/* Table */}
            {!loading && sorted.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "linear-gradient(90deg,#f1f5f9 0%,#dbeafe 100%)" }}>
                      {TABLE_COLS.map((col) => (
                        <th key={col.key} onClick={() => toggleSort(col.key)}
                          className="px-5 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span className={sort.key === col.key ? "text-blue-600" : ""}>{col.label}</span>
                            <SortIcon field={col.key} sort={sort} />
                          </span>
                        </th>
                      ))}
                      <th className="px-5 py-3.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginated.map((account, i) => {
                      const bc         = getBC(account.balanceType || account.type);
                      const isSelected = selectedAccount?._id === account._id;
                      const canView    = checkAuthorization(user, "CHART OF ACCOUNTS", "VIEW");

                      return (
                        <motion.tr
                          key={account._id || i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.018 }}
                          onClick={() => canView && openLedgerModal(account)}
                          className={`transition-all group ${bc.row} ${isSelected ? "bg-blue-50/60" : ""} ${canView ? "cursor-pointer" : "cursor-default"}`}
                        >
                          {/* Code */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                              #{String(account.code || "").padStart(3, "0")}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${bc.dot}`} />
                              <div>
                                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                                  {account.name || "—"}
                                </p>
                                {account.description && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                                    {account.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Group */}
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border bg-slate-100 text-slate-600 border-slate-200">
                              {account.groupName || "—"}
                            </span>
                          </td>

                          {/* Balance Type */}
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${bc.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${bc.dot}`} />
                              {account.balanceType || account.type || "—"}
                            </span>
                          </td>

                          {/* Current Balance */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold text-slate-700">
                              {account.closingBalance != null
                                ? `₹${Number(account.closingBalance).toLocaleString("en-IN")} ${account.closingType === "credit" ? "Cr" : "Dr"}`
                                : "—"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end">
                              {canView && (
                                <button
                                  onClick={(e) => openLedgerModal(account, e)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Eye size={12} /> View
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Pagination footer ─────────────────── */}
            {!loading && sorted.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">

                {/* Left: count + page-size picker */}
                <div className="flex items-center gap-3">
                  <p className="text-[10px] text-slate-400">
                    Showing{" "}
                    <span className="font-black text-slate-700">{pageStart + 1}</span>
                    {" – "}
                    <span className="font-black text-slate-700">{pageEnd}</span>
                    {" of "}
                    <span className="font-black text-slate-700">{sorted.length}</span>
                    {" accounts"}
                    {hasActiveFilters() && (
                      <span className="ml-1.5 text-blue-600 font-bold">· filtered</span>
                    )}
                  </p>

                  {/* Rows-per-page */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Rows</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none appearance-none cursor-pointer"
                    >
                      {[5, 10, 20, 50].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right: page navigation */}
                <div className="flex items-center gap-1">
                  {/* First */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="First page"
                  >
                    <ChevronsLeft size={14} />
                  </button>

                  {/* Prev */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {/* Page number pills */}
                  {(() => {
                    const pages = [];
                    const delta = 1;
                    const left  = Math.max(2, safePage - delta);
                    const right = Math.min(totalPages - 1, safePage + delta);

                    // always show page 1
                    pages.push(1);
                    if (left > 2) pages.push("...");
                    for (let p = left; p <= right; p++) pages.push(p);
                    if (right < totalPages - 1) pages.push("...");
                    if (totalPages > 1) pages.push(totalPages);

                    return pages.map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1.5 text-[11px] text-slate-300 select-none">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[28px] h-7 px-2 rounded-lg text-[11px] font-black transition-all ${
                            p === safePage
                              ? "text-white shadow-sm"
                              : "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          }`}
                          style={p === safePage ? { background: "linear-gradient(135deg,#1e40af,#3b82f6)" } : {}}
                        >
                          {p}
                        </button>
                      )
                    );
                  })()}

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>

                  {/* Last */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Last page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── LEDGER DETAIL MODAL ─────────────────────── */}
      <AnimatePresence>
        {selectedAccount && (
          <LedgerDetailModal
            account={selectedAccount}
            onClose={() => setSelectedAccount(null)}
            onUpdate={handleAccountUpdate}
            advancedFilters={advancedFilters}
            onEditRequested={openLedgerEditModal}
          />
        )}
      </AnimatePresence>

      {/* Add Ledger */}
      {openModel.addLedger && (
        <ManageLedgerModal
          open={openModel.addLedger}
          onClose={() => toggleModal("addLedger")}
          title="Add Ledger"
          subtitle="Ledger accounts can be added here or created manually from journal entries"
          updateAccount={handleAccountUpdate}
        />
      )}

      {openModel.editLedger && selectedAccount && (
        <ManageLedgerModal
          open={openModel.editLedger}
          onClose={() => toggleModal("editLedger")}
          title="Edit Ledger"
          subtitle="Update ledger information and group assignment"
          updateAccount={handleAccountUpdate}
          ledgerToEdit={selectedAccount}
        />
      )}

      {/* Advanced Search */}
      {openModel.advancedSearch && (
        <AdvancedSearchModal
          open={openModel.advancedSearch}
          onClose={() => toggleModal("advancedSearch")}
          filters={advancedFilters}
          onApplyFilters={handleAdvancedFilterChange}
          availableAccountGroups={accountGroups.filter((g) => g !== "All")}
        />
      )}

      {/* Audit Log */}
      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={user?.company?._id}
        modules={["ACCOUNT"]}
        title="Account Audit Trail"
        subtitle="Tracking all account and ledger-related activities"
      />
    </>
  );
}
