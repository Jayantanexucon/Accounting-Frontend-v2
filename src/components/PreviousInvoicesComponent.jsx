
import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import SideDialogBox from "../modals/SideDialogBox";
import { API } from "../apis/api";
import dayjs from "dayjs";
import AdvancedInvoiceSearch from "./AdvancedInvoiceSearch";
import CreateLedgerFromInvoiceModal from "../modals/CreateLedgerFromInvoiceModal";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import PaymentReceiptModal from "../modals/PaymentReceiptModal";
import PaymentHistoryModal from "../modals/PaymentHistoryModal";
import {
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  Calendar,
  User,
  Package,
  Banknote,
  Filter,
  Edit,
  Trash2,
  CreditCard,
  RefreshCw,
  Download,
  Mail,
  BookOpen,
  Percent,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckCircle,
  History,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function PreviousInvoicesComponent({ open, onClose }) {
  const { user } = useAuth();
  
  // State
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [filteredAllInvoices, setFilteredAllInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
    total: 0,
  });
  const [expandedRows, setExpandedRows] = useState({});
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [appliedFilters , setAppliedFilters] = useState({});
  const [createLedgerModal, setCreateLedgerModal] = useState({
    open: false,
    invoiceNo: "",
    invoiceData: null,
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    invoiceData: null,
  });
  const [paymentHistoryModal, setPaymentHistoryModal] = useState(false);
  const [tdsDetailsModalOpen, setTdsDetailsModalOpen] = useState(false);
  const [tdsDetailRows, setTdsDetailRows] = useState([]);
  const [tdsDetailsLoading, setTdsDetailsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  // Dropdown options
  const invoiceOptions = [...new Set(allInvoices.map((i) => i.invoiceNo))];
  const clientOptions = [...new Set(allInvoices.map((i) => i.billTo?.name))];

  // Fetch all invoices for dropdown options
  useEffect(() => {
    const fetchAllInvoices = async () => {
      try {
        const response = await API.get(`/invoices/getall/${user.company._id}`, {
          params: {
            companyId: user.company._id,
            approvalStatus: "Approved",
            page: 1,
            limit: 10000,
          },
        });
        setAllInvoices(response.data?.data || []);
      } catch (error) {
        console.error("Error fetching all invoices:", error);
      }
    };

    if (open && user?.company?._id) {
      fetchAllInvoices();
    }
  }, [open, user?.company?._id]);

  // Main fetch function
  const fetchInvoices = async () => {
    if (!user?.company?._id) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await API.get(`/invoices/getall/${user.company._id}`, {
        params: {
          companyId: user.company._id,
          page: pagination.page,
          limit: pagination.limit,
          approvalStatus: "Approved",
          sort: "-createdAt",
          ...advancedFilters,
        },
      });

      const invoicesData = response.data?.data || [];
      setInvoices(invoicesData);

      const allFilteredResponse = await API.get(
  `/invoices/getall/${user.company._id}`,
  {
    params: {
      companyId: user.company._id,
      page: 1,
      limit: 10000, // IMPORTANT
      approvalStatus: "Approved",
      sort: "-createdAt",
      ...advancedFilters, // 🔥 SAME FILTERS
    },
  }
);

setFilteredAllInvoices(allFilteredResponse.data?.data || []);

      if (response.data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages,
          page: response.data.pagination.currentPage || prev.page,
        }));
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError("Failed to fetch invoices");
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user?.company?._id) {
      fetchInvoices();
    }
  }, [pagination.page, pagination.limit, advancedFilters, open, user?.company?._id]);

  useEffect(() => {
    if (open && user?.company?._id) {
      fetchTdsDetails();
    }
  }, [open, user?.company?._id, advancedFilters]);

  // Helper functions
  const formatDate = (date) => (date ? dayjs(date).format("DD-MMM-YYYY") : "-");
  
  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getItemSummary = (items) => {
    if (!items || items.length === 0) return "No items";
    return `${items.length} item${items.length > 1 ? "s" : ""}`;
  };

  const getPaymentReceivedAmount = (payment = {}) =>
    Number(payment.receivedAmount ?? payment.amountReceived ?? payment.amountPaid ?? 0);

  const getPaymentTdsAmount = (payment = {}) =>
    Number(payment.tdsAdjusted ?? payment.tdsAmount ?? 0);

  const getPaymentSettledAmount = (payment = {}) =>
    Number(payment.grossAmount ?? getPaymentReceivedAmount(payment) + getPaymentTdsAmount(payment));

  // Calculate payment information
  const calculatePaymentInfo = (invoice) => {
    const invoiceAmount = invoice.netPayable || invoice.amountDue || 0;
    const payments = invoice.payments || [];

    const paymentsTotal = payments.reduce(
      (sum, payment) => sum + getPaymentSettledAmount(payment),
      0,
    );
    const totalTDSAdjusted = payments.reduce(
      (sum, payment) => sum + getPaymentTdsAmount(payment),
      0,
    );

    const totalReceived =
      payments.length > 0
        ? paymentsTotal
        : Number(
            invoice.paidAmount ??
              Math.max(0, invoiceAmount - Number(invoice.remainingAmount ?? invoiceAmount)),
          );
    const pendingAmount = Math.max(
      0,
      payments.length > 0
        ? invoiceAmount - totalReceived
        : Number(invoice.remainingAmount ?? invoiceAmount - totalReceived),
    );
    const completionPercentage = invoiceAmount > 0 ? (totalReceived / invoiceAmount) * 100 : 0;
    
    let paymentStatus = invoice.paymentStatus;
    if (!paymentStatus) {
      if (pendingAmount <= 0) {
        paymentStatus = "fully_paid";
      } else if (totalReceived > 0) {
        paymentStatus = "partially_paid";
      } else {
        paymentStatus = "unpaid";
      }
    }

    return {
      invoiceAmount,
      totalReceived,
      pendingAmount,
      totalTDSAdjusted,
      completionPercentage,
      paymentStatus,
      paymentCount: payments.length,
      lastPaymentDate: payments.length > 0 
        ? payments[payments.length - 1].paymentDate 
        : null
    };
  };

  const getTdsDetailRows = () => tdsDetailRows;

  const fetchTdsDetails = async () => {
    if (!user?.company?._id) return;

    setTdsDetailsLoading(true);
    try {
      const response = await API.get("/tds-report", {
        params: {
          companyId: user.company._id,
          fromDate: advancedFilters.invoiceDateFrom || advancedFilters.fromDate,
          toDate: advancedFilters.invoiceDateTo || advancedFilters.toDate,
        },
      });

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const filteredRows = rows.filter((row) => {
        const matchesInvoice =
          !advancedFilters.invoiceNo ||
          String(row.invoiceNo || "").toLowerCase().includes(String(advancedFilters.invoiceNo).toLowerCase());
        const matchesClient =
          !advancedFilters.clientName ||
          String(row.clientName || "").toLowerCase().includes(String(advancedFilters.clientName).toLowerCase());

        return matchesInvoice && matchesClient;
      });

      setTdsDetailRows(
        filteredRows.map((row) => ({
          invoiceNo: row.invoiceNo || "-",
          clientName: row.clientName || "-",
          paymentDate: row.paymentDate || null,
          reference: row.reference || "-",
          receivedAmount: Number(row.receivedAmount || 0),
          tdsAmount: Number(row.tdsAmount || 0),
          settledAmount: Number(
            row.settledAmount || Number(row.receivedAmount || 0) + Number(row.tdsAmount || 0),
          ),
        })),
      );
    } catch (error) {
      console.error("Error fetching TDS details:", error);
      setTdsDetailRows([]);
    } finally {
      setTdsDetailsLoading(false);
    }
  };

  const handleGenerateTdsReport = () => {
    const rows = getTdsDetailRows();
    if (!rows.length) {
      toast.error("No TDS data available to export");
      return;
    }

    const exportRows = rows.map((row) => ({
      "Invoice No": row.invoiceNo,
      Client: row.clientName,
      "Payment Date": formatDate(row.paymentDate),
      Reference: row.reference,
      "Received Amount": row.receivedAmount,
      "TDS Amount": row.tdsAmount,
      "Settled Amount": row.settledAmount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TDS Report");
    XLSX.writeFile(workbook, `tds-report-${dayjs().format("DD-MMM-YYYY")}.xlsx`);
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus, pendingAmount) => {
    switch (paymentStatus) {
      case "fully_paid":
        return {
          text: "Paid",
          color: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle2,
          iconColor: "text-green-600"
        };
      case "partially_paid":
        return {
          text: `₹${formatAmount(pendingAmount)} Pending`,
          color: "bg-amber-100 text-amber-800 border-amber-200",
          icon: Clock,
          iconColor: "text-amber-600"
        };
      case "unpaid":
      default:
        return {
          text: "Unpaid",
          color: "bg-red-100 text-red-800 border-red-200",
          icon: AlertTriangle,
          iconColor: "text-red-600"
        };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "border-green-500 text-green-600 bg-green-200";
      case "inprogress":
        return "border-yellow-500 text-yellow-600 bg-yellow-200";
      case "completed":
        return "border-gray-400 text-gray-600 bg-gray-300";
      default:
        return "border-gray-300 text-gray-500";
    }
  };

  // Event handlers
  const handleRefreshAndClear = async () => {
    try {
      setAdvancedFilters({});
      setAppliedFilters({});
      setPagination((prev) => ({ ...prev, page: 1 }));
      setFilteredAllInvoices([]);
      // await fetchInvoices();
      toast.success("Refreshed and cleared filters");
    } catch (error) {
      toast.error("Failed to refresh");
    }
  };

  const handleAdvancedSearch = (filters) => {
    setAdvancedFilters(filters);
    setAppliedFilters(filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setShowAdvancedSearch(false);
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const toggleRowExpand = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRowClick = (invoice) => {
    setExpandedRows((prev) => ({
      ...prev,
      [invoice._id]: !prev[invoice._id],
    }));
  };

  // Delete invoice
  const handleDeleteClick = (invoice, e) => {
    e.stopPropagation();
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;

    try {
      await API.delete(`/invoices/delete/${invoiceToDelete._id}`);
      setDeleteDialogOpen(false);
      fetchInvoices();
      toast.success("Invoice deleted successfully");
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  // Download functions
  const handleDownloadPdf = async (invoiceId, invoiceNo, e) => {
    e.stopPropagation();
    try {
      const response = await API.get(`/invoices/${invoiceId}/download/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadWord = async (invoiceId, invoiceNo, e) => {
    e.stopPropagation();
    try {
      const response = await API.get(`/invoices/${invoiceId}/download/word`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoiceNo}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Word document downloaded successfully");
    } catch (error) {
      console.error("Error downloading Word document:", error);
      toast.error("Failed to download Word document");
    }
  };

  const handleEditClick = (invoiceId, e) => {
    e.stopPropagation();
  };

  // Create ledger from invoice
  const handleCreateLedgerClick = async (invoice, e) => {
    e.stopPropagation();

    if (invoice.salesJournalId) {
      toast.info("Sales journal already posted for this invoice");
      return;
    }

    try {
      const response = await API.get(`/invoices/get/${invoice._id}`);
      const fullInvoiceData = response.data?.data || invoice;

      setCreateLedgerModal({
        open: true,
        invoiceNo: invoice.invoiceNo,
        invoiceData: fullInvoiceData,
      });
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to load invoice details");
    }
  };

  const handleLedgerCreated = (newLedger) => {
    toast.success("Journal posted successfully!");
    fetchInvoices();
    setCreateLedgerModal({
      open: false,
      invoiceNo: null,
      invoiceData: null,
    });
  };

  // Record payment
  const handleRecordPayment = (invoice, e) => {
    e.stopPropagation();

    if (!invoice.salesJournalId) {
      toast.error("Please post the sales journal first before recording payments");
      return;
    }

    const paymentInfo = calculatePaymentInfo(invoice);
    if (paymentInfo.pendingAmount <= 0) {
      toast.info("This invoice is already fully paid");
      return;
    }

    setPaymentModal({
      open: true,
      invoiceData: invoice,
    });
  };

  const handlePaymentRecorded = (paymentData) => {
    toast.success(`Payment of ₹${paymentData.receivedAmount} recorded successfully!`);
    fetchInvoices();
    setPaymentModal({
      open: false,
      invoiceData: null,
    });
  };

  // Statistics
 const getInvoiceSummary = () => {
   const filteredInvoices = filteredAllInvoices; 
   
   if (filteredInvoices.length === 0) {
     return {
       totalAmount: 0,
       totalPendingAmount: 0,
       totalReceivedAmount: 0,
       pendingInvoices: 0,
       overdueInvoices: 0,
       totalInvoices: 0,
       totalTDS: 0,
     };
   }
   
   const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0);
   
   let totalPendingAmount = 0;
   let totalReceivedAmount = 0;
   
   filteredInvoices.forEach(invoice => {
     const paymentInfo = calculatePaymentInfo(invoice);
     totalPendingAmount += paymentInfo.pendingAmount;
     totalReceivedAmount += paymentInfo.totalReceived;
   });
   
   const pendingInvoices = filteredInvoices.filter((inv) => {
     const paymentInfo = calculatePaymentInfo(inv);
     return paymentInfo.pendingAmount > 0 && 
            (inv.status === "active" || inv.status === "inprogress") && 
            dayjs(inv.dueDate).isAfter(dayjs());
   }).length;
   
   const overdueInvoices = filteredInvoices.filter((inv) => {
     const paymentInfo = calculatePaymentInfo(inv);
     return paymentInfo.pendingAmount > 0 && 
            (inv.status === "active" || inv.status === "inprogress") && 
            dayjs(inv.dueDate).isBefore(dayjs());
   }).length;
   
   const totalTDS = tdsDetailRows.reduce((sum, row) => sum + row.tdsAmount, 0);
 
   return {
     totalAmount,
     totalPendingAmount,
     totalReceivedAmount,
     pendingInvoices,
     overdueInvoices,
     totalInvoices: filteredInvoices.length,
     totalTDS,
   };
 };

  const summary = getInvoiceSummary();

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  // Check if sales journal is posted
  const isJournalPosted = (invoice) => {
    return !!invoice.salesJournalId;
  };

  // Render content for side dialog
  const renderContent = () => {
    return (
      <div className="min-h-screen bg-gray-300 text-xs">
        {/* Header inside side dialog */}
        <div className="bg-gray-200 border-b border-gray-200 shadow-sm mb-4">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAdvancedSearch(true)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center text-xs"
                >
                  <Filter className="h-4 w-4 mr-1.5" />
                  Advanced Search
                </button>
                <button
                  onClick={handleRefreshAndClear}
                  disabled={loading}
                  className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center disabled:opacity-50 text-xs"
                >
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {Object.keys(appliedFilters).length > 0 && (
  <div className="px-2 sm:px-4 lg:px-6 pb-4">
    <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-[11px] text-blue-800 flex flex-wrap gap-2">
      <span className="font-semibold">Showing results for:</span>

      {appliedFilters.invoiceNo && (
        <span className="bg-white px-2 py-0.5 rounded border">
          Invoice: {appliedFilters.invoiceNo}
        </span>
      )}

      {appliedFilters.clientName && (
        <span className="bg-white px-2 py-0.5 rounded border">
          Client: {appliedFilters.clientName}
        </span>
      )}

      {appliedFilters.paymentStatus && (
        <span className="bg-white px-2 py-0.5 rounded border">
          Payment Status: {appliedFilters.paymentStatus.replace("_", " ")}
        </span>
      )}

      {appliedFilters.journalPosted && (  
        <span className="bg-white px-2 py-0.5 rounded border">
          Journal Posted: {appliedFilters.journalPosted}
        </span>
      )}

      {appliedFilters.invoiceDateFrom && (
        <span className="bg-white px-2 py-0.5 rounded border">
          Invoice Date: {appliedFilters.invoiceDateFrom} → {appliedFilters.invoiceDateTo}
        </span>
      )}

      {appliedFilters.createdAtFrom && (
        <span className="bg-white px-2 py-0.5 rounded border">
          Created: {appliedFilters.createdAtFrom} → {appliedFilters.createdAtTo}
        </span>
      )}

      {appliedFilters.salesJournalPostedAtFrom && (
        <span className="bg-white px-2 py-0.5 rounded border">
          Posted: {appliedFilters.salesJournalPostedAtFrom} → {appliedFilters.salesJournalPostedAtTo}
        </span>
      )}
    </div>
  </div>
)}

        {/* Stats Summary */}
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            <div className="bg-gray-200 p-2 rounded-md border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-600">Total Invoices</p>
                  <p className="text-sm font-semibold text-gray-900">{summary.totalInvoices || 0}</p>
                </div>
                <div className="bg-blue-100 p-1 rounded-md">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-200 p-2 rounded-md border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-600">Total Received</p>
                  <p className="text-sm font-bold text-green-600">₹{formatAmount(summary.totalReceivedAmount)}</p>
                </div>
                <div className="bg-green-100 p-1 rounded-md">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-200 p-2 rounded-md border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-600">Pending Payment</p>
                  <p className="text-sm font-bold text-amber-600">₹{formatAmount(summary.totalPendingAmount)}</p>
                  <p className="text-[9px] text-gray-500">{summary.pendingInvoices || 0} invoices</p>
                </div>
                <div className="bg-amber-100 p-1 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-gray-200 p-2 rounded-md border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-600">Total Revenue</p>
                  <p className="text-sm font-bold text-neutral-700">₹{formatAmount(summary.totalAmount)}</p>
                </div>
                <div className="bg-neutral-100 p-1 rounded-md">
                  <Banknote className="h-4 w-4 text-neutral-700" />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTdsDetailsModalOpen(true)}
              className="bg-gray-200 p-2 rounded-md border border-gray-200 shadow-xs text-left transition hover:bg-purple-50 hover:border-purple-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-600">Total TDS</p>
                  <p className="text-sm font-bold text-purple-600">₹{formatAmount(summary.totalTDS)}</p>
                  <p className="text-[9px] text-gray-500">Click to view detailed list</p>
                </div>
                <div className="bg-purple-100 p-1 rounded-md">
                  <Percent className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-natural-600 mb-3"></div>
              <p className="text-gray-600 text-xs">Loading invoices...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 mb-3 text-xs">{error}</p>
              <button onClick={fetchInvoices} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs">
                Try Again
              </button>
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="bg-gray-100 rounded-lg shadow-xs border border-gray-200 p-6 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-700 mb-1">No invoices found</h3>
              <p className="text-gray-500 mb-4 text-xs">No invoices available.</p>
            </div>
          ) : (
            <>
              {/* Invoice List */}
              <div className="space-y-1.5 mb-4">
                {invoices.map((invoice) => {
                  const paymentInfo = calculatePaymentInfo(invoice);
                  const paymentBadge = getPaymentStatusBadge(paymentInfo.paymentStatus, paymentInfo.pendingAmount);
                  const PaymentIcon = paymentBadge.icon;
                  const journalPosted = isJournalPosted(invoice);

                  return (
                    <div
                      key={invoice._id}
                      className="bg-gray-100 rounded-md border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => handleRowClick(invoice)}
                    >
                      {/* Invoice Header */}
                      <div className="p-2.5 text-xs">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5">
                          {/* Left Section */}
                          <div className="flex items-start space-x-3">
                            <div className="bg-neutral-50 p-2 rounded-md">
                              <Receipt className="h-4 w-4 text-neutral-700" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 mb-0.5">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">{invoice.invoiceNo || "N/A"}</h3>
                                {/* <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${getStatusColor(invoice.status)}`}>
                                  {invoice.status}
                                </span> */}
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border flex items-center gap-1 ${paymentBadge.color}`}>
                                  <PaymentIcon className={`h-3 w-3 ${paymentBadge.iconColor}`} />
                                  {paymentBadge.text}
                                </span>
                                {invoice.tdsAmount > 0 && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-purple-500 text-purple-600 bg-purple-100">
                                    TDS: ₹{formatAmount(invoice.tdsAmount)}
                                  </span>
                                )}
                                {journalPosted && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full border border-green-500 text-green-600 bg-green-100">
                                    Journal Posted
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(invoice.invoiceDate)}
                                </div>
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-1" />
                                  <span className="truncate max-w-[120px]">{invoice.billTo?.name || "No client"}</span>
                                </div>
                                <div className="flex items-center">
                                  <Package className="h-3 w-3 mr-1" />
                                  {getItemSummary(invoice.items)}
                                </div>
                                <div className="flex items-center">
                                  <Banknote className="h-3 w-3 mr-1" />
                                  <span className="font-medium">
                                    {paymentInfo.paymentCount > 0 ? `${paymentInfo.paymentCount} payment${paymentInfo.paymentCount > 1 ? 's' : ''}` : 'No payments'}
                                  </span>
                                </div>
                              </div>
                              {invoice.createdBy?.name && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1 text-green-6 00" />
                                  <span className="truncate max-w-[120px]">
                                    {invoice.createdBy?.name}
                                  </span>
                              </div>
                              )}
                            </div>
                          </div>

                          {/* Right Section */}
                          <div className="flex items-center justify-between lg:justify-end mt-1.5 lg:mt-0 lg:space-x-3">
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-2 mb-1">
                                <div className="text-[10px] text-gray-600">Paid: ₹{formatAmount(paymentInfo.totalReceived)}</div>
                                <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${paymentInfo.completionPercentage === 100 ? 'bg-green-500' : paymentInfo.completionPercentage > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(paymentInfo.completionPercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <div className="text-[10px] text-gray-600">{paymentInfo.completionPercentage.toFixed(0)}%</div>
                              </div>

                              <p className="text-[10px] text-gray-600">Amount Due / Pending</p>
                              <div className="flex items-baseline gap-1">
                                <p className="text-sm font-bold text-gray-900">
                                  {invoice.currency || "₹"} {formatAmount(invoice.amountDue || 0)}
                                </p>
                                {paymentInfo.pendingAmount > 0 && (
                                  <p className="text-xs font-semibold text-red-600">
                                    → ₹{formatAmount(paymentInfo.pendingAmount)}
                                  </p>
                                )}
                              </div>

                              {invoice.tdsAmount > 0 && (
                                <p className="text-[10px] text-purple-600 mt-0.5">
                                  TDS: {invoice.currency || "₹"} {formatAmount(invoice.tdsAmount || 0)}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => toggleRowExpand(invoice._id, e)}
                              className="p-1 hover:bg-gray-100 rounded-md"
                            >
                              {expandedRows[invoice._id] ? (
                                <ChevronUp className="h-4 w-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details - SAME AS InvoiceData.jsx */}
                      {expandedRows[invoice._id] && (
                        <div className="border-t border-gray-200 px-4 py-1.5">
                          {/* Accounting Bill Format */}
                          <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left Column - Invoice Details */}
                              <div>
                                <h4 className="font-bold text-gray-800 text-sm mb-3 border-b pb-2">Invoice Details</h4>
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] text-gray-500">Invoice Number</p>
                                    <p className="font-semibold text-xs">{invoice.invoiceNo || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-500">Invoice Date</p>
                                    <p className="font-semibold text-xs">{formatDate(invoice.invoiceDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-500">Due Date</p>
                                    <p className="font-semibold text-xs">{formatDate(invoice.dueDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-500">Payment Terms</p>
                                    <p className="font-semibold text-xs">{invoice.paymentTerms || "Net 30 Days"}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-gray-500">Currency</p>
                                    <p className="font-semibold text-xs">{invoice.currency || "INR (₹)"}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column - Amount Summary */}
                              <div>
                                <h4 className="font-bold text-gray-800 text-sm mb-3 border-b pb-2">Amount Summary</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-gray-600">Subtotal (Taxable Value)</span>
                                    <span className="font-semibold text-xs">₹{formatAmount(invoice.totalTaxableValue || invoice.amountDue || 0)}</span>
                                  </div>
                                  {invoice.totalCGSTAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-600">CGST</span>
                                      <span className="font-semibold text-xs">₹{formatAmount(invoice.totalCGSTAmount)}</span>
                                    </div>
                                  )}
                                  {invoice.totalSGSTAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-600">SGST</span>
                                      <span className="font-semibold text-xs">₹{formatAmount(invoice.totalSGSTAmount)}</span>
                                    </div>
                                  )}
                                  {invoice.totalIGSTAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-gray-600">IGST</span>
                                      <span className="font-semibold text-xs">₹{formatAmount(invoice.totalIGSTAmount)}</span>
                                    </div>
                                  )}
                                  {invoice.tdsAmount > 0 && (
                                    <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-2">
                                      <span className="text-[10px] text-purple-600 font-semibold">TDS Deduction</span>
                                      <span className="font-semibold text-xs text-purple-600">- ₹{formatAmount(invoice.tdsAmount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                                    <span className="text-xs font-bold text-gray-800">Total Amount Due</span>
                                    <span className="text-sm font-bold text-gray-900">₹{formatAmount(invoice.amountDue || 0)}</span>
                                  </div>
                                  {invoice.netPayable && invoice.netPayable !== invoice.amountDue && (
                                    <div className="flex justify-between items-center border-t border-dashed border-gray-300 pt-2">
                                      <span className="text-[10px] text-gray-600">Net Payable (After TDS)</span>
                                      <span className="text-xs font-semibold text-green-600">₹{formatAmount(invoice.netPayable)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Client and Payment Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            {/* Client Details */}
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Client Information
                              </h4>
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-medium text-gray-600 w-1/3">Client Name</td>
                                    <td className="py-2 px-1 font-semibold">{invoice.billTo?.name || "-"}</td>
                                  </tr>
                                  <tr className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-medium text-gray-600">Address</td>
                                    <td className="py-2 px-1">{invoice.billTo?.address || "-"}</td>
                                  </tr>
                                  {invoice.billTo?.GSTIN && (
                                    <tr className="border-b border-gray-200">
                                      <td className="py-2 px-1 font-medium text-gray-600">GSTIN</td>
                                      <td className="py-2 px-1 font-mono">{invoice.billTo.GSTIN}</td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td className="py-2 px-1 font-medium text-gray-600">Ship To</td>
                                    <td className="py-2 px-1">{invoice.shipTo?.name || "-"}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Payment Summary */}
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Payment Summary
                              </h4>
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-medium text-gray-600 w-1/3">Total Invoice</td>
                                    <td className="py-2 px-1 font-semibold text-green-700">₹{formatAmount(paymentInfo.invoiceAmount)}</td>
                                  </tr>
                                  <tr className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-medium text-gray-600">Total Received</td>
                                    <td className="py-2 px-1 font-semibold text-blue-700">₹{formatAmount(paymentInfo.totalReceived)}</td>
                                  </tr>
                                  <tr className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-medium text-gray-600">Pending Amount</td>
                                    <td className="py-2 px-1 font-semibold text-amber-700">₹{formatAmount(paymentInfo.pendingAmount)}</td>
                                  </tr>
                                  <tr className="border-b border-gray-200">
                                    <td className="py-2 px-1 font-medium text-gray-600">TDS Adjusted</td>
                                    <td className="py-2 px-1 font-semibold text-purple-700">₹{formatAmount(paymentInfo.totalTDSAdjusted)}</td>
                                  </tr>
                                  <tr>
                                    <td className="py-2 px-1 font-medium text-gray-600">Completion</td>
                                    <td className="py-2 px-1">
                                      <div className="flex items-center">
                                        <span className="font-semibold mr-2">{paymentInfo.completionPercentage.toFixed(1)}%</span>
                                        <div className="h-2 w-20 bg-gray-200 rounded-full overflow-hidden flex-1">
                                          <div
                                            className={`h-full ${paymentInfo.completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(paymentInfo.completionPercentage, 100)}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Payment History Table */}
                          {invoice.payments && invoice.payments.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h4 className="font-semibold text-gray-700 flex items-center text-sm mb-3">
                                <History className="h-4 w-4 mr-2" />
                                Recent Payments ({invoice.payments.length})
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-gray-200 rounded-lg">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="py-2 px-3 text-left font-medium text-gray-700 border-b">Date</th>
                                      <th className="py-2 px-3 text-left font-medium text-gray-700 border-b">Mode</th>
                                      <th className="py-2 px-3 text-left font-medium text-gray-700 border-b">Reference</th>
                                      <th className="py-2 px-3 text-right font-medium text-gray-700 border-b">Amount</th>
                                      <th className="py-2 px-3 text-right font-medium text-gray-700 border-b">TDS</th>
                                      <th className="py-2 px-3 text-center font-medium text-gray-700 border-b">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...invoice.payments]
                                      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                                      .slice(0, 3)
                                      .map((payment, index) => (
                                        <tr key={payment._id || index} className="hover:bg-gray-50">
                                          <td className="py-2 px-3 border-b border-gray-100">{formatDate(payment.paymentDate)}</td>
                                          <td className="py-2 px-3 border-b border-gray-100">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px]">
                                              {payment.paymentMode || "N/A"}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 border-b border-gray-100 font-mono">{payment.referenceNumber || "-"}</td>
                                          <td className="py-2 px-3 border-b border-gray-100 text-right font-bold text-green-600">
                                            ₹{formatAmount(getPaymentReceivedAmount(payment))}
                                          </td>
                                          <td className="py-2 px-3 border-b border-gray-100 text-right text-purple-600">
                                            {getPaymentTdsAmount(payment) > 0 ? `₹${formatAmount(getPaymentTdsAmount(payment))}` : "-"}
                                          </td>
                                          <td className="py-2 px-3 border-b border-gray-100 text-center">
                                            <span
                                              className={`px-2 py-1 rounded text-[10px] ${
                                                payment.status === "posted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                                              }`}
                                            >
                                              {payment.status || "recorded"}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                                {invoice.payments.length > 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedInvoice(invoice);
                                      setPaymentHistoryModal(true);
                                    }}
                                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    View all {invoice.payments.length} payments →
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                            <Link
                              to={`/master-data/manual-invoice?edit=${invoice._id}`}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center text-xs"
                              onClick={(e) => handleEditClick(invoice._id, e)}
                            >
                              <Edit className="h-3 w-3 mr-1.5" />
                              Edit Invoice
                            </Link>

                            <button
                              onClick={(e) => handleDownloadPdf(invoice._id, invoice.invoiceNo, e)}
                              className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"
                            >
                              <Download className="h-3 w-3 mr-1.5" />
                              Download PDF
                            </button>

                            <button
                              onClick={(e) => handleDownloadWord(invoice._id, invoice.invoiceNo, e)}
                              className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 flex items-center text-xs"
                            >
                              <Download className="h-3 w-3 mr-1.5" />
                              Download Word
                            </button>

                            {/* Post Sales Journal Button */}
                            {!invoice.salesJournalId && (
                              <button
                                onClick={(e) => handleCreateLedgerClick(invoice, e)}
                                className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 flex items-center text-xs"
                              >
                                <BookOpen className="h-3 w-3 mr-1.5" />
                                Post Sales Journal
                              </button>
                            )}

                            {/* Journal Posted Indicator */}
                            {invoice.salesJournalId && (
                              <div className="px-3 py-1.5 bg-green-50 text-green-600 rounded-md flex items-center text-xs border border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1.5" />
                                Sales Journal Posted
                              </div>
                            )}

                            {/* Receive Payment Button */}
                            {invoice.salesJournalId && paymentInfo.pendingAmount > 0 && (
                              <button
                                onClick={(e) => handleRecordPayment(invoice, e)}
                                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-md hover:bg-green-100 flex items-center text-xs"
                              >
                                <Banknote className="h-3 w-3 mr-1.5" />
                                Receive Payment
                              </button>
                            )}

                            {/* Fully Paid Indicator */}
                            {paymentInfo.pendingAmount <= 0 && paymentInfo.totalReceived > 0 && (
                              <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md flex items-center text-xs border border-green-200 font-semibold">
                                <CheckCircle className="h-3 w-3 mr-1.5" />
                                Fully Paid ✓
                              </div>
                            )}

                            {/* View Payment History Button */}
                            {invoice.payments && invoice.payments.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                  setPaymentHistoryModal(true);
                                }}
                                className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 flex items-center text-xs"
                              >
                                <History className="h-3 w-3 mr-1.5" />
                                Payment History ({invoice.payments.length})
                              </button>
                            )}

                            <button
                              onClick={(e) => handleDeleteClick(invoice, e)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-1.5" />
                              Delete
                            </button>

                            <button className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 flex items-center text-xs">
                              <Mail className="h-3 w-3 mr-1.5" />
                              Email Invoice
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} invoices
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <ChevronUp className="h-3 w-3 mr-1 transform -rotate-90" />
                      Previous
                    </button>

                    <div className="flex items-center space-x-1">
                      {generatePageNumbers().map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1.5 text-xs min-w-8 rounded-md ${pagination.page === pageNum ? "bg-neutral-700 text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                        <>
                          <span className="text-gray-400 px-1">...</span>
                          <button
                            onClick={() => handlePageChange(pagination.totalPages)}
                            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            {pagination.totalPages}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      Next
                      <ChevronUp className="h-3 w-3 ml-1 transform rotate-90" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-600 flex items-center">
                    <span className="mr-2">Rows per page:</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => {
                        setPagination((prev) => ({
                          ...prev,
                          limit: parseInt(e.target.value),
                          page: 1,
                        }));
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    >
                      {[5, 10, 25, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <SideDialogBox open={open} onClose={onClose} title="Previous Invoices" subtitle="View and manage all your invoices" contents={renderContent()} width="max-w-6xl" />

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-md max-w-sm w-full">
            <div className="p-5">
              <div className="flex items-center mb-3">
                <div className="bg-red-100 p-1.5 rounded-md mr-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Delete Invoice</h3>
              </div>
              <p className="text-gray-600 mb-5 text-xs">
                Are you sure you want to delete invoice{" "}
                <span className="font-semibold text-natural-700">{invoiceToDelete?.invoiceNo}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setDeleteDialogOpen(false)} className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-xs">
                  Cancel
                </button>
                <button onClick={handleDeleteConfirm} className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <AdvancedInvoiceSearch
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onSearch={handleAdvancedSearch}
          invoiceNumbers={invoiceOptions}
          clientNames={clientOptions}
        />
      )}

      {/* Create Ledger from Invoice Modal */}
      {createLedgerModal.open && (
        <CreateLedgerFromInvoiceModal
          open={createLedgerModal.open}
          onClose={() => setCreateLedgerModal({ open: false, invoiceNo: "", invoiceData: null })}
          onSuccess={handleLedgerCreated}
          initialInvoiceNo={createLedgerModal.invoiceNo}
          invoiceData={createLedgerModal.invoiceData}
        />
      )}

      {/* Payment Receipt Modal */}
      {paymentModal.open && (
        <PaymentReceiptModal
          open={paymentModal.open}
          onClose={() => setPaymentModal({ open: false, invoiceData: null })}
          onSuccess={handlePaymentRecorded}
          invoiceData={paymentModal.invoiceData}
        />
      )}

      {/* Payment History Modal */}
      {paymentHistoryModal && selectedInvoice && (
        <PaymentHistoryModal
          open={paymentHistoryModal}
          onClose={() => {
            setPaymentHistoryModal(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
          paymentHistory={selectedInvoice.payments || []}
        />
      )}

      {tdsDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Total TDS Details</h3>
                <p className="text-xs text-slate-500 mt-1">Complete list of TDS-adjusted payments</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateTdsReport}
                  className="px-3 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => setTdsDetailsModalOpen(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {["Invoice", "Client", "Payment Date", "Reference", "Received", "TDS", "Settlement"].map((label) => (
                      <th key={label} className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-widest">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tdsDetailsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Loading TDS details...
                      </td>
                    </tr>
                  ) : getTdsDetailRows().length > 0 ? (
                    getTdsDetailRows().map((row, index) => (
                      <tr key={`${row.invoiceNo}-${row.reference}-${index}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{row.invoiceNo}</td>
                        <td className="px-4 py-3 text-slate-700">{row.clientName}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.paymentDate)}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{row.reference}</td>
                        <td className="px-4 py-3 text-emerald-700 font-bold tabular-nums">{formatAmount(row.receivedAmount)}</td>
                        <td className="px-4 py-3 text-violet-700 font-bold tabular-nums">{formatAmount(row.tdsAmount)}</td>
                        <td className="px-4 py-3 text-slate-900 font-bold tabular-nums">{formatAmount(row.settledAmount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No TDS-adjusted payments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
