import { useEffect, useState } from "react";
import SideDialogBox from "../modals/SideDialogBox";
import { toast } from "react-toastify";
import { pendingApprovalClientApi, statusUpdateClientApi } from "../apis/clientApi";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import LoadingComponent from "./LoadingComponent";
import EmptyComponent from "./EmptyComponent";
import {
  ChevronRight, CheckCircle2, XCircle, Clock, User, Phone,
  Mail, MapPin, FileText, CreditCard, Calendar, Receipt, Hash,
  Globe, Building2
} from "lucide-react";

// ─── Field row in the approval table ─────────────────────────────────────────
function FieldRow({ label, value, mono, badge }) {
  if (!value && value !== false) return null;
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-2.5 pl-4 pr-2 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap w-36 align-top pt-3">
        {label}
      </td>
      <td className="py-2.5 pr-4 text-xs text-slate-800 align-top pt-3">
        {badge ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
            value === true || value === "Active"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-600 border-red-100"
          }`}>
            {value === true || value === "Active"
              ? <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active</>
              : <><span className="w-1.5 h-1.5 bg-red-400 rounded-full" /> Inactive</>}
          </span>
        ) : (
          <span className={mono ? "font-mono text-slate-900 font-semibold" : "font-medium"}>{value || "—"}</span>
        )}
      </td>
    </tr>
  );
}

function TableSection({ title }) {
  return (
    <tr>
      <td colSpan={2} className="py-1.5 pl-4 border-y border-slate-100"
        style={{ background: "linear-gradient(90deg,#f8fafc,#eff6ff)" }}>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClientApprovalComponent({ open, onClose, refreshClients }) {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading]          = useState(true);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [processingId, setProcessingId]   = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!open) return;
      try {
        setLoading(true);
        const res = await pendingApprovalClientApi(user?.company?._id, controller.signal);
        const flat = res?.data?.flatMap((client) =>
          client.ref
            .filter((r) => r.status === "Pending")
            .map((r) => ({
              clientId:  client._id,
              versionNo: r.versionNo,
              snapshot:  r.snapshot,
            }))
        ) || [];
        setPendingItems(flat);
      } catch (err) {
        if (!axios.isCancel(err)) toast.warn("Could not load pending approvals");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [open]);

  const handleAction = async (id, version, status) => {
    setProcessingId(`${id}-${version}`);
    try {
      await statusUpdateClientApi(id, version, status);
      toast.success(status === "Approved" ? "Approved successfully!" : "Rejected.");
      setPendingItems((prev) => prev.filter((i) => !(i.clientId === id && i.versionNo === version)));
      if (expandedIndex !== null) setExpandedIndex(null);
      await refreshClients();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  const renderContent = () => {
    if (loading) return <LoadingComponent title="Loading approvals…" />;
    if (!pendingItems.length) return (
      <EmptyComponent
        title="No pending approvals"
        subtitle="All client changes are up to date"
      />
    );

    return (
      <div className="space-y-2 p-4">
        {/* Count header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: "linear-gradient(135deg,#92400e,#d97706)" }}>
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">
              {pendingItems.length} pending {pendingItems.length === 1 ? "request" : "requests"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{new Date().toLocaleDateString()}</span>
        </div>

        {pendingItems.map((item, idx) => {
          const s          = item.snapshot;
          const isOpen     = expandedIndex === idx;
          const key        = `${item.clientId}-${item.versionNo}`;
          const isProcessing = processingId === key;

          return (
            <div key={idx}
              className={`rounded-2xl border overflow-hidden transition-all duration-200 bg-white ${
                isOpen ? "border-blue-200 shadow-md" : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
              }`}>

              {/* Row header */}
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                onClick={() => setExpandedIndex(isOpen ? null : idx)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-700 font-black text-sm shrink-0"
                    style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)", border: "1px solid #fde68a" }}>
                    {s.clientName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{s.clientName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {s.clientCode && (
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">{s.clientCode}</span>
                      )}
                      <span className="text-[10px] text-amber-700 font-black bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-lg">
                        v{item.versionNo}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        <TableSection title="Contact" />
                        <FieldRow label="Contact"  value={s.contactPerson} />
                        <FieldRow label="Phone"    value={s.contactNumber} />
                        <FieldRow label="Email"    value={s.email} />
                        <FieldRow label="Website"  value={s.website} />

                        <TableSection title="Address" />
                        <FieldRow label="Address"  value={s.clientAddress} />
                        <FieldRow label="City"     value={s.clientCity} />
                        <FieldRow label="State"    value={s.clientState ? `${s.clientState}${s.stateCode ? ` (${s.stateCode})` : ""}` : null} />
                        <FieldRow label="Country"  value={s.clientCountry} />
                        <FieldRow label="PIN / ZIP" value={s.pinCode} mono />
                        {s.gstStateCode && <FieldRow label="GST State" value={s.gstStateCode} mono />}

                        <TableSection title="Tax" />
                        {s.panNumber    && <FieldRow label="PAN"       value={s.panNumber} mono />}
                        {s.gstNumber    && <FieldRow label="GSTIN"     value={s.gstNumber} mono />}
                        {s.vatNumber    && <FieldRow label="VAT"       value={s.vatNumber} mono />}
                        {s.einNumber    && <FieldRow label="EIN"       value={s.einNumber} mono />}
                        {s.ssnNumber    && <FieldRow label="SSN"       value={s.ssnNumber} mono />}
                        {s.companyNumber && <FieldRow label="Co. No."  value={s.companyNumber} mono />}
                        {s.nationalIdNumber && <FieldRow label="Natl. ID" value={s.nationalIdNumber} mono />}
                        {s.taxIdentificationNumber && (
                          <FieldRow label={s.taxIdentifierType || "Tax ID"} value={s.taxIdentificationNumber} mono />
                        )}

                        {s.tdsApplicable && (
                          <>
                            <TableSection title="TDS" />
                            <FieldRow label="TDS Rate"    value={`${s.tdsRate}%`} mono />
                            <FieldRow label="TDS Section" value={s.tdsSection} />
                          </>
                        )}

                        <TableSection title="Terms" />
                        <FieldRow label="Payment"  value={s.paymentTerms} />
                        <FieldRow label="Currency" value={s.currency} mono />
                        <FieldRow label="Status"   value={s.isActive} badge />
                        {s.remarks && <FieldRow label="Remarks" value={s.remarks} />}
                      </tbody>
                    </table>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/60 border-t border-slate-100">
                    <button
                      onClick={() => handleAction(item.clientId, item.versionNo, "Approved")}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#059669,#34d399)", boxShadow: "0 4px 10px rgba(5,150,105,0.25)" }}>
                      {isProcessing
                        ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.clientId, item.versionNo, "Rejected")}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <SideDialogBox
      open={open}
      onClose={onClose}
      title="Client Approvals"
      subtitle="Review and approve pending client changes"
      contents={renderContent()}
    />
  );
}