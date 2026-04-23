import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import {
  completeInvoiceAccountingApi,
  createClientLedgerFromInvoiceApi,
  createJournalFromInvoiceApi,
  validateInvoiceAccountsApi,
} from "../apis/invoice.api";

// Lucide Icons
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  CreditCard,
  Percent,
  BookOpen,
  Receipt,
  Banknote,
  Calculator,
} from "lucide-react";

const CreateLedgerFromInvoiceModal = ({
  open,
  onClose,
  onSuccess,
  initialInvoiceNo,
  invoiceData,
}) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Validate, 2: Create Ledger & Journal, 3: Complete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [accountingResult, setAccountingResult] = useState(null);
  const [accountingStatus, setAccountingStatus] = useState(null);

  useEffect(() => {
    if (open && invoiceData) {
      resetState();
      validateAccounts();
    }
  }, [open, invoiceData]);

  const resetState = () => {
    setStep(1);
    setLoading(false);
    setError(null);
    setValidationResult(null);
    setAccountingResult(null);
    setAccountingStatus(null);
  };

  const validateAccounts = async () => {
    if (!invoiceData || !user?.company?._id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await validateInvoiceAccountsApi(user.company._id);

      setValidationResult(response.data);

      if (response.data?.allRequiredAccountsExist) {
        setStep(2);
        toast.success("All required accounts are configured");
      } else {
        const missingRequired =
          response.data?.missingAccounts?.filter((acc) => !acc.optional) ||
          [];
        if (missingRequired.length > 0) {
          toast.error(`${missingRequired.length} required accounts missing`);
        } else {
          toast.warning("Some optional accounts are missing");
          // Still allow proceeding if only optional accounts are missing
          setStep(2);
        }
      }
    } catch (error) {
      console.error("Error validating accounts:", error);
      setError("Failed to validate accounts");
      toast.error("Failed to validate accounts");
    } finally {
      setLoading(false);
    }
  };
  const createCompleteAccounting = async () => {
    if (!invoiceData) return;

    setLoading(true);
    setError(null);

    try {
      if (invoiceData.approvalStatus !== "Approved") {
        toast.error("Sales journal can be posted only after invoice approval");
        setLoading(false);
        return;
      }

      // Check if sales journal already posted
      if (invoiceData.salesJournalId) {
        toast.info("Sales journal already posted for this invoice");
        setLoading(false);
        return;
      }

      // Use the complete accounting endpoint
      const response = await completeInvoiceAccountingApi(user.company._id, invoiceData._id);

      setAccountingResult(response?.data);
      setAccountingStatus(response?.data);

      toast.success("Sales journal posted successfully!");

      // Call success callback
      if (onSuccess) {
        onSuccess(response?.data);
      }

      setStep(3);
    } catch (error) {
      console.error("Error completing accounting:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post sales journal";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Alternative: Create ledger only (if needed)
  const createClientLedgerOnly = async () => {
    if (!invoiceData) return;

    setLoading(true);
    setError(null);

    try {
      if (invoiceData.approvalStatus !== "Approved") {
        toast.error("Ledger can be created only after invoice approval");
        setLoading(false);
        return;
      }

      const response = await createClientLedgerFromInvoiceApi(user.company._id, invoiceData._id);

      setAccountingResult(response?.data);
      toast.success("Client ledger created successfully");

      // Move to next step
      setStep(3);
    } catch (error) {
      console.error("Error creating ledger:", error);
      setError(error.response?.data?.message || "Failed to create ledger");
      toast.error("Failed to create ledger");
    } finally {
      setLoading(false);
    }
  };

  // Alternative: Create journal only
  const createJournalOnly = async () => {
    if (!invoiceData) return;

    setLoading(true);
    setError(null);

    try {
      if (invoiceData.approvalStatus !== "Approved") {
        toast.error("Journal can be created only after invoice approval");
        setLoading(false);
        return;
      }

      const response = await createJournalFromInvoiceApi(user.company._id, invoiceData._id);

      setAccountingResult(response?.data);
      setAccountingStatus(response?.data);

      toast.success("Accounting journal created successfully");

      // Call success callback
      if (onSuccess) {
        onSuccess(response?.data);
      }

      setStep(3);
    } catch (error) {
      console.error("Error creating journal:", error);
      setError(error.response?.data?.message || "Failed to create journal");
      toast.error("Failed to create journal");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const taxableValue = invoiceData?.totalTaxableValue || 0;
  const tdsAmount = Number(invoiceData?.totalTDSAmount || invoiceData?.tdsAmount || 0);
  const netPayable = Number(invoiceData?.netPayable || (invoiceData?.amountDue || 0) - tdsAmount);
  const totalTaxAmount = Number(invoiceData?.totalTaxAmount || 
    (invoiceData?.totalCGSTAmount || 0) + 
    (invoiceData?.totalSGSTAmount || 0) + 
    (invoiceData?.totalIGSTAmount || 0));
  const taxSummary = Array.isArray(invoiceData?.taxSummary) ? invoiceData.taxSummary : [];


  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-natural-700 to-natural-500  p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <BookOpen className="h-6 w-6 mr-3" />
              <div>
                <h2 className="text-lg font-semibold">Post Sales Journal</h2>
                <p className="text-sm opacity-90">
                  Invoice: {initialInvoiceNo || invoiceData?.invoiceNo}
                </p>
                <p className="text-xs opacity-75">
                  This creates the sales accounting entry (one-time only)
                </p>
              </div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Calculator className="h-5 w-5 text-blue-500 mr-2" />
                Post Sales Journal Entry
              </h3>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className=" hover:bg-natural-600 p-1 rounded-full disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-between items-center mt-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= stepNum ? "bg-white text-natural-700" : "bg-natural-600 text-black"}`}
                >
                  {step > stepNum ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span className="text-xs mt-1">
                  {stepNum === 1 && "Validate"}
                  {stepNum === 2 && "Create"}
                  {stepNum === 3 && "Complete"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="animate-spin h-10 w-10 text-natural-600 mb-4" />
              <p className="text-gray-600">Processing...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="font-semibold text-red-700">Error</h3>
              </div>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : step === 1 ? (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Account Validation
              </h3>

              {validationResult ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div
                      className={`border rounded-lg p-4 ${validationResult.allRequiredAccountsExist ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${validationResult.allRequiredAccountsExist ? "text-green-700" : "text-red-700"}`}
                        >
                          Required Accounts
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${validationResult.allRequiredAccountsExist ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {validationResult.existingAccounts?.filter(
                            (acc) => !acc.optional,
                          )?.length || 0}
                          /
                          {validationResult.existingAccounts?.filter(
                            (acc) => !acc.optional,
                          )?.length + validationResult.requiredMissingCount}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        {validationResult.allRequiredAccountsExist ? (
                          <span className="text-green-600">
                            ✓ All required accounts found
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {validationResult.requiredMissingCount} missing
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-700">
                          Found Accounts
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                          {validationResult.existingAccounts?.length || 0}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-blue-600">
                        Accounts ready for use
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-yellow-700">
                          Optional Missing
                        </span>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                          {validationResult.optionalMissingCount || 0}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-yellow-600">
                        Can proceed without these
                      </div>
                    </div>
                  </div>

                  {/* Existing Accounts List */}
                  {validationResult.existingAccounts?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">
                        Found Accounts:
                      </h4>
                      <div className="space-y-2">
                        {validationResult.existingAccounts.map(
                          (account, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-white p-2 rounded border border-green-100"
                            >
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                <div>
                                  <div className="font-medium text-sm">
                                    {account.name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    Code: {account.code} | Group:{" "}
                                    {account.groupName}
                                    {account.matchedBy && (
                                      <span className="ml-2 text-green-500">
                                        (matched by {account.matchedBy})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs capitalize">
                                {account.type}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Missing Accounts */}
                  {validationResult.missingAccounts?.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        {validationResult.allRequiredAccountsExist
                          ? "Optional Accounts Missing:"
                          : "Missing Accounts:"}
                      </h4>
                      <div className="space-y-2">
                        {validationResult.missingAccounts.map(
                          (account, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-2 rounded ${account.optional ? "bg-yellow-50" : "bg-red-50"}`}
                            >
                              <div className="flex items-center">
                                <AlertCircle
                                  className={`h-4 w-4 mr-2 ${account.optional ? "text-yellow-500" : "text-red-500"}`}
                                />
                                <div>
                                  <div
                                    className={`font-medium text-sm ${account.optional ? "text-yellow-700" : "text-red-700"}`}
                                  >
                                    {account.type.toUpperCase()} Account
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {account.message}
                                    {account.searchTerms && (
                                      <div className="mt-1">
                                        <span className="font-medium">
                                          Search for:
                                        </span>{" "}
                                        {account.searchTerms.join(", ")}
                                      </div>
                                    )}
                                    {account.groupMatch && (
                                      <div>
                                        <span className="font-medium">
                                          Group should be:
                                        </span>{" "}
                                        {account.groupMatch}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {account.optional ? (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                                  Optional
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                  Required
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {!validationResult.allRequiredAccountsExist && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-700 font-medium">
                            ⚠️ Cannot proceed: Required accounts are missing.
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            Please create the missing accounts in Chart of
                            Accounts first.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invoice Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Invoice Summary:
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-medium ml-2">
                          ₹{invoiceData?.amountDue?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">TDS Amount:</span>
                        <span className="font-medium ml-2">
                          ₹{invoiceData?.totalTDSAmount?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Net Payable:</span>
                        <span className="font-medium ml-2">
                          ₹
                          {invoiceData?.netPayable?.toFixed(2) ||
                            invoiceData?.amountDue?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tax Amount:</span>
                        <span className="font-medium ml-2">
                          ₹
                          {(
                            (invoiceData?.totalCGSTAmount || 0) +
                            (invoiceData?.totalSGSTAmount || 0) +
                            (invoiceData?.totalIGSTAmount || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Rules */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-700 mb-2">
                      How accounts are matched:
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-600">
                      <li className="flex items-start">
                        <span className="font-medium mr-2">Sales:</span>
                        <span>
                          Account with "sales" in name OR type =
                          "revenueAccount"
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">Debtor:</span>
                        <span>
                          Ledger under "Sundry Debtors" group
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">TDS:</span>
                        <span>Account with "tds" in name (optional)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="font-medium mr-2">GST:</span>
                        <span>
                          Accounts with "cgst", "sgst", or "igst" in name
                          (optional)
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Validating accounts...</p>
                </div>
              )}
            </div>
          ) : step === 2 ? (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <Calculator className="h-5 w-5 text-blue-500 mr-2" />
                Create Accounting Entries
              </h3>

              <div className="space-y-6">
                {/* Client Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 mb-2">
                    Client Information:
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-32">
                        Client Name:
                      </span>
                      <span className="font-medium">
                        {invoiceData?.billTo?.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-32">GSTIN:</span>
                      <span className="font-medium">
                        {invoiceData?.billTo?.GSTIN || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 w-32">
                        Invoice Amount:
                      </span>
                      <span className="font-medium text-green-600">
                        ₹{invoiceData?.amountDue?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Journal Preview */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-700 mb-2">
                    Journal Entries Preview:
                  </h4>
                  <div className="space-y-3">
                    {/* Debit Entries */}
                    <div className="space-y-2">
                      <div className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-blue-700">
                              Debit: Sundry Debtors
                            </div>
                            <div className="text-sm text-gray-600">
                              Client: {invoiceData?.billTo?.name} (Net Payable)
                            </div>
                          </div>
                          <div className="text-red-600 font-bold">
                            ₹{netPayable?.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {tdsAmount > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-blue-700">
                                Debit: TDS Receivable
                              </div>
                              <div className="text-sm text-gray-600">
                                Tax Deducted at Source
                              </div>
                            </div>
                            <div className="text-red-600 font-bold">
                              ₹{tdsAmount?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Credit Entries */}
                    <div className="bg-white border border-gray-200 rounded p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-green-700">
                              Credit: Sales Account
                            </div>
                            <div className="text-sm text-gray-600">
                              Taxable value
                            </div>
                          </div>
                          <div className="text-green-600 font-bold">
                            ₹{taxableValue?.toFixed(2)}
                          </div>
                        </div>

                        {/* Dynamic Tax Entries */}
                        {taxSummary.length > 0 ? (
                          taxSummary.map((tax, idx) => (
                            <div key={idx} className="flex justify-between items-center border-t pt-2">
                              <div>
                                <div className="font-medium text-green-700">
                                  Credit: {tax.label || tax.taxType} Payable
                                </div>
                                <div className="text-sm text-gray-600">
                                  {tax.label || tax.taxType}
                                </div>
                              </div>
                              <div className="text-green-600 font-bold">
                                ₹{Number(tax.amount || 0).toFixed(2)}
                              </div>
                            </div>
                          ))
                        ) : (
                          <>
                            {invoiceData?.totalCGSTAmount > 0 && (
                              <div className="flex justify-between items-center border-t pt-2">
                                <div>
                                  <div className="font-medium text-green-700">
                                    Credit: CGST Payable
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Central GST
                                  </div>
                                </div>
                                <div className="text-green-600 font-bold">
                                  ₹{invoiceData?.totalCGSTAmount?.toFixed(2)}
                                </div>
                              </div>
                            )}

                            {invoiceData?.totalSGSTAmount > 0 && (
                              <div className="flex justify-between items-center border-t pt-2">
                                <div>
                                  <div className="font-medium text-green-700">
                                    Credit: SGST Payable
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    State GST
                                  </div>
                                </div>
                                <div className="text-green-600 font-bold">
                                  ₹{invoiceData?.totalSGSTAmount?.toFixed(2)}
                                </div>
                              </div>
                            )}

                            {invoiceData?.totalIGSTAmount > 0 && (
                              <div className="flex justify-between items-center border-t pt-2">
                                <div>
                                  <div className="font-medium text-green-700">
                                    Credit: IGST Payable
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Integrated GST
                                  </div>
                                </div>
                                <div className="text-green-600 font-bold">
                                  ₹{invoiceData?.totalIGSTAmount?.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Check */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-700">
                        Total Debit
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        ₹{invoiceData?.amountDue?.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-gray-400">=</div>
                    <div>
                      <div className="font-medium text-gray-700">
                        Total Credit
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        ₹{invoiceData?.amountDue?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center text-sm text-gray-600">
                    Journal is balanced (Debit = Credit)
                  </div>
                </div>

                {/* Action Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-700 mb-2">
                    What will happen:
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-600">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        A ledger account will be created for the client under
                        "Sundry Debtors" (if not exists)
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        A SALES journal will be posted with proper double-entry
                        accounting
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        This is a ONE-TIME operation - once posted, you cannot
                        post again
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>
                        After posting, you can record payments using the
                        "Receive Payment" button
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : step === 3 ? (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Accounting Complete
              </h3>

              {accountingResult || accountingStatus ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
                      <div>
                        <h4 className="font-semibold text-green-700">
                          Sales Journal Posted Successfully
                        </h4>
                        <p className="text-sm text-green-600">
                          The sales accounting entry has been created. You can
                          now record payments against this invoice.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ledger Information */}
                  {(accountingResult?.ledger || accountingStatus?.ledger) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
                          <h5 className="font-medium text-gray-700">
                            Ledger Created
                          </h5>
                          {(accountingResult?.ledger?.autoCreated ||
                            accountingStatus?.ledger?.autoCreated) && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              Auto-created
                            </span>
                          )}
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-600">
                            Account:{" "}
                            {accountingResult?.ledger?.name ||
                              accountingStatus?.ledger?.name}
                          </div>
                          <div className="text-gray-600">
                            Code:{" "}
                            {accountingResult?.ledger?.code ||
                              accountingStatus?.ledger?.code}
                          </div>
                        </div>
                      </div>

                      {/* Journal Information */}
                      {(accountingResult?.journal ||
                        accountingStatus?.journal) && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <Receipt className="h-5 w-5 text-purple-500 mr-2" />
                            <h5 className="font-medium text-gray-700">
                              Journal Created
                            </h5>
                            {(accountingResult?.journal?.autoCreated ||
                              accountingStatus?.journal?.autoCreated) && (
                              <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                Auto-created
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="text-gray-600">
                              Reference:{" "}
                              {accountingResult?.journal?.referenceNumber ||
                                accountingStatus?.journal?.referenceNumber}
                            </div>
                            <div className="text-gray-600">
                              Date:{" "}
                              {new Date(
                                accountingResult?.journal?.date ||
                                  accountingStatus?.journal?.date,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Accounting Summary */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-700 mb-2">
                      Accounting Summary:
                    </h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Taxable Value:</span>
                        <span className="font-medium">
                          ₹
                          {(
                            accountingResult?.accountingSummary?.taxableValue ||
                            accountingStatus?.accountingSummary?.taxableValue ||
                            invoiceData?.totalTaxableValue ||
                            0
                          )?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Tax:</span>
                        <span className="font-medium">
                          ₹
                          {(
                            accountingResult?.accountingSummary?.totalTax ||
                            accountingStatus?.accountingSummary?.totalTax ||
                            0
                          )?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">TDS Deducted:</span>
                        <span className="font-medium">
                          ₹
                          {(
                            accountingResult?.accountingSummary?.tdsAmount ||
                            accountingStatus?.accountingSummary?.tdsAmount ||
                            invoiceData?.totalTDSAmount ||
                            0
                          )?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Net Payable:</span>
                        <span className="font-bold text-green-600">
                          ₹
                          {(
                            accountingResult?.accountingSummary?.netPayable ||
                            accountingStatus?.accountingSummary?.netPayable ||
                            invoiceData?.netPayable ||
                            invoiceData?.amountDue ||
                            0
                          )?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Success Message */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-600">
                      The accounting process has been completed successfully.
                      You can now view the ledger and journal entries in their
                      respective sections.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    Completing accounting process...
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer / Action Buttons */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex justify-between">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <div className="space-x-3">
              {step === 1 && validationResult?.allRequiredAccountsExist && (
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continue to Accounting Creation
                </button>
              )}

              {step === 1 && !validationResult?.allRequiredAccountsExist && (
                <button
                  onClick={validateAccounts}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Re-validate Accounts
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={createCompleteAccounting}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Posting..." : "Post Sales Journal"}
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateLedgerFromInvoiceModal;
