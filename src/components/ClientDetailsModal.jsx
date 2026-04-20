import { useEffect, useMemo, useState } from "react";
import { getClientByIdApi } from "../apis/clientApi";
import {
  X,
  User,
  Phone,
  Mail,
  Globe,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Landmark,
  Building2,
  Wallet,
} from "lucide-react";
import { ensureAddressArray, formatAddressText } from "../utils/masterLocationUtils";

const Field = ({ label, value, mono = false }) => {
  const hasValue = value !== null && value !== undefined && String(value).trim() !== "";
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""} ${hasValue ? "text-slate-800 font-semibold" : "text-slate-300 italic"}`}>
        {hasValue ? value : "—"}
      </p>
    </div>
  );
};

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50">
      <Icon size={14} className="text-slate-500" />
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

export default function ClientDetailsModal({ isOpen, onClose, clientId }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !clientId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getClientByIdApi(clientId);
        setClient(response.data);
      } catch (err) {
        setError("Failed to load client details");
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, clientId]);

  useEffect(() => {
    const handleEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const addresses = useMemo(
    () => ensureAddressArray(client?.addresses, client || {}),
    [client]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl bg-slate-50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg font-black">
                {(client?.clientName || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black">{client?.clientName || "Client Details"}</h2>
                <p className="text-blue-100 text-xs font-mono mt-1">{client?.clientCode || ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {client?.isActive !== undefined && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${client.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {client.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {client.isActive ? "Active" : "Inactive"}
                </span>
              )}
              <button onClick={onClose} className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {loading && <div className="py-16 text-center text-sm text-slate-500">Loading client details...</div>}
          {error && <div className="py-16 text-center text-sm text-red-600">{error}</div>}

          {client && !loading && !error && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Country", value: client.clientCountry || client.defaultAddress?.country || "—" },
                  { label: "Currency", value: [client.currencySymbol, client.currency, client.currencyName].filter(Boolean).join(" ") || "—" },
                  { label: "Payment Terms", value: client.paymentTerms || "—" },
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
                  <Field label="Contact Person" value={client.contactPerson} />
                  <Field label="Phone" value={client.contactNumber} />
                  <Field label="Alternate Phone" value={client.altContactNumber} />
                  <Field label="Email" value={client.email} />
                  <Field label="Website" value={client.website} />
                  <Field label="Client Type" value={client.clientType} />
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
                  {(client.taxDetails || []).map((tax, index) => (
                    <Field key={`${tax.taxType}-${index}`} label={tax.taxType || "Tax"} value={tax.taxNumber} mono />
                  ))}
                  {!client.taxDetails?.length && (
                    <>
                      <Field label="PAN" value={client.panNumber} mono />
                      <Field label="GST" value={client.gstNumber} mono />
                      <Field label="Tax ID" value={client.taxIdentificationNumber} mono />
                    </>
                  )}
                </div>
              </Section>

              <Section title="Financial Information" icon={Wallet}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Currency" value={[client.currencySymbol, client.currency, client.currencyName].filter(Boolean).join(" ")} />
                  <Field label="Credit Limit" value={client.creditLimit} />
                  <Field label="Opening Balance" value={client.openingBalance} />
                  <Field label="Payment Terms" value={client.paymentTerms} />
                  <Field label="TDS Applicable" value={client.tdsApplicable ? "Yes" : "No"} />
                  <Field label="TDS Rate" value={client.tdsApplicable ? `${client.tdsRate || 0}%` : ""} />
                </div>
              </Section>

              <Section title="Additional Details" icon={Building2}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Remarks" value={client.remarks} />
                  <Field label="Created At" value={client.createdAt ? new Date(client.createdAt).toLocaleString() : ""} />
                  <Field label="Updated At" value={client.updatedAt ? new Date(client.updatedAt).toLocaleString() : ""} />
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
