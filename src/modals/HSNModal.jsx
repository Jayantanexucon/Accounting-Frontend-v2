import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { X, Plus, Lock, Unlock, Hash, ChevronDown } from "lucide-react";
import { getallhsn, gethsnbyid, updatehsnbyid, createhsn } from "../apis/hsnapi";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

/* ── small helpers ────────────────────────────────────── */
const Label = ({ children, required }) => (
  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const inputCls =
  "w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all font-medium placeholder-slate-400 text-slate-700";

const disabledCls =
  "w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-medium cursor-not-allowed";

/* ── component ────────────────────────────────────────── */
export default function HSNModal({ isOpen, onClose, onSaved, editId }) {
  const { user } = useAuth();
  const companyId = user?.company?._id;

  const init = {
    serviceType: "", hsnCode: "",
    effectiveFrom: "", effectiveTo: "",
    igst: "", cgst: "", sgst: "",
    tdsApplicable: false, tdsRate: "", tdsSection: "",
  };

  const [form, setForm]           = useState(init);
  const [loading, setLoading]     = useState(false);
  const [masterList, setMaster]   = useState([]);
  const [query, setQuery]         = useState("");
  const [showDrop, setShowDrop]   = useState(false);
  const [gstLocked, setGstLocked] = useState(false);

  const dropRef  = useRef(null);
  const inputRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    set(name, type === "checkbox" ? checked : value);
  };

  /* load master list */
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        // Always fetch all HSN codes (global master data) - no companyId filter
        const res = await getallhsn();
        const raw = Array.isArray(res.data) ? res.data : [];
        const seen = new Set(); const out = [];
        for (const r of raw) {
          const c = String(r.hsnCode ?? "").trim();
          if (!seen.has(c)) { seen.add(c); out.push(r); }
        }
        setMaster(out);
      } catch { toast.error("Failed to load HSN master"); }
    })();
  }, [isOpen]);

  /* load for edit */
  useEffect(() => {
    if (!isOpen) return;
    if (!editId) { setForm(init); setQuery(""); setGstLocked(false); return; }
    (async () => {
      setLoading(true);
      try {
        // Always fetch HSN by ID (global master data) - no companyId filter
        const res = await gethsnbyid(editId);
        const d = res.data || {};
        setForm({
          serviceType: d.serviceType || "",
          hsnCode:     d.hsnCode || "",
          effectiveFrom: d.effectiveFrom?.split("T")[0] || "",
          effectiveTo:   d.effectiveTo?.split("T")[0] || "",
          igst: d.igst ?? "", cgst: d.cgst ?? "", sgst: d.sgst ?? "",
          tdsApplicable: !!d.tdsApplicable,
          tdsRate: d.tdsRate ?? "", tdsSection: d.tdsSection ?? "",
        });
        setQuery(d.hsnCode || "");
      } catch { toast.error("Failed to load HSN"); }
      finally { setLoading(false); }
    })();
  }, [editId, isOpen]);

  /* suggestions */
  const suggestions = useMemo(() => {
    if (!query) return masterList.slice(0, 8);
    return masterList.filter(m => String(m.hsnCode).includes(query)).slice(0, 8);
  }, [masterList, query]);

  /* auto-fill GST on exact match */
  useEffect(() => {
    if (!query) { setGstLocked(false); return; }
    const exact = masterList.find(m => String(m.hsnCode) === String(query));
    if (exact) {
      setForm(p => ({ ...p, cgst: exact.cgst, sgst: exact.sgst, igst: exact.igst }));
      setGstLocked(true);
    } else { setGstLocked(false); }
  }, [query, masterList]);

  /* outside click */
  useEffect(() => {
    const h = e => {
      if (dropRef.current && !dropRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target))
        setShowDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* submit */
  const handleSubmit = e => {
    e.preventDefault();
    if (!form.serviceType)  return toast.error("Service Type is required");
    if (!form.hsnCode)      return toast.error("HSN code is required");
    if (!form.effectiveFrom) return toast.error("Effective From is required");

    const from = new Date(form.effectiveFrom);
    const to   = form.effectiveTo ? new Date(form.effectiveTo) : null;
    if (from > new Date()) return toast.error("Effective From cannot be in the future");
    if (to && from > to)   return toast.error("Effective From cannot be after Effective To");

    save();
  };

  const save = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        hsnCode: String(form.hsnCode).trim(),
        igst: Number(form.igst), cgst: Number(form.cgst), sgst: Number(form.sgst),
        tdsRate: Number(form.tdsRate || 0),
      };
      if (editId) {
        await updatehsnbyid(companyId, editId, payload);
        toast.success("HSN updated");
      } else {
        await createhsn(companyId, payload);
        toast.success("HSN created");
      }
      onSaved?.();
      onClose();
    } catch { toast.error("Save failed"); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  /* ── render ─────────────────────────────────────────── */
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 overflow-hidden z-10"
        >
          {/* modal header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                <Hash size={15} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  {editId ? "Edit HSN / SAC" : "Add HSN / SAC"}
                </h3>
                <p className="text-[10px] text-indigo-200/80 font-medium mt-0.5">
                  {editId ? "Update tax code details" : "Create a new tax code entry"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">

            {/* row 1: service type + hsn code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label required>Service Type</Label>
                <input
                  name="serviceType"
                  value={form.serviceType}
                  onChange={handleChange}
                  placeholder="e.g. Software Development"
                  className={inputCls}
                />
              </div>

              <div className="relative">
                <Label required>HSN / SAC Code</Label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value);
                      set("hsnCode", e.target.value);
                      setShowDrop(true);
                    }}
                    onFocus={() => setShowDrop(true)}
                    placeholder="Type or pick HSN code"
                    className={inputCls + " pr-8"}
                  />
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <AnimatePresence>
                  {showDrop && (
                    <motion.div
                      ref={dropRef}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl max-h-44 overflow-auto mt-1 z-30"
                    >
                      {suggestions.length > 0 && suggestions.map(s => (
                        <div
                          key={s._id}
                          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors"
                          onMouseDown={() => {
                            setQuery(s.hsnCode);
                            setForm(p => ({ ...p, hsnCode: s.hsnCode, cgst: s.cgst, sgst: s.sgst, igst: s.igst }));
                            setShowDrop(false);
                          }}
                        >
                          <span className="text-xs font-bold text-slate-700">{s.hsnCode}</span>
                          <span className="text-[10px] text-slate-400">{s.serviceType}</span>
                        </div>
                      ))}
                      {query && (
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer border-t border-slate-100 hover:bg-slate-50 transition-colors text-xs text-indigo-600 font-bold"
                          onMouseDown={() => setShowDrop(false)}
                        >
                          <Plus size={13} /> Use "{query}" as new code
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* row 2: dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label required>Effective From</Label>
                <input type="date" value={form.effectiveFrom} onChange={e => set("effectiveFrom", e.target.value)} className={inputCls} />
              </div>
              <div>
                <Label>Effective To</Label>
                <input type="date" value={form.effectiveTo} onChange={e => set("effectiveTo", e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* row 3: GST rates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>GST Rates (%)</Label>
                {gstLocked && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                    <Lock size={10} /> Auto-filled from existing code
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "igst", label: "IGST", border: "border-blue-200 focus:border-blue-400 focus:ring-blue-500/20" },
                  { key: "cgst", label: "CGST", border: "border-violet-200 focus:border-violet-400 focus:ring-violet-500/20" },
                  { key: "sgst", label: "SGST", border: "border-emerald-200 focus:border-emerald-400 focus:ring-emerald-500/20" },
                ].map(({ key, label, border }) => (
                  <div key={key}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                    {gstLocked ? (
                      <div className={disabledCls + " flex items-center justify-between"}>
                        <span>{form[key] ?? "—"}%</span>
                        <Lock size={11} className="text-slate-300" />
                      </div>
                    ) : (
                      <input
                        type="number"
                        value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder="0"
                        className={`w-full px-3 py-2.5 text-xs bg-white border ${border} rounded-xl focus:ring-2 outline-none transition-all font-medium placeholder-slate-400 text-slate-700`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* row 4: TDS */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <label className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="tdsApplicable"
                    checked={form.tdsApplicable}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-700">TDS Applicable</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${form.tdsApplicable ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"}`}>
                  {form.tdsApplicable ? "YES" : "NO"}
                </span>
              </label>

              <AnimatePresence>
                {form.tdsApplicable && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-slate-100">
                      <div>
                        <Label>TDS Section</Label>
                        <input
                          name="tdsSection"
                          value={form.tdsSection}
                          onChange={handleChange}
                          placeholder="e.g. 194C"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <Label>TDS Rate (%)</Label>
                        <input
                          type="number"
                          name="tdsRate"
                          value={form.tdsRate}
                          onChange={handleChange}
                          min="0" max="100"
                          placeholder="0"
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {loading && <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {editId ? "Update HSN" : "Create HSN"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}