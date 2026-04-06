import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { formatCurrency } from "../utils/formatUtil";
import { getClientReconciliationsApi, fixReconciliationDiscrepancyApi } from "../apis/reconciliationApi";

export default function ReconciliationModal({ isOpen, onClose, companyId, onReconciled }) {
  const [loading, setLoading] = useState(true);
  const [reconciliations, setReconciliations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [fixingId, setFixingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && companyId) {
      fetchReconciliations();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen, companyId]);

  const fetchReconciliations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getClientReconciliationsApi(companyId);

      // Safely navigate: axios wraps in res.data, API wraps payload in .data
      const payload = res?.data?.data ?? res?.data ?? {};
      setReconciliations(payload.reconciliations || []);
      setSummary(payload.summary || null);
    } catch (err) {
      console.error("Error fetching reconciliations:", err);
      const msg = err?.response?.data?.message || "Failed to load reconciliation data";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFixDiscrepancy = async (ledgerId) => {
    try {
      setFixingId(ledgerId);
      const res = await fixReconciliationDiscrepancyApi(companyId, ledgerId);
      toast.success(res?.data?.message || "Discrepancy fixed successfully");

      // Optimistically update local state
      setReconciliations((prev) =>
        prev.map((r) =>
          r.ledgerId === ledgerId
            ? { ...r, discrepancy: 0, status: "reconciled", ledgerBalance: r.pendingInvoiceAmount }
            : r
        )
      );
      setSummary((prev) =>
        prev
          ? { ...prev, reconciled: prev.reconciled + 1, unreconciled: Math.max(0, prev.unreconciled - 1) }
          : prev
      );

      if (onReconciled) {
        onReconciled();
      }
    } catch (err) {
      console.error("Error fixing discrepancy:", err);
      toast.error(err?.response?.data?.message || "Failed to fix discrepancy");
    } finally {
      setFixingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
    <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Account Reconciliation</h3>
              <p className="text-sm text-gray-500 mt-1">Review and fix Ledger Balance vs Pending Invoice Discrepancies</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Summary Bar */}
          {summary && !loading && (
            <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center gap-6 text-sm">
              <span className="text-gray-600">
                Total clients: <span className="font-semibold text-gray-900">{summary.totalClients}</span>
              </span>
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle className="w-4 h-4" />
                Reconciled: <span className="font-semibold">{summary.reconciled}</span>
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
                Unreconciled: <span className="font-semibold">{summary.unreconciled}</span>
              </span>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4 max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600">Loading reconciliation data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchReconciliations}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : reconciliations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No active client accounts found for reconciliation.
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                {reconciliations.map((item) => (
                  <div
                    key={item.ledgerId}
                    className={`border rounded-lg p-4 transition-colors ${
                      item.status === "reconciled"
                        ? "bg-green-50 border-green-200"
                        : "bg-white border-red-200 shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h4 className="text-md font-semibold text-gray-900">{item.clientName}</h4>
                          {item.status === "reconciled" ? (
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" /> Reconciled
                            </span>
                          ) : (
                            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" /> Unreconciled
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Ledger Code: {item.ledgerCode}</div>
                      </div>

                      {item.status !== "reconciled" && (
                        <button
                          onClick={() => handleFixDiscrepancy(item.ledgerId)}
                          disabled={fixingId === item.ledgerId}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {fixingId === item.ledgerId ? (
                            <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Fixing...</>
                          ) : (
                            "Auto-Fix Discrepancy"
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-white p-3 rounded border border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ledger Balance</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(item.ledgerBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Invoices</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(item.pendingInvoiceAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Discrepancy</p>
                        <p className={`text-sm font-semibold mt-1 ${Math.abs(item.discrepancy) > 0.01 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(item.discrepancy)}
                        </p>
                      </div>
                    </div>

                    {Math.abs(item.discrepancy) > 0.01 && (
                      <p className="text-xs text-red-500 mt-3 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                        This discrepancy means the account's actual journal balance differs from the sum of unpaid invoices. Clicking 'Fix' will post an adjusting journal entry to match the invoice amount.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
  );
}