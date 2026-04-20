import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  Wallet,
  Banknote,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { ensureAddressArray, formatAddressText } from "../utils/masterLocationUtils";

const STATUS_META = {
  Pending: { icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  Approved: { icon: CheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Rejected: { icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200" },
  Completed: { icon: CheckCircle, cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const Field = ({ label, value, mono = false }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-sm ${mono ? "font-mono" : ""} ${value ? "text-slate-800 font-semibold" : "text-slate-300 italic"}`}>
      {value || "—"}
    </p>
  </div>
);

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
      <Icon size={14} className="text-slate-500" />
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export default function VendorDetails({ vendor, onClose }) {
  const status = STATUS_META[vendor.status] || STATUS_META.Pending;
  const StatusIcon = status.icon;
  const addresses = ensureAddressArray(vendor.addresses, vendor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl bg-slate-50" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-blue-900 to-blue-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg font-black">
                {(vendor.vendorName || "V").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black">{vendor.vendorName}</h2>
                <p className="text-blue-100 text-xs font-mono mt-1">{vendor.vendorCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${status.cls}`}>
                <StatusIcon size={12} />
                {vendor.status || "Pending"}
              </span>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Country", value: vendor.country || vendor.defaultAddress?.country || "—" },
              { label: "Currency", value: [vendor.currencySymbol, vendor.currency, vendor.currencyName].filter(Boolean).join(" ") || "—" },
              { label: "Payment Terms", value: vendor.paymentTerms || "—" },
              { label: "Addresses", value: String(addresses.length || 0) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>

          <Section title="Contact Information" icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Contact Person" value={vendor.contactPerson} />
              <Field label="Phone" value={vendor.phoneNumber} />
              <Field label="Email" value={vendor.email} />
              <Field label="Website" value={vendor.website} />
              <Field label="Sub Vendor" value={vendor.isSubVendor ? "Yes" : "No"} />
              <Field label="Active" value={vendor.isActive ? "Yes" : "No"} />
            </div>
          </Section>

          <Section title="Addresses" icon={MapPin}>
            <div className="space-y-3">
              {addresses.map((address, index) => (
                <div key={`${address.type}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-black text-slate-800">
                      {index === 0 ? "Default Address" : address.label || address.type || `Address ${index + 1}`}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {index === 0 ? "Primary" : address.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{formatAddressText(address) || "—"}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Tax Information" icon={CreditCard}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(vendor.taxDetails || []).map((tax, index) => (
                <Field key={`${tax.taxType}-${index}`} label={tax.taxType || "Tax"} value={tax.taxNumber} mono />
              ))}
              {!vendor.taxDetails?.length && (
                <>
                  <Field label="PAN" value={vendor.pan} mono />
                  <Field label="GST" value={vendor.gstin} mono />
                  <Field label="Tax ID" value={vendor.taxIdentificationNumber} mono />
                </>
              )}
            </div>
          </Section>

          <Section title="Commercial Information" icon={Wallet}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Currency" value={[vendor.currencySymbol, vendor.currency, vendor.currencyName].filter(Boolean).join(" ")} />
              <Field label="Credit Limit" value={vendor.creditLimit ? `${vendor.currencySymbol || ""} ${vendor.creditLimit}` : ""} />
              <Field label="Payment Terms" value={vendor.paymentTerms} />
              <Field label="Service Type" value={vendor.serviceType} />
              <Field label="Goods Type" value={vendor.goodsType} />
              <Field label="TDS" value={vendor.tdsApplicable ? `${vendor.tdsRate || 0}% ${vendor.tdsSection || ""}` : ""} />
            </div>
          </Section>

          <Section title="Bank & Audit" icon={Banknote}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Bank Name" value={vendor.bankName} />
              <Field label="Account Number" value={vendor.accountNumber} mono />
              <Field label="IFSC Code" value={vendor.ifscCode} mono />
              <Field label="Branch Name" value={vendor.branchName} />
              <Field label="Created At" value={vendor.createdAt ? new Date(vendor.createdAt).toLocaleString() : ""} />
              <Field label="Updated At" value={vendor.updatedAt ? new Date(vendor.updatedAt).toLocaleString() : ""} />
            </div>
          </Section>

          {!!vendor.complianceDocs?.length && (
            <Section title="Compliance Documents" icon={FileText}>
              <div className="space-y-2">
                {vendor.complianceDocs.map((doc, index) => (
                  <div key={`${doc}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                    {doc}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
