
import React, { useMemo } from "react";
import dayjs from "dayjs";
import {
  CheckCircle,
  X,
  Receipt,
  User,
  Calendar,
  Package,
  CreditCard,
  Banknote,
  Percent,
  FileText,
  Edit,
} from "lucide-react";

const InvoiceCreatedModal = ({ open, onClose, invoice, isEdit = false }) => {
  const displayInvoice = useMemo(() => {
    if (!invoice) return null;

    if (isEdit && invoice.ref && invoice.ref.length > 0) {
      const latestVersion = invoice.ref[invoice.ref.length - 1];
      if (latestVersion.snapshot) {
        return {
          ...invoice,
          ...latestVersion.snapshot,
          _id: invoice._id,
          invoiceNo: invoice.invoiceNo || latestVersion.snapshot.invoiceNo,
          companyId: invoice.companyId,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        };
      }
    }

    return invoice;
  }, [invoice, isEdit]);

  if (!open || !displayInvoice) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return dayjs(dateString).format("DD-MMM-YYYY");
    } catch (error) {
      return "-";
    }
  };

  const calculateTotalTax = (inv) => {
    if (!inv) return "0.00";
    const cgst = inv.totalCGSTAmount || 0;
    const sgst = inv.totalSGSTAmount || 0;
    const igst = inv.totalIGSTAmount || 0;
    return (cgst + sgst + igst).toFixed(2);
  };

  const getStatusText = (status) => {
    const statusMap = {
      DRAFT: "Draft",
      POSTED: "Posted",
      PARTIALLY_PAID: "Partially Paid",
      PAID: "Paid",
      RECONCILED: "Reconciled",
      pending: "Pending",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status || "Active";
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        {/* Modal Content */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-auto overflow-hidden">
          {/* Header - Different colors for create vs edit */}
          <div className={`px-6 py-5 text-white ${
            isEdit 
              ? "bg-gradient-to-r from-blue-600 to-blue-800" 
              : "bg-gradient-to-r from-green-600 to-green-800"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  {isEdit ? (
                    <Edit className="h-6 w-6" />
                  ) : (
                    <CheckCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {isEdit ? "Invoice Updated Successfully" : "Invoice Created Successfully"}
                  </h2>
                  <p className="text-white/90 text-sm mt-1">
                    {isEdit 
                      ? `Invoice #${displayInvoice.invoiceNo || "N/A"} has been updated`
                      : `Invoice #${displayInvoice.invoiceNo || "N/A"} has been saved to the system`
                    }
                    {isEdit && " and is pending approval"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Invoice Summary Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-3 rounded-lg ${
                    isEdit ? "bg-blue-100" : "bg-green-100"
                  }`}>
                    <Receipt className={`h-6 w-6 ${
                      isEdit ? "text-blue-600" : "text-green-600"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {displayInvoice.invoiceNo || "N/A"}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        displayInvoice.status === 'active' ? 'bg-green-100 text-green-800' :
                        displayInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        displayInvoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        displayInvoice.status === 'inprogress' ? 'bg-blue-100 text-blue-800' :
                        displayInvoice.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                        displayInvoice.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {getStatusText(displayInvoice.status)}
                      </span>
                      {isEdit && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        {formatDate(displayInvoice.invoiceDate)}
                      </div>
                      <div className="flex items-center">
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        <span className="max-w-[150px] truncate">
                          {displayInvoice.billTo?.name || 
                           displayInvoice.billTo || 
                           "No client"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayInvoice.currency || "₹"} {(displayInvoice.amountDue || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Due: {formatDate(displayInvoice.dueDate)}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Taxable Value</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {displayInvoice.currency || "₹"} {(displayInvoice.totalTaxableValue || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Tax</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {displayInvoice.currency || "₹"} {calculateTotalTax(displayInvoice)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <Banknote className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Items</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {displayInvoice.items?.length || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <Package className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* TDS Display (if applicable) */}
            {(displayInvoice.tdsAmount > 0 || displayInvoice.totalTDSAmount > 0) && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Percent className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-purple-700">TDS Amount</p>
                      <p className="text-xs text-purple-600">Tax Deducted at Source</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-700">
                    {displayInvoice.currency || "₹"} {(
                      displayInvoice.tdsAmount || 
                      displayInvoice.totalTDSAmount || 
                      0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Client Details */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <h4 className="text-sm font-medium text-gray-700">Bill To</h4>
                  </div>
                  <p className="font-medium text-gray-900">
                    {displayInvoice.billTo?.name || 
                     (typeof displayInvoice.billTo === 'string' ? displayInvoice.billTo : "N/A")}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {displayInvoice.billTo?.address || 
                     (typeof displayInvoice.billTo === 'object' && displayInvoice.billTo.address) || 
                     "-"}
                  </p>
                  {(displayInvoice.billTo?.GSTIN || displayInvoice.billTo?.gstin) && (
                    <p className="text-xs text-gray-500 mt-2">
                      GSTIN: {displayInvoice.billTo.GSTIN || displayInvoice.billTo.gstin}
                    </p>
                  )}
                </div>
                
                {(displayInvoice.shipTo?.name || displayInvoice.shipTo) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <h4 className="text-sm font-medium text-gray-700">Ship To</h4>
                    </div>
                    <p className="font-medium text-gray-900">
                      {displayInvoice.shipTo?.name || 
                       (typeof displayInvoice.shipTo === 'string' ? displayInvoice.shipTo : "N/A")}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {displayInvoice.shipTo?.address || 
                       (typeof displayInvoice.shipTo === 'object' && displayInvoice.shipTo.address) || 
                       "-"}
                    </p>
                    {(displayInvoice.shipTo?.GSTIN || displayInvoice.shipTo?.gstin) && (
                      <p className="text-xs text-gray-500 mt-2">
                        GSTIN: {displayInvoice.shipTo.GSTIN || displayInvoice.shipTo.gstin}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Due Date</p>
                  <p className="font-medium text-gray-900">{formatDate(displayInvoice.dueDate)}</p>
                </div>
                {displayInvoice.paymentMode && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment Mode</p>
                    <p className="font-medium text-gray-900">{displayInvoice.paymentMode}</p>
                  </div>
                )}
                {((displayInvoice.tdsAmount || displayInvoice.totalTDSAmount) > 0) && (
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                      <p className="text-sm font-medium text-gray-700">TDS (reference only, actual at payment)</p>
                      <p className="text-lg font-bold text-violet-600">
                        {displayInvoice.currency || "₹"} {((displayInvoice.tdsAmount || displayInvoice.totalTDSAmount || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Specific Information */}
            {isEdit && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <Edit className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Pending Approval</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This invoice update requires approval. The changes will be applied once approved by an administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with only Close button */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCreatedModal;
