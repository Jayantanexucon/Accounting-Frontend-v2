import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { addClientApi, updateClientApi } from "../apis/clientApi";
import countryRules from "../utils/countryRules";
import { getallhsn } from "../apis/hsnapi";

// ─── Payment Terms ────────────────────────────────────────────────────────────
const paymentTermsOptions = [
  { value: "", label: "Select payment terms" },
  { value: "P1", label: "P1 – Immediate Payment" },
  { value: "P2", label: "P2 – Net 15 Days" },
  { value: "P3", label: "P3 – Net 30 Days" },
  { value: "P4", label: "P4 – Net 60 Days" },
  { value: "P5", label: "P5 – Advance Payment" },
  { value: "P6", label: "P6 – Cash on Delivery" },
  { value: "P7", label: "P7 – 50% Advance, 50% on Delivery" },
];

// ─── Country list (matches countryRules keys) ─────────────────────────────────
const countryOptions = [
  { value: "India", label: "India 🇮🇳" },
  { value: "USA", label: "United States 🇺🇸" },
  { value: "UK", label: "United Kingdom 🇬🇧" },
  { value: "UAE", label: "UAE 🇦🇪" },
  { value: "SaudiArabia", label: "Saudi Arabia 🇸🇦" },
  { value: "Canada", label: "Canada 🇨🇦" },
  { value: "Australia", label: "Australia 🇦🇺" },
  { value: "Germany", label: "Germany 🇩🇪" },
  { value: "France", label: "France 🇫🇷" },
  { value: "Singapore", label: "Singapore 🇸🇬" },
  { value: "Japan", label: "Japan 🇯🇵" },
  { value: "Nepal", label: "Nepal 🇳🇵" },
  { value: "Bhutan", label: "Bhutan 🇧🇹" },
  { value: "Other", label: "Other" },
];

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  clientName: "",
  contactPerson: "",
  contactNumber: "",
  altContactNumber: "",
  email: "",
  website: "",
  clientAddress: "",
  clientCity: "",
  clientState: "",
  clientCountry: "India",
  pinCode: "",
  stateCode: "",
  gstStateCode: "",
  // Tax
  taxIdentifierType: "",
  panNumber: "",
  gstNumber: "",
  taxIdentificationNumber: "",
  einNumber: "",
  ssnNumber: "",
  vatNumber: "",
  companyNumber: "",
  nationalIdNumber: "",
  // Misc
  paymentTerms: "",
  remarks: "",
  isActive: true,
  hsnCodes: [],
  selectedHsn: "",
  poList: [],
  poInput: "",
  // TDS
  tdsApplicable: false,
  tdsRate: 0,
  tdsSection: "",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManageClientModal({
  open,
  onClose = () => {},
  title = "Add Client",
  subtitle = "",
  updateClient = () => {},
  editClient = null,
  refreshClients = () => {},
}) {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [rule, setRule] = useState(countryRules["India"]);
  const [hsmList, setHsmList] = useState([]);

  // ── Load HSN list ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.company?._id) return;
    getallhsn(user.company._id)
      .then((res) => setHsmList(res.data || []))
      .catch(() => toast.error("Failed to load HSN list"));
  }, [user]);

  // ── Populate form on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (editClient) {
      setForm({
        ...emptyForm,
        ...editClient,
        selectedHsn: "",
        poInput: "",
        hsnCodes: editClient.hsnCodes || [],
        poList: editClient.poList || [],
        tdsApplicable: editClient.tdsApplicable ?? false,
        tdsRate: editClient.tdsRate ?? 0,
        tdsSection: editClient.tdsSection || "",
        isActive: editClient.isActive ?? true,
      });
      setRule(countryRules[editClient.clientCountry] || countryRules.default);
    } else {
      setForm(emptyForm);
      setRule(countryRules["India"]);
    }
  }, [open, editClient]);

  // ── Generic field handler ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processed = value;
    if (["panNumber", "gstNumber", "taxIdentificationNumber", "vatNumber"].includes(name)) {
      processed = value.toUpperCase();
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : processed,
    }));
  };

  // ── Country change: reset location fields only ─────────────────────────────
  const handleCountryChange = (e) => {
    const country = e.target.value;
    const newRule = countryRules[country] || countryRules.default;
    setForm((prev) => ({
      ...prev,
      clientCountry: country,
      clientState: "",
      stateCode: "",
      gstStateCode: "",
      pinCode: "",
    }));
    setRule(newRule);
  };

  // ── State dropdown ─────────────────────────────────────────────────────────
  const handleStateChange = (e) => {
    const selected = e.target.value;
    const st = rule.states.find((s) => s.name === selected);
    setForm((prev) => ({
      ...prev,
      clientState: selected,
      stateCode: st?.code || "",
      gstStateCode: st?.gstStateCode || "",
    }));
  };

  // ── Validation + Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!form.clientName.trim()) throw new Error("Client name is required");

      const countryRule = countryRules[form.clientCountry] || countryRules.default;

      if (!form.pinCode.trim()) throw new Error(`${countryRule.postalCodeLabel || "Postal code"} is required`);
      if (countryRule.postalCodeRegex && !countryRule.postalCodeRegex.test(form.pinCode)) {
        throw new Error(countryRule.postalCodeMessage || "Invalid postal code");
      }

      // Only enforce tax fields if the user filled something in
      // (Backend model handles format validation; we just check presence for required fields)
      if (form.clientCountry === "India") {
        if (!form.panNumber.trim()) throw new Error("PAN number is required for India");
        if (!form.gstNumber.trim()) throw new Error("GST number is required for India");
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNumber)) {
          throw new Error("PAN number must be in format: ABCDE1234F");
        }
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber)) {
          throw new Error("GST number must be in valid GSTIN format (e.g. 22AAAAA0000A1Z5)");
        }
      }

      if (form.clientCountry === "USA") {
        if (form.einNumber && !/^\d{2}-\d{7}$/.test(form.einNumber)) {
          throw new Error("EIN must be in format: 12-3456789");
        }
        if (form.ssnNumber && !/^\d{3}-\d{2}-\d{4}$/.test(form.ssnNumber)) {
          throw new Error("SSN must be in format: 123-45-6789");
        }
      }

      const clientData = {
        ...form,
        companyId: user?.company?._id,
        // strip UI-only fields
        selectedHsn: undefined,
        poInput: undefined,
      };

      if (editClient) {
        await updateClientApi(editClient._id, clientData);
        toast.success(`Updated: ${form.clientName}`);
        refreshClients();
      } else {
        const res = await addClientApi(clientData);
        updateClient(res.data);
        toast.success(`Added: ${form.clientName}`);
      }

      onClose();
      setForm(emptyForm);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || error?.message || "Error saving client"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };


  // ─── Shared class strings ──────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 font-medium hover:border-slate-300";
  const upperCls = inputCls + " uppercase";
  const readonlyCls = "w-full px-3 py-2.5 text-xs border border-slate-100 rounded-xl bg-slate-50 cursor-not-allowed text-slate-400 font-mono";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-slate-50 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">

      {/* ── Header ── */}
      <div className="shrink-0 rounded-t-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl border border-white/25">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-tight">
                {editClient ? "Edit Client" : title}
              </h2>
              <p className="text-blue-200 text-[11px] mt-0.5">
                {editClient ? `Updating: ${editClient.clientName}` : (subtitle || "Fill in the details below")}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        <form className="p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>

          {/* Client Name */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input type="text" name="clientName" value={form.clientName} onChange={handleChange}
              placeholder="Enter client or company name" className={inputCls} />
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <SectionHead title="Contact Information" accent="linear-gradient(180deg,#2563eb,#60a5fa)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Person"    name="contactPerson"    value={form.contactPerson}    onChange={handleChange} placeholder="Full name" />
              <Field label="Contact Number"    name="contactNumber"    value={form.contactNumber}    onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
              <Field label="Alternate Contact" name="altContactNumber" value={form.altContactNumber} onChange={handleChange} placeholder="Alternate number" />
              <Field label="Email Address"     name="email"            value={form.email}            onChange={handleChange} type="email" placeholder="email@example.com" />
              <Field label="Website"           name="website"          value={form.website}          onChange={handleChange} type="url" placeholder="https://example.com" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <SectionHead title="Address" accent="linear-gradient(180deg,#d97706,#fbbf24)" />
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Registered Address</label>
              <textarea name="clientAddress" value={form.clientAddress} onChange={handleChange}
                placeholder="Enter full registered address" rows={2} className={inputCls + " resize-none"} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Country</label>
              <select name="clientCountry" value={form.clientCountry} onChange={handleCountryChange} className={inputCls}>
                {countryOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {rule.states && rule.states.length > 0 ? (
              <div className={`grid grid-cols-1 gap-4 ${form.clientCountry === "India" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">State / Province</label>
                  <select name="clientState" value={form.clientState} onChange={handleStateChange} className={inputCls}>
                    <option value="">Select state</option>
                    {rule.states.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">State Code</label>
                  <input type="text" readOnly value={form.stateCode} placeholder="Auto-filled" className={readonlyCls} />
                </div>
                {form.clientCountry === "India" && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">GST State Code</label>
                    <input type="text" readOnly value={form.gstStateCode} placeholder="Auto-filled" className={readonlyCls} />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="State / Province" name="clientState" value={form.clientState} onChange={handleChange} placeholder="State / Province" />
                <Field label="State Code"       name="stateCode"   value={form.stateCode}   onChange={handleChange} placeholder="State Code" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="City" name="clientCity" value={form.clientCity} onChange={handleChange} placeholder="City" />
              <Field
                label={rule.postalCodeLabel || "Postal Code"}
                name="pinCode" value={form.pinCode} onChange={handleChange}
                placeholder={rule.postalCodeMessage || "Postal Code"}
                required hint={rule.postalCodeMessage}
              />
            </div>
          </div>

          {/* Tax Information */}
          {rule.taxFields && rule.taxFields.length > 0 && (
            <div className="space-y-4">
              <SectionHead title="Tax Information" sub={rule.name} accent="linear-gradient(180deg,#7c3aed,#a78bfa)" />
              <div className="space-y-4">
                {rule.taxFields.map((tf) => {
                  if (tf === "PAN") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">PAN Number <span className="text-red-500">*</span></label>
                      <input type="text" name="panNumber" value={form.panNumber} onChange={handleChange} placeholder="ABCDE1234F" maxLength={10} className={upperCls} />
                      <p className="text-[10px] text-slate-400 font-mono">Format: ABCDE1234F</p>
                    </div>
                  );
                  if (tf === "GST") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">GSTIN <span className="text-red-500">*</span></label>
                      <input type="text" name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="22AAAAA0000A1Z5" maxLength={15} className={upperCls} />
                      <p className="text-[10px] text-slate-400 font-mono">15-digit GST Identification Number</p>
                    </div>
                  );
                  if (tf === "EIN") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">EIN</label>
                      <input type="text" name="einNumber" value={form.einNumber} onChange={handleChange} placeholder="12-3456789" className={inputCls} />
                    </div>
                  );
                  if (tf === "SSN") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">SSN</label>
                      <input type="text" name="ssnNumber" value={form.ssnNumber} onChange={handleChange} placeholder="123-45-6789" className={inputCls} />
                    </div>
                  );
                  if (tf === "VAT") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">VAT Number</label>
                      <input type="text" name="vatNumber" value={form.vatNumber} onChange={handleChange} placeholder="Enter VAT number" className={upperCls} />
                    </div>
                  );
                  if (tf === "CompanyNumber") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Company Number</label>
                      <input type="text" name="companyNumber" value={form.companyNumber} onChange={handleChange} placeholder="Enter company number" className={inputCls} />
                    </div>
                  );
                  if (tf === "NationalID" || tf === "TRN") return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {tf === "TRN" ? "Tax Registration Number (TRN)" : "National ID / Iqama"}
                      </label>
                      <input type="text" name="nationalIdNumber" value={form.nationalIdNumber} onChange={handleChange} placeholder="Enter ID number" className={inputCls} />
                    </div>
                  );
                  return (
                    <div key={tf} className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{tf}</label>
                      <input type="text" name="taxIdentificationNumber" value={form.taxIdentificationNumber} onChange={handleChange} placeholder={`Enter ${tf}`} className={upperCls} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TDS (India only) */}
          {form.clientCountry === "India" && (
            <div className="space-y-4">
              <SectionHead title="TDS Configuration" accent="linear-gradient(180deg,#92400e,#d97706)" />
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <div className="relative">
                  <input type="checkbox" name="tdsApplicable" checked={form.tdsApplicable} onChange={handleChange}
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white checked:border-blue-600 checked:bg-blue-600 transition-all" />
                  <svg className="absolute top-0.5 left-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-slate-700">TDS Applicable</span>
              </label>
              {form.tdsApplicable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">TDS Section</label>
                    <input type="text" name="tdsSection" value={form.tdsSection} onChange={handleChange} placeholder="194J / 194C" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">TDS Rate (%)</label>
                    <input type="number" name="tdsRate" value={form.tdsRate} onChange={handleChange} min={0} max={100} className={inputCls} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Terms */}
          <div className="space-y-4">
            <SectionHead title="Financial Terms" accent="linear-gradient(180deg,#059669,#34d399)" />
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Terms</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className={inputCls}>
                {paymentTermsOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Remarks</label>
              <textarea name="remarks" value={form.remarks} onChange={handleChange}
                placeholder="Any additional notes…" rows={2} className={inputCls + " resize-none"} />
            </div>
          </div>

          {/* HSN & PO */}
          <div className="space-y-4">
            <SectionHead title="HSN & Purchase Orders" accent="linear-gradient(180deg,#1e3a8a,#60a5fa)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* HSN */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Add HSN Code</label>
                <div className="flex items-center gap-2">
                  <select name="selectedHsn" value={form.selectedHsn} onChange={handleChange} className={inputCls + " flex-1"}>
                    <option value="">Select HSN code</option>
                    {hsmList.map((item) => (
                      <option key={item._id} value={item.hsnCode}>{item.serviceType} — {item.hsnCode}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => {
                    if (!form.selectedHsn) return;
                    if (form.hsnCodes.includes(form.selectedHsn)) { toast.error("HSN already added"); return; }
                    setForm((p) => ({ ...p, hsnCodes: [...p.hsnCodes, p.selectedHsn], selectedHsn: "" }));
                  }} className="px-3 py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 shrink-0"
                  style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>Add</button>
                </div>
                <div className="space-y-1.5">
                  {form.hsnCodes.map((code, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="text-xs font-mono font-semibold text-slate-700">HSN: {code}</span>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, hsnCodes: p.hsnCodes.filter((c) => c !== code) }))}
                        className="text-red-400 hover:text-red-600 font-bold transition-colors text-base leading-none">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* PO */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Add Purchase Order</label>
                <div className="flex items-center gap-2">
                  <input type="text" name="poInput" value={form.poInput} onChange={handleChange}
                    placeholder="Enter PO number" className={inputCls + " flex-1"} />
                  <button type="button" onClick={() => {
                    const po = form.poInput.trim();
                    if (!po) return;
                    if (form.poList.includes(po)) { toast.error("PO already added"); return; }
                    setForm((p) => ({ ...p, poList: [...p.poList, po], poInput: "" }));
                  }} className="px-3 py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 shrink-0"
                  style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}>Add</button>
                </div>
                <div className="space-y-1.5">
                  {form.poList.map((po, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="text-xs font-mono font-semibold text-blue-700">PO: {po}</span>
                      <button type="button" onClick={() => setForm((p) => ({ ...p, poList: p.poList.filter((x) => x !== po) }))}
                        className="text-red-400 hover:text-red-600 font-bold transition-colors text-base leading-none">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="py-2">
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div className="relative">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white checked:border-blue-600 checked:bg-blue-600 transition-all" />
                <svg className="absolute top-0.5 left-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700">Active Client</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Inactive clients won't appear in transaction lists</p>
              </div>
            </label>
          </div>
        </form>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 bg-white rounded-b-2xl flex items-center justify-end gap-2">
        <button type="button" onClick={handleClose} disabled={loading}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 text-xs font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}>
          {loading ? (
            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{editClient ? "Updating…" : "Adding…"}</>
          ) : (editClient ? "Update Client" : "Add Client")}
        </button>
      </div>
    </div>
  );
}

// ─── Reusable field helper ────────────────────────────────────────────────────
function Field({ label, name, value, onChange, placeholder, type = "text", required, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 font-medium hover:border-slate-300" />
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHead({ title, sub, accent }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
      <div className="w-1 h-5 rounded-full shrink-0" style={{ background: accent }} />
      <div>
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}