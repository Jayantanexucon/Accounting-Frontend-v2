import React, { useEffect, useState } from "react";
import { API } from "../apis/api";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  History,
  User,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  DollarSign,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Users,
  AlertCircle,
  CheckSquare,
  Package,
  Truck,
  CreditCard,
} from "lucide-react";

dayjs.extend(relativeTime);

const PurchaseOrderAuditLogModal = ({
  open,
  onClose,
  poId,
  poNumber,
  companyId,
}) => {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedUpdates, setExpandedUpdates] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open && poId && companyId) {
      fetchAuditLogs();
    }
  }, [open, poId, companyId]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await API.get(
        `/audit-logs/${companyId}/${poId}/poupdates`,
      );
      setAuditData(response.data?.data || null);
    } catch (error) {
      console.error("Error fetching purchase order updates:", error);
      toast.error("Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes("STATUS")) return <AlertCircle size={14} />;
    if (action.includes("UPDATED") || action.includes("UPDATE")) return <Edit size={14} />;
    return <History size={14} />;
  };

  const formatValue = (value) => {
    if (value === "—" || value === null || value === undefined) {
      return <span className="text-slate-300 italic">—</span>;
    }
    if (typeof value === "object") {
      return <span className="text-slate-400 font-mono text-[10px]">[Object]</span>;
    }
    return <span className="font-bold text-slate-700">{value}</span>;
  };

  const filteredUpdates =
    auditData?.updates?.filter((update) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          update.moduleLabel?.toLowerCase().includes(term) ||
          update.actionLabel?.toLowerCase().includes(term) ||
          update.changeSummary?.toLowerCase().includes(term) ||
          update.performedBy?.name?.toLowerCase().includes(term)
        );
      }
      return true;
    }) || [];

  const toggleUpdateExpand = (id) => {
    setExpandedUpdates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: "", time: "", relative: "", full: "" };
    const date = dayjs(timestamp);
    return {
      date: date.format("DD MMM YYYY"),
      time: date.format("hh:mm A"),
      relative: date.fromNow(),
      full: date.format("DD MMM YYYY, hh:mm A"),
    };
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed top-0 right-0 z-[101] h-full w-full md:w-[600px] bg-slate-50 shadow-2xl overflow-hidden border-l border-white/20">
        <div className="flex flex-col h-full">
          
          {/* ── HEADER ───────────────────────────────────── */}
          <div className="shrink-0 p-6 bg-white border-b border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl shadow-lg shadow-blue-500/20"
                     style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)" }}>
                  <History size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight tracking-tight uppercase">PO Audit Trail</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      PO: #{poNumber}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {auditData?.summary?.totalUpdates || 0} Events
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} 
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer border border-transparent hover:border-red-100">
                <X size={18} />
              </button>
            </div>

            {/* Stats strip */}
            {auditData?.summary && (
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Activity</p>
                    <p className="text-xs font-bold text-slate-700">{formatDateTime(auditData.summary.lastUpdated).date}</p>
                  </div>
                  <Calendar size={14} className="text-slate-300" />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Most Active</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{auditData.summary.mostActiveUser?.split(" ")[0] || "System"}</p>
                  </div>
                  <User size={14} className="text-slate-300" />
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search updates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[11px] font-bold bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* ── CONTENT ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6 scrollbar-hide">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loading History...</p>
              </div>
            ) : filteredUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                <div className="p-4 rounded-3xl bg-slate-200">
                  <History size={32} className="text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-500">No activity recorded</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

                <div className="space-y-8">
                  {filteredUpdates.map((update, idx) => {
                    const time = formatDateTime(update.timestamp);
                    const isExpanded = !!expandedUpdates[update.id];

                    return (
                      <div key={update.id} className="relative pl-12">
                        {/* Timeline node */}
                        <div className="absolute left-4 top-1 -translate-x-1/2 z-10">
                          <div className="w-8 h-8 rounded-full border-4 border-slate-50 bg-blue-50 flex items-center justify-center shadow-md">
                            {getActionIcon(update.action)}
                          </div>
                        </div>

                        {/* Event Card */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                          <div className="p-4" onClick={() => toggleUpdateExpand(update.id)}>
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-100 mb-1.5 inline-block">
                                  Purchase Order
                                </span>
                                <h3 className="text-xs font-black text-slate-900 leading-tight">
                                  {update.actionLabel}
                                </h3>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 mb-0.5">{time.relative}</p>
                                <p className="text-[9px] font-medium text-slate-300">{time.time}</p>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 font-medium mb-3">
                              {update.changeSummary}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 capitalize font-bold text-[9px]">
                                  {update.performedBy?.name?.charAt(0) || "S"}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {update.performedBy?.name || "System"}
                                </span>
                              </div>
                              {update.totalChanges > 0 && (
                                <button className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-wide">
                                  {isExpanded ? "Hide Details" : `${update.totalChanges} Changes`}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded detail section */}
                          <AnimatePresence>
                            {isExpanded && update.changes && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="bg-slate-50/80 border-t border-slate-100 p-4 space-y-3"
                              >
                                {update.changes.map((change, cIdx) => (
                                  <div key={cIdx} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">
                                      {change.fieldLabel}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 items-center">
                                      <div className="bg-red-50/40 rounded-lg p-2 border border-red-100/30">
                                        <p className="text-[8px] font-black text-red-500 uppercase tracking-tight mb-1">Previous</p>
                                        <div className="text-[11px] font-bold text-slate-500 line-through truncate opacity-50">
                                          {formatValue(change.oldValue)}
                                        </div>
                                      </div>
                                      <div className="bg-emerald-50/40 rounded-lg p-2 border border-emerald-100/30">
                                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-tight mb-1">Updated</p>
                                        <div className="text-[11px] font-black text-slate-800 truncate">
                                          {formatValue(change.newValue)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── FOOTER ───────────────────────────────────── */}
          <div className="shrink-0 p-4 bg-white border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider tabular-nums">
                Displaying {filteredUpdates.length} Events
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={fetchAuditLogs} 
                  disabled={loading}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button onClick={onClose}
                   className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all">
                  Done
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default PurchaseOrderAuditLogModal;
