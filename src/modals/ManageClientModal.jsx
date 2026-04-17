import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { addClientApi, updateClientApi } from "../apis/clientApi";
import { getallhsn } from "../apis/hsnapi";
import {
  createCountryApi,
  createStateApi,
  getCountriesApi,
  getStatesApi,
} from "../apis/masterDataApi";
import AddressListEditor from "../components/AddressListEditor";
import CountryTaxFields from "../components/CountryTaxFields";
import {
  ensureAddressArray,
  getTaxTypesForCountry,
} from "../utils/masterLocationUtils";

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

const emptyForm = {
  clientName: "",
  contactPerson: "",
  contactNumber: "",
  altContactNumber: "",
  email: "",
  website: "",
  paymentTerms: "",
  remarks: "",
  hsnCodes: [],
  selectedHsn: "",
  poList: [],
  poInput: "",
  tdsApplicable: false,
  tdsRate: 0,
  tdsSection: "",
  isActive: true,
  addresses: ensureAddressArray(),
  taxDetails: [],
};

const deriveLegacyTaxDetails = (entity = {}) => {
  const detailMap = [
    ["GST", entity.gstNumber],
    ["PAN", entity.panNumber],
    ["VAT", entity.vatNumber],
    ["EIN", entity.einNumber],
    ["SSN", entity.ssnNumber],
    ["CompanyNumber", entity.companyNumber],
    ["NationalID", entity.nationalIdNumber],
  ];

  return detailMap
    .filter(([, value]) => String(value || "").trim())
    .map(([taxType, taxNumber]) => ({
      taxType,
      label: taxType,
      taxNumber: String(taxNumber).trim(),
    }));
};

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
  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "null");
  const companyId = user?.company?._id || selectedCompany?._id;

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [hsnList, setHsnList] = useState([]);

  const inputCls =
    "w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 font-medium hover:border-slate-300";
  const labelCls = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5";

  const primaryAddress = form.addresses[0] || {};
  const activeTaxTypes = useMemo(
    () => getTaxTypesForCountry(countries, primaryAddress.country),
    [countries, primaryAddress.country]
  );

  useEffect(() => {
    if (!open || !companyId) return;

    Promise.all([getCountriesApi(), getStatesApi(), getallhsn(companyId)])
      .then(([countryRes, stateRes, hsnRes]) => {
        setCountries(countryRes?.data || []);
        setStates(stateRes?.data || []);
        setHsnList(hsnRes?.data || []);
      })
      .catch(() => toast.error("Failed to load master data"));
  }, [open, companyId]);

  useEffect(() => {
    if (!open) return;

    if (editClient) {
      setForm({
        ...emptyForm,
        ...editClient,
        addresses: ensureAddressArray(editClient.addresses, editClient),
        taxDetails:
          editClient.taxDetails?.length > 0
            ? editClient.taxDetails
            : deriveLegacyTaxDetails(editClient),
        selectedHsn: "",
        poInput: "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editClient]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCreateCountry = async (payload) => {
    const response = await createCountryApi({
      ...payload,
      currency: {
        currencyName: payload.currencyName,
        currencyCode: payload.currencyCode,
        currencySymbol: payload.currencySymbol,
      },
    });
    const createdCountry = response?.data;
    if (!createdCountry) throw new Error("Country was not created");
    const refreshed = await getCountriesApi();
    setCountries(refreshed?.data || []);
    toast.success(`Country added: ${createdCountry.countryName}`);
    return createdCountry;
  };

  const handleCreateState = async (payload) => {
    const response = await createStateApi(payload);
    const createdState = response?.data;
    if (!createdState) throw new Error("State was not created");
    const refreshed = await getStatesApi();
    setStates(refreshed?.data || []);
    toast.success(`State added: ${createdState.stateName}`);
    return createdState;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (!form.clientName.trim()) {
        throw new Error("Client name is required");
      }

      if (!primaryAddress.line1?.trim() || !primaryAddress.country?.trim()) {
        throw new Error("Default address and country are required");
      }

      const payload = {
        ...form,
        companyId,
        addresses: form.addresses,
        taxDetails: activeTaxTypes.length
          ? form.taxDetails.filter((item) => activeTaxTypes.includes(item.taxType))
          : form.taxDetails,
        selectedHsn: undefined,
        poInput: undefined,
      };

      if (editClient?._id) {
        await updateClientApi(editClient._id, payload);
        toast.success(`Updated: ${form.clientName}`);
        refreshClients();
      } else {
        const result = await addClientApi(payload);
        updateClient(result?.data);
        toast.success(`Added: ${form.clientName}`);
      }

      onClose();
      setForm(emptyForm);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Error saving client");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  return (
    <div className="w-full bg-slate-50 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="shrink-0 rounded-t-2xl overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#60a5fa 100%)" }}
        >
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight">
              {editClient ? "Edit Client" : title}
            </h2>
            <p className="text-blue-200 text-[11px] mt-0.5">
              {editClient ? `Updating: ${editClient.clientName}` : subtitle || "Client master data"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form className="p-6 space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-1.5">
            <label className={labelCls}>
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              placeholder="Enter client or company name"
              className={inputCls}
            />
          </div>

          <div className="space-y-4">
            <SectionHead title="Contact Information" accent="linear-gradient(180deg,#2563eb,#60a5fa)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="Full name" className={inputCls} labelCls={labelCls} />
              <Field label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="+91 XXXXX XXXXX" className={inputCls} labelCls={labelCls} />
              <Field label="Alternate Contact" name="altContactNumber" value={form.altContactNumber} onChange={handleChange} placeholder="Alternate number" className={inputCls} labelCls={labelCls} />
              <Field label="Email Address" name="email" value={form.email} onChange={handleChange} placeholder="email@example.com" type="email" className={inputCls} labelCls={labelCls} />
              <Field label="Website" name="website" value={form.website} onChange={handleChange} placeholder="https://example.com" className={inputCls} labelCls={labelCls} />
            </div>
          </div>

          <div className="space-y-4">
            <SectionHead title="Address Information" accent="linear-gradient(180deg,#d97706,#fbbf24)" />
            <AddressListEditor
              addresses={form.addresses}
              onChange={(addresses) => setForm((prev) => ({ ...prev, addresses }))}
              countries={countries.map((country) => ({
                value: country._id,
                label: country.countryName,
                countryName: country.countryName,
                taxTypes: country.taxTypes || [],
                countryType: country.countryType,
              }))}
              states={states}
              onCreateCountry={handleCreateCountry}
              onCreateState={handleCreateState}
              inputCls={inputCls}
              labelCls={labelCls}
              sectionTitle="Client Addresses"
            />
          </div>

          <div className="space-y-4">
            <SectionHead
              title="Tax Information"
              sub={primaryAddress.country || "Select a country in the default address"}
              accent="linear-gradient(180deg,#7c3aed,#a78bfa)"
            />
            <CountryTaxFields
              countryName={primaryAddress.country}
              taxTypes={activeTaxTypes}
              taxDetails={form.taxDetails}
              onChange={(taxDetails) => setForm((prev) => ({ ...prev, taxDetails }))}
              inputCls={inputCls}
              labelCls={labelCls}
            />
          </div>

          {primaryAddress.country === "India" && (
            <div className="space-y-4">
              <SectionHead title="TDS Configuration" accent="linear-gradient(180deg,#92400e,#d97706)" />
              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <input
                  type="checkbox"
                  name="tdsApplicable"
                  checked={form.tdsApplicable}
                  onChange={handleChange}
                />
                <span className="text-xs font-bold text-slate-700">TDS Applicable</span>
              </label>
              {form.tdsApplicable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="TDS Section" name="tdsSection" value={form.tdsSection} onChange={handleChange} placeholder="194J / 194C" className={inputCls} labelCls={labelCls} />
                  <Field label="TDS Rate (%)" name="tdsRate" value={form.tdsRate} onChange={handleChange} type="number" placeholder="10" className={inputCls} labelCls={labelCls} />
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <SectionHead title="Financial Terms" accent="linear-gradient(180deg,#059669,#34d399)" />
            <div className="space-y-1.5">
              <label className={labelCls}>Payment Terms</label>
              <select name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className={inputCls}>
                {paymentTermsOptions.map((term) => (
                  <option key={term.value} value={term.value}>
                    {term.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Remarks</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="Any additional notes..."
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <div className="space-y-4">
            <SectionHead title="HSN & Purchase Orders" accent="linear-gradient(180deg,#1e3a8a,#60a5fa)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TagListSection
                title="Add HSN Code"
                selectValue={form.selectedHsn}
                options={hsnList.map((item) => ({
                  value: item.hsnCode,
                  label: `${item.serviceType} — ${item.hsnCode}`,
                }))}
                onSelectChange={(value) => setForm((prev) => ({ ...prev, selectedHsn: value }))}
                onAdd={() => {
                  if (!form.selectedHsn) return;
                  if (form.hsnCodes.includes(form.selectedHsn)) {
                    toast.error("HSN already added");
                    return;
                  }
                  setForm((prev) => ({
                    ...prev,
                    hsnCodes: [...prev.hsnCodes, prev.selectedHsn],
                    selectedHsn: "",
                  }));
                }}
                tags={form.hsnCodes}
                onRemove={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    hsnCodes: prev.hsnCodes.filter((item) => item !== value),
                  }))
                }
                inputCls={inputCls}
                labelCls={labelCls}
              />

              <TagInputSection
                title="Add Purchase Order"
                value={form.poInput}
                onChange={(value) => setForm((prev) => ({ ...prev, poInput: value }))}
                onAdd={() => {
                  const po = form.poInput.trim();
                  if (!po) return;
                  if (form.poList.includes(po)) {
                    toast.error("PO already added");
                    return;
                  }
                  setForm((prev) => ({
                    ...prev,
                    poList: [...prev.poList, po],
                    poInput: "",
                  }));
                }}
                tags={form.poList}
                onRemove={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    poList: prev.poList.filter((item) => item !== value),
                  }))
                }
                inputCls={inputCls}
                labelCls={labelCls}
              />
            </div>
          </div>

          <div className="py-2">
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
              <div>
                <span className="text-xs font-bold text-slate-700">Active Client</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Inactive clients won't appear in transaction lists
                </p>
              </div>
            </label>
          </div>
        </form>
      </div>

      <div className="shrink-0 px-6 py-3.5 border-t border-slate-200 bg-white rounded-b-2xl flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-all"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2.5 text-xs font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90 flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
        >
          {loading ? (editClient ? "Updating..." : "Adding...") : editClient ? "Update Client" : "Add Client"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, type = "text", className, labelCls }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className={className} />
    </div>
  );
}

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

function TagListSection({ title, selectValue, options, onSelectChange, onAdd, tags, onRemove, inputCls, labelCls }) {
  return (
    <div className="space-y-3">
      <label className={labelCls}>{title}</label>
      <div className="flex items-center gap-2">
        <select value={selectValue} onChange={(e) => onSelectChange(e.target.value)} className={`${inputCls} flex-1`}>
          <option value="">Select option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 shrink-0"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}
        >
          Add
        </button>
      </div>
      <div className="space-y-1.5">
        {tags.map((tag) => (
          <TagChip key={tag} label={tag} onRemove={() => onRemove(tag)} />
        ))}
      </div>
    </div>
  );
}

function TagInputSection({ title, value, onChange, onAdd, tags, onRemove, inputCls, labelCls }) {
  return (
    <div className="space-y-3">
      <label className={labelCls}>{title}</label>
      <div className="flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter value" className={`${inputCls} flex-1`} />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2.5 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 shrink-0"
          style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)" }}
        >
          Add
        </button>
      </div>
      <div className="space-y-1.5">
        {tags.map((tag) => (
          <TagChip key={tag} label={tag} onRemove={() => onRemove(tag)} />
        ))}
      </div>
    </div>
  );
}

function TagChip({ label, onRemove }) {
  return (
    <div className="flex justify-between items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
      <span className="text-xs font-mono font-semibold text-slate-700">{label}</span>
      <button type="button" onClick={onRemove} className="text-red-400 hover:text-red-600 font-bold transition-colors text-base leading-none">
        ×
      </button>
    </div>
  );
}
