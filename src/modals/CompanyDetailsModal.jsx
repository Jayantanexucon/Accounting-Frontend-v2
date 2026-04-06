import React from "react";
import {
  X,
  Building2,
  MapPin,
  CreditCard,
  BanknoteIcon,
  Calendar,
  Settings,
  File,
  Users,
  Mail,
  Phone,
  Globe,
  User,
  FileText,
  Hash,
  DollarSign,
  CheckCircle,
  XCircle,
  ChevronRight,
  Shield,
  Lock,
  ExternalLink,
  Printer,
  Download,
} from "lucide-react";

function CompanyDetailsModal({ isOpen, onClose, company }) {
  if (!isOpen || !company) return null;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };

  // Format currency
  const formatCurrency = (currencyCode) => {
    const currencies = {
      INR: "₹ Indian Rupee",
      USD: "$ US Dollar",
      EUR: "€ Euro",
    };
    return currencies[currencyCode] || currencyCode;
  };

  // Info Card Component
  const InfoCard = ({ title, value, icon: Icon, subValue, status, className = "" }) => (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <Icon className="w-4 h-4 text-gray-600" />
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-base font-semibold text-gray-900 mt-1">{value || "-"}</p>
            {subValue && <p className="text-sm text-gray-600 mt-1">{subValue}</p>}
          </div>
        </div>
        {status && <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === "active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-700"}`}>{status}</span>}
      </div>
    </div>
  );

  // Detail Section Component
  const DetailSection = ({ title, icon: Icon, children, gridCols = "grid-cols-1 md:grid-cols-2", className = "" }) => (
    <div className={`border border-gray-200 rounded-xl bg-white overflow-hidden ${className}`}>
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-gray-700" />}
          {title}
        </h3>
      </div>
      <div className={`grid ${gridCols} gap-6 p-6`}>{children}</div>
    </div>
  );

  // Detail Field Component
  const DetailField = ({ label, value, icon: Icon, badge, badgeColor = "gray" }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <label className="text-sm font-medium text-gray-600">{label}</label>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-base font-medium text-gray-900">{value || "-"}</p>
        {badge && <span className={`px-2 py-1 rounded text-xs font-medium bg-${badgeColor}-50 text-${badgeColor}-700`}>{badge}</span>}
      </div>
    </div>
  );

  // Toggle Field Component
  const ToggleField = ({ label, enabled, icon: Icon }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
        {enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        <span className="text-xs font-medium">{enabled ? "Enabled" : "Disabled"}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header - Matching Creation Modal */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Company Details</h2>
                <p className="text-gray-300 text-sm">View complete company information</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors group" title="Print">
                <Printer className="w-5 h-5 text-white/80 group-hover:text-white" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors group" title="Export">
                <Download className="w-5 h-5 text-white/80 group-hover:text-white" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Company Summary Card */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{company.name}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">{company.companyType || "Private Ltd"}</span>
                    <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium">{company.businessNature || "Service"}</span>
                    <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-medium flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {company.employees?.length || 0} Employees
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/80 text-sm">Company ID</p>
                {/* comapny id last 8 characters in uppercase */}
                <p className="text-white font-mono text-lg">{company._id?.slice(-8).toUpperCase() || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard
                title="Registered Address"
                value={company.registeredAddress?.city || "N/A"}
                subValue={company.registeredAddress?.state ? `${company.registeredAddress.state}, India` : "India"}
                icon={MapPin}
              />
              <InfoCard title="Financial Year" value={formatDate(company.financialYearStart)} subValue="Books begin from" icon={Calendar} />
              <InfoCard
                title="Tax Status"
                value={company.taxDetails?.gstType || "Unregistered"}
                subValue={company.taxDetails?.gstin ? `GSTIN: ${company.taxDetails.gstin}` : "No GSTIN"}
                icon={CreditCard}
              />
            </div>

            {/* Contact & Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DetailSection title="Basic Information" icon={Building2}>
                <DetailField label="Company Name" value={company.name} />
                <DetailField label="Trade Name" value={company.tradeName} />
                <DetailField label="Company Type" value={company.companyType} icon={Building2} />
                <DetailField label="Business Nature" value={company.businessNature} icon={FileText} />
              </DetailSection>

              <DetailSection title="Contact Details" icon={Mail}>
                <DetailField label="Email Address" value={company.email} icon={Mail} />
                <DetailField label="Phone Number" value={company.phone} icon={Phone} />
                <DetailField label="Website" value={company.website} icon={Globe} />
                <DetailField label="Authorized Signatory" value={company.authorizedSignatory} icon={User} />
              </DetailSection>
            </div>

            {/* Dates & Address */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DetailSection title="Important Dates" icon={Calendar}>
                <DetailField label="Incorporation Date" value={formatDate(company.incorporationDate)} />
                <DetailField label="Financial Year Start" value={formatDate(company.financialYearStart)} />
                <DetailField label="Books Begin From" value={formatDate(company.booksBeginFrom)} />
              </DetailSection>

              <DetailSection title="Registered Address" icon={MapPin}>
                <DetailField label="Branch Name" value={company.branchName} />
                <DetailField label="Address Line" value={company.registeredAddress?.line1} />
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="City" value={company.registeredAddress?.city} />
                  <DetailField label="State" value={company.registeredAddress?.state} />
                  <DetailField label="Country" value={company.registeredAddress?.country} />
                  <DetailField label="Pincode" value={company.registeredAddress?.pincode} />
                </div>
              </DetailSection>
            </div>

            {/* Tax & Banking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DetailSection title="Tax Information" icon={CreditCard}>
                <DetailField
                  label="GST Type"
                  value={company.taxDetails?.gstType}
                  badge={company.taxDetails?.gstType === "Regular" ? "Registered" : "Unregistered"}
                  badgeColor={company.taxDetails?.gstType === "Regular" ? "green" : "gray"}
                />
                <DetailField label="GSTIN" value={company.taxDetails?.gstin} />
                <DetailField label="PAN Number" value={company.taxDetails?.pan} />
                <DetailField label="TAN Number" value={company.taxDetails?.tan} />
              </DetailSection>

              <DetailSection title="Bank Details" icon={BanknoteIcon}>
                <DetailField label="Bank Name" value={company.bankDetails?.bankName} />
                <DetailField label="Account Holder" value={company.bankDetails?.accountHolderName} />
                <DetailField label="Account Number" value={company.bankDetails?.accountNumber} />
                <DetailField label="IFSC Code" value={company.bankDetails?.ifsc} />
              </DetailSection>
            </div>

            {/* Configuration Sections */}
            <DetailSection title="Accounting Configuration" icon={Settings} gridCols="grid-cols-1 md:grid-cols-3">
              <div className="space-y-4">
                <DetailField label="Base Currency" value={formatCurrency(company.accountingConfig?.baseCurrency)} icon={DollarSign} />
                <DetailField label="Decimal Places" value={company.accountingConfig?.decimalPlaces} icon={Hash} />
              </div>
              <div className="space-y-4">
                <ToggleField label="Bill Wise Accounting" enabled={company.accountingConfig?.enableBillWise} />
                <ToggleField label="Bank Reconciliation" enabled={company.accountingConfig?.enableBankReconciliation} />
              </div>
              <div className="space-y-4">
                <ToggleField label="Audit Trail" enabled={company.accountingConfig?.enableAuditTrail} />
                {company.accountingConfig?.enableAuditTrail && (
                  <DetailField label="Audit Locked Till" value={company.auditLockedTill ? formatDate(company.auditLockedTill) : "Not Locked"} icon={Lock} />
                )}
              </div>
            </DetailSection>

            {/* Invoice Configuration */}
            <DetailSection title="Invoice Configuration" icon={File}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <DetailField label="Invoice Prefix" value={company.invoiceConfig?.prefix} />
                  <DetailField label="Starting Number" value={company.invoiceConfig?.startingNumber} />
                </div>
                <div className="space-y-4 md:col-span-2">
                  {company.invoiceConfig?.termsAndConditions && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Terms & Conditions</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-700 text-sm">{company.invoiceConfig.termsAndConditions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DetailSection>

            {/* Employees Section */}
            {/* {company.employees?.length > 0 && (
              <DetailSection title="Team Members" icon={Users} gridCols="grid-cols-1">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Privileges</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {company.employees.map((employee, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">{employee.user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{employee.user?.name || "Unknown User"}</p>
                                <p className="text-sm text-gray-500">{employee.user?.email || "No email"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{employee.role || "No role"}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {employee.privilege?.masterUpdate && (
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Master Update
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">Active</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DetailSection>
            )} */}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last modified:</span> {company.lastModifiedBy ? "By Admin" : "Not available"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900
                       bg-white border border-gray-300 rounded-lg hover:border-gray-400 
                       hover:shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900
                       bg-white border border-gray-300 rounded-lg hover:border-gray-400 
                       hover:shadow-sm transition-all duration-200 flex items-center gap-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyDetailsModal;
