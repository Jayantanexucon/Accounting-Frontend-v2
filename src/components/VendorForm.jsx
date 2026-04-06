import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Plus, Save, UploadCloud, ChevronDown, ChevronUp,
  X, AlertCircle, Building2, MapPin, FileText,
  Banknote, Calendar, User, Phone, Mail, Hash,
  CreditCard, Layers,
} from "lucide-react";
import { createVendor, updateVendor, getVendors } from "../apis/vendorApi";

// ─── Validation ───────────────────────────────────────────────────────────────
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
const panRegex   = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;

const VendorSchema = Yup.object().shape({
  vendorName:         Yup.string().required("Vendor name is required"),
  email:              Yup.string().email("Invalid email").nullable(),
  phoneNumber:        Yup.string().matches(/^\d{7,15}$/, "Enter valid phone number").nullable(),
  gstin:              Yup.string().matches(gstinRegex, "Invalid GSTIN").nullable().notRequired(),
  pan:                Yup.string().matches(panRegex, "Invalid PAN").nullable().notRequired(),
  pinCode:            Yup.string().matches(/^\d{4,6}$/, "Invalid PIN/ZIP").nullable(),
  creditLimit:        Yup.number().min(0, "Must be >= 0").nullable(),
  agreementStartDate: Yup.date().nullable(),
  agreementEndDate:   Yup.date().nullable(),
});

// ─── Reusable field components ────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ name }) {
  return (
    <ErrorMessage name={name}>
      {(msg) => (
        <p className="mt-1 text-[10px] font-bold text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{msg}
        </p>
      )}
    </ErrorMessage>
  );
}

const inputCls =
  "w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl " +
  "placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all";

