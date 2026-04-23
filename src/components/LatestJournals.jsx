import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { allJournalApi } from "../apis/journalApi";
import { useAuth } from "../contexts/AuthContext";
import LoadingComponent from "./LoadingComponent";
import axios from "axios";
import { motion } from "framer-motion";
import { BookOpen, Calendar, ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import dayjs from "dayjs";

export default function LatestJournals({ onViewAll, onJournalClick }) {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isLoading } = useAuth();
  const company = localStorage.getItem("selectedCompany") ? JSON.parse(localStorage.getItem("selectedCompany")) : null;

  useEffect(() => {
    const controller = new AbortController();
    async function getLatestJournals() {
      try {
        setLoading(true);
        // Pass a limit to the API if supported, or fetch and sort
        const res = await allJournalApi(company?._id, { limit: 100 }, controller.signal);
        
        // Sort strictly by createdAt (newest first) to show actually latest activity
        // Automated journals from invoices might have an older 'date' (invoice date)
        // but they are 'posted' now, so createdAt is what the user expects for "Recent"
        const sortedJournals = (res.data || [])
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
          
        setJournals(sortedJournals);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error(err);
          toast.warn("Error fetching journals");
        }
      } finally {
        if (!controller?.signal?.aborted) setLoading(false);
      }
    }
    if (company?._id && !isLoading) {
      getLatestJournals();
    }
    return () => controller.abort();
  }, [company?._id, isLoading]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Loading Journals...</p>
        </div>
      ) : journals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
          <BookOpen className="h-10 w-10 text-slate-400 mb-2" />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">No Journals</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {journals.map((journal, i) => {
            const totalAmount = journal.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
            return (
              <motion.div
                key={journal._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onJournalClick && onJournalClick(journal)}
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-blue-50/40 transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-white group-hover:scale-110 transition-all shrink-0">
                    <BookOpen size={18} className="text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      Journal #{journal.number}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Calendar size={10} />
                        {dayjs(journal.date).format("DD MMM YYYY")}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-200" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {journal.lines.length} Lines
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs font-black text-slate-800 tabular-nums">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black ${journal.posted ? "text-emerald-700" : "text-amber-700"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${journal.posted ? "bg-emerald-500" : "bg-amber-400"}`} />
                    {journal.posted ? "Posted" : "Draft"}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
