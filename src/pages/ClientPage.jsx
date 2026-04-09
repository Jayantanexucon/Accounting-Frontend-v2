import { useState, useCallback, useEffect, useMemo } from "react";
import { CirclePlus, Users, CircleCheckBig, Search, Filter, SlidersHorizontal, RefreshCw } from "lucide-react";
import ManageClientModal from "../modals/ManageClientModal";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { getClientsPaginatedApi } from "../apis/clientApi";
import ClientComponent from "../components/ClientComponent";
import LoadingComponent from "../components/LoadingComponent";
import EmptyComponent from "../components/EmptyComponent";
import ClientApprovalComponent from "../components/ClientApprovalComponent";
import { checkAuthorization } from "../utils/checkAuthorization";
import AuditLogSidebar from "../components/AuditLogSidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ClientPage() {
  const { user } = useAuth();
  const company = localStorage.getItem("selectedCompany")
    ? JSON.parse(localStorage.getItem("selectedCompany"))
    : null;

  const [expandedId, setExpandedId]   = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [page, setPage]               = useState(1);
  const [openLogs, setOpenLogs]       = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openModal, setOpenModal]     = useState({ addClient: false, editClient: false, approvals: false });

  const LIMIT = 10;
  const queryClient = useQueryClient();

  const { data: clientResponse, isLoading: loading, isFetching } = useQuery({
    queryKey: ["clients", company?._id, page, LIMIT, searchTerm, statusFilter, countryFilter],
    queryFn: () =>
      getClientsPaginatedApi({
        companyId: company._id,
        page, limit: LIMIT,
        search: searchTerm,
        status: statusFilter,
        country: countryFilter,
      }),
    enabled: !!company?._id,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });

