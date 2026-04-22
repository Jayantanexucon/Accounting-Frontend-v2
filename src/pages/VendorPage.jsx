import { useState, useMemo } from "react";
import {
  CirclePlus, UserSquare2, CircleCheckBig,
  Search, SlidersHorizontal, Building2, History,
} from "lucide-react";
import { motion } from "framer-motion";
import VendorTable from "../components/VendorTable";
import VendorForm from "../components/VendorForm";
import VendorApprovalComponent from "../components/VendorApprovalComponent.jsx";
import { useAuth } from "../contexts/AuthContext";
import { API } from "../apis/api";
import { checkAuthorization } from "../utils/checkAuthorization.js";
import AuditLogSidebar from "../components/AuditLogSidebar.jsx";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoadingComponent from "../components/LoadingComponent";

export default function VendorPage() {
  const { user } = useAuth();
  const companyId = user?.company?._id;
  const canCreateVendor = checkAuthorization(user, "VENDOR", "CREATE");
  const canEditVendor = checkAuthorization(user, "VENDOR", "EDIT");

  const [openForm, setOpenForm]             = useState(false);
  const [editData, setEditData]             = useState(null);
  const [searchTerm, setSearchTerm]         = useState("");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [page, setPage]                     = useState(1);
  const [openLogs, setOpenLogs]             = useState(false);
  const [showFilters, setShowFilters]       = useState(false);
  const [showApprovals, setShowApprovals]   = useState(false);

  const LIMIT = 10;
  const queryClient = useQueryClient();

  const { data: vendorResponse, isLoading: loading } = useQuery({
    queryKey: ["vendors", companyId, page, LIMIT],
    queryFn: async () => {
      const res = await API.get(`masterData/vendor/${companyId}`, { params: { page, limit: LIMIT } });
      return res.data.data;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const vendors    = vendorResponse?.vendors || [];
  const totalItems = vendorResponse?.totalCount ?? 0;
  const totalPages = vendorResponse?.totalPages  ?? 1;

  const filteredVendors = useMemo(() => {
    let list = vendors;
    if (statusFilter === "active")    list = list.filter((v) => v.isActive);
    if (statusFilter === "inactive")  list = list.filter((v) => !v.isActive);
    if (statusFilter === "subvendor") list = list.filter((v) => v.isSubVendor && v.isActive);
    if (statusFilter === "pending")   list = list.filter((v) => v.status === "Pending");
    if (statusFilter === "approved")  list = list.filter((v) => v.status === "Approved");
    if (statusFilter === "rejected")  list = list.filter((v) => v.status === "Rejected");
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((v) =>
        v.vendorName?.toLowerCase().includes(q)     ||
        v.vendorCode?.toLowerCase().includes(q)     ||
        v.email?.toLowerCase().includes(q)          ||
        v.phoneNumber?.toLowerCase().includes(q)    ||
        v.contactPerson?.toLowerCase().includes(q)  ||
        v.city?.toLowerCase().includes(q)           ||
        v.state?.toLowerCase().includes(q)          ||
        v.country?.toLowerCase().includes(q)        ||
        v.gstin?.toLowerCase().includes(q)          ||
        v.pan?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vendors, statusFilter, searchTerm]);

  const activeCount      = vendors.filter((v) => v.isActive).length;
  const inactiveCount    = vendors.filter((v) => !v.isActive).length;
  const hasActiveFilters = searchTerm || statusFilter !== "all";

  const refreshVendors   = () =>
    queryClient.invalidateQueries({ queryKey: ["vendors", companyId] });

  const handleClearFilters = () => {
    setSearchTerm(""); setStatusFilter("all"); setPage(1);
  };

  /* ── stat card definitions (mirrors HomePage STATS shape) ── */
  const STATS = [
    {
      label: "Total Vendors",
      value: totalItems,
      gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
      glow: "#93c5fd",
    },
    {
      label: "Active",
      value: activeCount,
      gradient: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)",
      glow: "#6ee7b7",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      gradient: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 55%,#f87171 100%)",
      glow: "#fca5a5",
    },
    {
      label: "This Page",
      value: vendors.length,
      gradient: "linear-gradient(135deg,#312e81 0%,#7c3aed 55%,#a78bfa 100%)",
      glow: "#c4b5fd",
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ══════════════════════════════════════════
            STICKY HEADER  — matches HomePage style
        ══════════════════════════════════════════ */}
        <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-6 py-5">

            {/* Title row */}
            <div className="flex items-center justify-between gap-4">

              {/* Left — icon + title + subtitle */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl shadow-md"
                  style={{ background: "linear-gradient(135deg,#1e40af,#3b82f6)" }}>
                  <Building2 size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    Vendor Management
                  </h1>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {user?.company?.name || "Your Company"} · Master vendor registry
                  </p>
                </div>
              </div>

              {/* Right — actions */}
              <div className="flex items-center gap-2">

                {/* Audit Trail — icon-only, same as HomePage History button */}
                <button
                  onClick={() => setOpenLogs(true)}
                  title="Audit Trail"
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <History size={15} />
                </button>

                {/* Approvals */}
                {canEditVendor && (
                  <button
                    onClick={() => setShowApprovals(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all">
                    <CircleCheckBig size={14} /> Approvals
                  </button>
                )}

                {/* New Vendor — same gradient + glow as HomePage CTA */}
                {canCreateVendor && (
                  <button
                    onClick={() => { setEditData(null); setOpenForm(true); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                    style={{
                      background: "linear-gradient(135deg,#1e40af,#3b82f6)",
                      boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                    }}>
                    <CirclePlus size={14} /> New Vendor
                  </button>
                )}
              </div>
            </div>

            {/* ── Stat Cards — mirrors HomePage motion cards ── */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  {/* Diagonal stripe */}
                  <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
                  {/* Circle accent */}
                  <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />

                  <div className="relative z-10">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-2">
                      {s.label}
                    </p>
                    <p className="text-3xl font-black text-white leading-none">
                      {s.value}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </motion.div>
              ))}
            </div>

          </div>
        </div>
        {/* ══ END HEADER ══ */}

        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

          {/* ── Search + Filter Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, GST, PAN…"
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all font-medium placeholder-slate-400"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-xs">
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                  showFilters || hasActiveFilters
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}>
                <SlidersHorizontal size={13} /> Filters
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            </div>

            {showFilters && (
              <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</span>
                  <select
                    className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="subvendor">Sub-vendor</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors ml-1">
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Vendor List ── */}
          <div className="space-y-2">
            {loading && <LoadingComponent message="Fetching vendors…" />}

            {!loading && vendors.length === 0 && page === 1 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <UserSquare2 size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">No vendors found</p>
                <p className="text-xs text-slate-400">Add your first vendor to get started</p>
                {checkAuthorization(user, "VENDOR", "CREATE") && (
                  <button
                    onClick={() => { setEditData(null); setOpenForm(true); }}
                    className="mt-1 px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-all"
                    style={{
                      background: "linear-gradient(135deg,#1e40af,#3b82f6)",
                      boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
                    }}>
                    Add Your First Vendor
                  </button>
                )}
              </div>
            )}

            {!loading && filteredVendors.length === 0 && vendors.length > 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-sm font-bold text-slate-500">
                  {searchTerm
                    ? `No vendors match "${searchTerm}"`
                    : "No vendors match the current filter"}
                </p>
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Clear filters
                </button>
              </div>
            )}

            {!loading && vendors.length === 0 && page > 1 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <p className="text-sm font-bold text-slate-500">No more vendors on this page.</p>
                <button
                  onClick={() => setPage(page - 1)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  Go back to previous page
                </button>
              </div>
            )}

            {!loading && checkAuthorization(user, "VENDOR", "VIEW") && filteredVendors.length > 0 && (
              <VendorTable
                vendors={filteredVendors}
                onEdit={(v) => {
                  setEditData(v);
                  setOpenForm(true);
                }}
              />
            )}
          </div>

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-5 py-3 shadow-sm">
              <p className="text-[10px] text-slate-400 font-medium">
                Page <span className="font-bold text-slate-600">{page}</span> of{" "}
                <span className="font-bold text-slate-600">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1} onClick={() => setPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold">
                  «
                </button>
                <button
                  disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pg    = start + i;
                  return (
                    <button
                      key={pg} onClick={() => setPage(pg)}
                      className="min-w-[30px] h-[30px] rounded-lg text-[11px] font-bold transition-all border"
                      style={pg === page
                        ? { background: "linear-gradient(135deg,#1e40af,#3b82f6)", color: "white", borderColor: "#3b82f6" }
                        : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                      {pg}
                    </button>
                  );
                })}
                <button
                  disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  Next
                </button>
                <button
                  disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold">
                  »
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Audit Sidebar ── */}
      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={companyId}
        modules={["VENDOR"]}
        title="Vendor Audit Trail"
        subtitle="All vendor-related activity"
      />

      {/* ── Approvals ── */}
      {showApprovals && (
        <VendorApprovalComponent
          open={showApprovals}
          onClose={() => setShowApprovals(false)}
          refreshVendors={refreshVendors}
        />
      )}

      {/* ── Form Modal ── */}
      {openForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setOpenForm(false); setEditData(null); }}
          />
          <div className="relative min-h-screen px-4 py-8 flex items-start justify-center">
            <div className="relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl">
              <VendorForm
                companyId={companyId}
                editData={editData}
                onClose={() => { setOpenForm(false); setEditData(null); }}
                onSuccess={() => {
                  setOpenForm(false);
                  setEditData(null);
                  refreshVendors();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
