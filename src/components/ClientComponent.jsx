import React, { useState } from "react";
import {
  ChevronDown, ChevronUp, User, Phone, MapPin, CreditCard,
  FileText, Calendar, CheckCircle2, XCircle, Edit, Globe,
  Mail, Home, Flag, Hash, Eye, Building2, Tag, Receipt,
  Landmark, Package, ShoppingCart, Info,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";
import ClientDetailsModal from "./ClientDetailsModal";

// ─── Payment term labels ──────────────────────────────────────────────────────
const PT_LABELS = {
  P1: "Immediate",
  P2: "Net 15 Days",
  P3: "Net 30 Days",
  P4: "Net 60 Days",
  P5: "Advance",
  P6: "Cash on Delivery",
  P7: "50% Advance",
};

// ─── Country flag emojis ──────────────────────────────────────────────────────
const COUNTRY_FLAG = {
  India: "🇮🇳", USA: "🇺🇸", UK: "🇬🇧", UAE: "🇦🇪",
  SaudiArabia: "🇸🇦", Canada: "🇨🇦", Australia: "🇦🇺",
  Germany: "🇩🇪", France: "🇫🇷", Singapore: "🇸🇬",
  Japan: "🇯🇵", Nepal: "🇳🇵", Bhutan: "🇧🇹",
};

// ─── Small info pill ──────────────────────────────────────────────────────────
function Pill({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-xs font-semibold text-slate-800 break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientComponent({ client, expanded, onToggle, onEdit }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const flag = COUNTRY_FLAG[client.clientCountry] || "🌐";
  const ptLabel = PT_LABELS[client.paymentTerms] || client.paymentTerms;


  return (
    <>
      <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden relative ${
        expanded ? "border-blue-200 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}>

        {/* Left status accent stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: client.isActive
            ? "linear-gradient(180deg,#059669,#34d399)"
            : "linear-gradient(180deg,#dc2626,#f87171)" }} />

        {/* ── Card Header ── */}
        <div className="pl-4 pr-4 py-3.5 cursor-pointer select-none" onClick={() => onToggle(client._id)}>
          <div className="flex items-center justify-between gap-4">

            {/* Avatar + Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)" }}>
                  <span className="text-sm font-black text-blue-700">{client.clientName?.charAt(0).toUpperCase()}</span>
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs">{flag}</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{client.clientName}</h3>
                  <span className="font-mono text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                    {client.clientCode}
                  </span>
                  {client.clientType && client.clientType !== "Company" && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100">
                      {client.clientType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {client.contactNumber && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Phone className="w-3 h-3" />{client.contactNumber}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[180px]">
                      <Mail className="w-3 h-3 shrink-0" />{client.email}
                    </span>
                  )}
                  {client.clientCity && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="w-3 h-3" />{client.clientCity}{client.clientState ? `, ${client.clientState}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: badges + actions */}
            <div className="flex items-center gap-2 shrink-0">
              {client.gstNumber && (
                <span className="hidden md:flex items-center gap-1 font-mono text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-1 rounded-lg">GST ✓</span>
              )}
              {client.panNumber && (
                <span className="hidden md:flex items-center gap-1 font-mono text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">PAN ✓</span>
              )}

              {client.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Inactive
                </span>
              )}

              <button onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View full details">
                <Eye className="w-3.5 h-3.5" />
              </button>
              {checkAuthorization(user, "CLIENTS", "EDIT") && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit client">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="p-1.5 text-slate-300">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${expanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Expanded Details ── */}
        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/40">
            <div className="p-5 space-y-5">

              {/* Contact */}
              <Section title="Contact Information" icon={User}>
                <Pill icon={User}    label="Contact Person"   value={client.contactPerson} />
                <Pill icon={Phone}   label="Primary Number"   value={client.contactNumber} />
                <Pill icon={Phone}   label="Alternate Number" value={client.altContactNumber} />
                <Pill icon={Mail}    label="Email"            value={client.email} />
                {client.website && (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Website</p>
                      <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}>
                        {client.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                )}
              </Section>

              <div className="border-t border-slate-200" />

              {/* Address */}
              <Section title="Address" icon={MapPin}>
                {client.clientAddress && (
                  <div className="md:col-span-2 xl:col-span-3 flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0">
                      <Home className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Registered Address</p>
                      <p className="text-xs font-semibold text-slate-800">{client.clientAddress}</p>
                    </div>
                  </div>
                )}
                <Pill icon={Building2} label="City"       value={client.clientCity} />
                <Pill icon={MapPin}    label="State"      value={client.clientState ? `${client.clientState}${client.stateCode ? ` (${client.stateCode})` : ""}` : null} />
                <Pill icon={Flag}      label="Country"    value={`${flag} ${client.clientCountry}`} />
                <Pill icon={Hash}      label="PIN / ZIP"  value={client.pinCode} mono />
                {client.gstStateCode && <Pill icon={Hash} label="GST State Code" value={client.gstStateCode} mono />}
              </Section>

              {/* Tax */}
              {(client.panNumber || client.gstNumber || client.vatNumber || client.einNumber ||
                client.ssnNumber || client.companyNumber || client.nationalIdNumber ||
                client.taxIdentificationNumber) && (
                <>
                  <div className="border-t border-slate-200" />
                  <Section title="Tax Information" icon={Receipt}>
                    {client.gstNumber && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1.5 bg-violet-50 rounded-lg shrink-0">
                          <FileText className="w-3.5 h-3.5 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">GSTIN</p>
                          <p className="text-xs font-bold text-slate-800 font-mono">{client.gstNumber}</p>
                          {client.gstType && <span className="text-[10px] text-violet-600 font-bold">{client.gstType}</span>}
                        </div>
                      </div>
                    )}
                    {client.panNumber && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-lg shrink-0">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PAN</p>
                          <p className="text-xs font-bold text-slate-800 font-mono">{client.panNumber}</p>
                        </div>
                      </div>
                    )}
                    <Pill icon={FileText} label="VAT Number"     value={client.vatNumber} mono />
                    <Pill icon={FileText} label="EIN"            value={client.einNumber} mono />
                    <Pill icon={FileText} label="Company Number" value={client.companyNumber} mono />
                    <Pill icon={FileText} label="National ID"    value={client.nationalIdNumber} mono />
                    {client.taxIdentificationNumber && (
                      <Pill icon={FileText} label={client.taxIdentifierType || "Tax ID"} value={client.taxIdentificationNumber} mono />
                    )}
                  </Section>
                </>
              )}

              {/* TDS */}
              {client.tdsApplicable && (
                <>
                  <div className="border-t border-slate-200" />
                  <Section title="TDS Configuration" icon={Landmark}>
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-amber-50 rounded-lg shrink-0">
                        <Landmark className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TDS Rate</p>
                        <p className="text-xs font-black text-slate-800 font-mono">{client.tdsRate}%</p>
                      </div>
                    </div>
                    <Pill icon={FileText} label="TDS Section" value={client.tdsSection} />
                  </Section>
                </>
              )}

              {/* Financial */}
              {(client.paymentTerms || client.creditLimit || client.currency) && (
                <>
                  <div className="border-t border-slate-200" />
                  <Section title="Financial Terms" icon={Calendar}>
                    {client.paymentTerms && (
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1.5 bg-blue-50 rounded-lg shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Payment Terms</p>
                          <p className="text-xs font-semibold text-slate-800">{ptLabel}</p>
                          <span className="font-mono text-[10px] text-slate-400">{client.paymentTerms}</span>
                        </div>
                      </div>
                    )}
                    {client.creditLimit > 0 && (
                      <Pill icon={CreditCard} label="Credit Limit" value={`${client.currency || "₹"} ${client.creditLimit?.toLocaleString()}`} />
                    )}
                    {client.currency && <Pill icon={Tag} label="Currency" value={client.currency} mono />}
                  </Section>
                </>
              )}

              {/* HSN & PO */}
              {((client.hsnCodes?.length > 0) || (client.poList?.length > 0)) && (
                <>
                  <div className="border-t border-slate-200" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HSN & Purchase Orders</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {client.hsnCodes?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">HSN Codes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {client.hsnCodes.map((code, i) => (
                              <span key={i} className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">{code}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {client.poList?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Purchase Orders</p>
                          <div className="flex flex-wrap gap-1.5">
                            {client.poList.map((po, i) => (
                              <span key={i} className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                <ShoppingCart className="w-3 h-3" />{po}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Remarks */}
              {client.remarks && (
                <>
                  <div className="border-t border-slate-200" />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remarks</h4>
                    </div>
                    <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 italic">"{client.remarks}"</p>
                  </div>
                </>
              )}

              {/* Timestamps */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400">
                  Created {new Date(client.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Updated {new Date(client.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ClientDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={client._id}
      />
    </>
  );
}