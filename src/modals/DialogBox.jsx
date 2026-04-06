import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function DialogBox({
  open = false,
  title = "Dialog Title",
  subtitle = "This is a subtitle for the dialog box.",
  loading = false,
  onClose = () => {},
  onSubmit = () => {},
  contents = <></>,
  maxWidth = "max-w-2xl",
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
            className={`relative max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl ${maxWidth} w-full overflow-hidden border border-slate-100`}
          >
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="text-slate-700">{contents}</div>
            </div>

            {/* Footer / Actions */}
            <div className="p-6 md:p-8 border-t border-slate-100 flex gap-3 justify-end bg-slate-50/50">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={onSubmit}
                className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none flex items-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
