import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import GroupForm from "../components/GroupForm";
import {
  Plus,
  Search,
  FolderTree,
  Activity,
  History,
  Layers,
  Pencil,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { API } from "../apis/api";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";
import AuditLogSidebar from "../components/AuditLogSidebar";
import { motion, AnimatePresence } from "framer-motion";

const BALANCE_COLORS = {
  DEBIT: {
    pill: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    row: "hover:bg-blue-50/40",
  },
  CREDIT: {
    pill: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    row: "hover:bg-violet-50/40",
  },
  NEUTRAL: {
    pill: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    row: "hover:bg-slate-50/60",
  },
};
const getBC = (type) =>
  BALANCE_COLORS[(type || "").toUpperCase()] || BALANCE_COLORS.NEUTRAL;

const SortIcon = ({ field, sort }) =>
  sort.key === field ? (
    sort.dir === "asc" ? (
      <ChevronUp size={11} className="text-indigo-500" />
    ) : (
      <ChevronDown size={11} className="text-indigo-500" />
    )
  ) : (
    <ChevronDown size={11} className="text-slate-300" />
  );

export default function GroupPage() {
  const { user } = useAuth();
  const companyId = user?.company?._id;

  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [openLogs, setOpenLogs] = useState(false);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(""), 3500);
      return () => clearTimeout(t);
    }
  }, [successMsg]);
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const loadGroups = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await API.get(`/accounting/group`, {
        params: { companyId },
      });
      setGroups(res.data.data);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || "Failed to load groups");
    }
  }, [companyId]);

  const handleCreate = async (data) => {
    try {
      await API.post(`/accounting/group`, {
        ...data,
        companyId: user.company._id,
      });
      setSuccessMsg("Group created successfully");
      setErrorMsg("");
      setShowForm(false);
      loadGroups();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to create group");
      setSuccessMsg("");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await API.put(`/accounting/group/${editData._id}`, data);
      setSuccessMsg("Group updated successfully");
      setErrorMsg("");
      setEditData(null);
      setShowForm(false);
      loadGroups();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update group");
      setSuccessMsg("");
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/accounting/group/${id}`);
      setSuccessMsg("Group deleted");
      setErrorMsg("");
      setDeleteConfirm(null);
      loadGroups();
    } catch {
      setErrorMsg("Failed to delete group");
      setSuccessMsg("");
    }
  };

  const filteredGroups = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return groups.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.balanceType?.toLowerCase().includes(q)
    );
  }, [groups, searchTerm]);

  useEffect(() => {
    if (!companyId) return;

    const run = async () => {
      await loadGroups();
    };

    run();
  }, [companyId, loadGroups]);

  const toggleSort = (key) =>
    setSort((p) => ({
      key,
      dir: p.key === key && p.dir === "asc" ? "desc" : "asc",
    }));

  const sorted = [...filteredGroups].sort((a, b) => {
    const va = (a[sort.key] || "").toLowerCase();
    const vb = (b[sort.key] || "").toLowerCase();
    return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const totalGroups = groups.length;
  const uniqueBalanceTypes = new Set(groups.map((g) => g.balanceType)).size;

  const toggleExpandedGroup = (groupId) =>
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-xl shadow-md"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                }}
              >
                <Layers size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                  Group Management
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Organise and manage accounting groups
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenLogs(true)}
                title="Audit Trail"
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
              >
                <History size={15} />
              </button>
              {checkAuthorization(user, "GROUPS", "CREATE") && (
                <button
                  onClick={() => {
                    setEditData(null);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 text-white text-xs font-bold rounded-xl transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                    boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                  }}
                >
                  <Plus size={14} /> New Group
                </button>
              )}
            </div>
          </div>

          {/* Stat Cards */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            {/* Total Groups */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
              style={{
                background:
                  "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)",
              }}
            >
              <div
                className="absolute -top-8 -right-8 w-44 h-32 rounded-full opacity-30 blur-2xl group-hover:scale-125 transition-transform duration-700"
                style={{
                  background: "radial-gradient(ellipse,#93c5fd,transparent)",
                }}
              />
              <div
                className="absolute -bottom-6 -left-6 w-32 h-24 rounded-full opacity-25 blur-xl"
                style={{
                  background: "radial-gradient(ellipse,#bfdbfe,transparent)",
                }}
              />
              <div className="absolute top-0 right-14 w-0.5 h-full bg-white/20 rotate-12 scale-y-150" />
              <div className="absolute top-3 right-3 w-14 h-14 rounded-full border-2 border-white/15" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">
                    Total Groups
                  </p>
                  <p className="text-4xl font-black text-white leading-none">
                    {totalGroups}
                  </p>
                  <p className="text-blue-200/60 text-[11px] font-medium mt-2">
                    All registered groups
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-lg">
                  <FolderTree size={22} className="text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </motion.div>

            {/* Balance Types */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="relative overflow-hidden rounded-2xl p-5 shadow-xl group cursor-default"
              style={{
                background:
                  "linear-gradient(135deg,#064e3b 0%,#059669 55%,#34d399 100%)",
              }}
            >
              <div
                className="absolute -top-10 -right-10 w-48 h-36 rounded-full opacity-25 blur-2xl group-hover:scale-125 transition-transform duration-700"
                style={{
                  background: "radial-gradient(ellipse,#6ee7b7,transparent)",
                }}
              />
              <div
                className="absolute -bottom-8 -left-4 w-36 h-28 rounded-full opacity-25 blur-xl"
                style={{
                  background: "radial-gradient(ellipse,#a7f3d0,transparent)",
                }}
              />
              <div className="absolute -bottom-5 -right-5 w-28 h-28 rounded-full border-4 border-white/15" />
              <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full border-2 border-white/10" />
              <div className="absolute top-0 left-20 w-0.5 h-full bg-white/15 -rotate-12 scale-y-150" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <p className="text-emerald-200 text-[10px] font-black uppercase tracking-widest mb-2">
                    Balance Types
                  </p>
                  <p className="text-4xl font-black text-white leading-none">
                    {uniqueBalanceTypes}
                  </p>
                  <p className="text-emerald-200/60 text-[11px] font-medium mt-2">
                    Unique account categories
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl border border-white/25 backdrop-blur-sm group-hover:scale-110 transition-transform shadow-lg">
                  <Activity size={22} className="text-white" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        {/* search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or balance type…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* toasts */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              {successMsg}
            </motion.div>
          )}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* table bar */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100"
            style={{
              background: "linear-gradient(90deg,#f8fafc 0%,#eef2ff 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-6 rounded-full"
                style={{
                  background: "linear-gradient(180deg,#4f46e5,#818cf8)",
                }}
              />
              <p className="text-xs font-extrabold text-slate-800 tracking-wide uppercase">
                All Groups
              </p>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black text-white"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                }}
              >
                {sorted.length}
              </span>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <X size={10} /> Clear
              </button>
            )}
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg,#eef2ff,#e0e7ff)",
                }}
              >
                <FolderTree size={28} className="text-indigo-300" />
              </div>
              <p className="text-sm font-bold text-slate-500">
                No groups found
              </p>
              <p className="text-xs text-slate-400">
                {searchTerm
                  ? "Try a different search"
                  : "Click 'New Group' to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr
                    style={{
                      background:
                        "linear-gradient(90deg,#f1f5f9 0%,#e0e7ff 100%)",
                    }}
                  >
                    {[
                      { key: "name", label: "Group Name" },
                      { key: "balanceType", label: "Balance Type" },
                      { key: "description", label: "Description" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="px-5 py-3.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none whitespace-nowrap"
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={
                              sort.key === col.key ? "text-indigo-600" : ""
                            }
                          >
                            {col.label}
                          </span>
                          <SortIcon field={col.key} sort={sort} />
                        </span>
                      </th>
                    ))}
                    <th className="px-5 py-3.5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((g, i) => {
                    const bc = getBC(g.balanceType);
                    const isExpanded = expandedGroupId === g._id;

                    return (
                      <Fragment key={g._id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.025 }}
                          className={`transition-colors ${bc.row} group cursor-pointer`}
                          onClick={() => toggleExpandedGroup(g._id)}
                        >
                          {/* Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandedGroup(g._id);
                                }}
                                className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                                title={isExpanded ? "Collapse group details" : "Expand group details"}
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                              <div
                                className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${bc.dot}`}
                              />
                              <div>
                                <p className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                  {g.name || "—"}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {g.code && (
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      #{g.code}
                                    </p>
                                  )}
                                  {g.nature && (
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                      {g.nature}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Balance Type */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${bc.pill}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${bc.dot}`}
                              />
                              {g.balanceType || "—"}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="px-5 py-4">
                            <p className="text-slate-500 truncate max-w-[260px]">
                              {g.noteNo || (
                                <span className="text-slate-300 italic">
                                  Click to view mapping details
                                </span>
                              )}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {checkAuthorization(user, "GROUPS", "EDIT") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditData(g);
                                    setShowForm(true);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                              )}
                              {checkAuthorization(user, "GROUPS", "DELETE") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm(g._id);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-all"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={4} className="px-5 pb-4 pt-0">
                              <div className="mt-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  {[
                                    { label: "Nature", value: g.nature },
                                    { label: "Schedule Main Head", value: g.scheduleMainHead },
                                    { label: "Schedule Group", value: g.scheduleGroup },
                                    { label: "Schedule Line Item", value: g.scheduleLineItem },
                                    // { label: "Note No", value: g.noteNo },
                                    { label: "Report Type", value: g.scheduleMapping?.reportType },
                                    {
                                      label: "Created On",
                                      value: g.createdAt
                                        ? new Date(g.createdAt).toLocaleDateString("en-IN")
                                        : null,
                                    },
                                    {
                                      label: "Updated On",
                                      value: g.updatedAt
                                        ? new Date(g.updatedAt).toLocaleDateString("en-IN")
                                        : null,
                                    },
                                  ].map((item) => (
                                    <div
                                      key={`${g._id}-${item.label}`}
                                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                    >
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {item.label}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-700 break-words">
                                        {item.value || <span className="text-slate-300 italic">Not set</span>}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">
                Showing{" "}
                <span className="font-bold text-slate-600">
                  {sorted.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-600">
                  {groups.length}
                </span>{" "}
                groups
              </p>
              <p className="text-[10px] text-slate-400">
                Click column headers to sort
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    Delete Group?
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    boxShadow: "0 4px 12px rgba(239,68,68,0.35)",
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showForm && (
        <GroupForm
          initial={editData}
          onSubmit={editData ? handleUpdate : handleCreate}
          onClose={() => {
            setShowForm(false);
            setEditData(null);
          }}
        />
      )}

      <AuditLogSidebar
        isOpen={openLogs}
        onClose={() => setOpenLogs(false)}
        companyId={user?.company?._id}
        modules={["GROUP"]}
        title="Group Audit Trail"
        subtitle="Tracking all group-related activities"
      />
    </div>
  );
}
