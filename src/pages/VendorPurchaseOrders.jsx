import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getVendorById } from "../apis/vendorApi";
import {
    advancedSearchPurchaseOrdersApi,
    deletePurchaseOrderApi,
    downloadPdfPurchaseOrderApi,
    downloadWordPurchaseOrderApi,
} from "../apis/purchaseOrderApi";
import dayjs from "dayjs";
import PurchaseOrderDetailModal from "../modals/PurchaseOrderDetailModal";
import PurchaseOrderAuditLogModal from "../modals/PurchaseOrderAuditLogModal";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Download,
    Plus,
    User,
    CreditCard,
    Banknote,
    Mail,
    ChevronDown,
    ChevronUp,
    Clock,
    CheckCircle,
    ShoppingCart,
    AlertCircle,
    Eye,
    History,
    Loader2,
} from "lucide-react";
import { checkAuthorization } from "../utils/checkAuthorization";

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white border rounded-md p-2 flex items-center justify-between shadow-sm">
        <div>
            <p className="text-[10px] text-gray-500">{label}</p>
            <p className={`text-sm font-bold text-${color}-600`}>{value}</p>
        </div>
        <div className={`bg-${color}-100 p-1 rounded-md`}>
            <Icon className={`h-4 w-4 text-${color}-600`} />
        </div>
    </div>
);

