// components/CompanyModal.jsx
import React, { useState, useEffect } from "react";
import { X, Building2, MapPin, CreditCard, BanknoteIcon, FileText, Calendar, Percent, Settings, Users, Lock } from "lucide-react";
import { toast } from "react-toastify";
import { File } from "lucide-react";


function CompanyModal({ isOpen, onClose, mode, company, onSubmit, loading }) {
  // Function to get initial form data
  const getInitialFormData = () => ({
    // Core Identity
    name: "",
    tradeName: "",
    companyType: "Private Ltd",
    businessNature: "Service",

    // Dates
    incorporationDate: "",
    financialYearStart: "",
    booksBeginFrom: "",

    // Address
    registeredAddress: {
      line1: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
    },
    branchName: "",

    // Contact
    email: "",
    phone: "",
    website: "",
    authorizedSignatory: "",

    // Tax
    taxDetails: {
      gstType: "Unregistered",
      gstin: "",
      pan: "",
      tan: "",
    },

    // Banking
    bankDetails: {
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      ifsc: "",
    },

    // Accounting Config
    accountingConfig: {
      baseCurrency: "INR",
      decimalPlaces: 2,
      enableBillWise: true,
      enableBankReconciliation: true,
      enableAuditTrail: true,
    },

    // Invoice Config
    invoiceConfig: {
      prefix: "INV/",
      startingNumber: 1,
      termsAndConditions: "",
    },

    // Employees
    employees: [],
  });

  const [formData, setFormData] = useState(getInitialFormData());

  // Reset form when modal opens/closes or company changes
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && company) {
      // Deep merge company data with initial data to ensure all fields exist
      const initialData = getInitialFormData();

      // Function to safely merge nested objects
      const mergeObjects = (target, source) => {
        const result = { ...target };
        for (const key in source) {
          if (source[key] !== null && source[key] !== undefined) {
            if (typeof source[key] === "object" && !Array.isArray(source[key]) && typeof target[key] === "object") {
              result[key] = mergeObjects(target[key] || {}, source[key]);
            } else {
              result[key] = source[key];
            }
          }
        }
        return result;
      };

      const mergedData = mergeObjects(initialData, company);

      // Format dates
      if (mergedData.incorporationDate) {
        mergedData.incorporationDate = new Date(mergedData.incorporationDate).toISOString().split("T")[0];
      }
      if (mergedData.financialYearStart) {
        mergedData.financialYearStart = new Date(mergedData.financialYearStart).toISOString().split("T")[0];
      }
      if (mergedData.booksBeginFrom) {
        mergedData.booksBeginFrom = new Date(mergedData.booksBeginFrom).toISOString().split("T")[0];
      }

      // Ensure numeric values
      if (mergedData.accountingConfig?.decimalPlaces !== undefined) {
        mergedData.accountingConfig.decimalPlaces = Number(mergedData.accountingConfig.decimalPlaces) || 2;
      }
      if (mergedData.invoiceConfig?.startingNumber !== undefined) {
        mergedData.invoiceConfig.startingNumber = Number(mergedData.invoiceConfig.startingNumber) || 1;
      }

      setFormData(mergedData);
    } else if (mode === "create") {
      setFormData(getInitialFormData());
    }
  }, [mode, company, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle nested fields
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === "checkbox" ? checked : value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      // Convert date strings to Date objects
      incorporationDate: formData.incorporationDate ? new Date(formData.incorporationDate) : null,
      financialYearStart: formData.financialYearStart ? new Date(formData.financialYearStart) : null,
      booksBeginFrom: formData.booksBeginFrom ? new Date(formData.booksBeginFrom) : null,

      // Ensure numeric values
      accountingConfig: {
        ...formData.accountingConfig,
        decimalPlaces: Number(formData.accountingConfig.decimalPlaces) || 2,
      },
      invoiceConfig: {
        ...formData.invoiceConfig,
        startingNumber: Number(formData.invoiceConfig.startingNumber) || 1,
      },
    };

    delete submitData.invoiceConfig.paymentTerms;
    delete submitData.invoiceConfig.logoUrl;

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-black/10 to-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50
                shadow-[0_0_100px_rgba(0,0,0,0.3)]"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{mode === "create" ? "Create New Company" : "Edit Company"}</h2>
                <p className="text-gray-300 text-sm">{mode === "create" ? "Add a new company to your workspace" : "Update company information"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[70vh] p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trade Name</label>
                  <input
                    type="text"
                    name="tradeName"
                    value={formData.tradeName || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Enter trade name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Type</label>
                  <select
                    name="companyType"
                    value={formData.companyType || "Private Ltd"}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="Private Ltd">Private Limited</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Nature</label>
                  <select
                    name="businessNature"
                    value={formData.businessNature || "Service"}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="Service">Service</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incorporation Date</label>
                  <input
                    type="date"
                    name="incorporationDate"
                    value={formData.incorporationDate || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year Start</label>
                  <input
                    type="date"
                    name="financialYearStart"
                    value={formData.financialYearStart || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Books Begin From</label>
                  <input
                    type="date"
                    name="booksBeginFrom"
                    value={formData.booksBeginFrom || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Registered Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Branch name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    name="registeredAddress.line1"
                    value={formData.registeredAddress?.line1 || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="registeredAddress.city"
                    value={formData.registeredAddress?.city || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    name="registeredAddress.state"
                    value={formData.registeredAddress?.state || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="registeredAddress.country"
                    value={formData.registeredAddress?.country || "India"}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="registeredAddress.pincode"
                    value={formData.registeredAddress?.pincode || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Pincode"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="company@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authorized Signatory</label>
                  <input
                    type="text"
                    name="authorizedSignatory"
                    value={formData.authorizedSignatory || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Authorized person name"
                  />
                </div>
              </div>
            </div>

            {/* Tax Details */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Tax Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Type</label>
                  <select
                    name="taxDetails.gstType"
                    value={formData.taxDetails?.gstType || "Unregistered"}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="Unregistered">Unregistered</option>
                    <option value="Regular">Regular</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    name="taxDetails.gstin"
                    value={formData.taxDetails?.gstin || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="GSTIN number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                  <input
                    type="text"
                    name="taxDetails.pan"
                    value={formData.taxDetails?.pan || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="PAN number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TAN</label>
                  <input
                    type="text"
                    name="taxDetails.tan"
                    value={formData.taxDetails?.tan || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="TAN number"
                  />
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BanknoteIcon className="w-5 h-5" />
                Bank Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankDetails.bankName"
                    value={formData.bankDetails?.bankName || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Bank name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    name="bankDetails.accountHolderName"
                    value={formData.bankDetails?.accountHolderName || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Account holder name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="bankDetails.accountNumber"
                    value={formData.bankDetails?.accountNumber || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    name="bankDetails.ifsc"
                    value={formData.bankDetails?.ifsc || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="IFSC code"
                  />
                </div>
              </div>
            </div>

            {/* Accounting Configuration */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Accounting Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
                  <select
                    name="accountingConfig.baseCurrency"
                    value={formData.accountingConfig?.baseCurrency || "INR"}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="INR">INR (Indian Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
                  <input
                    type="number"
                    name="accountingConfig.decimalPlaces"
                    value={formData.accountingConfig?.decimalPlaces || 2}
                    onChange={handleChange}
                    min="0"
                    max="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="accountingConfig.enableBillWise"
                    checked={!!formData.accountingConfig?.enableBillWise}
                    onChange={handleChange}
                    className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                  />
                  <label className="text-sm font-medium text-gray-700">Enable Bill Wise Accounting</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="accountingConfig.enableBankReconciliation"
                    checked={!!formData.accountingConfig?.enableBankReconciliation}
                    onChange={handleChange}
                    className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                  />
                  <label className="text-sm font-medium text-gray-700">Enable Bank Reconciliation</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="accountingConfig.enableAuditTrail"
                    checked={!!formData.accountingConfig?.enableAuditTrail}
                    onChange={handleChange}
                    className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                  />
                  <label className="text-sm font-medium text-gray-700">Enable Audit Trail</label>
                </div>
              </div>
            </div>

            {/* Invoice Configuration */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <File className="w-5 h-5" />
                Invoice Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    name="invoiceConfig.prefix"
                    value={formData.invoiceConfig?.prefix || "INV/"}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="INV/"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Number</label>
                  <input
                    type="number"
                    name="invoiceConfig.startingNumber"
                    value={formData.invoiceConfig?.startingNumber || 1}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                  <textarea
                    name="invoiceConfig.termsAndConditions"
                    value={formData.invoiceConfig?.termsAndConditions || ""}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Invoice terms and conditions"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900
                       hover:bg-gray-100 rounded-lg transition-all duration-200
                       border border-transparent hover:border-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-white
                       bg-gray-900 hover:bg-gray-800 rounded-lg transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {mode === "create" ? "Create Company" : "Update Company"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CompanyModal;
