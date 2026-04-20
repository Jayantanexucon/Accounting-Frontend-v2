import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Save,
  UploadCloud,
  X,
  AlertCircle,
  Building2,
  User,
  FileText,
  Banknote,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import { createVendor, getVendors, updateVendor } from "../apis/vendorApi";
import {
  createCountryApi,
  createStateApi,
  getCountriesApi,
  getStatesApi,
} from "../apis/masterDataApi";
import AddressListEditor from "./AddressListEditor";
import CountryTaxFields from "./CountryTaxFields";
import { ensureAddressArray, getTaxTypesForCountry } from "../utils/masterLocationUtils";

const emptyForm = {
  vendorName: "",
  contactPerson: "",
  phoneNumber: "",
  email: "",
  website: "",
  paymentTerms: "",
  creditLimit: "",
  goodsType: "",
  serviceType: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  agreementStartDate: "",
  agreementEndDate: "",
  parentVendorId: "",
  isSubVendor: false,
  status: "Pending",
  remarks: "",
  tdsApplicable: false,
  tdsRate: 0,
  tdsSection: "",
  addresses: ensureAddressArray(),
  taxDetails: [],
};

const deriveLegacyTaxDetails = (vendor = {}) => {
  const detailMap = [
    ["GST", vendor.gstin],
    ["PAN", vendor.pan],
    ["VAT", vendor.vatNumber],
    ["EIN", vendor.einNumber],
    ["SSN", vendor.ssnNumber],
    ["CompanyNumber", vendor.companyNumber],
    ["NationalID", vendor.nationalIdNumber],
  ];

  return detailMap
    .filter(([, value]) => String(value || "").trim())
    .map(([taxType, taxNumber]) => ({
      taxType,
      label: taxType,
      taxNumber: String(taxNumber).trim(),
    }));
};

