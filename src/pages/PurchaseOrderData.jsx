import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API } from "../apis/api";
import { getClientsApi } from "../apis/clientApi";
import { getVendors } from "../apis/vendorApi";
import {
  getPurchaseOrdersApi,
  advancedSearchPurchaseOrdersApi,
} from "../apis/purchaseOrderApi";
import dayjs from "dayjs";
import PurchaseOrderAdvancedSearch from "../components/PurchaseOrderAdvancedSearch";
import AuditLogSidebar from "../components/AuditLogSidebar";
import ClientDetailsModal from "../components/ClientDetailsModal";
import { motion, AnimatePresence } from "framer-motion";

import {
  Search,
  RefreshCw,
  Plus,
  Loader2,
  User,
  Banknote,
  AlertCircle,
  CheckCircle,
  Filter,
  Clock,
  ShoppingCart,
  Upload,
  MapPin,
  FileText,
  Eye,
  History,
  X,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Calendar,
  Hash,
  Globe,
  Building2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Advanced Search Panel (inline, no external dep)
// ─────────────────────────────────────────────
const PO_STATUS_OPTIONS = [
  { value: "", label: "All PO Statuses" },
  { value: "OPEN", label: "Open" },
  { value: "PARTIALLY_INVOICED", label: "Partially Invoiced" },
  { value: "FULLY_INVOICED", label: "Fully Invoiced" },
  { value: "CLOSED", label: "Closed / Fully Paid" },
];

const INVOICE_STATE_OPTIONS = [
  { value: "", label: "All Invoice States" },
  { value: "OPEN_NO_INVOICE", label: "Open / No Invoice" },
  { value: "PARTIALLY_INVOICED", label: "Partially Invoiced" },
  { value: "FULLY_INVOICED", label: "Fully Invoiced" },
  { value: "FULLY_PAID", label: "Fully Paid" },
];

const AdvancedSearchPanel = ({ isOpen, filters, onApply, onClear, isLoading, companyId, clientOptions = [] }) => {
  const [local, setLocal] = useState(filters || {});
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [poSearchQuery, setPoSearchQuery] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showPoDropdown, setShowPoDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState(clientOptions);
  const [filteredPoNumbers, setFilteredPoNumbers] = useState([]);

  useEffect(() => {
    setLocal(filters || {});
    setClientSearchQuery(filters?.clientName || "");
    setPoSearchQuery(filters?.poNumber || "");
  }, [filters]);

  const set = (key, val) => setLocal((p) => ({ ...p, [key]: val }));

  const handleApply = () => onApply(local);
  const handleClear = () => {
    setLocal({});
    setClientSearchQuery("");
    setPoSearchQuery("");
    setShowClientDropdown(false);
    setShowPoDropdown(false);
    onClear();
  };

  const inputCls =
    "w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all placeholder-slate-400 text-slate-700";
  const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1";

  useEffect(() => {
    const nextClients = clientSearchQuery.trim()
      ? clientOptions.filter((name) =>
        name.toLowerCase().includes(clientSearchQuery.toLowerCase()),
      )
      : clientOptions;
    setFilteredClients(nextClients);
  }, [clientOptions, clientSearchQuery]);

  useEffect(() => {
    if (!isOpen || !companyId) return;

    const timer = window.setTimeout(async () => {
      try {
        const res = await API.get("/purchase-orders/search/number", {
          params: {
            q: poSearchQuery,
            companyId,
            ...(local.clientName ? { clientName: local.clientName } : {}),
          },
        });
        setFilteredPoNumbers(
          Array.isArray(res.data) ? res.data.map((item) => item.label).filter(Boolean) : [],
        );
      } catch (error) {
        console.error("Error searching PO numbers:", error);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [companyId, isOpen, local.clientName, poSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showClientDropdown && !event.target.closest(".inline-client-search")) {
        setShowClientDropdown(false);
      }
      if (showPoDropdown && !event.target.closest(".inline-po-search")) {
        setShowPoDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showClientDropdown, showPoDropdown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-blue-400" />
                <span className="text-sm font-bold text-white tracking-wide">Advanced Filters</span>
              </div>
              <button onClick={onClear} className="text-slate-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="inline-po-search">
                <label className={labelCls}>PO Number</label>
                <div className="relative">
                  <input
                    className={inputCls}
                    placeholder="Type to search PO number"
                    value={local.poNumber || ""}
                    onFocus={() => setShowPoDropdown(true)}
                    onChange={(e) => {
                      set("poNumber", e.target.value);
                      setPoSearchQuery(e.target.value);
                      setShowPoDropdown(true);
                    }}
                  />
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  {showPoDropdown && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {filteredPoNumbers.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500">No matching PO numbers</div>
                      ) : (
                        filteredPoNumbers.map((poNumber) => (
                          <button
                            key={poNumber}
                            type="button"
                            onClick={() => {
                              set("poNumber", poNumber);
                              setPoSearchQuery(poNumber);
                              setShowPoDropdown(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                          >
                            {poNumber}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="inline-client-search">
                <label className={labelCls}>Client Name</label>
                <div className="relative">
                  <input
                    className={inputCls}
                    placeholder="Type to search client name"
                    value={local.clientName || ""}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => {
                      set("clientName", e.target.value);
                      setClientSearchQuery(e.target.value);
                      setShowClientDropdown(true);
                    }}
                  />
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  {showClientDropdown && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {filteredClients.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500">No matching clients</div>
                      ) : (
                        filteredClients.map((clientName) => (
                          <button
                            key={clientName}
                            type="button"
                            onClick={() => {
                              set("clientName", clientName);
                              setClientSearchQuery(clientName);
                              setShowClientDropdown(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
                          >
                            {clientName}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>PO Status</label>
                <select className={inputCls} value={local.poStatus || local.status || ""} onChange={(e) => { set("poStatus", e.target.value); set("status", e.target.value); }}>
                  {PO_STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all-po-status"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Invoice State</label>
                <select className={inputCls} value={local.invoiceState || ""} onChange={(e) => set("invoiceState", e.target.value)}>
                  {INVOICE_STATE_OPTIONS.map((option) => (
                    <option key={option.value || "all-invoice-state"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={handleClear} className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1.5">
                <X size={13} /> Clear All
              </button>
              <button
                onClick={handleApply}
                disabled={isLoading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Filter size={13} />}
                Apply Filters
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ActivityBadge = ({ lastCreated }) => {
  if (!lastCreated) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">No POs</span>;
  const days = dayjs().diff(lastCreated, "day");
  if (days <= 30) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">● Active</span>;
  if (days <= 90) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">● Moderate</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">● Inactive</span>;
};

const getOpenAmount = (po) =>
  Math.max(
    0,
    (po?.totalAmount || 0) - (po?.totalInvoicedAmount || 0),
  );

const getInvoiceState = (po) => {
  const totalAmount = Number(po?.totalAmount || 0);
  const totalInvoicedAmount = Number(po?.totalInvoicedAmount || 0);

  if (po?.status === "CLOSED") {
    return "FULLY_PAID";
  }

  if (totalInvoicedAmount <= 0) {
    return "OPEN_NO_INVOICE";
  }

  if (totalInvoicedAmount < totalAmount) {
    return "PARTIALLY_INVOICED";
  }

  if (totalInvoicedAmount >= totalAmount) {
    return "FULLY_INVOICED";
  }

  return "PARTIALLY_INVOICED";
};

const TH = ({ label, sortKey, currentSort, onSort, icon: Icon }) => {
  const active = currentSort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer select-none hover:text-slate-700 group whitespace-nowrap"
    >
      <span className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className={active ? "text-blue-500" : "text-slate-400"} />}
        <span className={active ? "text-blue-600" : ""}>{label}</span>
        <span className="ml-0.5 text-slate-300 group-hover:text-slate-400">
          {active ? (currentSort.dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-40" />}
        </span>
      </span>
    </th>
  );
};

const PurchaseOrderData = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
  const companyId =
    localStorage.getItem("selectedCompanyId") ||
    user?.company?._id ||
    selectedCompany?._id;

  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [openLogs, setOpenLogs] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("receivable"); // "receivable" or "payable"

  const openClientDetails = (clientId) => { setSelectedClientId(clientId); setModalOpen(true); };

  const getFirstTaxId = (client) => {
    const taxFields = [client.gstNumber, client.panNumber, client.vatNumber, client.einNumber, client.ssnNumber, client.companyNumber, client.nationalIdNumber, client.taxIdentificationNumber];
    return taxFields.find(Boolean) || "N/A";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    if (!companyId) {
      console.error("Company ID is missing");
      setError("Company information not found. Please refresh the page.");
      setLoading(false);
      return;
    }
    try {
      const clientRes = await getClientsApi(companyId);
      const clientsList = Array.isArray(clientRes?.data) ? clientRes.data : [];
      setClients(clientsList.filter((c) => c.isActive !== false));

      // Fetch vendors
      const vendorRes = await getVendors(companyId);
      const vendorList = vendorRes.data?.data?.vendors || vendorRes.data?.vendors || [];
      setVendors(vendorList.filter((v) => v.isActive !== false));

      let poData;
      if (Object.keys(activeFilters).length > 0) {
        const res = await advancedSearchPurchaseOrdersApi({
          ...activeFilters,
          companyId: companyId,
          limit: 1000,
        });
        poData = res.data || [];
      } else {
        const res = await getPurchaseOrdersApi(companyId, { limit: 1000 });
        poData = res.data || [];
      }
      setPurchaseOrders(poData);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
      setLoadingAdvanced(false);
    }
  };

  useEffect(() => { if (companyId) fetchAllData(); }, [companyId, activeFilters]);

  const resolveClientId = (po, clientsList) => {
    if (!po.client) return null;
    let clientId = po.client._id;
    let clientObj = clientId ? clientsList.find((c) => c._id === clientId) : null;
    if (!clientObj && po.client.name) {
      clientObj = clientsList.find((c) => c.clientName?.toLowerCase() === po.client.name.toLowerCase());
      if (clientObj) clientId = clientObj._id;
    }
    return clientId || null;
  };

  // Filter POs by direction
  const receivablePOs = purchaseOrders.filter(po => po.direction === "receivable");
  const payablePOs = purchaseOrders.filter(po => po.direction === "payable");
  const currentPOs = viewMode === "receivable" ? receivablePOs : payablePOs;

  // Client stats (receivable)
  const clientStats = useMemo(() => {
    const stats = {};
    currentPOs.forEach((po) => {
      const clientId = resolveClientId(po, clients);
      if (!clientId) return;
      if (!stats[clientId]) {
        stats[clientId] = {
          totalPOs: 0,
          thisMonth: 0,
          totalValue: 0,
          openAmount: 0,
          openPOs: 0,
          latestPO: null,
          lastCreated: null,
        };
      }
      stats[clientId].totalPOs += 1;
      stats[clientId].totalValue += po.totalAmount || 0;
      stats[clientId].openAmount += getOpenAmount(po);
      if (getOpenAmount(po) > 0) stats[clientId].openPOs += 1;
      const createdAt = dayjs(po.createdAt);
      if (createdAt.isSame(dayjs(), "month")) stats[clientId].thisMonth += 1;
      if (!stats[clientId].lastCreated || createdAt.isAfter(stats[clientId].lastCreated)) {
        stats[clientId].lastCreated = createdAt;
        stats[clientId].latestPO = po.poNumber;
      }
    });
    return stats;
  }, [clients, currentPOs]);

  // Vendor stats (payable)
  const vendorStats = useMemo(() => {
    const stats = {};
    currentPOs.forEach((po) => {
      const vendorId = po.vendor?._id;
      if (!vendorId) return;
      if (!stats[vendorId]) {
        stats[vendorId] = {
          totalPOs: 0,
          thisMonth: 0,
          totalValue: 0,
          openAmount: 0,
          openPOs: 0,
          latestPO: null,
          lastCreated: null,
        };
      }
      stats[vendorId].totalPOs += 1;
      stats[vendorId].totalValue += po.totalAmount || 0;
      stats[vendorId].openAmount += getOpenAmount(po);
      if (getOpenAmount(po) > 0) stats[vendorId].openPOs += 1;
      const createdAt = dayjs(po.createdAt);
      if (createdAt.isSame(dayjs(), "month")) stats[vendorId].thisMonth += 1;
      if (!stats[vendorId].lastCreated || createdAt.isAfter(stats[vendorId].lastCreated)) {
        stats[vendorId].lastCreated = createdAt;
        stats[vendorId].latestPO = po.poNumber;
      }
    });
    return stats;
  }, [vendors, currentPOs]);

  const totalPOs = currentPOs.length;
  const totalValue = currentPOs.reduce((s, po) => s + (po.totalAmount || 0), 0);
  const pendingPOs = currentPOs.filter((po) => !["CLOSED", "FULLY_INVOICED"].includes(po.status)).length;
  const completedPOs = currentPOs.filter((po) => po.status === "CLOSED").length;

  const handleAdvancedSearch = (filters) => { setLoadingAdvanced(true); setActiveFilters(filters); setSearchQuery(""); setPage(1); };
  const handleClearSearch = () => {
    setActiveFilters({});
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setPage(1);
  };
  const handleSort = (key) => { setSort((p) => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" })); setPage(1); };
  const activeFilterEntries = Object.entries(activeFilters).filter(([key, value]) => {
    if (!value) return false;
    if (key === "status" && activeFilters.poStatus) return false;
    return true;
  });
  const activeFilterCount = activeFilterEntries.length;

  // Table rows based on viewMode
  const tableRows = useMemo(() => {
    let list = viewMode === "receivable" ? clients : vendors;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter(item => {
        const name = (viewMode === "receivable" ? item.clientName : item.vendorName)?.toLowerCase() || "";
        const code = (viewMode === "receivable" ? item.clientCode : item.vendorCode)?.toLowerCase() || "";
        const tax = viewMode === "receivable"
          ? (getFirstTaxId(item).toLowerCase())
          : (item.gstNumber || item.panNumber || item.taxNumber || "N/A").toLowerCase();
        const country = (viewMode === "receivable" ? item.clientCountry : item.country)?.toLowerCase() || "";
        return name.includes(q) || code.includes(q) || tax.includes(q) || country.includes(q);
      });
    }
    list = [...list].sort((a, b) => {
      let va, vb;
      const statsMap = viewMode === "receivable" ? clientStats : vendorStats;
      const sa = statsMap[a._id] || {};
      const sb = statsMap[b._id] || {};
      switch (sort.key) {
        case "name":
          va = (viewMode === "receivable" ? a.clientName : a.vendorName) || "";
          vb = (viewMode === "receivable" ? b.clientName : b.vendorName) || "";
          break;
        case "totalPOs": va = sa.totalPOs || 0; vb = sb.totalPOs || 0; break;
        case "totalValue": va = sa.totalValue || 0; vb = sb.totalValue || 0; break;
        case "thisMonth": va = sa.thisMonth || 0; vb = sb.thisMonth || 0; break;
        case "lastCreated": va = sa.lastCreated ? sa.lastCreated.valueOf() : 0; vb = sb.lastCreated ? sb.lastCreated.valueOf() : 0; break;
        case "openAmount": va = sa.openAmount || 0; vb = sb.openAmount || 0; break;
        case "country":
          va = viewMode === "receivable" ? (a.clientCountry || "") : (a.country || "");
          vb = viewMode === "receivable" ? (b.clientCountry || "") : (b.country || "");
          break;
        default: va = ""; vb = "";
      }
      if (typeof va === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [viewMode, clients, vendors, debouncedSearchQuery, clientStats, vendorStats, sort]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const safeP = Math.min(page, totalPages);
  const pagedRows = tableRows.slice((safeP - 1) * rowsPerPage, safeP * rowsPerPage);

  if (loading && !loadingAdvanced) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Loading purchase orders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight truncate">Purchase Orders</h1>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 hidden sm:block">
                {viewMode === "receivable" ? `${clients.length} clients` : `${vendors.length} vendors`} · {totalPOs} POs
              </p>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-sm hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={viewMode === "receivable" ? "Search client, code, GST, country…" : "Search vendor, code, GST, country…"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all font-medium placeholder-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAdvancedSearch((v) => !v)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all
                  ${showAdvancedSearch || activeFilterCount > 0
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
              >
                <Filter size={13} />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button onClick={() => setOpenLogs(true)} className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all" title="Audit Trail">
                <History size={15} />
              </button>
              <button onClick={fetchAllData} className="p-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all" title="Refresh">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
              <Link to="/purchase-order/bulk-po-upload" className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all text-xs font-bold">
                <Upload size={13} className="text-emerald-500" />
                Bulk
              </Link>
              <Link
                to={viewMode === "receivable" ? "/purchase-order" : "/purchase-order?direction=payable"}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Plus size={14} />
                New PO
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          <div className="pb-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all font-medium placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search Panel */}
      <div className="bg-white border-b border-slate-100">
        <AdvancedSearchPanel
          isOpen={showAdvancedSearch}
          filters={activeFilters}
          onApply={handleAdvancedSearch}
          onClear={() => { setShowAdvancedSearch(false); handleClearSearch(); }}
          isLoading={loadingAdvanced}
          companyId={companyId}
          clientOptions={clients.map((client) => client.clientName).filter(Boolean)}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toggle Buttons */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setViewMode("receivable")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 ${viewMode === "receivable"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-b-0 border-slate-200"
              }`}
          >
            <User size={16} /> Receivable (Clients)
          </button>
          <button
            onClick={() => setViewMode("payable")}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-all flex items-center gap-2 ${viewMode === "payable"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-b-0 border-slate-200"
              }`}
          >
            <Building2 size={16} /> Payable (Vendors)
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total POs", value: totalPOs, icon: ShoppingCart,
              bg: viewMode === "receivable" ? "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" : "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fbbf24 100%)",
              blob1: viewMode === "receivable" ? "#93c5fd" : "#fde68a",
              blob2: viewMode === "receivable" ? "#bfdbfe" : "#fef3c7",
              shadow: viewMode === "receivable" ? "shadow-blue-500/25" : "shadow-amber-500/25",
              streak: true,
            },
            {
              label: "Pending", value: pendingPOs, icon: Clock,
              bg: "linear-gradient(135deg,#92400e 0%,#d97706 55%,#fbbf24 100%)",
              blob1: "#fde68a", blob2: "#fef3c7", shadow: "shadow-amber-500/25",
              streak: false, ring: true,
            },
            {
              label: "Total Value", value: "₹" + totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 }), icon: TrendingUp,
              bg: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)",
              blob1: "#6ee7b7", blob2: "#a7f3d0", shadow: "shadow-emerald-500/25",
              streak: true,
            },
            {
              label: "Completed", value: completedPOs, icon: CheckCircle,
              bg: "linear-gradient(135deg,#312e81 0%,#7c3aed 55%,#a78bfa 100%)",
              blob1: "#c4b5fd", blob2: "#ddd6fe", shadow: "shadow-violet-500/25",
              streak: false, ring: true,
            },
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              className={`relative overflow-hidden rounded-2xl p-5 shadow-xl ${card.shadow} group cursor-default`}
              style={{ background: card.bg }}
            >
              <div className="absolute -top-8 -right-8 w-44 h-32 rounded-full opacity-25 blur-2xl group-hover:scale-125 transition-transform duration-700"
                style={{ background: `radial-gradient(ellipse,${card.blob1},transparent)` }} />
              <div className="absolute -bottom-6 -left-6 w-28 h-20 rounded-full opacity-20 blur-xl"
                style={{ background: `radial-gradient(ellipse,${card.blob2},transparent)` }} />
              {card.streak && <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />}
              {card.ring && <>
                <div className="absolute top-2 right-2 w-14 h-14 rounded-full border-2 border-white/15" />
                <div className="absolute top-5 right-5 w-7 h-7 rounded-full border border-white/10" />
              </>}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-white/60">{card.label}</p>
                  <p className="text-3xl font-black text-white leading-none">{card.value}</p>
                </div>
                <div className="p-2.5 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-lg">
                  <card.icon size={20} className="text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </motion.div>
          ))}
        </div>

        {/* Active Filter Pills */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active filters:</span>
            {activeFilterEntries.map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-100">
                {k}: {v}
                <button onClick={() => { const f = { ...activeFilters }; delete f[k]; setActiveFilters(f); }} className="ml-0.5 hover:text-blue-900">
                  <X size={10} />
                </button>
              </span>
            ))}
            <button onClick={handleClearSearch} className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
              <X size={10} /> Clear all
            </button>
          </div>
        )}

        {/* Table */}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={fetchAllData} className="rounded-lg bg-red-100 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-200">Try Again</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <p className="text-xs font-bold text-slate-700">
                {viewMode === "receivable" ? "Clients" : "Vendors"}
                <span className="ml-2 px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-black">{tableRows.length}</span>
              </p>
              {(searchQuery || activeFilterCount > 0) && (
                <button onClick={handleClearSearch} className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <X size={10} /> Clear filters
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <TH label="Name" sortKey="name" currentSort={sort} onSort={handleSort} icon={viewMode === "receivable" ? User : Building2} />
                    <TH label="Tax / GST" sortKey="taxId" currentSort={sort} onSort={handleSort} icon={Hash} />
                    <TH label="Country" sortKey="country" currentSort={sort} onSort={handleSort} icon={Globe} />
                    <TH label="Total POs" sortKey="totalPOs" currentSort={sort} onSort={handleSort} icon={ShoppingCart} />
                    <TH label="This Month" sortKey="thisMonth" currentSort={sort} onSort={handleSort} icon={Calendar} />
                    <TH label="Total Value" sortKey="totalValue" currentSort={sort} onSort={handleSort} icon={Banknote} />
                    <TH label="Latest PO" sortKey="latestPO" currentSort={sort} onSort={handleSort} icon={FileText} />
                    <TH label="Last Created" sortKey="lastCreated" currentSort={sort} onSort={handleSort} icon={Clock} />
                    <TH label="Open Amount" sortKey="openAmount" currentSort={sort} onSort={handleSort} icon={AlertCircle} />
                    <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        {viewMode === "receivable" ? <User className="mx-auto mb-3 h-10 w-10 text-slate-200" /> : <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-200" />}
                        <p className="text-sm font-semibold text-slate-400">No {viewMode === "receivable" ? "clients" : "vendors"} found</p>
                        <p className="text-xs text-slate-300 mt-1">Try adjusting your filters or search query</p>
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row, idx) => {
                      const stats = (viewMode === "receivable" ? clientStats : vendorStats)[row._id] || {
                        totalPOs: 0,
                        thisMonth: 0,
                        totalValue: 0,
                        openAmount: 0,
                        openPOs: 0,
                        latestPO: null,
                        lastCreated: null,
                      };
                      const hasPOs = stats.totalPOs > 0;
                      const name = viewMode === "receivable" ? row.clientName : row.vendorName;
                      const code = viewMode === "receivable" ? row.clientCode : row.vendorCode;
                      const tax = viewMode === "receivable" ? getFirstTaxId(row) : (row.gstNumber || row.panNumber || row.taxNumber || "N/A");
                      const country = viewMode === "receivable" ? row.clientCountry : row.country;
                      const gradient = viewMode === "receivable" ? "from-blue-500 to-indigo-600" : "from-amber-500 to-orange-600";
                      const hoverColor = viewMode === "receivable" ? "group-hover:text-blue-600" : "group-hover:text-amber-600";
                      const actionBg = viewMode === "receivable" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700";

                      return (
                        <motion.tr
                          key={row._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => navigate(viewMode === "receivable" ? `/purchaseorder-data/client/${row._id}` : `/purchaseorder-data/vendor/${row._id}`)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-[11px] shrink-0 shadow-sm`}>
                                {(name || "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className={`font-bold text-slate-800 truncate max-w-[140px] transition-colors ${hoverColor}`}>
                                  {name || "Unnamed"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">#{code || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{tax}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-slate-500">
                              <MapPin size={11} className="shrink-0" />
                              <span className="truncate max-w-[90px]">{country || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`font-black text-sm ${hasPOs ? "text-slate-800" : "text-slate-300"}`}>{stats.totalPOs || 0}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`font-bold text-sm ${stats.thisMonth > 0 ? "text-blue-600" : "text-slate-300"}`}>{stats.thisMonth || 0}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`font-bold ${stats.totalValue > 0 ? "text-emerald-700" : "text-slate-300"}`}>
                              {stats.totalValue > 0 ? "₹" + stats.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-blue-600 font-bold truncate max-w-[100px] block">{stats.latestPO || "—"}</span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                            {stats.lastCreated ? dayjs(stats.lastCreated).format("DD MMM YYYY") : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="min-w-[110px]">
                              <p className={`font-bold ${stats.openAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                ₹{stats.openAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {stats.openPOs || 0} open PO{stats.openPOs === 1 ? "" : "s"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {viewMode === "receivable" && (
                                <button onClick={() => openClientDetails(row._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="View Client">
                                  <Eye size={14} />
                                </button>
                              )}
                              <button onClick={() => navigate(viewMode === "receivable" ? `/purchaseorder-data/client/${row._id}` : `/purchaseorder-data/vendor/${row._id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all" title="View POs">
                                <FileText size={14} />
                              </button>
                              <Link
                                to={viewMode === "receivable" ? `/purchase-order?clientId=${row._id}` : `/purchase-order?vendorId=${row._id}&direction=payable`}
                                className={`p-1.5 rounded-lg ${actionBg} text-white transition-all shadow-sm`}
                                title="New PO"
                              >
                                <Plus size={14} />
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {tableRows.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[10px] text-slate-400 shrink-0">
                  Showing{" "}
                  <span className="font-bold text-slate-600">{(safeP - 1) * rowsPerPage + 1}</span>
                  {" "}–{" "}
                  <span className="font-bold text-slate-600">{Math.min(safeP * rowsPerPage, tableRows.length)}</span>
                  {" "}of{" "}
                  <span className="font-bold text-slate-600">{tableRows.length}</span> {viewMode === "receivable" ? "clients" : "vendors"}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safeP === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronUp size={13} className="rotate-[-90deg]" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeP) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-1.5 text-[11px] text-slate-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-[30px] h-[30px] rounded-lg text-[11px] font-bold transition-all border ${safeP === p
                              ? "text-white border-blue-600 shadow-sm shadow-blue-500/20"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          style={safeP === p ? { background: "linear-gradient(135deg,#1e3a8a,#2563eb)" } : {}}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeP === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronDown size={13} className="rotate-[-90deg]" />
                  </button>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rows</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  >
                    {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={companyId}
        modules={["PURCHASE_ORDER"]}
        title="Purchase Order Audit Trail"
        subtitle="Tracking purchase order creation, updates, approvals, and status changes"
      />
      <ClientDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={selectedClientId}
      />
    </div>
  );
};

export default PurchaseOrderData;