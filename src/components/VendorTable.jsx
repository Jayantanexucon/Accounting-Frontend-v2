import { useMemo, useState } from "react";
import { Phone, MapPin, Edit, Mail, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";
import VendorDetails from "./VendorDetails";
import { ensureAddressArray, formatAddressText } from "../utils/masterLocationUtils";

const COUNTRY_FLAG = {
  India: "🇮🇳",
  USA: "🇺🇸",
  UK: "🇬🇧",
  UAE: "🇦🇪",
  SaudiArabia: "🇸🇦",
  Canada: "🇨🇦",
  Australia: "🇦🇺",
  Germany: "🇩🇪",
  France: "🇫🇷",
  Singapore: "🇸🇬",
  Japan: "🇯🇵",
  Nepal: "🇳🇵",
  Bhutan: "🇧🇹",
};

function VendorCard({ vendor, onEdit }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const addresses = useMemo(() => ensureAddressArray(vendor.addresses, vendor), [vendor]);
  const primaryAddress = addresses[0] || {};
  const flag = COUNTRY_FLAG[primaryAddress.country || vendor.country] || "🌐";

  return (
    <>
      <div
        className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden relative cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background: vendor.isActive
              ? "linear-gradient(180deg,#059669,#34d399)"
              : "linear-gradient(180deg,#dc2626,#f87171)",
          }}
        />

        <div className="pl-4 pr-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)" }}
                >
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
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-200">
                    {vendor.currencySymbol || ""} {vendor.currency || "INR"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {vendor.phoneNumber && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Phone className="w-3 h-3" />
                      {vendor.phoneNumber}
                    </span>
                  )}
                  {vendor.email && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[220px]">
                      <Mail className="w-3 h-3 shrink-0" />
                      {vendor.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[280px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {formatAddressText(primaryAddress) || vendor.registeredAddress || "No address"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${vendor.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${vendor.isActive ? "bg-emerald-500" : "bg-red-400"}`} />
                {vendor.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="View details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {checkAuthorization(user, "VENDOR", "EDIT") && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(vendor);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Edit vendor"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {open && <VendorDetails vendor={vendor} onClose={() => setOpen(false)} />}
    </>
  );
}

export default function VendorTable({ vendors, onEdit }) {
  return (
    <div className="space-y-2">
      {vendors.map((vendor) => (
        <VendorCard key={vendor._id} vendor={vendor} onEdit={onEdit} />
      ))}
    </div>
  );
}