function Label({ children, required }) {
  return (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function Section({ icon: Icon, title, subtitle, accent = "#6366f1", children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="p-2 rounded-xl shadow-sm" style={{ background: `${accent}18` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-800">{title}</h4>
          {subtitle && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>
    </div>
  );
}

export default function VendorForm({ companyId, editData = null, onClose, onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [parentVendors, setParentVendors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);

  const inputCls =
    "w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

  const primaryAddress = form.addresses[0] || {};
  const activeTaxTypes = useMemo(
    () => getTaxTypesForCountry(countries, primaryAddress.country),
    [countries, primaryAddress.country]
  );

  useEffect(() => {
    Promise.all([getCountriesApi(), getStatesApi()])
      .then(([countryRes, stateRes]) => {
        setCountries(countryRes?.data || []);
        setStates(stateRes?.data || []);
      })
      .catch(() => toast.error("Failed to load location master data"));
  }, []);

  useEffect(() => {
    fetchParentVendors();
    if (editData?.complianceDocs) {
      setFiles(editData.complianceDocs.map((name) => ({ name, existing: true })));
    }
  }, [editData, companyId]);

  useEffect(() => {
    if (editData) {
      setForm({
        ...emptyForm,
        ...editData,
        addresses: ensureAddressArray(editData.addresses, editData),
        taxDetails:
          editData.taxDetails?.length > 0
            ? editData.taxDetails
            : deriveLegacyTaxDetails(editData),
        agreementStartDate: editData.agreementStartDate ? editData.agreementStartDate.split("T")[0] : "",
        agreementEndDate: editData.agreementEndDate ? editData.agreementEndDate.split("T")[0] : "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editData]);

  const fetchParentVendors = async () => {
    try {
      setLoadingParents(true);
      // Fetch all vendors (global master data) - no companyId filter
      const res = await getVendors();
      const vendors =
        res?.data?.data?.vendors ||
        res?.data?.data ||
        [];
      setParentVendors(vendors.filter((vendor) => vendor.isActive && (!editData || vendor._id !== editData._id)));
    } catch {
      setParentVendors([]);
    } finally {
      setLoadingParents(false);
    }
  };

  const handleBasicChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFilesChange = (event) => {
    const newFiles = Array.from(event.target.files).map((file) => ({
      file,
      name: file.name,
      existing: false,
    }));
    setFiles((prev) => [...prev.filter((item) => item.existing), ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
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
      if (!form.vendorName.trim()) {
        throw new Error("Vendor name is required");
      }
      if (!primaryAddress.line1?.trim() || !primaryAddress.country?.trim()) {
        throw new Error("Default address and country are required");
      }

      const formData = new FormData();
      const payload = {
        ...form,
        addresses: JSON.stringify(form.addresses),
        taxDetails: JSON.stringify(
          activeTaxTypes.length
            ? form.taxDetails.filter((item) => activeTaxTypes.includes(item.taxType))
            : form.taxDetails
        ),
        parentVendorId: form.isSubVendor ? form.parentVendorId || "" : "",
      };

      Object.entries(payload).forEach(([key, value]) => {
        if (key === "addresses" || key === "taxDetails") {
          formData.append(key, value);
          return;
        }
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, value);
        }
      });

      files.forEach((item) => {
        if (!item.existing && item.file) {
          formData.append("complianceDocs", item.file);
        }
      });

      const response = editData?._id
        ? await updateVendor(editData._id, formData)
        : await createVendor(companyId, formData);

      toast.success(editData?._id ? "Vendor updated successfully" : "Vendor created successfully");
      onSuccess?.(response?.data?.data || response?.data);
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl">
      <div className="bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl shadow-md" style={{ background: "linear-gradient(135deg,#0f172a,#1e40af)" }}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {editData ? "Edit Vendor" : "Add New Vendor"}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Vendor master data with multiple addresses and country-wise tax setup
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {editData && (
          <Section icon={AlertCircle} title="Vendor Status" accent="#f59e0b">
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Current Status</Label>
                <select name="status" value={form.status} onChange={handleBasicChange} className={inputCls}>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </Section>
        )}

        <Section icon={User} title="Basic Information" subtitle="Name, contact person, phone and email" accent="#6366f1">
          <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label required>Vendor Name</Label>
              <input name="vendorName" value={form.vendorName} onChange={handleBasicChange} placeholder="Enter vendor name" className={inputCls} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <input name="contactPerson" value={form.contactPerson} onChange={handleBasicChange} placeholder="Full name" className={inputCls} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <input name="phoneNumber" value={form.phoneNumber} onChange={handleBasicChange} placeholder="9876543210" className={inputCls} />
            </div>
            <div>
              <Label>Email Address</Label>
              <input name="email" value={form.email} onChange={handleBasicChange} placeholder="vendor@example.com" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <Label>Website</Label>
              <input name="website" value={form.website} onChange={handleBasicChange} placeholder="https://vendor.example.com" className={inputCls} />
            </div>
          </div>
        </Section>

        <Section icon={FileText} title="Address Details" subtitle="Default, ship-to and additional addresses" accent="#059669">
          <div className="pt-3">
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
              sectionTitle="Vendor Addresses"
            />
          </div>
        </Section>

        <Section icon={FileText} title="Tax Information" subtitle={primaryAddress.country || "Select country from default address"} accent="#7c3aed">
          <div className="pt-3">
            <CountryTaxFields
              countryName={primaryAddress.country}
              taxTypes={activeTaxTypes}
              taxDetails={form.taxDetails}
              onChange={(taxDetails) => setForm((prev) => ({ ...prev, taxDetails }))}
              inputCls={inputCls}
              labelCls={labelCls}
            />
            {primaryAddress.country === "India" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>TDS Section</Label>
                  <input name="tdsSection" value={form.tdsSection} onChange={handleBasicChange} placeholder="194J / 194C" className={inputCls} />
                </div>
                <div>
                  <Label>TDS Rate (%)</Label>
                  <input name="tdsRate" type="number" value={form.tdsRate} onChange={handleBasicChange} placeholder="10" className={inputCls} />
                </div>
                <label className="flex items-center gap-2 md:col-span-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" name="tdsApplicable" checked={form.tdsApplicable} onChange={handleBasicChange} />
                  TDS Applicable
                </label>
              </div>
            )}
          </div>
        </Section>

        <Section icon={FileText} title="Commercial Details" subtitle="Terms, goods and services" accent="#0f766e">
          <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <input name="paymentTerms" value={form.paymentTerms} onChange={handleBasicChange} placeholder="Net 30 / Advance" className={inputCls} />
            </div>
            <div>
              <Label>Goods Type</Label>
              <input name="goodsType" value={form.goodsType} onChange={handleBasicChange} placeholder="Type of goods supplied" className={inputCls} />
            </div>
            <div>
              <Label>Service Type</Label>
              <input name="serviceType" value={form.serviceType} onChange={handleBasicChange} placeholder="Consulting / IT services" className={inputCls} />
            </div>
            <div>
              <Label>Credit Limit</Label>
              <input name="creditLimit" type="number" value={form.creditLimit} onChange={handleBasicChange} placeholder="0" className={inputCls} />
            </div>
            <div>
              <Label>Agreement Start</Label>
              <input name="agreementStartDate" type="date" value={form.agreementStartDate} onChange={handleBasicChange} className={inputCls} />
            </div>
            <div>
              <Label>Agreement End</Label>
              <input name="agreementEndDate" type="date" value={form.agreementEndDate} onChange={handleBasicChange} className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <Label>Remarks</Label>
              <textarea name="remarks" value={form.remarks} onChange={handleBasicChange} rows="3" className={`${inputCls} resize-none`} placeholder="Additional vendor notes" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <label className="flex items-start gap-3 cursor-pointer group w-fit">
              <input
                type="checkbox"
                name="isSubVendor"
                checked={form.isSubVendor}
                onChange={handleBasicChange}
                className="mt-0.5"
              />
              <div>
                <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">This is a sub-vendor</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Link this vendor to a parent vendor</p>
              </div>
            </label>

            {form.isSubVendor && (
              <div className="mt-4 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                <Label required>Parent Vendor</Label>
                {loadingParents ? (
                  <div className="text-xs text-indigo-600 font-medium">Loading parent vendors...</div>
                ) : (
                  <select name="parentVendorId" value={form.parentVendorId} onChange={handleBasicChange} className={inputCls}>
                    <option value="">Select parent vendor</option>
                    {parentVendors.map((vendor) => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.vendorName} ({vendor.vendorCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </Section>

        <Section icon={Banknote} title="Bank Details" subtitle="Optional banking information" accent="#0891b2">
          <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Bank Name</Label>
              <input name="bankName" value={form.bankName} onChange={handleBasicChange} placeholder="e.g. HDFC Bank" className={inputCls} />
            </div>
            <div>
              <Label>Account Number</Label>
              <input name="accountNumber" value={form.accountNumber} onChange={handleBasicChange} placeholder="Account number" className={inputCls} />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <input name="ifscCode" value={form.ifscCode} onChange={handleBasicChange} placeholder="HDFC0001234" className={inputCls} />
            </div>
            <div>
              <Label>Branch Name</Label>
              <input name="branchName" value={form.branchName} onChange={handleBasicChange} placeholder="Branch name" className={inputCls} />
            </div>
          </div>
        </Section>

        <Section icon={Layers} title="Compliance Documents" subtitle="PDF, JPG or PNG" accent="#0d9488">
          <div className="pt-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer w-fit group">
              <div className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 group-hover:border-indigo-400 group-hover:bg-indigo-50/50 rounded-xl transition-all">
                <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">Upload Files</span>
              </div>
              <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFilesChange} className="hidden" />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{file.existing ? "Already uploaded" : "New upload"}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile(index)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <p className="text-[10px] text-slate-400 font-medium">
            Default address drives country-specific tax fields and legacy vendor data.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onClose && onClose()} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#0f172a,#1e40af)", boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}
            >
              {loading ? (
                "Saving..."
              ) : editData ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Update Vendor
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Create Vendor
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
