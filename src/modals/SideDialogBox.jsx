import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function SideDialogBox({
  open = false,
  title = "Side Dialog Title",
  subtitle = "This is a subtitle for the side dialog box.",
  onClose = () => {},
  contents = <></>,
  maxWidth = "md:w-[50%]",
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Side Dialog */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 z-[60] h-full w-full ${maxWidth} bg-white shadow-[-20px_0_50px_-12px_rgba(0,0,0,0.15)] flex flex-col border-l border-slate-100`}
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
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
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {contents}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
