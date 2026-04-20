import { useEffect, useState } from "react";
import SideDialogBox from "../modals/SideDialogBox";
import { toast } from "react-toastify";
import { getVendors, updateVendor, deleteVendor } from "../apis/vendorApi";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import LoadingComponent from "./LoadingComponent";
import EmptyComponent from "./EmptyComponent";
import VendorForm from "./VendorForm";
import { ChevronRight, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";

// ─── Field row ────────────────────────────────────────────────────────────────
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
          <span className={mono ? "font-mono text-slate-900 font-semibold" : "font-medium"}>
            {value || "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

function TableSection({ title }) {
  return (
    <tr>
      <td colSpan={2} className="py-1.5 pl-4 border-y border-slate-100"
        style={{ background: "linear-gradient(90deg,#f8fafc,#eef2ff)" }}>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VendorApprovalComponent({ open, onClose, refreshVendors }) {
  const { user } = useAuth();
  const [allVendors, setAllVendors]           = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [expandedIndex, setExpandedIndex]     = useState(null);
  const [processingId, setProcessingId]       = useState(null);
  const [statusFilter, setStatusFilter]       = useState("Pending");
  const [selectedVendor, setSelectedVendor]   = useState(null);
  const [showEditForm, setShowEditForm]       = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!open) return;
      try {
        setLoading(true);
        // Fetch all vendors (global master data) - no companyId filter
        const res     = await getVendors();
        const vendors = res.data?.data?.vendors || [];
        setAllVendors(vendors);

        const pending = vendors.filter((v) => v.status === "Pending" && v.isActive);
        if (pending.length > 0) {
          setStatusFilter("Pending");
          setFilteredVendors(pending);
        } else {
          setStatusFilter("All");
          setFilteredVendors(vendors.filter((v) => v.isActive));
        }
      } catch (err) {
        if (!axios.isCancel(err)) toast.warn("Could not load vendors");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [open]);

  const applyFilter = (vendors, filterType) => {
    setStatusFilter(filterType);
    const active = vendors.filter((v) => v.isActive);
    switch (filterType) {
      case "Pending":   setFilteredVendors(active.filter((v) => v.status === "Pending"));   break;
      case "Approved":  setFilteredVendors(active.filter((v) => v.status === "Approved"));  break;
      case "Rejected":  setFilteredVendors(active.filter((v) => v.status === "Rejected"));  break;
      case "Completed": setFilteredVendors(active.filter((v) => v.status === "Completed")); break;
      default:          setFilteredVendors(active);
    }
  };

  const refreshData = async () => {
    // Fetch all vendors (global master data) - no companyId filter
    const res     = await getVendors();
    const vendors = res.data?.data?.vendors || [];
    setAllVendors(vendors);
    applyFilter(vendors, statusFilter);
    if (refreshVendors) await refreshVendors();
  };

  const handleStatusChange = async (vendorId, newStatus) => {
    setProcessingId(`${vendorId}-${newStatus}`);
    try {
      const formData = new FormData();
      formData.append("status", newStatus);
      await updateVendor(vendorId, formData);
      toast.success(`Vendor ${newStatus.toLowerCase()} successfully!`);
      if (expandedIndex !== null) setExpandedIndex(null);
      await refreshData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (vendorId, vendorName) => {
    if (!window.confirm(`Delete "${vendorName}"?`)) return;
    setProcessingId(vendorId);
    try {
      await deleteVendor(vendorId);
      toast.success("Vendor deleted!");
      await refreshData();
    } catch (err) {
      toast.error("Error deleting vendor");
    } finally {
      setProcessingId(null);
    }
  };

  const handleFormSuccess = async () => {
    toast.success("Vendor updated successfully!");
    setShowEditForm(false);
    setSelectedVendor(null);
    setLoading(true);
    await refreshData();
    setLoading(false);
  };

  const renderContent = () => {
    if (loading) return <LoadingComponent title="Loading vendors…" />;

    return (
      <div className="space-y-2 p-4">

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {["All", "Pending", "Approved", "Rejected", "Completed"].map((f) => {
            const pendingCount = f === "Pending"
              ? allVendors.filter((v) => v.status === "Pending" && v.isActive).length
              : 0;
            return (
              <button key={f} onClick={() => applyFilter(allVendors, f)}
                className={`px-3 py-1.5 text-[10px] font-black rounded-xl border transition-all ${
                  statusFilter === f
                    ? "text-white border-indigo-500"
                    : "text-slate-500 bg-white border-slate-200 hover:border-slate-300"
                }`}
                style={statusFilter === f ? { background: "linear-gradient(135deg,#4f46e5,#6366f1)" } : {}}>
                {f}
                {pendingCount > 0 && (
                  <span className={`ml-1.5 px-1 rounded-full text-[9px] ${
                    statusFilter === f ? "bg-white/30" : "bg-amber-100 text-amber-700"
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filteredVendors.length === 0 ? (
          <EmptyComponent
            title={`No ${statusFilter === "All" ? "" : statusFilter + " "}vendors`}
            subtitle={statusFilter === "All"
              ? "No active vendors available."
              : `No vendors with '${statusFilter}' status`}
          />
        ) : (
          filteredVendors.map((vendor, idx) => {
            const isOpen       = expandedIndex === idx;
            const isProcessing = !!processingId?.startsWith(vendor._id);

            return (
              <div key={vendor._id}
                className={`rounded-2xl border overflow-hidden transition-all duration-200 bg-white ${
                  isOpen
                    ? "border-indigo-200 shadow-md"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                }`}>

                {/* Row header */}
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  onClick={() => setExpandedIndex(isOpen ? null : idx)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-indigo-700 font-black text-sm shrink-0"
                      style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1px solid #c7d2fe" }}>
                      {vendor.vendorName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{vendor.vendorName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {vendor.vendorCode && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">
                            {vendor.vendorCode}
                          </span>
                        )}
                        {vendor.status && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg border ${
                            vendor.status === "Pending"   ? "text-amber-700 bg-amber-50 border-amber-100"     :
                            vendor.status === "Approved"  ? "text-emerald-700 bg-emerald-50 border-emerald-100" :
                            vendor.status === "Rejected"  ? "text-red-700 bg-red-50 border-red-100"           :
                            "text-slate-600 bg-slate-50 border-slate-200"
                          }`}>
                            {vendor.status}
                          </span>
                        )}
                        {vendor.isSubVendor && (
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-lg font-black">
                            Sub-vendor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 hidden md:block">
                      {new Date(vendor.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Expanded body */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <tbody>
                          <TableSection title="Contact" />
                          <FieldRow label="Contact"  value={vendor.contactPerson} />
                          <FieldRow label="Phone"    value={vendor.phoneNumber} />
                          <FieldRow label="Email"    value={vendor.email} />

                          <TableSection title="Address" />
                          <FieldRow label="Address"  value={vendor.registeredAddress} />
                          <FieldRow label="City"     value={vendor.city} />
                          <FieldRow label="State"    value={vendor.state} />
                          <FieldRow label="Country"  value={vendor.country} />
                          <FieldRow label="PIN"      value={vendor.pinCode} mono />

                          <TableSection title="Tax" />
                          {vendor.pan   && <FieldRow label="PAN"   value={vendor.pan}   mono />}
                          {vendor.gstin && <FieldRow label="GSTIN" value={vendor.gstin} mono />}
                          {vendor.vatNumber && <FieldRow label="VAT" value={vendor.vatNumber} mono />}

                          <TableSection title="Commercial" />
                          <FieldRow label="Payment"      value={vendor.paymentTerms} />
                          <FieldRow label="Service Type" value={vendor.serviceType} />
                          <FieldRow label="Goods Type"   value={vendor.goodsType} />
                          <FieldRow label="Status"       value={vendor.isActive} badge />

                          {(vendor.bankName || vendor.accountNumber || vendor.ifscCode) && (
                            <>
                              <TableSection title="Bank" />
                              <FieldRow label="Bank"    value={vendor.bankName} />
                              <FieldRow label="Account" value={vendor.accountNumber} mono />
                              <FieldRow label="IFSC"    value={vendor.ifscCode} mono />
                              <FieldRow label="Branch"  value={vendor.branchName} />
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex-wrap">
                      {vendor.status !== "Approved" && (
                        <button
                          onClick={() => handleStatusChange(vendor._id, "Approved")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#059669,#34d399)", boxShadow: "0 4px 10px rgba(5,150,105,0.25)" }}>
                          {isProcessing
                            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                      )}
                      {vendor.status !== "Rejected" && (
                        <button
                          onClick={() => handleStatusChange(vendor._id, "Rejected")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                      {vendor.status !== "Pending" && (
                        <button
                          onClick={() => handleStatusChange(vendor._id, "Pending")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-all disabled:opacity-50">
                          <Clock className="w-3.5 h-3.5" /> Set Pending
                        </button>
                      )}
                      {vendor.status !== "Completed" && (
                        <button
                          onClick={() => handleStatusChange(vendor._id, "Completed")}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50">
                          Complete
                        </button>
                      )}
                      <div className="flex-1" />
                      <button
                        onClick={() => { setSelectedVendor(vendor); setShowEditForm(true); setExpandedIndex(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(vendor._id, vendor.vendorName)}
                        disabled={isProcessing}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <>
      <SideDialogBox
        open={open && !showEditForm}
        onClose={onClose}
        title="Vendor Approvals"
        subtitle="Review and manage vendor status"
        contents={renderContent()}
      />

      {showEditForm && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white shadow-xl rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <VendorForm
              companyId={user?.company?._id}
              editData={selectedVendor}
              onClose={() => { setShowEditForm(false); setSelectedVendor(null); }}
              onSuccess={handleFormSuccess}
            />
          </div>
        </div>
      )}
    </>
  );
}