const VendorPurchaseOrders = () => {
    const { user } = useAuth();
    const canCreatePO = checkAuthorization(user, "PURCHASE ORDER", "CREATE");
    const canEditPO = checkAuthorization(user, "PURCHASE ORDER", "EDIT");
    const canDeletePO = checkAuthorization(user, "PURCHASE ORDER", "DELETE");
    const navigate = useNavigate();
    const { vendorId } = useParams();

    const [vendor, setVendor] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedPOForDetail, setSelectedPOForDetail] = useState(null);
    const [auditModalOpen, setAuditModalOpen] = useState(false);
    const [selectedPOForAudit, setSelectedPOForAudit] = useState(null);

    const calculateTotalTax = (po) => {
        return (
            (po.totalCGSTAmount || 0) +
            (po.totalSGSTAmount || 0) +
            (po.totalIGSTAmount || 0)
        ).toFixed(2);
    };

    const formatDate = (date) => dayjs(date).format("DD-MMM-YYYY");
    const getOpenAmount = (po) => Math.max(0, (po.totalAmount || 0) - (po.totalInvoicedAmount || 0));
    const getDerivedStatus = (po) => {
        if (po.status === "CLOSED") return "CLOSED";
        const invoiced = po.totalInvoicedAmount || 0;
        const total = po.totalAmount || 0;
        if (invoiced >= total && total > 0) return "FULLY_INVOICED";
        if (invoiced > 0) return "PARTIALLY_INVOICED";
        return "OPEN";
    };

    const fetchVendorAndPOs = async () => {
        setLoading(true);
        setError(null);
        try {
            const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
            const companyId = localStorage.getItem("selectedCompanyId") || user?.company?._id || selectedCompany?._id;
            if (!companyId) throw new Error("Company ID missing");

            const vendorRes = await getVendorById(vendorId);
            setVendor(vendorRes.data?.data || vendorRes.data);

            const filters = {
                companyId,
                direction: "payable",
                vendorId,
                limit: 1000,
            };
            const res = await advancedSearchPurchaseOrdersApi(filters);
            let pos = res.data || [];
            // Extra safety filter
            pos = pos.filter(po => po.vendor?._id === vendorId || po.client?._id === vendorId);
            pos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPurchaseOrders(pos);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch vendor purchase orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.company?._id && vendorId) {
            fetchVendorAndPOs();
        }
    }, [user, vendorId]);

    const totalPOs = purchaseOrders.length;
    const totalValue = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const pendingPOs = purchaseOrders.filter((po) => !["CLOSED", "FULLY_INVOICED"].includes(po.status)).length;
    const completedPOs = purchaseOrders.filter((po) => po.status === "CLOSED").length;

    const handleDelete = async (poId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this purchase order?")) return;
        try {
            await deletePurchaseOrderApi(poId);
            fetchVendorAndPOs();
        } catch (err) {
            console.error(err);
            setError("Failed to delete purchase order");
        }
    };

    const handleDownloadPdf = async (poId, poNumber, e) => {
        e.stopPropagation();
        try {
            const response = await downloadPdfPurchaseOrderApi(poId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = `PurchaseOrder_${poNumber}.pdf`;
            link.click();
        } catch (err) {
            console.error(err);
            setError("Failed to download PDF");
        }
    };

    const handleDownloadWord = async (poId, poNumber, e) => {
        e.stopPropagation();
        try {
            const response = await downloadWordPurchaseOrderApi(poId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.download = `PurchaseOrder_${poNumber}.docx`;
            link.click();
        } catch (err) {
            console.error(err);
            setError("Failed to download Word document");
        }
    };

    const handleViewDetails = (po) => {
        setSelectedPOForDetail(po);
        setDetailModalOpen(true);
    };

    const handleViewAuditLog = (po, e) => {
        e.stopPropagation();
        setSelectedPOForAudit(po);
        setAuditModalOpen(true);
    };

    const toggleRowExpand = (poId) => {
        setExpandedRows((prev) => ({ ...prev, [poId]: !prev[poId] }));
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: "bg-gray-100 text-gray-800",
            issued: "bg-blue-100 text-blue-800",
            acknowledged: "bg-purple-100 text-purple-800",
            partially_received: "bg-yellow-100 text-yellow-800",
            fully_received: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
            closed: "bg-gray-100 text-gray-800",
            OPEN: "bg-red-100 text-red-800",
            PARTIALLY_INVOICED: "bg-amber-100 text-amber-800",
            FULLY_INVOICED: "bg-blue-100 text-blue-800",
            CLOSED: "bg-slate-100 text-slate-800",
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-xs">
            <div className="sticky top-0 z-40 bg-gradient-to-br from-amber-100 via-slate-100 to-slate-100 border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-7">
                        <div className="flex items-start sm:items-center gap-4">
                            <button onClick={() => navigate("/purchaseorder-data")} className="p-2 rounded-md hover:bg-gray-100 transition">
                                <ArrowLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div>
                                <h2 className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                                    <span className="text-gray-600">Purchase Order Management For</span>
                                    <span className="font-semibold text-gray-900">{vendor?.vendorName || "Unnamed Vendor"}</span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{vendor?.vendorCode}</span>
                                </h2>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                                    <span className="font-mono">Tax: {vendor?.gstNumber || vendor?.panNumber || "N/A"}</span>
                                    {vendor?.email && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span className="truncate">{vendor.email}</span>
                                        </>
                                    )}
                                    {vendor?.country && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span>{vendor.country}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {canCreatePO && (
                                <Link
                                    to={`/purchase-order?vendorId=${vendorId}&direction=payable`}
                                    className="inline-flex items-center justify-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New PO for {vendor?.vendorName || "Vendor"}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 border-t">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Total POs" value={totalPOs} icon={ShoppingCart} color="amber" />
                        <StatCard label="Pending" value={pendingPOs} icon={Clock} color="amber" />
                        <StatCard label="Total Value" value={totalValue.toFixed(2)} icon={Banknote} color="green" />
                        <StatCard label="Completed" value={completedPOs} icon={CheckCircle} color="emerald" />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center mb-4">
                        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                        <p className="text-red-600 mb-3 text-xs">{error}</p>
                        <button onClick={fetchVendorAndPOs} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs">
                            Try Again
                        </button>
                    </div>
                )}

                {purchaseOrders.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 text-center">
                        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-700 mb-1">No purchase orders for this vendor</h3>
                        <p className="text-gray-500 mb-4 text-xs">Create the first purchase order for this vendor.</p>
                        {canCreatePO && (
                            <Link
                                to={`/purchase-order?vendorId=${vendorId}&direction=payable`}
                                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-md inline-flex items-center text-xs"
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Create New PO
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {purchaseOrders.map((po) => {
                            const openAmount = getOpenAmount(po);
                            const showClosedPaidAmount = po.status === "CLOSED" && openAmount === 0;
                            return (
                                <div key={po._id} className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleRowExpand(po._id)}>
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-neutral-50 p-1.5 rounded-md">
                                                <ShoppingCart className="h-4 w-4 text-neutral-700" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-900">{po.poNumber}</span>
                                                    {po.approvalStatus === "Pending" ? (
                                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200 uppercase tracking-wider">
                                                            Pending Approval
                                                        </span>
                                                    ) : (
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(getDerivedStatus(po))}`}>
                                                            {getDerivedStatus(po)}
                                                        </span>
                                                    )}
                                                    <Eye className="h-3 w-3 text-blue-500 inline mr-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleViewDetails(po); }} />
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600">
                                                    <span>PO Date: {formatDate(po.poDate)}</span>
                                                    <span>Due: {po.deliveryDate}</span>
                                                    <span>{po.items?.length || 0} item(s)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm font-bold text-gray-900">{po.currency} {(po.totalAmount || 0).toFixed(2)}</span>
                                            {showClosedPaidAmount ? (
                                                <span className="text-xs font-semibold text-gray-500 line-through">{po.currency} {(po.totalAmount || 0).toFixed(2)}</span>
                                            ) : (
                                                <span className="text-xs font-semibold text-red-600">Open: {po.currency} {openAmount.toFixed(2)} / {(po.totalAmount || 0).toFixed(2)}</span>
                                            )}
                                            {expandedRows[po._id] ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                                        </div>
                                    </div>

                                    {expandedRows[po._id] && (
                                        <div className="border-t border-gray-200 px-4 py-1.5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-gray-700 flex items-center text-xs"><User className="h-3 w-3 mr-1.5" />Vendor Details</h4>
                                                    <div className="space-y-1.5">
                                                        <div>
                                                            <p className="text-[10px] text-gray-500">Vendor</p>
                                                            <p className="font-medium text-xs truncate">{po.vendor?.name || "-"}</p>
                                                            <p className="text-[10px] text-gray-600 truncate">{po.vendor?.address || "-"}</p>
                                                            <p className="text-[10px] text-gray-600">GSTIN: {po.vendor?.GSTIN || "N/A"} | State: {po.vendor?.stateCode || "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-500">Deliver To</p>
                                                            <p className="font-medium text-xs truncate">{po.deliverTo?.name || "-"}</p>
                                                            <p className="text-[10px] text-gray-600 truncate">{po.deliverTo?.address || "-"}</p>
                                                        </div>
                                                        {po.createdBy && <p className="text-[10px] text-gray-600">Created by: <span className="font-medium text-gray-800">{po.createdBy?.name}</span></p>}
                                                        {po.updatedBy && <p className="text-[10px] text-gray-600">Updated by: <span className="font-medium text-gray-800">{po.updatedBy?.name}</span></p>}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-gray-700 flex items-center text-xs"><CreditCard className="h-3 w-3 mr-1.5" />Financial Details</h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div><p className="text-[10px] text-gray-500">Taxable Value</p><p className="font-medium text-xs">{(po.totalTaxableValue || 0).toFixed(2)}</p></div>
                                                        <div><p className="text-[10px] text-gray-500">Total Tax</p><p className="font-medium text-xs">{calculateTotalTax(po)}</p></div>
                                                        <div><p className="text-[10px] text-gray-500">Open Amount</p><p className="font-medium text-xs text-red-600">{po.currency} {openAmount.toFixed(2)} / {(po.totalAmount || 0).toFixed(2)}</p></div>
                                                        <div><p className="text-[10px] text-gray-500">Delivery Date</p><p className="font-medium text-xs">{formatDate(po.deliveryDate)}</p></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <h4 className="font-semibold text-gray-700 flex items-center text-xs"><Banknote className="h-3 w-3 mr-1.5" />Tax Breakdown</h4>
                                                        {po.auditLogCount > 0 && (
                                                            <button onClick={(e) => handleViewAuditLog(po, e)} className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs">
                                                                <History className="h-3 w-3 mr-1.5" />Audit Trail ({po.auditLogCount})
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between"><span className="text-[10px] text-gray-600">CGST</span><span className="font-medium text-xs">{(po.totalCGSTAmount || 0).toFixed(2)}</span></div>
                                                        <div className="flex justify-between"><span className="text-[10px] text-gray-600">SGST</span><span className="font-medium text-xs">{(po.totalSGSTAmount || 0).toFixed(2)}</span></div>
                                                        <div className="flex justify-between"><span className="text-[10px] text-gray-600">IGST</span><span className="font-medium text-xs">{(po.totalIGSTAmount || 0).toFixed(2)}</span></div>
                                                        <div className="border-t pt-1.5"><div className="flex justify-between font-semibold text-xs"><span>Total Amount</span><span className="text-natural-700">{po.currency} {(po.totalAmount || 0).toFixed(2)}</span></div></div>
                                                    </div>
                                                    {po.notes && (
                                                        <div className="mt-2">
                                                            <p className="text-[10px] text-gray-500 mb-1">Notes</p>
                                                            <p className="text-[10px] text-gray-700 bg-gray-50 p-1.5 rounded">{po.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-gray-200">
                                                {po.approvalStatus === "Pending" ? (
                                                    <span className="text-[10px] text-gray-400 font-medium italic">
                                                        No actions allowed while pending approval
                                                    </span>
                                                ) : (
                                                    <>
                                                        {canEditPO && (
                                                            <Link to={`/purchase-order?edit=${po._id}`} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center text-xs"><Edit className="h-3 w-3 mr-1.5" />Edit</Link>
                                                        )}
                                                        <button onClick={(e) => handleDownloadPdf(po._id, po.poNumber, e)} className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"><Download className="h-3 w-3 mr-1.5" />PDF</button>
                                                        <button onClick={(e) => handleDownloadWord(po._id, po.poNumber, e)} className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"><Download className="h-3 w-3 mr-1.5" />Word</button>
                                                        {canDeletePO && (
                                                            <button onClick={(e) => handleDelete(po._id, e)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center text-xs"><Trash2 className="h-3 w-3 mr-1.5" />Delete</button>
                                                        )}
                                                        <button className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"><Mail className="h-3 w-3 mr-1.5" />Email</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <PurchaseOrderDetailModal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} purchaseOrderId={selectedPOForDetail?._id} />
            <PurchaseOrderAuditLogModal open={auditModalOpen} onClose={() => setAuditModalOpen(false)} poId={selectedPOForAudit?._id} poNumber={selectedPOForAudit?.poNumber} companyId={user?.company?._id} />
        </div>
    );
};

export default VendorPurchaseOrders;
