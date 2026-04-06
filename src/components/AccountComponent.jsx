import { formatCamelCase, formatCurrency } from "../utils/formatUtil";
import { Filter, User, Building2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function AccountComponent({ account, selected, onClick, hasMatchingTransactions }) {
  const { name, code, groupName, type, openingBalance, linkedClientId, linkedVendorId } = account;

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={`relative group cursor-pointer rounded-2xl p-5 border transition-all duration-300 ${
        selected 
          ? "glass border-blue-500 shadow-xl shadow-blue-500/10" 
          : "bg-white border-slate-200 hover:border-blue-400 shadow-premium hover:shadow-xl"
      }`}
    >
      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-0 right-0 p-1 bg-blue-500 rounded-tr-2xl rounded-bl-xl text-white">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Filter match indicator */}
      {hasMatchingTransactions && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm border border-emerald-200 flex items-center gap-1">
            <Filter size={10} strokeWidth={3} />
            Matches
          </div>
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-sm font-bold truncate ${selected ? "text-blue-700" : "text-slate-900"}`}>
                {name}
              </h3>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                #{code.padStart(3, "0")}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                {groupName}
              </span>
              <span>•</span>
              <span className="capitalize">{formatCamelCase(type).toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap gap-2 mb-5">
          {linkedClientId && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <User size={10} />
              CLIENT
            </div>
          )}
          {linkedVendorId && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <Building2 size={10} />
              VENDOR
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Balance</span>
            <span className={`text-sm font-bold ${selected ? "text-blue-600" : "text-slate-900"}`}>
              {formatCurrency(openingBalance)}
            </span>
          </div>
          
          <div className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${selected ? "text-blue-600" : "text-blue-500 group-hover:text-blue-700"}`}>
            Details
            <ExternalLink size={12} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