const clientData  = clientResponse?.data?.clients ?? [];
const totalItems  = clientResponse?.data?.totalCount ?? 0;
const totalPages  = Math.ceil(totalItems / LIMIT);
const activeCount = clientData.filter((c) => c.isActive).length;

  const countries = useMemo(() => {
    const set = new Set();
    clientData.forEach((c) => c.clientCountry && set.add(c.clientCountry));
    return Array.from(set).sort();
  }, [clientData]);

  const hasActiveFilters = searchTerm || statusFilter !== "all" || countryFilter !== "all";

  const toggleModal  = useCallback((key) => setOpenModal((p) => ({ ...p, [key]: !p[key] })), []);
  const toggleClient = useCallback((id) => setExpandedId((p) => (p === id ? null : id)), []);

  const handleEditClient = (client) => {
    setSelectedClient(client);
    toggleModal("editClient");
  };
  const handleCloseEdit = () => {
    setSelectedClient(null);
    toggleModal("editClient");
  };
  const refreshClients = () =>
    queryClient.invalidateQueries({ queryKey: ["clients", company?._id] });
  const handleClearFilters = () => {
    setSearchTerm(""); setStatusFilter("all"); setCountryFilter("all"); setPage(1);
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50">

        {/* ── Header ── */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shadow-md" style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Client Management</h1>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Master client registry</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setOpenLogs(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
                <RefreshCw size={13} className="text-slate-400" /> Audit Trail
              </button>
              {(user?._id === company?.owner || user?.privilege?.masterUpdate || user?.role === "superAdmin" || user?.role === "admin") && (
                <button onClick={() => toggleModal("approvals")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all">
                  <CircleCheckBig size={13} /> Approvals
                </button>
              )}
              {checkAuthorization(user, "CLIENTS", "CREATE") && (
                <button onClick={() => toggleModal("addClient")}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
                  <CirclePlus size={13} /> Add Client
                </button>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div className="px-6 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Clients", value: totalItems,                                    g: "linear-gradient(135deg,#1e3a8a,#2563eb)", blob: "#93c5fd" },
                { label: "Active",        value: activeCount,                                   g: "linear-gradient(135deg,#064e3b,#059669)", blob: "#6ee7b7" },
                { label: "Inactive",      value: clientData.filter(c => !c.isActive).length,   g: "linear-gradient(135deg,#7f1d1d,#dc2626)", blob: "#fca5a5" },
                { label: "This Page",     value: clientData.length,                             g: "linear-gradient(135deg,#312e81,#7c3aed)", blob: "#c4b5fd" },
              ].map((s) => (
                <div key={s.label} className="relative overflow-hidden rounded-2xl p-4 shadow-md group cursor-default"
                  style={{ background: s.g }}>
                  <div className="absolute -top-5 -right-5 w-16 h-12 rounded-full opacity-25 blur-xl"
                    style={{ background: `radial-gradient(ellipse,${s.blob},transparent)` }} />
                  <div className="absolute top-0 right-8 w-px h-full bg-white/15 rotate-12 scale-y-150" />
                  <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1 relative z-10">{s.label}</p>
                  <p className="text-2xl font-black text-white leading-tight relative z-10">{s.value}</p>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── Search + Filter Bar ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Search by name, code, GST, PAN…"
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all font-medium placeholder-slate-400"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <Filter size={12} />
                  </button>
                )}
              </div>
              <button onClick={() => setShowFilters((p) => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                  hasActiveFilters
                    ? "text-white border-blue-600"
                    : "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
                style={hasActiveFilters ? { background: "linear-gradient(135deg,#1e3a8a,#2563eb)" } : {}}>
                <SlidersHorizontal size={13} /> Filters
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-black">
                    {[searchTerm, statusFilter !== "all", countryFilter !== "all"].filter(Boolean).length}
                  </span>
                )}
              </button>
              <button onClick={refreshClients}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Refresh">
                <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              </button>
            </div>

            {showFilters && (
              <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</span>
                  <select className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium"
                    value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Country</span>
                  <select className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-medium"
                    value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}>
                    <option value="all">All Countries</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button onClick={handleClearFilters}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors ml-1">
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Client List ── */}
          <div className="space-y-2">
            {loading && <LoadingComponent message="Fetching clients…" />}
            {!loading && clientData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-100 rounded-2xl">
                  <Users size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-500">No clients found</p>
                <p className="text-xs text-slate-400">
                  {hasActiveFilters ? "Try adjusting your search or filters" : "Add your first client to get started"}
                </p>
              </div>
            )}
            {!loading && clientData.map((client, idx) => (
              <ClientComponent
                key={client._id}
                client={client}
                expanded={expandedId === client._id}
                onToggle={toggleClient}
                onEdit={handleEditClient}
              />
            ))}
          </div>

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-5 py-3 shadow-sm">
              <p className="text-[10px] text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-600">{(page - 1) * LIMIT + 1}</span>–<span className="font-bold text-slate-600">{Math.min(page * LIMIT, totalItems)}</span> of <span className="font-bold text-slate-600">{totalItems}</span>
              </p>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold">«</button>
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Prev</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pg = start + i;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className="min-w-[30px] h-[30px] rounded-lg text-[11px] font-bold transition-all border"
                      style={pg === page
                        ? { background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "white", borderColor: "#2563eb" }
                        : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                      {pg}
                    </button>
                  );
                })}
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Next</button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold">»</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Audit Sidebar ──────────────────────────────────────────────────── */}
      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={user?.company?._id}
        modules={["CLIENT"]}
        title="Client Audit Trail"
        subtitle="All client-related activity"
      />

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {(openModal.addClient || openModal.editClient || openModal.approvals) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (openModal.addClient) toggleModal("addClient");
              if (openModal.editClient) handleCloseEdit();
              if (openModal.approvals) toggleModal("approvals");
            }}
          />
          <div className="relative min-h-screen px-4 py-8 flex items-start justify-center">
            {openModal.addClient && (
              <div className="relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl">
                <ManageClientModal
                  open={openModal.addClient}
                  onClose={() => toggleModal("addClient")}
                  title="Add Client"
                  subtitle="Register a new client"
                  updateClient={refreshClients}
                />
              </div>
            )}
            {openModal.editClient && (
              <div className="relative w-full max-w-4xl my-8 bg-white rounded-2xl shadow-2xl">
                <ManageClientModal
                  open={openModal.editClient}
                  onClose={handleCloseEdit}
                  editClient={selectedClient}
                  refreshClients={refreshClients}
                />
              </div>
            )}
            {openModal.approvals && (
              <div className="relative w-full max-w-6xl my-8 bg-white rounded-2xl shadow-2xl">
                <ClientApprovalComponent
                  open={openModal.approvals}
                  onClose={() => toggleModal("approvals")}
                  refreshClients={refreshClients}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}