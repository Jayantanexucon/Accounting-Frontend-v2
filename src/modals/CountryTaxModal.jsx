import React, { useState, useEffect } from "react";
import { X, Globe, Plus, Pencil, Trash2, Save, Loader2, Search, AlertCircle, History } from "lucide-react";
import { toast } from "react-toastify";
import {
  getAllCountryTaxApi,
  createCountryTaxApi,
  updateCountryTaxApi,
  deleteCountryTaxApi,
} from "../apis/countryTaxApi";
import { getCountriesApi } from "../apis/masterDataApi";

const DEFAULT_TAX_TYPES = ["GST", "SALES_TAX", "VAT", "RCM", "NONE"];

const EMPTY_FORM = {
  countryId: "",
  taxType: "GST",
  taxRate: 0,
  taxLabel: "",
  description: "",
  isActive: true,
};

const TAX_TYPE_COLORS = {
  GST:       "bg-blue-50 text-blue-700 border-blue-200",
  SALES_TAX: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VAT:       "bg-violet-50 text-violet-700 border-violet-200",
  RCM:       "bg-amber-50 text-amber-700 border-amber-200",
  NONE:      "bg-slate-100 text-slate-500 border-slate-200",
};

// ─── Main Modal ─────────────────────────────────────────────────────────
export default function CountryTaxModal({ isOpen, onClose }) {
  const [list, setList]         = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]     = useState("");
  const [error, setError]       = useState(null);

  // form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  
  // Snapshot viewing
  const [viewingSnapshotsId, setViewingSnapshotsId] = useState(null);

  // ── fetch list ──────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [taxRes, countryRes] = await Promise.all([
        getAllCountryTaxApi(),
        getCountriesApi()
      ]);
      setList(taxRes?.data || []);
      setCountries(countryRes?.data || []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  // ── form helpers ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (record) => {
    setEditId(record._id);
    setForm({
      countryId:    record.countryId?._id || record.countryId,
      taxType:      record.taxType,
      taxRate:      record.taxRate,
      taxLabel:     record.taxLabel || "",
      description:  record.description || "",
      isActive:     record.isActive ?? true,
    });
    setError(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (e) => {
    const cid = e.target.value;
    const selectedCountry = countries.find(c => c._id === cid);
    const taxSystem = selectedCountry?.taxConfig?.taxSystem || "GST";
    setForm(prev => ({
      ...prev,
      countryId: cid,
      taxType: taxSystem !== "NONE" ? taxSystem : prev.taxType
    }));
  };

  // ── save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.countryId) {
      setError("Please select a Country.");
      return;
    }
    if (!form.taxType.trim()) {
      setError("Tax Type is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        taxType: form.taxType.trim().toUpperCase(),
        taxRate: Number(form.taxRate) || 0,
      };
      if (editId) {
        await updateCountryTaxApi(editId, payload);
        toast.success("Country tax rate updated");
      } else {
        await createCountryTaxApi(payload);
        toast.success("Country tax rate created");
      }
      cancelForm();
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Save failed";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── delete ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this country tax rate?")) return;
    setDeleting(id);
    try {
      await deleteCountryTaxApi(id);
      toast.success("Deleted successfully");
      setList((prev) => prev.filter((r) => r._id !== id));
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  // ── filtered list ───────────────────────────────────────────────────
  const filtered = list.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.countryName.toLowerCase().includes(q) ||
      r.countryCode.toLowerCase().includes(q) ||
      (r.taxLabel || "").toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
            >
              <Globe size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Country Tax Master</h2>
              <p className="text-[10px] text-slate-400">Manage tax rates for international transactions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Add Form */}
          {showForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-700">
                {editId ? "Edit Country Tax Rate" : "Add New Country Tax Rate"}
              </h3>

              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Country *
                  </label>
                  <select
                    value={form.countryId}
                    onChange={handleCountryChange}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                    disabled={!!editId} // Don't allow changing country on edit normally
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.countryName} ({c.countryCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tax Type *
                  </label>
                  <input
                    type="text"
                    list="taxTypesList"
                    placeholder="e.g. GST, VAT, SALES_TAX"
                    value={form.taxType}
                    onChange={(e) => handleChange("taxType", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                  <datalist id="taxTypesList">
                    {DEFAULT_TAX_TYPES.map(opt => <option key={opt} value={opt} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g., 18"
                    value={form.taxRate}
                    onChange={(e) => handleChange("taxRate", e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tax Label (display name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Sales Tax"
                    value={form.taxLabel}
                    onChange={(e) => handleChange("taxLabel", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Federal + State avg"
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => handleChange("isActive", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300"
                  />
                  <span className="text-xs text-slate-600">Active</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {editId ? "Update" : "Save"}
                </button>
                <button
                  onClick={cancelForm}
                  className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search country name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition"
              />
            </div>
            {!showForm && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg whitespace-nowrap transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
              >
                <Plus size={13} /> Add Country Tax
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Globe size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">
                {search ? "No results found" : "No country tax rates added yet"}
              </p>
              {!search && (
                <p className="text-[10px] mt-1">Click "Add Country Tax" to create your first entry</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* table header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-1">Code</div>
                <div className="col-span-3">Country</div>
                <div className="col-span-2">Tax Type</div>
                <div className="col-span-2">Rate</div>
                <div className="col-span-2">Label</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1"></div>
              </div>

              {filtered.map((record) => (
                <React.Fragment key={record._id}>
                <div
                  className="grid sm:grid-cols-12 gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl items-center hover:border-slate-300 transition"
                >
                  <div className="sm:col-span-1">
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-600">
                      {record.countryCode}
                    </span>
                  </div>
                  <div className="sm:col-span-3 text-xs font-medium text-slate-800">
                    {record.countryName}
                  </div>
                  <div className="sm:col-span-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        TAX_TYPE_COLORS[record.taxType] || TAX_TYPE_COLORS.NONE
                      }`}
                    >
                      {record.taxType.replace("_", " ")}
                    </span>
                  </div>
                  <div className="sm:col-span-2 text-xs font-bold text-slate-700">
                    {record.taxRate}%
                  </div>
                  <div className="sm:col-span-2 text-xs text-slate-500">
                    {record.taxLabel || "—"}
                  </div>
                  <div className="sm:col-span-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        record.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {record.isActive ? "Active" : "Off"}
                    </span>
                  </div>
                  <div className="sm:col-span-1 flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => setViewingSnapshotsId(viewingSnapshotsId === record._id ? null : record._id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition"
                      title="View Edit History"
                    >
                      <History size={12} />
                    </button>
                    <button
                      onClick={() => openEdit(record)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(record._id)}
                      disabled={deleting === record._id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                    >
                      {deleting === record._id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Snapshots view */}
                {viewingSnapshotsId === record._id && record.snapshots && record.snapshots.length > 0 && (
                  <div className="col-span-12 mt-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                    <h4 className="font-semibold mb-2">History Snapshots</h4>
                    <ul className="space-y-2">
                      {record.snapshots.map((snap, idx) => (
                        <li key={idx} className="flex justify-between items-center border-b border-slate-200 pb-1 last:border-0">
                          <div>
                            Changed to <span className="font-semibold">{snap.taxType}</span> @ <span className="font-semibold">{snap.taxRate}%</span>
                          </div>
                          <div className="text-slate-500">
                            by {snap.updatedBy?.name} on {new Date(snap.updatedAt).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          <p className="text-[10px] text-slate-400">
            {list.length} countr{list.length !== 1 ? "ies" : "y"} configured
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
