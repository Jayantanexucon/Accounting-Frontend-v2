import React, { useMemo, useState } from "react";
import { Phone, MapPin, Edit, Mail, Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { checkAuthorization } from "../utils/checkAuthorization";
import ClientDetailsModal from "./ClientDetailsModal";
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

export default function ClientComponent({ client, onEdit }) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const addresses = useMemo(() => ensureAddressArray(client.addresses, client), [client]);
  const primaryAddress = addresses[0] || {};
  const flag = COUNTRY_FLAG[primaryAddress.country || client.clientCountry] || "🌐";

  return (
    <>
      <div
        className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden relative cursor-pointer"
        onClick={() => setModalOpen(true)}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{
            background: client.isActive
              ? "linear-gradient(180deg,#059669,#34d399)"
              : "linear-gradient(180deg,#dc2626,#f87171)",
          }}
        />

        <div className="pl-4 pr-4 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm"
                  style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)" }}
                >
                  <span className="text-sm font-black text-blue-700">
                    {client.clientName?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="absolute -bottom-1 -right-1 text-xs">{flag}</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{client.clientName}</h3>
                  <span className="font-mono text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                    {client.clientCode}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-200">
                    {client.currencySymbol || ""} {client.currency || "INR"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {client.contactNumber && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Phone className="w-3 h-3" />
                      {client.contactNumber}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[220px]">
                      <Mail className="w-3 h-3 shrink-0" />
                      {client.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[280px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {formatAddressText(primaryAddress) || client.clientAddress || "No address"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {client.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Inactive
                </span>
              )}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setModalOpen(true);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                title="View details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              {checkAuthorization(user, "CLIENTS", "EDIT") && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(client);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Edit client"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ClientDetailsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} clientId={client._id} />
    </>
  );
}
