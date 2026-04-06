import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  FileText,
  Banknote,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";

export default function VendorDetails({ vendor, onClose }) {
  // Status color mapping
  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
    Completed: "bg-gray-100 text-gray-800",
  };

  // Status icon mapping
  const StatusIcon =
    {
      Pending: Clock,
      Approved: CheckCircle,
      Rejected: XCircle,
      Completed: CheckCircle,
    }[vendor.status] || Clock;

  return (
    <div className="bg-gray-100 rounded-xl shadow-lg border relative">
      {/* Close Button */}
      {/* {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
          title="Close details"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      )} */}

      {/* Header with Gradient */}
      <div className=" p-6 rounded-t-xl border-b">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {vendor.vendorName}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-600 font-medium">
                    Code: {vendor.vendorCode}
                  </span>
                  {vendor.isSubVendor && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Sub-vendor
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex items-center gap-2">
              <StatusIcon
                className={`w-4 h-4 ${
                  statusColors[vendor.status]?.split(" ")[1]
                }`}
              />
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[vendor.status]
                }`}
              >
                {vendor.status || "Pending"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  vendor.isActive ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-sm text-gray-700">
                {vendor.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information Card */}
          <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">
                Contact Information
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <p className="font-medium">{vendor.contactPerson || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{vendor.phoneNumber || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium break-all">{vendor.email || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address Card */}
          <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Address Details</h3>
            </div>
            <div className="space-y-3">
              <div className="mb-3">
                <p className="text-sm text-gray-500 mb-1">Registered Address</p>
                <p className="text-gray-800 whitespace-pre-line">
                  {vendor.registeredAddress || "—"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">City</p>
                  <p className="font-medium">{vendor.city || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">State</p>
                  <p className="font-medium">{vendor.state || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Country</p>
                  <p className="font-medium">{vendor.country || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PIN Code</p>
                  <p className="font-medium">{vendor.pinCode || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Information Card */}
          <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Tax Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">PAN Number</p>
                <div className="font-mono font-medium bg-gray-50 p-2 rounded-lg">
                  {vendor.pan || "—"}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">GSTIN</p>
                <div className="font-mono font-medium bg-gray-50 p-2 rounded-lg">
                  {vendor.gstin || "—"}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Service Type</p>
                <p className="font-medium">{vendor.serviceType || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Goods Type</p>
                <p className="font-medium">{vendor.goodsType || "—"}</p>
              </div>
            </div>
          </div>

          {/* Payment & Commercial Card */}
          <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Banknote className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-800">
                Payment & Commercial
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Terms</p>
                <p className="font-medium">{vendor.paymentTerms || "—"}</p>
              </div>
              {vendor.creditLimit > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Credit Limit</p>
                      <p className="text-xl font-bold text-blue-700">
                        ₹{vendor.creditLimit.toLocaleString()}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank Details Card (if available) */}
          {(vendor.bankName || vendor.accountNumber || vendor.ifscCode) && (
            <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Banknote className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800">Bank Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {vendor.bankName && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                    <p className="font-medium">{vendor.bankName}</p>
                  </div>
                )}
                {vendor.accountNumber && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Account Number</p>
                    <div className="font-mono font-medium bg-gray-50 p-2 rounded-lg">
                      {vendor.accountNumber}
                    </div>
                  </div>
                )}
                {vendor.ifscCode && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">IFSC Code</p>
                    <div className="font-mono font-medium bg-gray-50 p-2 rounded-lg">
                      {vendor.ifscCode}
                    </div>
                  </div>
                )}
                {vendor.branchName && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Branch Name</p>
                    <p className="font-medium">{vendor.branchName}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agreement Period Card */}
          {(vendor.agreementStartDate || vendor.agreementEndDate) && (
            <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-800">
                  Agreement Period
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vendor.agreementStartDate && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Start Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="font-medium">
                        {new Date(vendor.agreementStartDate).toLocaleDateString(
                          "en-IN",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {vendor.agreementEndDate && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">End Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <p className="font-medium">
                        {new Date(vendor.agreementEndDate).toLocaleDateString(
                          "en-IN",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compliance Documents Card */}
          {vendor.complianceDocs && vendor.complianceDocs.length > 0 && (
            <div className="border rounded-xl p-5 hover:shadow-sm transition-shadow lg:col-span-2">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <FileText className="w-5 h-5 text-teal-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800">
                    Compliance Documents
                  </h3>
                </div>
                <span className="text-sm text-gray-500">
                  {vendor.complianceDocs.length} file(s)
                </span>
              </div>
              <div className="space-y-2">
                {vendor.complianceDocs.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm truncate max-w-xs">
                          {doc}
                        </p>
                        <p className="text-xs text-gray-500">PDF Document</p>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open(doc, "_blank")}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Timestamps */}
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 mb-1">Created On</p>
              <p className="font-medium">
                {new Date(vendor.createdAt).toLocaleString("en-IN", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-500 mb-1">Last Updated</p>
              <p className="font-medium">
                {new Date(vendor.updatedAt).toLocaleString("en-IN", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