const selectCls =
  "w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, accent = "#6366f1", children, collapsible, open, onToggle }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div
        className={`flex items-center justify-between px-5 py-4 ${collapsible ? "cursor-pointer hover:bg-slate-50/60 transition-colors" : ""}`}
        onClick={collapsible ? onToggle : undefined}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl shadow-sm" style={{ background: `${accent}18` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800">{title}</h4>
            {subtitle && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {collapsible && (
          open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {(!collapsible || open) && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorForm({ companyId, editData = null, onClose, onSuccess }) {
  const [parentVendors, setParentVendors]   = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [files, setFiles]                   = useState([]);
  const [bankOpen, setBankOpen]             = useState(false);
  const [commercialOpen, setCommercialOpen] = useState(true);
  const [subVendorChecked, setSubVendorChecked] = useState(Boolean(editData?.isSubVendor));

  useEffect(() => {
    fetchParentVendors();
    if (editData?.complianceDocs) {
      setFiles(editData.complianceDocs.map((f) => ({ name: f, existing: true })));
    }
  }, [editData, companyId]);

  async function fetchParentVendors() {
    try {
      setLoadingParents(true);
      const res     = await getVendors(companyId);
      const vendors = Array.isArray(res.data?.data) ? res.data.data : [];
      setParentVendors(vendors.filter((v) => v.isActive && (!editData || v._id !== editData._id)));
    } catch {
      setParentVendors([]);
    } finally {
      setLoadingParents(false);
    }
  }

  function handleFilesChange(e) {
    const newFiles = Array.from(e.target.files).map((f) => ({ file: f, name: f.name, existing: false }));
    setFiles((prev) => [...prev.filter((p) => p.existing), ...newFiles]);
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitForm(values, { setSubmitting, setErrors }) {
    try {
      const formData  = new FormData();
      const normalize = (v) => (v === "" || v === undefined ? null : v);

      const payload = {
        vendorName:         values.vendorName,
        contactPerson:      values.contactPerson      || "",
        registeredAddress:  values.registeredAddress  || "",
        country:            values.country            || "",
        state:              values.state              || "",
        city:               values.city               || "",
        pinCode:            values.pinCode            || "",
        phoneNumber:        values.phoneNumber        || "",
        email:              values.email              || "",
        gstin:              values.gstin              || "",
        pan:                values.pan                || "",
        serviceType:        values.serviceType        || "",
        goodsType:          values.goodsType          || "",
        paymentTerms:       values.paymentTerms       || "",
        creditLimit:        normalize(values.creditLimit),
        bankName:           values.bankName           || "",
        accountNumber:      values.accountNumber      || "",
        ifscCode:           values.ifscCode           || "",
        branchName:         values.branchName         || "",
        agreementStartDate: normalize(values.agreementStartDate),
        agreementEndDate:   normalize(values.agreementEndDate),
        parentVendorId:     subVendorChecked ? normalize(values.parentVendorId) : null,
        isSubVendor:        subVendorChecked,
        status:             values.status || "Pending",
      };

      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null) formData.append(key, value);
      });

      files.forEach((fileObj) => {
        if (!fileObj.existing && fileObj.file) formData.append("complianceDocs", fileObj.file);
      });

      const res = editData?._id
        ? await updateVendor(editData._id, formData)
        : await createVendor(companyId, formData);

      if (res?.data?.success === false) return setErrors({ submit: res.data.message });

      if (onSuccess) onSuccess(res.data?.data || res.data);
      if (onClose) onClose();
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || "Failed to save vendor" });
    } finally {
      setSubmitting(false);
    }
  }

  const initialValues = {
    vendorName:         editData?.vendorName         || "",
    contactPerson:      editData?.contactPerson      || "",
    registeredAddress:  editData?.registeredAddress  || "",
    country:            editData?.country            || "India",
    state:              editData?.state              || "",
    city:               editData?.city               || "",
    pinCode:            editData?.pinCode            || "",
    phoneNumber:        editData?.phoneNumber        || "",
    email:              editData?.email              || "",
    gstin:              editData?.gstin              || "",
    pan:                editData?.pan                || "",
    serviceType:        editData?.serviceType        || "",
    goodsType:          editData?.goodsType          || "",
    paymentTerms:       editData?.paymentTerms       || "",
    creditLimit:        editData?.creditLimit        || "",
    bankName:           editData?.bankName           || "",
    accountNumber:      editData?.accountNumber      || "",
    ifscCode:           editData?.ifscCode           || "",
    branchName:         editData?.branchName         || "",
    agreementStartDate: editData?.agreementStartDate ? editData.agreementStartDate.split("T")[0] : "",
    agreementEndDate:   editData?.agreementEndDate   ? editData.agreementEndDate.split("T")[0]   : "",
    parentVendorId:     editData?.parentVendorId     || "",
    status:             editData?.status             || "Pending",
  };

  return (
    <div className="bg-slate-50 rounded-2xl">

      {/* ── Modal Header ── */}
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
              {editData ? "Update vendor details below" : "Fill in the vendor information below"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Formik enableReinitialize initialValues={initialValues} validationSchema={VendorSchema} onSubmit={submitForm}>
        {({ isSubmitting, values, setFieldValue, errors }) => (
          <Form className="p-6 space-y-4">

            {/* ── Status (edit only) ── */}
            {editData && (
              <Section icon={AlertCircle} title="Vendor Status" accent="#f59e0b">
                <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Current Status</Label>
                    <select
                      value={values.status}
                      onChange={(e) => setFieldValue("status", e.target.value)}
                      className={selectCls}>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-2">
                    <p className="text-[11px] text-slate-400 font-medium">
                      Status changes are tracked in the audit trail
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* ── Basic Information ── */}
            <Section icon={User} title="Basic Information" subtitle="Name, contact person, phone & email" accent="#6366f1">
              <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label required>Vendor Name</Label>
                  <Field name="vendorName" placeholder="Enter vendor name" className={inputCls} />
                  <FieldError name="vendorName" />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Field name="contactPerson" placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Field name="phoneNumber" placeholder="e.g. 9876543210" className={inputCls} />
                  <FieldError name="phoneNumber" />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Field name="email" type="email" placeholder="vendor@example.com" className={inputCls} />
                  <FieldError name="email" />
                </div>
              </div>
            </Section>

            {/* ── Address ── */}
            <Section icon={MapPin} title="Address Details" subtitle="Registered address, city, state & country" accent="#059669">
              <div className="pt-3 space-y-4">
                <div>
                  <Label>Registered Address</Label>
                  <Field
                    as="textarea"
                    name="registeredAddress"
                    rows="3"
                    placeholder="Complete registered address"
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Country</Label>
                    <Field name="country" placeholder="India" className={inputCls} />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Field name="state" placeholder="State" className={inputCls} />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Field name="city" placeholder="City" className={inputCls} />
                  </div>
                </div>
                <div className="md:w-1/3">
                  <Label>PIN / ZIP Code</Label>
                  <Field name="pinCode" placeholder="400001" className={inputCls} />
                  <FieldError name="pinCode" />
                </div>
              </div>
            </Section>

            {/* ── Commercial Details (collapsible) ── */}
            <Section
              icon={FileText}
              title="Commercial Details"
              subtitle="GST, PAN, payment terms, sub-vendor settings"
              accent="#7c3aed"
              collapsible
              open={commercialOpen}
              onToggle={() => setCommercialOpen((s) => !s)}>
              <div className="pt-3 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>GSTIN</Label>
                    <Field name="gstin" placeholder="22AAAAA0000A1Z5" className={`${inputCls} font-mono`} />
                    <FieldError name="gstin" />
                  </div>
                  <div>
                    <Label>PAN Number</Label>
                    <Field name="pan" placeholder="ABCDE1234F" className={`${inputCls} font-mono`} />
                    <FieldError name="pan" />
                  </div>
                  <div>
                    <Label>Payment Terms</Label>
                    <Field name="paymentTerms" placeholder="e.g. Net 30, Advance" className={inputCls} />
                  </div>
                  <div>
                    <Label>Goods Type</Label>
                    <Field name="goodsType" placeholder="Type of goods supplied" className={inputCls} />
                  </div>
                  <div>
                    <Label>Service Type</Label>
                    <Field name="serviceType" placeholder="IT Services, Consulting…" className={inputCls} />
                  </div>
                  <div>
                    <Label>Credit Limit (₹)</Label>
                    <Field type="number" name="creditLimit" placeholder="0" className={inputCls} />
                    <FieldError name="creditLimit" />
                  </div>
                </div>

                {/* Sub-vendor toggle */}
                <div className="border-t border-slate-100 pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group w-fit">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        id="subVendorCheck"
                        checked={subVendorChecked}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSubVendorChecked(checked);
                          if (!checked) setFieldValue("parentVendorId", "");
                          else fetchParentVendors();
                        }}
                        className="sr-only"
                      />
                      <div className={`w-9 h-5 rounded-full transition-all duration-200 ${subVendorChecked ? "bg-indigo-600" : "bg-slate-200"}`} />
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${subVendorChecked ? "translate-x-4" : ""}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">This is a sub-vendor</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Link this vendor to a parent vendor</p>
                    </div>
                  </label>

                  {subVendorChecked && (
                    <div className="mt-4 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                      <Label required>Parent Vendor</Label>
                      {loadingParents ? (
                        <div className="flex items-center gap-2 py-2 text-xs text-indigo-600 font-medium">
                          <span className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                          Loading parent vendors…
                        </div>
                      ) : parentVendors.length === 0 ? (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl mt-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-700 font-medium">
                            No active vendors found. Create a regular vendor first before creating a sub-vendor.
                          </p>
                        </div>
                      ) : (
                        <>
                          <select
                            value={values.parentVendorId || ""}
                            onChange={(e) => setFieldValue("parentVendorId", e.target.value)}
                            className={selectCls}
                            required={subVendorChecked}>
                            <option value="">Select parent vendor</option>
                            {parentVendors.map((p) => p && typeof p === "object" ? (
                              <option key={p._id || Math.random()} value={p._id || ""}>
                                {`${p.vendorName || ""} (${p.vendorCode || ""})${p.isSubVendor ? " [Sub-vendor]" : ""}`}
                              </option>
                            ) : null)}
                          </select>
                          <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                            {parentVendors.length} active vendor(s) available
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ── Bank Details (collapsible) ── */}
            <Section
              icon={Banknote}
              title="Bank Details"
              subtitle="Optional banking information"
              accent="#0891b2"
              collapsible
              open={bankOpen}
              onToggle={() => setBankOpen((s) => !s)}>
              <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Field name="bankName" placeholder="e.g. HDFC Bank" className={inputCls} />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Field name="accountNumber" placeholder="Account number" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Field name="ifscCode" placeholder="HDFC0001234" className={`${inputCls} font-mono`} />
                </div>
                <div>
                  <Label>Branch Name</Label>
                  <Field name="branchName" placeholder="Branch name" className={inputCls} />
                </div>
              </div>
            </Section>

            {/* ── Agreement Period ── */}
            <Section icon={Calendar} title="Agreement Period" subtitle="Start and end dates of the vendor agreement" accent="#dc2626">
              <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Field type="date" name="agreementStartDate" className={inputCls} />
                  <FieldError name="agreementStartDate" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Field type="date" name="agreementEndDate" className={inputCls} />
                  <FieldError name="agreementEndDate" />
                </div>
              </div>
            </Section>

            {/* ── Compliance Documents ── */}
            <Section icon={Layers} title="Compliance Documents" subtitle="PDF, JPG or PNG — max 5 files, 10 MB each" accent="#0d9488">
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Attached Files ({files.length})
                    </p>
                    <ul className="space-y-1.5">
                      {files.map((f, idx) => (
                        <li key={idx}
                          className="flex items-center justify-between gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate">{f.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {f.existing ? "Already uploaded" : "New upload"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {f.existing && (
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                Uploaded
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>

            {/* ── Submit Error ── */}
            {errors.submit && (
              <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold">{errors.submit}</p>
              </div>
            )}

            {/* ── Form Actions ── */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-400 font-medium">
                Fields marked <span className="text-red-400 font-black">*</span> are required
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onClose && onClose()}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#0f172a,#1e40af)", boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}>
                  {isSubmitting ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : editData ? (
                    <Save className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {isSubmitting
                    ? (editData ? "Updating…" : "Creating…")
                    : (editData ? "Update Vendor" : "Create Vendor")}
                </button>
              </div>
            </div>

          </Form>
        )}
      </Formik>
    </div>
  );
}