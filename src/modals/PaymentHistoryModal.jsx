import React, { useState } from "react";
import dayjs from "dayjs";
import { X, Calendar, CreditCard, Receipt, CheckCircle, Clock } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { getJournalByIdApi } from "../apis/journalApi";
import JournalDetailsModal from "./JournalDetailsModal";

const PaymentHistoryModal = ({ open, onClose, invoice, paymentHistory = [] }) => {
  const { user } = useAuth();
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  if (!open) return null;

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateTotals = () => {
    const totalReceived = paymentHistory.reduce((sum, p) => sum + (p.originalAmount || p.settledAmount || p.receivedAmount || p.amountPaid || 0), 0);
    const totalTDS = paymentHistory.reduce((sum, p) => sum + (p.tdsAdjusted || p.tdsAmount || 0), 0);
    return { totalReceived, totalTDS };
  };

  const totals = calculateTotals();
  const invoiceAmount = invoice?.amountDue || invoice?.invoiceAmount || invoice?.netPayable || 0;
  const pendingAmount = Math.max(0, invoiceAmount - (totals.totalReceived + totals.totalTDS));

  const getJournalId = (journalRef) =>
    typeof journalRef === "object" && journalRef !== null ? journalRef._id : journalRef;

  const handleOpenJournal = async (journalId) => {
    if (!journalId || !user?.company?._id) return;
    try {
      const response = await getJournalByIdApi(user.company._id, getJournalId(journalId));
      setSelectedJournal(response.data || response);
      setJournalModalOpen(true);
    } catch (error) {
      console.error("Error loading journal details:", error);
      toast.error("Failed to load journal details");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-linear-to-r from-blue-700 to-blue-500 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Payment History</h2>
              <p className="text-sm opacity-90">Invoice: {invoice?.invoiceNo}</p>
            </div>
            <button onClick={onClose} className="hover:bg-blue-600 p-1 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs text-blue-600 mb-1">Invoice Amount</div>
              <div className="text-2xl font-bold text-blue-700">₹{formatAmount(invoiceAmount)}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-xs text-green-600 mb-1">Total Received</div>
              <div className="text-2xl font-bold text-green-700">₹{formatAmount(totals.totalReceived)}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-xs text-purple-600 mb-1">TDS Adjusted</div>
              <div className="text-2xl font-bold text-purple-700">₹{formatAmount(totals.totalTDS)}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-xs text-red-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-red-700">₹{formatAmount(pendingAmount)}</div>
            </div>
          </div>

          {/* Payment Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Mode</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Reference</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">TDS</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Journal</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                      No payments recorded yet
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((payment, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {dayjs(payment.paymentDate).format("DD MMM YYYY")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {payment.paymentMode || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {payment.referenceNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        ₹{formatAmount(payment.receivedAmount || payment.amountPaid || 0)}
                        {(payment.originalAmount || payment.adjustmentAmount) && (
                          <div className="text-[10px] font-semibold text-amber-700">
                            Settled ₹{formatAmount(payment.originalAmount || payment.amountPaid || 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-purple-600">
                        {(payment.tdsAdjusted || payment.tdsAmount) > 0 ? `₹${formatAmount(payment.tdsAdjusted || payment.tdsAmount)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {payment.journalId ? (
                          <button
                            type="button"
                            onClick={() => handleOpenJournal(payment.journalId)}
                            className="font-mono text-blue-600 hover:text-blue-800"
                          >
                            {payment.paymentJournal?.number || payment.journalNumber || "View Journal"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs flex items-center justify-center gap-1 ${
                          payment.status === 'posted' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status === 'posted' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {payment.status || 'recorded'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                        {payment.remarks || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {paymentHistory.length > 0 && (
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan="4" className="px-4 py-3 text-right">Total:</td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ₹{formatAmount(totals.totalReceived)}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-700">
                      ₹{formatAmount(totals.totalTDS)}
                    </td>
                    <td colSpan="3" className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Client Info */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Client Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{invoice?.billTo?.name || '-'}</span>
              </div>
              {invoice?.billTo?.GSTIN && (
                <div>
                  <span className="text-gray-600">GSTIN:</span>
                  <span className="ml-2 font-medium">{invoice.billTo.GSTIN}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
        <button
          onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
        </button>
      </div>
      <JournalDetailsModal
        open={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        journal={selectedJournal}
      />
      </div>
    </div>
  );
};

export default PaymentHistoryModal;
