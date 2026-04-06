import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  History, 
  Activity, 
  FileText, 
  BookOpen, 
  Search, 
  Calendar,
  Clock,
  CheckCircle, 
  XCircle,
  Package,
  Wallet,
  Layers,
  Hash,
  Users,
  UserCheck,
  Building2,
  Briefcase,
  ChevronDown,
  ArrowRight,
  User
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getAuditLogsApi } from "../apis/auditLog.api";

dayjs.extend(relativeTime);

const AuditLogSidebar = ({
  isOpen,
  onClose,
  companyId,
  modules = [],
  title,
  subtitle,
}) => {
  const isHomePage = !modules || modules.length === 0;
  const today = dayjs().format("YYYY-MM-DD");
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    startDate: today,
    endDate: today,
    module: isHomePage ? "ALL" : (modules[0] || "ALL"),
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && companyId) {
      loadLogs();
    }
  }, [isOpen, companyId, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {
        ...(filters.startDate ? { fromDate: filters.startDate } : {}),
        ...(filters.endDate ? { toDate: filters.endDate } : {}),
        // If it's not home page, and we haven't manually changed the module filter, 
        // use the first module from the prop if available.
        ...(filters.module !== "ALL" ? { module: filters.module } : {}),
      };
      
      // If we are NOT on the home page and no module is selected, 
      // but we have modules in the prop, we should probably send the first one as default.
      if (!isHomePage && filters.module === "ALL" && modules.length > 0) {
        params.module = modules[0];
      }

      const res = await getAuditLogsApi(String(companyId), params);
      setLogs(res.data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getActionTypeColor = (actionType) => {
    const actionMap = {
      CREATE: "bg-emerald-50 text-emerald-700 border-emerald-100",
      UPDATE: "bg-blue-50 text-blue-700 border-blue-100",
      DELETE: "bg-red-50 text-red-700 border-red-100",
      SALES_JOURNAL_POSTED: "bg-violet-50 text-violet-700 border-violet-100",
      APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
      REJECTED: "bg-red-50 text-red-700 border-red-100",
    };
    return (
      actionMap[actionType] ||
      "bg-slate-50 text-slate-700 border-slate-100"
    );
  };

  const renderInvoiceCreatedContent = (invoiceData) => {
    if (!invoiceData) return null;
    return (
      <div className="space-y-3 mt-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Invoice No</p>
            <p className="text-[11px] font-black text-slate-700">{invoiceData.invoiceNo || "N/A"}</p>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</p>
            <p className="text-[11px] font-black text-slate-700">₹{(invoiceData.totalTaxableValue ?? 0).toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Billed To</p>
          <p className="text-[11px] font-bold text-slate-600 truncate">{invoiceData.billTo?.name || "N/A"}</p>
        </div>
      </div>
    );
  };

  const renderLogEntry = (log) => {
    const logEntries = Array.isArray(log.logs) ? log.logs : (Array.isArray(log.changes) ? log.changes : []);

    const actionType = log.actionType || log.action || "UPDATE";
    const colors = getActionTypeColor(actionType);
    
    const getModuleIcon = (module) => {
      const iconMap = {
        INVOICE: <FileText size={14} />,
        JOURNAL: <BookOpen size={14} />,
        JOURNAL_ENTRY: <BookOpen size={14} />,
        PURCHASE_ORDER: <Package size={14} />,
        PAYMENT: <Wallet size={14} />,
        GROUP: <Layers size={14} />,
        CLIENT: <User size={14} />,
        VENDOR: <Briefcase size={14} />,
        HSN: <Hash size={14} />,
        EMPLOYEE: <Users size={14} />,
        USER: <UserCheck size={14} />,
        COMPANY: <Building2 size={14} />,
      };
      return iconMap[module] || <Activity size={14} />;
    };

    const formatValue = (val) => {
      if (val === null || val === undefined) return "N/A";
      if (typeof val === "object") return JSON.stringify(val).substring(0, 50) + "...";
      return String(val);
    };

    return (
      <div className="relative pl-10" key={log._id || log.id}>
        <div className="absolute left-4 top-0 -translate-x-1/2">
          <div className={`w-8 h-8 rounded-full border-4 border-white ${colors.split(" ")[0]} flex items-center justify-center shadow-sm`}>
            <span className={colors.split(" ")[1]}>
              {getModuleIcon(log.module)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors}`}>
              {actionType}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {dayjs(log.timestamp).format("hh:mm A")}
            </span>
          </div>
          
          <h4 className="text-[11px] font-black text-slate-900 mb-1">
            {log.moduleLabel || log.module} {actionType.toLowerCase().replace(/_/g, " ")}
          </h4>
          
          {log.changeSummary && (
            <p className="text-[10px] text-slate-600 mb-2 font-medium">{log.changeSummary}</p>
          )}

          {logEntries.some(e => e.newValue && typeof e.newValue === 'object' && e.newValue.invoiceNo) && 
            renderInvoiceCreatedContent(logEntries.find(e => e.newValue?.invoiceNo)?.newValue)}

          {logEntries.length > 0 && (
            <div className="space-y-2 mt-2">
              {logEntries.map((entry, i) => {
                const fieldName = entry.fieldLabel || entry.field || "Change";
                return (
                  <div key={i} className="text-[11px] text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px] block mb-0.5">{fieldName}</span>
                    {entry.changeDescription ? (
                      <p className="font-medium text-slate-700">{entry.changeDescription}</p>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-red-600 line-through opacity-50">{formatValue(entry.oldValue)}</span>
                        <ArrowRight size={10} className="text-slate-300" />
                        <span className="text-emerald-600 font-bold">{formatValue(entry.newValue)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {log.performedBy?.name && (
            <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                <User size={10} className="text-slate-400" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">By {log.performedBy.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.moduleLabel?.toLowerCase().includes(term) ||
      log.actionType?.toLowerCase().includes(term) ||
      log.performedBy?.name?.toLowerCase().includes(term) ||
      log.logs?.some(l => l.changeDescription?.toLowerCase().includes(term))
    );
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-slate-50 shadow-2xl z-[101] flex flex-col border-l border-white/20"
            >
              <div className="p-6 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl shadow-lg shadow-blue-500/20"
                         style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" }}>
                      <Activity size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">Audit Logs</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction History</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl border border-transparent hover:border-red-100">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      placeholder="Search history..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">From</label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange("startDate", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">To</label>
                      <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange("endDate", e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                  {isHomePage && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Module Category</label>
                      <div className="relative group/select">
                        <select
                          value={filters.module}
                          onChange={(e) => handleFilterChange("module", e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-700 appearance-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all outline-none cursor-pointer"
                        >
                          {[
                            "ALL", "INVOICE", "JOURNAL", "PAYMENT", 
                            "PURCHASE_ORDER", "GROUP", "CLIENT", "VENDOR", 
                            "HSN", "EMPLOYEE", "USER", "COMPANY", "ACCOUNT"
                          ].map((m) => (
                            <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-blue-500 transition-colors">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide bg-slate-50">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Syncing Logs...</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <div className="p-4 rounded-3xl bg-slate-200">
                      <History size={32} className="text-slate-400" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase">No logs found</p>
                  </div>
                ) : (
                  <div className="relative space-y-8">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                    
                    {filteredLogs.map((log) => renderLogEntry(log))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98]"
                >
                  Close Sidebar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AuditLogSidebar;
