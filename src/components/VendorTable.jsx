import {
  ChevronDown, Phone, MapPin, Edit, Mail, Hash,
  FileText, Calendar, Building2, Banknote, CreditCard,
  Download, Globe, User, Flag, Info,
  CheckCircle, XCircle, Clock,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";

// ─── Country flag emojis ──────────────────────────────────────────────────────
const COUNTRY_FLAG = {
  India: "🇮🇳", USA: "🇺🇸", UK: "🇬🇧", UAE: "🇦🇪",
  SaudiArabia: "🇸🇦", Canada: "🇨🇦", Australia: "🇦🇺",
  Germany: "🇩🇪", France: "🇫🇷", Singapore: "🇸🇬",
  Japan: "🇯🇵", Nepal: "🇳🇵", Bhutan: "🇧🇹",
};

// ─── Payment term labels ──────────────────────────────────────────────────────
const PT_LABELS = {
  P1: "Immediate", P2: "Net 15 Days", P3: "Net 30 Days",
  P4: "Net 60 Days", P5: "Advance", P6: "Cash on Delivery", P7: "50% Advance",
};

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:   { icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50 border-amber-100",     dot: "bg-amber-500"   },
  Approved:  { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", dot: "bg-emerald-500" },
  Rejected:  { icon: XCircle,     color: "text-red-600",     bg: "bg-red-50 border-red-100",         dot: "bg-red-500"     },
  Completed: { icon: CheckCircle, color: "text-slate-600",   bg: "bg-slate-50 border-slate-200",     dot: "bg-slate-400"   },
};

// ─── Info pill ────────────────────────────────────────────────────────────────
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

// ─── Single vendor card ───────────────────────────────────────────────────────
function VendorCard({ vendor, expanded, onSelect, onEdit }) {
  const { user } = useAuth();

  const flag      = COUNTRY_FLAG[vendor.country] || "🌐";
  const ptLabel   = PT_LABELS[vendor.paymentTerms] || vendor.paymentTerms;
  const statusCfg = STATUS_CONFIG[vendor.status] || STATUS_CONFIG.Pending;

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden relative ${
      expanded ? "border-blue-200 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
    }`}>

      {/* Left active/inactive accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: vendor.isActive
          ? "linear-gradient(180deg,#059669,#34d399)"
          : "linear-gradient(180deg,#dc2626,#f87171)" }} />

      {/* ── Card Header ── */}
      <div className="pl-4 pr-4 py-3.5 cursor-pointer select-none" onClick={() => onSelect(vendor._id)}>
        <div className="flex items-center justify-between gap-4">

          {/* Avatar + Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm"
                style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)" }}>
                <span className="text-sm font-black text-indigo-700">
                  {vendor.vendorName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="absolute -bottom-1 -right-1 text-xs">{flag}</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 truncate">{vendor.vendorName}</h3>
                <span className="font-mono text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                  {vendor.vendorCode}
                </span>
                {vendor.isSubVendor && (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100">
                    Sub-vendor
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {vendor.phoneNumber && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Phone className="w-3 h-3" />{vendor.phoneNumber}
                  </span>
                )}
                {vendor.email && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[180px]">
                    <Mail className="w-3 h-3 shrink-0" />{vendor.email}
                  </span>
                )}
                {vendor.city && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3" />{vendor.city}{vendor.state ? `, ${vendor.state}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: badges + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {vendor.gstin && (
              <span className="hidden md:flex items-center gap-1 font-mono text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-100 px-2 py-1 rounded-lg">
                GST ✓
              </span>
            )}
            {vendor.pan && (
              <span className="hidden md:flex items-center gap-1 font-mono text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
                PAN ✓
              </span>
            )}

            {vendor.status && (
              <span className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black border ${statusCfg.bg} ${statusCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {vendor.status}
              </span>
            )}

            {vendor.isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Inactive
              </span>
            )}

            {checkAuthorization(user, "VENDOR", "EDIT") && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(vendor); }}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                title="Edit vendor">
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="p-1.5">
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
              <Pill icon={User}  label="Contact Person" value={vendor.contactPerson} />
              <Pill icon={Phone} label="Phone Number"   value={vendor.phoneNumber} />
              <Pill icon={Mail}  label="Email Address"  value={vendor.email} />
              {vendor.website && (
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Website</p>
                    <a
                      href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline break-all"
                      onClick={(e) => e.stopPropagation()}>
                      {vendor.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                </div>
              )}
            </Section>

            <div className="border-t border-slate-200" />

            {/* Address */}
            <Section title="Address" icon={MapPin}>
              {vendor.registeredAddress && (
                <div className="md:col-span-2 xl:col-span-3 flex items-start gap-2.5">
                  <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Registered Address</p>
                    <p className="text-xs font-semibold text-slate-800 whitespace-pre-line">{vendor.registeredAddress}</p>
                  </div>
                </div>
              )}
              <Pill icon={Building2} label="City"     value={vendor.city} />
              <Pill icon={MapPin}    label="State"    value={vendor.state} />
              <Pill icon={Flag}      label="Country"  value={`${flag} ${vendor.country}`} />
              <Pill icon={Hash}      label="PIN Code" value={vendor.pinCode} mono />
            </Section>

            {/* Tax */}
            {(vendor.pan || vendor.gstin || vendor.vatNumber || vendor.einNumber) && (
              <>
                <div className="border-t border-slate-200" />
                <Section title="Tax Information" icon={FileText}>
                  {vendor.gstin && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-violet-50 rounded-lg shrink-0">
                        <FileText className="w-3.5 h-3.5 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">GSTIN</p>
                        <p className="text-xs font-bold text-slate-800 font-mono">{vendor.gstin}</p>
                        {vendor.gstType && (
                          <span className="text-[10px] text-violet-600 font-bold">{vendor.gstType}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {vendor.pan && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-indigo-50 rounded-lg shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PAN</p>
                        <p className="text-xs font-bold text-slate-800 font-mono">{vendor.pan}</p>
                      </div>
                    </div>
                  )}
                  <Pill icon={FileText} label="VAT Number" value={vendor.vatNumber} mono />
                  <Pill icon={FileText} label="EIN"        value={vendor.einNumber} mono />
                </Section>
              </>
            )}

            {/* TDS */}
            {vendor.tdsApplicable && (
              <>
                <div className="border-t border-slate-200" />
                <Section title="TDS Configuration" icon={FileText}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-amber-50 rounded-lg shrink-0">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">TDS Rate</p>
                      <p className="text-xs font-black text-slate-800 font-mono">{vendor.tdsRate}%</p>
                    </div>
                  </div>
                  <Pill icon={FileText} label="TDS Section" value={vendor.tdsSection} />
                </Section>
              </>
            )}

            {/* Financial & Commercial */}
            {(vendor.paymentTerms || vendor.creditLimit || vendor.serviceType || vendor.goodsType) && (
              <>
                <div className="border-t border-slate-200" />
                <Section title="Financial & Commercial" icon={Calendar}>
                  {vendor.paymentTerms && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-blue-50 rounded-lg shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Payment Terms</p>
                        <p className="text-xs font-semibold text-slate-800">{ptLabel}</p>
                        <span className="font-mono text-[10px] text-slate-400">{vendor.paymentTerms}</span>
                      </div>
                    </div>
                  )}
                  {vendor.creditLimit > 0 && (
                    <Pill icon={CreditCard} label="Credit Limit" value={`₹ ${vendor.creditLimit?.toLocaleString()}`} />
                  )}
                  <Pill icon={FileText} label="Service Type" value={vendor.serviceType} />
                  <Pill icon={FileText} label="Goods Type"   value={vendor.goodsType} />
                </Section>
              </>
            )}

            {/* Bank Details */}
            {(vendor.bankName || vendor.accountNumber || vendor.ifscCode || vendor.branchName) && (
              <>
                <div className="border-t border-slate-200" />
                <Section title="Bank Details" icon={Banknote}>
                  <Pill icon={Banknote}  label="Bank Name"      value={vendor.bankName} />
                  <Pill icon={Hash}      label="Account Number" value={vendor.accountNumber} mono />
                  <Pill icon={Hash}      label="IFSC Code"      value={vendor.ifscCode} mono />
                  <Pill icon={Building2} label="Branch"         value={vendor.branchName} />
                </Section>
              </>
            )}

            {/* Agreement Period */}
            {(vendor.agreementStartDate || vendor.agreementEndDate) && (
              <>
                <div className="border-t border-slate-200" />
                <Section title="Agreement Period" icon={Calendar}>
                  {vendor.agreementStartDate && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-green-50 rounded-lg shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Start Date</p>
                        <p className="text-xs font-semibold text-slate-800">
                          {new Date(vendor.agreementStartDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                  {vendor.agreementEndDate && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-red-50 rounded-lg shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">End Date</p>
                        <p className="text-xs font-semibold text-slate-800">
                          {new Date(vendor.agreementEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* Compliance Documents */}
            {vendor.complianceDocs?.length > 0 && (
              <>
                <div className="border-t border-slate-200" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance Documents</h4>
                    <span className="ml-auto font-mono text-[10px] text-slate-400">{vendor.complianceDocs.length} file(s)</span>
                  </div>
                  <div className="space-y-1.5">
                    {vendor.complianceDocs.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 rounded-lg">
                            <FileText className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-xs">{doc}</p>
                        </div>
                        <button
                          onClick={() => window.open(doc, "_blank")}
                          className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                          <Download className="w-3 h-3" /> View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Remarks */}
            {vendor.remarks && (
              <>
                <div className="border-t border-slate-200" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remarks</h4>
                  </div>
                  <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 italic">
                    "{vendor.remarks}"
                  </p>
                </div>
              </>
            )}

            {/* Timestamps */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-400">
                Created {new Date(vendor.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Updated {new Date(vendor.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── VendorTable — same props as before, zero import changes needed ───────────
export default function VendorTable({ vendors, onEdit, selectedVendor, onSelect }) {
  return (
    <div className="space-y-2">
      {vendors.map((v) => (
        <VendorCard
          key={v._id}
          vendor={v}
          expanded={selectedVendor === v._id}
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}