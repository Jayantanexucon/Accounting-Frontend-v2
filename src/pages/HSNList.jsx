import React, { useMemo, useState } from "react";
import HSNModal from "../modals/HSNModal";
import CountryTaxModal from "../modals/CountryTaxModal";
import {
  Plus, Pencil, Trash2, ChevronRight, History, Hash,
  Tag, ShieldCheck, ShieldOff, Search, X, LayoutGrid,
  Calendar, SlidersHorizontal, Globe,
} from "lucide-react";
import { toast } from "react-toastify";
import { getallhsn, deletehsnbyid } from "../apis/hsnapi";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";
import AuditLogSidebar from "../components/AuditLogSidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

/* ── helpers ─────────────────────────────────────────────── */
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";

const GstPill = ({ label, value, cls }) => (
  <div className={`flex flex-col items-center px-4 py-2.5 rounded-xl border ${cls}`}>
    <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</span>
    <span className="text-sm font-black mt-0.5">{value ?? "—"}%</span>
  </div>
);

/* ── component ───────────────────────────────────────────── */
export default function HSNList() {
  const { user } = useAuth();
  const companyId = user?.company?._id;

  const [modalOpen, setModalOpen]               = useState(false);
  const [editId, setEditId]                     = useState(null);
  const [openLogs, setOpenLogs]                 = useState(false);
  const [expanded, setExpanded]                 = useState(null);
  const [search, setSearch]                     = useState("");
  const [page, setPage]                         = useState(1);
  const [countryTaxModalOpen, setCountryTaxModalOpen] = useState(false);

  const PAGE_SIZE = 10;

  const queryClient = useQueryClient();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["hsn"],
    queryFn: async () => {
      // Always fetch all HSN codes (global master data) - no companyId filter
      const r = await getallhsn();
      return r.data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const openCreate = () => { setEditId(null); setModalOpen(true); };
  const openEdit   = (id) => { setEditId(id); setModalOpen(true); };

  const remove = async (id) => {
    if (!window.confirm("Delete this HSN entry?")) return;
    try {
      await deletehsnbyid(companyId, id);
      toast.success("HSN deleted");
      queryClient.invalidateQueries({ queryKey: ["hsn", companyId] });
    } catch {
      toast.error("Delete failed");
    }
  };

  /* group + search */
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of list) {
      const k = r.hsnCode ?? "(no-code)";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    const q = search.toLowerCase();
    return Array.from(map.entries())
      .map(([hsnCode, services]) => ({ hsnCode, services }))
      .filter(
        (g) =>
          !search ||
          g.hsnCode.toLowerCase().includes(q) ||
          g.services.some((s) => s.serviceType?.toLowerCase().includes(q))
      );
  }, [list, search]);

  const totalPages      = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const paginatedGroups = grouped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalServices = list.length;
  const uniqueCodes   = new Set(list.map((r) => r.hsnCode)).size;
  const withTds       = list.filter((r) => r.tdsApplicable).length;

  /* stat card definitions — mirrors HomePage STATS shape */
  const STATS = [
    {
      label: "Total Entries",
      value: totalServices,
      gradient: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
      glow: "#93c5fd",
    },
    {
      label: "Unique Codes",
      value: uniqueCodes,
      gradient: "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)",
      glow: "#6ee7b7",
    },
    {
      label: "TDS Applicable",
      value: withTds,
      gradient: "linear-gradient(135deg,#92400e 0%,#d97706 55%,#fbbf24 100%)",
      glow: "#fde68a",
    },
  ];

  /* ── render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ══════════════════════════════════════════════════
          STICKY HEADER — matches HomePage / VendorPage style
      ══════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-5">

          {/* Title row */}
          <div className="flex items-center justify-between gap-4">

            {/* Left — icon + title + subtitle */}
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl shadow-md"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                <Hash size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  HSN / SAC Codes
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  {user?.company?.name || "Your Company"} · Tax codes, GST rates &amp; TDS applicability
                </p>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2">

              {/* Audit Trail — icon-only, same as HomePage */}
              <button
                onClick={() => setOpenLogs(true)}
                title="Audit Trail"
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                <History size={15} />
              </button>

              {/* Country Tax Master button */}
              <button
                onClick={() => setCountryTaxModalOpen(true)}
                title="Country Tax Master"
                className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
                  boxShadow: "0 4px 14px rgba(14,165,233,0.35)",
                }}>
                <Globe size={14} /> Country Tax
              </button>

              {/* Add HSN — gradient CTA matching HomePage */}
              {checkAuthorization(user, "HSN", "CREATE") && (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                  style={{
                    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                    boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                  }}>
                  <Plus size={14} /> Add HSN
                </button>
              )}
            </div>
          </div>

          {/* ── Stat Cards — exact HomePage motion card pattern ── */}
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

      {/* ══ Body ══════════════════════════════════════════════ */}
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">

        {/* ── Search bar card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by HSN code or service type…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all font-medium placeholder-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            {/* results badge */}
            {search && (
              <span className="shrink-0 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                {grouped.length} result{grouped.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── States: loading / empty / list ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading HSN codes…</p>
          </div>

        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="p-4 bg-slate-100 rounded-2xl">
              <LayoutGrid size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">No HSN codes found</p>
            <p className="text-xs text-slate-400">
              {search
                ? "Try a different search term"
                : "Click 'Add HSN' to create your first entry"}
            </p>
            {!search && checkAuthorization(user, "HSN", "CREATE") && (
              <button
                onClick={openCreate}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl hover:opacity-90 transition-all"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }}>
                <Plus size={13} /> Add Your First HSN
              </button>
            )}
          </div>

        ) : (
          /* ── Accordion list ── */
          <div className="space-y-2">
            {paginatedGroups.map((group, gi) => {
              const isOpen = expanded === group.hsnCode;
              return (
                <motion.div
                  key={group.hsnCode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.03 }}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 shadow-sm ${
                    isOpen
                      ? "border-indigo-200 shadow-md"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  {/* ── Collapsed row ── */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : group.hsnCode)}
                    className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                      isOpen ? "bg-indigo-50/50" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* HSN code badge */}
                      <span className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black tracking-widest border transition-all ${
                        isOpen
                          ? "bg-indigo-600 text-white border-indigo-600 shadow shadow-indigo-500/25"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {group.hsnCode}
                      </span>

                      <div className="min-w-0">
                        {/* service type pills */}
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {group.services.map((s) => (
                            <span
                              key={s._id}
                              className="inline-block text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 truncate max-w-[200px]"
                              title={s.serviceType}>
                              {s.serviceType || "—"}
                            </span>
                          ))}
                        </div>
                        {/* meta row */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>
                            {group.services.length}{" "}
                            {group.services.length === 1 ? "entry" : "entries"}
                          </span>
                          {group.services.length === 1 && (
                            <>
                              <span className="text-slate-200">·</span>
                              <span>IGST {group.services[0]?.igst ?? "—"}%</span>
                              <span className="text-slate-200">·</span>
                              <span>CGST {group.services[0]?.cgst ?? "—"}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <motion.div
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}>
                      <ChevronRight size={15} className="text-slate-400 shrink-0" />
                    </motion.div>
                  </button>

                  {/* ── Expanded body ── */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="divide-y divide-slate-100 border-t border-slate-100">
                          {group.services.map((s) => (
                            <div key={s._id} className="px-6 py-5 bg-slate-50/40">
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1 min-w-0">

                                  {/* service name + dates */}
                                  <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <div className="flex items-center gap-1.5">
                                      <Tag size={13} className="text-indigo-500 shrink-0" />
                                      <span className="text-sm font-bold text-slate-800">
                                        {s.serviceType || "—"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                      <Calendar size={11} className="shrink-0" />
                                      <span>{fmt(s.effectiveFrom)}</span>
                                      <span>→</span>
                                      <span>{fmt(s.effectiveTo)}</span>
                                    </div>
                                  </div>

                                  {/* GST pills */}
                                  <div className="flex flex-wrap gap-3 mb-4">
                                    <GstPill label="IGST" value={s.igst} cls="border-blue-100   bg-blue-50/80   text-blue-700"   />
                                    <GstPill label="CGST" value={s.cgst} cls="border-violet-100 bg-violet-50/80 text-violet-700" />
                                    <GstPill label="SGST" value={s.sgst} cls="border-emerald-100 bg-emerald-50/80 text-emerald-700" />
                                  </div>

                                  {/* TDS */}
                                  {s.tdsApplicable ? (
                                    <div className="inline-flex items-center gap-3 px-3.5 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                                      <ShieldCheck size={13} className="text-amber-500 shrink-0" />
                                      <span className="font-bold">TDS Applicable</span>
                                      <span className="text-amber-300">·</span>
                                      <span>Sec: <strong>{s.tdsSection || "—"}</strong></span>
                                      <span className="text-amber-300">·</span>
                                      <span>Rate: <strong>{s.tdsRate ?? 0}%</strong></span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-400">
                                      <ShieldOff size={12} />
                                      <span>TDS Not Applicable</span>
                                    </div>
                                  )}

                                  {/* timestamps */}
                                  <p className="text-[10px] text-slate-300 mt-3 font-medium font-mono">
                                    Created {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
                                    {s.updatedAt && (
                                      <> · Updated {new Date(s.updatedAt).toLocaleString()}</>
                                    )}
                                  </p>
                                </div>

                                {/* action buttons */}
                                <div className="flex flex-col gap-2 shrink-0 pt-0.5">
                                  {checkAuthorization(user, "HSN", "EDIT") && (
                                    <button
                                      onClick={() => openEdit(s._id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all">
                                      <Pencil size={12} /> Edit
                                    </button>
                                  )}
                                  {checkAuthorization(user, "HSN", "DELETE") && (
                                    <button
                                      onClick={() => remove(s._id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all">
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-5 py-3 shadow-sm">
            <p className="text-[10px] text-slate-400 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-600">
                {(page - 1) * PAGE_SIZE + 1}
              </span>
              –
              <span className="font-bold text-slate-600">
                {Math.min(page * PAGE_SIZE, grouped.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-600">{grouped.length}</span>{" "}
              groups
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => { setPage(1); setExpanded(null); }}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold">
                «
              </button>
              <button
                disabled={page === 1}
                onClick={() => { setPage((p) => p - 1); setExpanded(null); }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                Prev
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pg    = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => { setPage(pg); setExpanded(null); }}
                    className="min-w-[30px] h-[30px] rounded-lg text-[11px] font-bold transition-all border"
                    style={
                      pg === page
                        ? { background: "linear-gradient(135deg,#4f46e5,#6366f1)", color: "white", borderColor: "#6366f1" }
                        : { background: "white", color: "#475569", borderColor: "#e2e8f0" }
                    }>
                    {pg}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => { setPage((p) => p + 1); setExpanded(null); }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                Next
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => { setPage(totalPages); setExpanded(null); }}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold">
                »
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Sidebar & Modal ── */}
      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={companyId}
        modules={["HSN"]}
        title="HSN Audit Trail"
        subtitle="Tracking all HSN-related activities"
      />
      {modalOpen && (
        <HSNModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["hsn", companyId] })}
          editId={editId}
        />
      )}
      {/* Country Tax Master Modal */}
      <CountryTaxModal
        isOpen={countryTaxModalOpen}
        onClose={() => setCountryTaxModalOpen(false)}
      />
    </div>
  );
}