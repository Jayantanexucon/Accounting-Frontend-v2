import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  loading = false,
  destructive = false,
}) {
  const variants = {
    primary: { icon: <Info className="w-6 h-6 text-blue-600" />, bg: "bg-blue-50", button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" },
    danger: { icon: <AlertTriangle className="w-6 h-6 text-red-600" />, bg: "bg-red-50", button: "bg-red-600 hover:bg-red-700 shadow-red-600/20" },
    warning: { icon: <AlertCircle className="w-6 h-6 text-amber-600" />, bg: "bg-amber-50", button: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" },
    success: { icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />, bg: "bg-emerald-50", button: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" },
  };

  const activeVariant = destructive ? variants.danger : variants[confirmVariant] || variants.primary;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-8">
              <div className="flex items-start gap-5">
                <div className={`p-4 rounded-2xl ${activeVariant.bg} shrink-0`}>
                  {activeVariant.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
                  <p className="text-slate-500 font-medium mt-2 leading-relaxed">{message}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${activeVariant.button}`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
