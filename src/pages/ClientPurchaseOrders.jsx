import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getClientsApi } from "../apis/clientApi";
import {
  getPurchaseOrdersApi,
  deletePurchaseOrderApi,
  downloadPdfPurchaseOrderApi,
  downloadWordPurchaseOrderApi,
  advancedSearchPurchaseOrdersApi,
} from "../apis/purchaseOrderApi";
import dayjs from "dayjs";
import PurchaseOrderAdvancedSearch from "../components/PurchaseOrderAdvancedSearch";
import PurchaseOrderDetailModal from "../modals/PurchaseOrderDetailModal";

// Icons
import {
  ArrowLeft,
  Edit,
  Search,
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
  Filter,
  RefreshCw,
  Loader2,
  Eye,
} from "lucide-react";
import { Upload } from "lucide-react";
import { History } from "lucide-react";
import PurchaseOrderAuditLogModal from "../modals/PurchaseOrderAuditLogModal";

// ---------- Reuse StatCard ----------
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

const ClientPurchaseOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clientId } = useParams(); // client ID from URL

  // ---------- State ----------
  const [client, setClient] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);
  const [expandedRows, setExpandedRows] = useState({}); // per PO expand/collapse
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPOForDetail, setSelectedPOForDetail] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedPOForAudit, setSelectedPOForAudit] = useState(null);

  const handleViewAuditLog = (po, e) => {
    e.stopPropagation();
    setSelectedPOForAudit(po);
    setAuditModalOpen(true);
  };
  // ---------- Helper: calculate total tax ----------
  const calculateTotalTax = (po) => {
    return (
      (po.totalCGSTAmount || 0) +
      (po.totalSGSTAmount || 0) +
      (po.totalIGSTAmount || 0)
    ).toFixed(2);
  };

  // ---------- Format date ----------
  const formatDate = (date) => dayjs(date).format("DD-MMM-YYYY");
  const getOpenAmount = (po) =>
    Math.max(
      0,
      Number(
        po.remainingInvoicableAmount ??
          ((po.totalAmount || 0) - (po.totalInvoicedAmount || 0)),
      ),
    );
  const shouldShowClosedPaidAmount = (po, openAmount) =>
    po.status === "CLOSED" && openAmount === 0;

  // ---------- Helper: resolve client ID from PO (fallback by name) ----------
  const resolveClientId = (po, clientsList) => {
    if (!po.client) return null;
    // 1. Try direct _id
    let clientId = po.client._id;
    let clientObj = null;
    if (clientId) {
      clientObj = clientsList.find((c) => c._id === clientId);
    }
    // 2. Fallback: match by name (case‑insensitive)
    if (!clientObj && po.client.name) {
      clientObj = clientsList.find(
        (c) => c.clientName?.toLowerCase() === po.client.name.toLowerCase(),
      );
      if (clientObj) clientId = clientObj._id;
    }
    return clientId || null;
  };
  // ---------- Fetch client details and POs for this client ----------
  const fetchClientAndPOs = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientRes = await getClientsApi(user.company._id);
      const foundClient = clientRes.data?.find((c) => c._id === clientId);
      setClient(foundClient);

      // Build filters – try exact ID first
      const filters = {
        ...activeFilters,
        clientId,
        limit: 1000,
      };

      if (clientId) {
        filters.clientId = clientId;
      }

      // // If we have the client name, also try a name search as fallback
      if (foundClient?.clientName) {
        filters.clientName = foundClient.clientName;
      }

      if (searchQuery) filters.poNumber = searchQuery;

      const res = await advancedSearchPurchaseOrdersApi(filters);
      setPurchaseOrders(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch client purchase orders");
    } finally {
      setLoading(false);
      setLoadingAdvanced(false);
    }
  };
  useEffect(() => {
    if (user?.company?._id && clientId) {
      fetchClientAndPOs();
    }
  }, [user, clientId, activeFilters, searchQuery]);
  
  // ---------- Stats for this client ----------
  const totalPOs = purchaseOrders.length;
  const totalValue = purchaseOrders.reduce(
    (sum, po) => sum + (po.totalAmount || 0),
    0,
  );
  const pendingPOs = purchaseOrders.filter(
    (po) => !["CLOSED", "FULLY_INVOICED"].includes(po.status),
  ).length;
  const completedPOs = purchaseOrders.filter(
    (po) => po.status === "CLOSED",
  ).length;

  // ---------- Handlers (unchanged) ----------
  const handleAdvancedSearch = (filters) => {
    setLoadingAdvanced(true);
    setActiveFilters(filters);
    setSearchQuery("");
  };

  const handleClearSearch = () => {
    setActiveFilters({});
    setSearchQuery("");
  };

  const handleDelete = async (poId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this purchase order?"))
      return;
    try {
      await deletePurchaseOrderApi(poId);
      fetchClientAndPOs();
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

  // ---------- Loading ----------
  if (loading && !loadingAdvanced) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
      </div>
    );
  }
  const getFirstTaxId = (client) => {
    const taxFields = [
      client.gstNumber,
      client.panNumber,
      client.vatNumber,
      client.einNumber,
      client.ssnNumber,
      client.companyNumber,
      client.nationalIdNumber,
      client.taxIdentificationNumber,
    ];
    return taxFields.find(Boolean) || "N/A";
  };
  // ---------- Render (unchanged, except the Eye icon is already correct) ----------
  return (
    <div className="min-h-screen text-xs">
      {/* Header with Back button and Client name */}
      <div className="sticky top-0 z-40 bg-gradient-to-br from-blue-100 via-slate-100 to-slate-100 border-b shadow-sm">
        {/* Main Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ===================== TOP HEADER ===================== */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-7">
            {/* Left Section */}
            <div className="flex items-start sm:items-center gap-4">
              <button
                onClick={() => navigate("/purchaseorder-data")}
                className="p-2 rounded-md hover:bg-gray-100 transition"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>

              <div className="min-w-0 flex-1">
                <h2 className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                  <span className="text-gray-600">
                    Purchase Order Management For
                  </span>

                  <span className="font-semibold text-gray-900">
                    {client.clientName || "Unnamed Client"}
                  </span>

                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                    {client.clientCode}
                  </span>
                </h2>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span className="font-mono">
                    Tax: {getFirstTaxId(client)}
                  </span>
                  {client.email && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="truncate">{client.email}</span>
                    </>
                  )}
                  {client.clientCountry && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>{client.clientCountry}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex gap-2">
              <Link
                to={`/purchase-order/bulk-po-upload?clientId=${clientId}`}
                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition ml-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload for {client?.clientName || "Client"}
              </Link>
              <Link
                to={`/purchase-order?clientId=${clientId}`}
                className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition"
              >
                <Plus className="h-4 w-4 mr-2" />
                New PO of {client?.clientName || "Client"}
              </Link>
            </div>
          </div>

          {/* ===================== SEARCH + ACTIONS ===================== */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search POs by number, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Advanced */}
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced
                {Object.keys(activeFilters).length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
                    {Object.keys(activeFilters).length - 1}
                  </span>
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchClientAndPOs}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {/* Clear */}
              {(searchQuery || Object.keys(activeFilters).length > 0) && (
                <button
                  onClick={handleClearSearch}
                  className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===================== STATS SECTION ===================== */}
        <div className="bg-gray-50 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total POs"
              value={totalPOs}
              icon={ShoppingCart}
              color="indigo"
            />
            <StatCard
              label="Pending"
              value={pendingPOs}
              icon={Clock}
              color="amber"
            />
            <StatCard
              label="Total Value"
              value={totalValue.toFixed(2)}
              icon={Banknote}
              color="green"
            />
            <StatCard
              label="Completed"
              value={completedPOs}
              icon={CheckCircle}
              color="emerald"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Advanced Search Modal – clientId is passed but we filter locally anyway */}
        <PurchaseOrderAdvancedSearch
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
          onClear={handleClearSearch}
          companyId={user?.company?._id}
          isLoading={loadingAdvanced}
          initialFilters={{ ...activeFilters, clientId }}
          clientId={clientId}
        />

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600 mb-3 text-xs">{error}</p>
            <button
              onClick={fetchClientAndPOs}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs"
            >
              Try Again
            </button>
          </div>
        )}

        {/* PO List – now only shows POs that truly belong to this client */}
        {purchaseOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700 mb-1">
              No purchase orders for this client
            </h3>
            <p className="text-gray-500 mb-4 text-xs">
              {searchQuery || Object.keys(activeFilters).length > 0
                ? "No POs match your criteria."
                : "Create the first purchase order for this client."}
            </p>
            <Link
              to={`/purchase-order?clientId=${clientId}`}
              className="px-4 py-2 bg-gradient-to-r from-neutral-600 to-neutral-700 text-white rounded-md inline-flex items-center text-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create New PO
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {purchaseOrders.map((po) => {
              const openAmount = getOpenAmount(po);
              const showClosedPaidAmount = shouldShowClosedPaidAmount(
                po,
                openAmount,
              );
              return (
              <div
                key={po._id}
                className="bg-white border border-gray-200 rounded-md overflow-hidden"
              >
                {/* PO Header – click to expand/collapse */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRowExpand(po._id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-neutral-50 p-1.5 rounded-md">
                      <ShoppingCart className="h-4 w-4 text-neutral-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {po.poNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(po.status)}`}
                        >
                          {po.status}
                        </span>
                        <Eye
                          className="h-3 w-3 text-blue-500 inline mr-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(po);
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-600">
                        <span>PO Date: {formatDate(po.poDate)}</span>
                        <span>Due: {po.deliveryDate}</span>
                        <span>{po.items?.length || 0} item(s)</span>
                      </div>
                    </div>
                  </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-gray-900">
                        {po.currency} {(po.totalAmount || 0).toFixed(2)}
                      </span>
                      {showClosedPaidAmount ? (
                        <span className="text-xs font-semibold text-gray-500 line-through">
                          {po.currency} {(po.totalAmount || 0).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-red-600">
                          Open: {po.currency} {openAmount.toFixed(2)} / {(po.totalAmount || 0).toFixed(2)}
                        </span>
                      )}
                      {expandedRows[po._id] ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Expanded Details – unchanged */}
                {expandedRows[po._id] && (
                  <div className="border-t border-gray-200 px-4 py-1.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Vendor Details */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700 flex items-center text-xs">
                          <User className="h-3 w-3 mr-1.5" />
                          Client Details
                        </h4>
                        <div className="space-y-1.5">
                          <div>
                            <p className="text-[10px] text-gray-500">Client</p>
                            <p className="font-medium text-xs truncate">
                              {po.client?.name || "-"}
                            </p>
                            <p className="text-[10px] text-gray-600 truncate">
                              {po.client?.address || "-"}
                            </p>
                            <p className="text-[10px] text-gray-600">
                              GSTIN: {po.client?.GSTIN || "N/A"} | State:{" "}
                              {po.client?.stateCode || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">
                              Deliver To
                            </p>
                            <p className="font-medium text-xs truncate">
                              {po.deliverTo?.name || "-"}
                            </p>
                            <p className="text-[10px] text-gray-600 truncate">
                              {po.deliverTo?.address || "-"}
                            </p>
                          </div>
                          {po.createdBy && (
                            <p className="text-[10px] text-gray-600">
                              Created by :{" "}
                              <span className="font-medium text-gray-800">
                                {po.createdBy?.name}
                              </span>
                            </p>
                          )}

                          {po.updatedBy && (
                            <p className="text-[10px] text-gray-600">
                              Updated by :{" "}
                              <span className="font-medium text-gray-800">
                                {po.updatedBy?.name}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-700 flex items-center text-xs">
                          <CreditCard className="h-3 w-3 mr-1.5" />
                          Financial Details
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-500">
                              Taxable Value
                            </p>
                            <p className="font-medium text-xs">
                              {(po.totalTaxableValue || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">
                              Total Tax
                            </p>
                            <p className="font-medium text-xs">
                              {calculateTotalTax(po)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">
                              Open Amount
                            </p>
                            <p className="font-medium text-xs truncate text-red-600">
                              {po.currency} {openAmount.toFixed(2)} / {(po.totalAmount || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500">
                              Delivery Date
                            </p>
                            <p className="font-medium text-xs">
                              {formatDate(po.deliveryDate)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tax Breakdown & Notes */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <h4 className="font-semibold text-gray-700 flex items-center text-xs">
                            <Banknote className="h-3 w-3 mr-1.5" />
                            Tax Breakdown
                          </h4>
                          {po.auditLogCount > 0 && (
                            <button
                              onClick={(e) => handleViewAuditLog(po, e)}
                              className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"
                            >
                              <History className="h-3 w-3 mr-1.5" />
                              Audit Trail ({po.auditLogCount})
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[10px] text-gray-600">
                              CGST
                            </span>
                            <span className="font-medium text-xs">
                              {(po.totalCGSTAmount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-gray-600">
                              SGST
                            </span>
                            <span className="font-medium text-xs">
                              {(po.totalSGSTAmount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-gray-600">
                              IGST
                            </span>
                            <span className="font-medium text-xs">
                              {(po.totalIGSTAmount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="border-t pt-1.5">
                            <div className="flex justify-between font-semibold text-xs">
                              <span>Total Amount</span>
                              <span className="text-natural-700">
                                {po.currency} {(po.totalAmount || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {po.notes && (
                          <div className="mt-2">
                            <p className="text-[10px] text-gray-500 mb-1">
                              Notes
                            </p>
                            <p className="text-[10px] text-gray-700 bg-gray-50 p-1.5 rounded">
                              {po.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-1 mt-4 pt-4 border-t border-gray-200">
                      <Link
                        to={`/purchase-order?edit=${po._id}`}
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1.5" />
                        Edit
                      </Link>
                      <button
                        onClick={(e) =>
                          handleDownloadPdf(po._id, po.poNumber, e)
                        }
                        className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        PDF
                      </button>
                      <button
                        onClick={(e) =>
                          handleDownloadWord(po._id, po.poNumber, e)
                        }
                        className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"
                      >
                        <Download className="h-3 w-3 mr-1.5" />
                        Word
                      </button>
                      <button
                        onClick={(e) => handleDelete(po._id, e)}
                        className="px-2.5 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1.5" />
                        Delete
                      </button>
                      <button className="px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs">
                        <Mail className="h-3 w-3 mr-1.5" />
                        Email
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <PurchaseOrderDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        purchaseOrderId={selectedPOForDetail?._id}
      />
      <PurchaseOrderAuditLogModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        poId={selectedPOForAudit?._id}
        poNumber={selectedPOForAudit?.poNumber}
        companyId={user?.company?._id}
      />
    </div>
  );
};

export default ClientPurchaseOrders;
