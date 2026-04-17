import { useEffect, useState } from "react";
import { getAuditLogsApi } from "../apis/auditLog.api";

const AuditLogSidebar = ({
  isOpen,
  onClose,
  companyId,
  modules = [],
  title,
  subtitle,
}) => {
  const [logs, setLogs] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [module, setModule] = useState(""); // Single module filter for home page
  const [isLoading, setIsLoading] = useState(false);

  // Determine if this is home page (no specific modules provided)
  const isHomePage = !modules || modules.length === 0;

  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split("T")[0];

    setFromDate(today);
    setToDate(today);
    // Reset module filter when opening home page
    if (isHomePage) {
      setModule("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!fromDate || !toDate) return;

    loadLogs();
  }, [fromDate, toDate, isOpen]);

  const handleDateNavigation = (direction) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    switch (direction) {
      case "prev":
        from.setDate(from.getDate() - 1);
        to.setDate(to.getDate() - 1);
        break;
      case "next":
        from.setDate(from.getDate() + 1);
        to.setDate(to.getDate() + 1);
        break;
      case "today":
        const today = new Date();
        from.setTime(today.getTime());
        to.setTime(today.getTime());
        break;
      default:
        return;
    }

    setFromDate(from.toISOString().split("T")[0]);
    setToDate(to.toISOString().split("T")[0]);
  };

  const setDatePreset = (preset) => {
    const today = new Date();
    const from = new Date();
    const to = new Date();

    switch (preset) {
      case "today":
        setFromDate(today.toISOString().split("T")[0]);
        setToDate(today.toISOString().split("T")[0]);
        break;
      case "yesterday":
        from.setDate(today.getDate() - 1);
        to.setDate(today.getDate() - 1);
        setFromDate(from.toISOString().split("T")[0]);
        setToDate(to.toISOString().split("T")[0]);
        break;
      case "last7days":
        from.setDate(today.getDate() - 6);
        setFromDate(from.toISOString().split("T")[0]);
        setToDate(today.toISOString().split("T")[0]);
        break;
      case "last30days":
        from.setDate(today.getDate() - 29);
        setFromDate(from.toISOString().split("T")[0]);
        setToDate(to.toISOString().split("T")[0]);
        break;
      default:
        break;
    }
  };

  const navigateDateRange = (direction) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Calculate the number of days in the current range
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (direction === "prev") {
      from.setDate(from.getDate() - (diffDays + 1));
      to.setDate(to.getDate() - (diffDays + 1));
    } else if (direction === "next") {
      from.setDate(from.getDate() + (diffDays + 1));
      to.setDate(to.getDate() + (diffDays + 1));
    }

    setFromDate(from.toISOString().split("T")[0]);
    setToDate(to.toISOString().split("T")[0]);
  };

  const loadLogs = async () => {
    if (!companyId) {
      console.error("Company ID is required");
      return;
    }

    setIsLoading(true);
    try {
      const params = {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        ...(isHomePage && module ? { module } : {}), // Only add module param for home page with filter
      };

      // // console.log("Loading logs with params:", params);

      const res = await getAuditLogsApi(String(companyId), params);

      // // console.log("Logs received:", res.data?.length);
      setLogs(res.data || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logs based on modules prop or module filter
  const filteredLogs =
    !isHomePage && Array.isArray(modules) && modules.length > 0
      ? logs.filter((log) => modules.includes(log.module || ""))
      : isHomePage && module
        ? logs.filter((log) => (log.module || "") === module)
        : logs;

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "0.00";
    return parseFloat(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper function to format time
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get color for action type badge
  const getActionTypeColor = (actionType) => {
    const actionMap = {
      // Green for creation actions
      CREATE: "bg-green-100 text-green-800 border border-green-200",
      CLIENT_CREATED: "bg-green-100 text-green-800 border border-green-200",
      VENDOR_CREATED: "bg-green-100 text-green-800 border border-green-200",
      SALES_JOURNAL_CREATED:
        "bg-green-100 text-green-800 border border-green-200",
      ACCOUNT_CREATED: "bg-green-100 text-green-800 border border-green-200",
      PO_CREATED: "bg-green-100 text-green-800 border border-green-200",
      // New creation actions
      USER_REGISTERED: "bg-green-100 text-green-800 border border-green-200",
      COMPANY_CREATED: "bg-green-100 text-green-800 border border-green-200",
      EMPLOYEE_ADDED: "bg-green-100 text-green-800 border border-green-200",
      GROUP_CREATED: "bg-green-100 text-green-800 border border-green-200",
      HSN_CREATED: "bg-green-100 text-green-800 border border-green-200",

      // Yellow for update actions
      UPDATE: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      CLIENT_UPDATED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      VENDOR_UPDATED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      PO_UPDATED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      // New update actions
      EMPLOYEE_UPDATED:
        "bg-yellow-100 text-yellow-800 border border-yellow-200",
      GROUP_UPDATED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
      HSN_UPDATED: "bg-yellow-100 text-yellow-800 border border-yellow-200",

      // Red for delete/reversal actions
      DELETE: "bg-red-100 text-red-800 border border-red-200",
      PO_DELETED: "bg-red-100 text-red-800 border border-red-200",
      // New delete actions
      GROUP_DELETED: "bg-red-100 text-red-800 border border-red-200",
      HSN_DELETED: "bg-red-100 text-red-800 border border-red-200",

      // Blue for status/process actions
      SALES_JOURNAL_POSTED: "bg-blue-100 text-blue-800 border border-blue-200",
      // New auth actions
      USER_LOGIN: "bg-blue-100 text-blue-800 border border-blue-200",
      USER_LOGOUT: "bg-blue-100 text-blue-800 border border-blue-200",

      "PO_CREATED From Excal sheets":
        "bg-green-100 text-green-800 border border-green-200",
      BULK_CREATE: "bg-green-100 text-green-800 border border-green-200",

      PAYMENT_RECORDED_AND_JOURNAL_POSTED:
        "bg-blue-100 text-blue-800 border border-blue-200",
    };

    return (
      actionMap[actionType] ||
      "bg-gray-100 text-gray-800 border border-gray-200"
    );
  };

  // Get display text for action type
  const getActionDisplayText = (actionType) => {
    const displayMap = {
      CREATE: "Created",
      UPDATE: "Updated",
      DELETE: "Deleted",
      CLIENT_CREATED: "Client Created",
      CLIENT_UPDATED: "Client Updated",
      VENDOR_CREATED: "Vendor Created",
      VENDOR_UPDATED: "Vendor Updated",
      ACCOUNT_CREATED: "Account Created",
      SALES_JOURNAL_POSTED: "Sales Journal Posted",
      PO_CREATED: "PO Created",
      PO_UPDATED: "PO Updated",
      PO_DELETED: "PO Deleted",
      // New action display texts
      USER_REGISTERED: "User Registered",
      USER_LOGIN: "User Login",
      USER_LOGOUT: "User Logout",
      COMPANY_CREATED: "Company Created",
      EMPLOYEE_ADDED: "Employee Added",
      EMPLOYEE_UPDATED: "Employee Updated",
      GROUP_CREATED: "Group Created",
      GROUP_UPDATED: "Group Updated",
      GROUP_DELETED: "Group Deleted",
      HSN_CREATED: "HSN Created",
      HSN_UPDATED: "HSN Updated",
      HSN_DELETED: "HSN Deleted",
      PAYMENT_RECORDED_AND_JOURNAL_POSTED: "Payment Recorded & Journal Posted",
      "PO_CREATED From Excal sheets": "PO Created (Excel)",
      BULK_CREATE: "Invoice Create(Excel)",
    };

    return displayMap[actionType] || actionType.replace(/_/g, " ");
  };

  // Render journal logs based on actual data structure
  const renderJournalLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "CREATE":
        const journalData =
          logEntries[0]?.newValue?.journal || logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Journal Created
              </div>
            </div>
            {journalData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Journal Number
                    </div>
                    <div className="text-sm font-semibold">
                      {journalData.number || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Voucher Type
                    </div>
                    <div className="text-sm">
                      {journalData.voucherType || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Date
                    </div>
                    <div className="text-sm">
                      {formatDate(journalData.date)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Status
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${journalData.posted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {journalData.posted ? "Posted" : "Draft"}
                    </span>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Narration
                    </div>
                    <div className="text-sm">
                      {journalData.narration || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "DELETE":
        const oldJournalData =
          logEntries[0]?.oldValue?.journal || logEntries[0]?.oldValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Journal Deleted
              </div>
            </div>
            {oldJournalData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Journal Number
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      {oldJournalData.number || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Voucher Type
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldJournalData.voucherType || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "UPDATE":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Journal Updated
              </div>
            </div>
            <div className="space-y-3">
              {logEntries.map((entry, idx) => {
                const fieldNames = {
                  journalLines: "Journal Lines",
                };
                const fieldName =
                  fieldNames[entry.field] ||
                  entry.field
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-4 gap-3 text-sm items-center"
                  >
                    <div className="font-medium text-gray-700">{fieldName}</div>
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Previous
                        </div>
                        <div className="text-red-700 line-through text-xs">
                          {entry.oldValue
                            ? Array.isArray(entry.oldValue)
                              ? `${entry.oldValue.length} lines`
                              : JSON.stringify(entry.oldValue).substring(
                                  0,
                                  100,
                                ) + "..."
                            : "N/A"}
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Updated
                        </div>
                        <div className="text-green-700 text-xs">
                          {entry.newValue
                            ? Array.isArray(entry.newValue)
                              ? `${entry.newValue.length} lines`
                              : JSON.stringify(entry.newValue).substring(
                                  0,
                                  100,
                                ) + "..."
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  const renderInvoiceCreatedContent = (invoiceData) => {
    if (!invoiceData) return null;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">
              Invoice Number
            </div>
            <div className="text-sm font-semibold">
              {invoiceData.invoiceNo || "N/A"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">Amount Due</div>
            <div className="text-sm font-semibold">
              ₹{formatCurrency(invoiceData.amountDue)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">
              Invoice Date
            </div>
            <div className="text-sm">{formatDate(invoiceData.invoiceDate)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">Due Date</div>
            <div className="text-sm">{formatDate(invoiceData.dueDate)}</div>
          </div>
          {invoiceData.billTo && (
            <div className="col-span-2 space-y-1">
              <div className="text-sm font-medium text-gray-500">Bill To</div>
              <div className="text-sm">{invoiceData.billTo.name || "N/A"}</div>
            </div>
          )}
        </div>
        {invoiceData.items && invoiceData.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Items ({invoiceData.items.length})
            </div>
            <div className="space-y-2">
              {invoiceData.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.description || `Item ${idx + 1}`}</span>
                  <span>₹{formatCurrency(item.total)}</span>
                </div>
              ))}
              {invoiceData.items.length > 3 && (
                <div className="text-xs text-gray-500 italic">
                  + {invoiceData.items.length - 3} more item
                  {invoiceData.items.length - 3 !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render invoice logs based on actual data structure
  const renderInvoiceLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "CREATE":
        const invoiceData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Invoice Created
              </div>
            </div>
            {renderInvoiceCreatedContent(logEntries[0]?.newValue)}
          </div>
        );
      case "BULK_CREATE":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Invoice Created (Bulk)
              </div>
            </div>
            {renderInvoiceCreatedContent(logEntries[0]?.newValue)}
          </div>
        );

      case "UPDATE":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Invoice Updated
              </div>
            </div>
            <div className="space-y-3">
              {logEntries.map((entry, idx) => {
                if (entry.field === "items") {
                  let oldItems = [];
                  let newItems = [];

                  try {
                    oldItems =
                      typeof entry.oldValue === "string"
                        ? JSON.parse(entry.oldValue)
                        : entry.oldValue || [];
                    newItems =
                      typeof entry.newValue === "string"
                        ? JSON.parse(entry.newValue)
                        : entry.newValue || [];
                  } catch (e) {
                    oldItems = entry.oldValue || [];
                    newItems = entry.newValue || [];
                  }

                  const oldTotal = Array.isArray(oldItems)
                    ? oldItems.reduce((sum, item) => sum + (item.total || 0), 0)
                    : 0;
                  const newTotal = Array.isArray(newItems)
                    ? newItems.reduce((sum, item) => sum + (item.total || 0), 0)
                    : 0;

                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="font-medium text-sm mb-2 text-gray-700">
                        Items Updated
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Previous Items
                          </div>
                          {Array.isArray(oldItems) && oldItems.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-xs">
                                {oldItems.length} item
                                {oldItems.length !== 1 ? "s" : ""}
                              </div>
                              <div className="text-xs text-gray-600">
                                Total: ₹{formatCurrency(oldTotal)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              No items
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Updated Items
                          </div>
                          {Array.isArray(newItems) && newItems.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-xs">
                                {newItems.length} item
                                {newItems.length !== 1 ? "s" : ""}
                              </div>
                              <div className="text-xs text-gray-600">
                                Total: ₹{formatCurrency(newTotal)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              No items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                const fieldNames = {
                  invoiceDate: "Invoice Date",
                  dueDate: "Due Date",
                  amountDue: "Amount Due",
                  status: "Status",
                  billTo: "Bill To",
                  items: "Items",
                };

                const fieldName =
                  fieldNames[entry.field] ||
                  entry.field
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-4 gap-3 text-sm items-center"
                  >
                    <div className="font-medium text-gray-700">{fieldName}</div>
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Previous
                        </div>
                        <div className="text-red-700 line-through text-xs">
                          {entry.field.includes("Date") && entry.oldValue
                            ? formatDate(entry.oldValue)
                            : entry.field === "amountDue"
                              ? `₹${formatCurrency(entry.oldValue)}`
                              : entry.oldValue !== null &&
                                  entry.oldValue !== undefined
                                ? typeof entry.oldValue === "object"
                                  ? JSON.stringify(entry.oldValue).substring(
                                      0,
                                      100,
                                    ) + "..."
                                  : String(entry.oldValue)
                                : "N/A"}
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Updated
                        </div>
                        <div className="text-green-700 text-xs">
                          {entry.field.includes("Date") && entry.newValue
                            ? formatDate(entry.newValue)
                            : entry.field === "amountDue"
                              ? `₹${formatCurrency(entry.newValue)}`
                              : entry.newValue !== null &&
                                  entry.newValue !== undefined
                                ? typeof entry.newValue === "object"
                                  ? JSON.stringify(entry.newValue).substring(
                                      0,
                                      100,
                                    ) + "..."
                                  : String(entry.newValue)
                                : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "DELETE":
        const oldInvoiceData = logEntries[0]?.oldValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Invoice Deleted
              </div>
            </div>
            {oldInvoiceData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Invoice Number
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      {oldInvoiceData.invoiceNo || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Amount Due
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      ₹{formatCurrency(oldInvoiceData.amountDue)}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Bill To
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldInvoiceData.billTo?.name || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render invoice accounting logs
  const renderInvoiceAccountingLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "SALES_JOURNAL_POSTED":
        const journalData =
          logEntries[0]?.newValue?.salesJournal || logEntries[0]?.newValue;
        const accountingStatus =
          logEntries[1]?.newValue || logEntries[0]?.newValue?.accountingStatus;

        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Sales Journal Posted
              </div>
            </div>
            <div className="space-y-3">
              {journalData && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Journal Number
                    </div>
                    <div className="text-sm font-semibold">
                      {journalData.journalNumber || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Journal Date
                    </div>
                    <div className="text-sm">
                      {formatDate(journalData.journalDate)}
                    </div>
                  </div>
                </div>
              )}
              {accountingStatus && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Accounting Status
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${accountingStatus === "journal_posted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {accountingStatus.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render client logs
  const renderClientLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "CLIENT_CREATED":
        const clientData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Client Created
              </div>
            </div>
            {clientData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Client Name
                    </div>
                    <div className="text-sm font-semibold">
                      {clientData.clientName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Client Code
                    </div>
                    <div className="text-sm">
                      {clientData.clientCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Contact Person
                    </div>
                    <div className="text-sm">
                      {clientData.contactPerson || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Contact Number
                    </div>
                    <div className="text-sm">
                      {clientData.contactNumber || "N/A"}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Email
                    </div>
                    <div className="text-sm">{clientData.email || "N/A"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "CLIENT_UPDATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Client Updated
              </div>
            </div>
            {logEntries.length > 0 ? (
              <div className="space-y-3">
                {logEntries.map((entry, idx) => {
                  const fieldNames = {
                    clientName: "Client Name",
                    contactPerson: "Contact Person",
                    contactNumber: "Contact Number",
                    email: "Email",
                    status: "Status",
                  };

                  const fieldName =
                    fieldNames[entry.field] ||
                    entry.field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-3 text-sm items-center"
                    >
                      <div className="font-medium text-gray-700">
                        {fieldName}
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Previous
                          </div>
                          <div className="text-red-700 line-through">
                            {entry.oldValue !== null &&
                            entry.oldValue !== undefined
                              ? String(entry.oldValue)
                              : "N/A"}
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Updated
                          </div>
                          <div className="text-green-700">
                            {entry.newValue !== null &&
                            entry.newValue !== undefined
                              ? String(entry.newValue)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No specific field changes recorded
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render vendor logs
  const renderVendorLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "VENDOR_CREATED":
        const vendorData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Vendor Created
              </div>
            </div>
            {vendorData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Vendor Name
                    </div>
                    <div className="text-sm font-semibold">
                      {vendorData.vendorName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Vendor Code
                    </div>
                    <div className="text-sm">
                      {vendorData.vendorCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Contact Person
                    </div>
                    <div className="text-sm">
                      {vendorData.contactPerson || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Phone Number
                    </div>
                    <div className="text-sm">
                      {vendorData.phoneNumber || "N/A"}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Email
                    </div>
                    <div className="text-sm">{vendorData.email || "N/A"}</div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Address
                    </div>
                    <div className="text-sm">
                      {vendorData.registeredAddress || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "VENDOR_UPDATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Vendor Updated
              </div>
            </div>
            {logEntries.length > 0 ? (
              <div className="space-y-3">
                {logEntries.map((entry, idx) => {
                  const fieldNames = {
                    vendorName: "Vendor Name",
                    contactPerson: "Contact Person",
                    phoneNumber: "Phone Number",
                    email: "Email",
                    status: "Status",
                  };

                  const fieldName =
                    fieldNames[entry.field] ||
                    entry.field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-3 text-sm items-center"
                    >
                      <div className="font-medium text-gray-700">
                        {fieldName}
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Previous
                          </div>
                          <div className="text-red-700 line-through">
                            {entry.oldValue !== null &&
                            entry.oldValue !== undefined
                              ? String(entry.oldValue)
                              : "N/A"}
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Updated
                          </div>
                          <div className="text-green-700">
                            {entry.newValue !== null &&
                            entry.newValue !== undefined
                              ? String(entry.newValue)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No specific field changes recorded
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render account logs
  const renderAccountLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "ACCOUNT_CREATED":
        const accountData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Account Created
              </div>
            </div>
            {accountData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Account Name
                    </div>
                    <div className="text-sm font-semibold">
                      {accountData.name || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Account Code
                    </div>
                    <div className="text-sm">{accountData.code || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Account Type
                    </div>
                    <div className="text-sm">{accountData.type || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Name
                    </div>
                    <div className="text-sm">
                      {accountData.groupName || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Helper to render PO created content (used for both single and bulk)
  const renderPOCreatedContent = (poData) => {
    if (!poData) return null;

    // Determine client display name (could be string or object)
    let clientName = "N/A";
    if (poData.client) {
      if (typeof poData.client === "string") clientName = poData.client;
      else if (poData.client.name) clientName = poData.client.name;
    }

    // Format addresses if available
    const clientAddress = poData.client?.address
      ? typeof poData.client.address === "string"
        ? poData.client.address
        : ""
      : "";

    return (
      <div className="space-y-3">
        {/* Basic PO Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">PO Number</div>
            <div className="text-sm font-semibold">
              {poData.poNumber || "N/A"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">
              Total Amount
            </div>
            <div className="text-sm font-semibold">
              ₹{formatCurrency(poData.totalAmount)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">PO Date</div>
            <div className="text-sm">{formatDate(poData.poDate)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-500">
              Delivery Date
            </div>
            <div className="text-sm">{formatDate(poData.deliveryDate)}</div>
          </div>
          <div className="col-span-2 space-y-1">
            <div className="text-sm font-medium text-gray-500">Client</div>
            <div className="text-sm">
              {clientName}
              {clientAddress && (
                <span className="text-gray-600">, {clientAddress}</span>
              )}
            </div>
          </div>
        </div>

        {/* Items preview (similar to invoice) */}
        {poData.items && poData.items.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Items ({poData.items.length})
            </div>
            <div className="space-y-2">
              {poData.items.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>
                    {item.description || `Item ${idx + 1}`}
                    <span className="text-gray-500 text-xs ml-2">
                      ({item.quantity} x ₹{formatCurrency(item.rate)})
                    </span>
                  </span>
                  <span>₹{formatCurrency(item.total)}</span>
                </div>
              ))}
              {poData.items.length > 3 && (
                <div className="text-xs text-gray-500 italic">
                  + {poData.items.length - 3} more item
                  {poData.items.length - 3 !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tax summary (optional) */}
        {(poData.totalTaxableValue > 0 ||
          poData.totalCGSTAmount > 0 ||
          poData.totalSGSTAmount > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Taxable Value:</span>
                <span className="ml-2 font-medium">
                  ₹{formatCurrency(poData.totalTaxableValue)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">CGST:</span>
                <span className="ml-2 font-medium">
                  ₹{formatCurrency(poData.totalCGSTAmount)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">SGST:</span>
                <span className="ml-2 font-medium">
                  ₹{formatCurrency(poData.totalSGSTAmount)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">IGST:</span>
                <span className="ml-2 font-medium">
                  ₹{formatCurrency(poData.totalIGSTAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render purchase order logs
  const renderPurchaseOrderLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "PO_CREATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Purchase Order Created
              </div>
            </div>
            {renderPOCreatedContent(logEntries[0]?.newValue)}
          </div>
        );

      case "PO_CREATED From Excal sheets":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Purchase Order Created (Excel)
              </div>
            </div>
            {renderPOCreatedContent(logEntries[0]?.newValue)}
          </div>
        );

      case "PO_UPDATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Purchase Order Updated
              </div>
            </div>
            <div className="space-y-3">
              {logEntries.map((entry, idx) => {
                if (entry.field === "items") {
                  let oldItems = [];
                  let newItems = [];

                  try {
                    oldItems =
                      typeof entry.oldValue === "string"
                        ? JSON.parse(entry.oldValue)
                        : entry.oldValue || [];
                    newItems =
                      typeof entry.newValue === "string"
                        ? JSON.parse(entry.newValue)
                        : entry.newValue || [];
                  } catch (e) {
                    oldItems = entry.oldValue || [];
                    newItems = entry.newValue || [];
                  }

                  const oldTotal = Array.isArray(oldItems)
                    ? oldItems.reduce((sum, item) => sum + (item.total || 0), 0)
                    : 0;
                  const newTotal = Array.isArray(newItems)
                    ? newItems.reduce((sum, item) => sum + (item.total || 0), 0)
                    : 0;

                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="font-medium text-sm mb-2 text-gray-700">
                        Items Updated
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Previous Items
                          </div>
                          {Array.isArray(oldItems) && oldItems.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-xs">
                                {oldItems.length} item
                                {oldItems.length !== 1 ? "s" : ""}
                              </div>
                              <div className="text-xs text-gray-600">
                                Total: ₹{formatCurrency(oldTotal)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              No items
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">
                            Updated Items
                          </div>
                          {Array.isArray(newItems) && newItems.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-xs">
                                {newItems.length} item
                                {newItems.length !== 1 ? "s" : ""}
                              </div>
                              <div className="text-xs text-gray-600">
                                Total: ₹{formatCurrency(newTotal)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              No items
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                const fieldNames = {
                  poNumber: "PO Number",
                  totalAmount: "Total Amount",
                  vendor: "Vendor",
                };

                const fieldName =
                  fieldNames[entry.field] ||
                  entry.field
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div
                    key={idx}
                    className="grid grid-cols-4 gap-3 text-sm items-center"
                  >
                    <div className="font-medium text-gray-700">{fieldName}</div>
                    <div className="col-span-3 grid grid-cols-2 gap-3">
                      <div className="bg-red-50 border border-red-200 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Previous
                        </div>
                        <div className="text-red-700 line-through">
                          {entry.field === "totalAmount" && entry.oldValue
                            ? `₹${formatCurrency(entry.oldValue)}`
                            : entry.oldValue !== null &&
                                entry.oldValue !== undefined
                              ? String(entry.oldValue)
                              : "N/A"}
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Updated
                        </div>
                        <div className="text-green-700">
                          {entry.field === "totalAmount" && entry.newValue
                            ? `₹${formatCurrency(entry.newValue)}`
                            : entry.newValue !== null &&
                                entry.newValue !== undefined
                              ? String(entry.newValue)
                              : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "PO_DELETED":
        const oldPOData = logEntries[0]?.oldValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Purchase Order Deleted
              </div>
            </div>
            {oldPOData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      PO Number
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      {oldPOData.poNumber || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Total Amount
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      ₹{formatCurrency(oldPOData.totalAmount)}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Vendor
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldPOData.vendor || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render Payment logs
  const renderPaymentLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "PAYMENT_RECORDED_AND_JOURNAL_POSTED":
        // Find payment details and status change
        const paymentLog = logEntries.find(
          (entry) => entry.field === "payment",
        );
        const statusLog = logEntries.find(
          (entry) => entry.field === "invoicePaymentStatus",
        );

        const paymentData = paymentLog?.newValue;
        const oldStatus = statusLog?.oldValue;
        const newStatus = statusLog?.newValue;
        const statusChanged = oldStatus !== newStatus;

        return (
          <div className="space-y-4">
            {/* Header */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Payment Recorded & Journal Posted
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-4">
              {paymentData && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-sm text-gray-700 mb-3">
                    Payment Details
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          Payment Date
                        </div>
                        <div className="text-sm font-semibold">
                          {formatDate(paymentData.paymentDate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          Payment Mode
                        </div>
                        <div className="text-sm capitalize">
                          {paymentData.paymentMode?.replace(/_/g, " ") || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          Reference Number
                        </div>
                        <div className="text-sm">
                          {paymentData.referenceNumber || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          Received Amount
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          ₹{formatCurrency(paymentData.receivedAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          TDS Adjusted
                        </div>
                        <div className="text-sm">
                          ₹{formatCurrency(paymentData.tdsAdjusted)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500">
                          Payment Status
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${paymentData.status === "posted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                        >
                          {paymentData.status?.replace(/_/g, " ") || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Payment Status Change */}
              {statusLog && (
                <div
                  className={`border ${statusChanged ? "border-yellow-200" : "border-gray-200"} rounded-lg p-4 ${statusChanged ? "bg-yellow-50" : "bg-gray-50"}`}
                >
                  <div className="font-medium text-sm text-gray-700 mb-3">
                    Invoice Payment Status
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Previous Status
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            oldStatus === "fully_paid"
                              ? "bg-green-100 text-green-800"
                              : oldStatus === "partially_paid"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {oldStatus ? oldStatus.replace(/_/g, " ") : "N/A"}
                        </span>
                        {statusChanged && (
                          <svg
                            className="w-4 h-4 mx-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        Current Status
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          newStatus === "fully_paid"
                            ? "bg-green-100 text-green-800"
                            : newStatus === "partially_paid"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {newStatus ? newStatus.replace(/_/g, " ") : "N/A"}
                      </span>
                    </div>
                  </div>
                  {!statusChanged && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      Status remained unchanged
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 text-gray-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    Journal Entry
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Automatically created and posted
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render Auth logs
  const renderAuthLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "USER_REGISTERED":
        const userData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                User Registered
              </div>
            </div>
            {userData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Full Name
                    </div>
                    <div className="text-sm font-semibold">
                      {userData.fullName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Email
                    </div>
                    <div className="text-sm">{userData.email || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Role
                    </div>
                    <div className="text-sm">{userData.role || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Status
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${userData.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {userData.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "USER_LOGIN":
        const loginData = logEntries[0]?.newValue || logEntries[0];
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                User Login
              </div>
            </div>
            {loginData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      User
                    </div>
                    <div className="text-sm font-semibold">
                      {loginData.userName || loginData.email || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Login Time
                    </div>
                    <div className="text-sm">{formatTime(log.createdAt)}</div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <div className="text-sm font-medium text-gray-500">
                      IP Address
                    </div>
                    <div className="text-sm">
                      {loginData.ipAddress || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "USER_LOGOUT":
        const logoutData = logEntries[0]?.newValue || logEntries[0];
        return (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                User Logout
              </div>
            </div>
            {logoutData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      User
                    </div>
                    <div className="text-sm font-semibold">
                      {logoutData.userName || logoutData.email || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Logout Time
                    </div>
                    <div className="text-sm">{formatTime(log.createdAt)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render Company logs
  const renderCompanyLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "COMPANY_CREATED":
        const companyData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Company Created
              </div>
            </div>
            {companyData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Company Name
                    </div>
                    <div className="text-sm font-semibold">
                      {companyData.companyName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Company Code
                    </div>
                    <div className="text-sm">
                      {companyData.companyCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">PAN</div>
                    <div className="text-sm">{companyData.pan || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      GSTIN
                    </div>
                    <div className="text-sm">{companyData.gstin || "N/A"}</div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Address
                    </div>
                    <div className="text-sm">
                      {companyData.address || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "EMPLOYEE_ADDED":
        const employeeData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Employee Added
              </div>
            </div>
            {employeeData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Employee Name
                    </div>
                    <div className="text-sm font-semibold">
                      {employeeData.name || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Employee ID
                    </div>
                    <div className="text-sm">
                      {employeeData.employeeId || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Role
                    </div>
                    <div className="text-sm">{employeeData.role || "N/A"}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Department
                    </div>
                    <div className="text-sm">
                      {employeeData.department || "N/A"}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Email
                    </div>
                    <div className="text-sm">{employeeData.email || "N/A"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "EMPLOYEE_UPDATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Employee Updated
              </div>
            </div>
            {logEntries.length > 0 ? (
              <div className="space-y-3">
                {logEntries.map((entry, idx) => {
                  const fieldNames = {
                    name: "Name",
                    employeeId: "Employee ID",
                    role: "Role",
                    department: "Department",
                    email: "Email",
                    status: "Status",
                  };

                  const fieldName =
                    fieldNames[entry.field] ||
                    entry.field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-3 text-sm items-center"
                    >
                      <div className="font-medium text-gray-700">
                        {fieldName}
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Previous
                          </div>
                          <div className="text-red-700 line-through">
                            {entry.oldValue !== null &&
                            entry.oldValue !== undefined
                              ? String(entry.oldValue)
                              : "N/A"}
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Updated
                          </div>
                          <div className="text-green-700">
                            {entry.newValue !== null &&
                            entry.newValue !== undefined
                              ? String(entry.newValue)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No specific field changes recorded
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render Group logs
  const renderGroupLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "GROUP_CREATED":
        const groupData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Group Created
              </div>
            </div>
            {groupData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Name
                    </div>
                    <div className="text-sm font-semibold">
                      {groupData.groupName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Code
                    </div>
                    <div className="text-sm">
                      {groupData.groupCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Type
                    </div>
                    <div className="text-sm">
                      {groupData.groupType || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Parent Group
                    </div>
                    <div className="text-sm">
                      {groupData.parentGroup || "None"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "GROUP_UPDATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Group Updated
              </div>
            </div>
            {logEntries.length > 0 ? (
              <div className="space-y-3">
                {logEntries.map((entry, idx) => {
                  const fieldNames = {
                    groupName: "Group Name",
                    groupCode: "Group Code",
                    groupType: "Group Type",
                    parentGroup: "Parent Group",
                    status: "Status",
                  };

                  const fieldName =
                    fieldNames[entry.field] ||
                    entry.field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-3 text-sm items-center"
                    >
                      <div className="font-medium text-gray-700">
                        {fieldName}
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Previous
                          </div>
                          <div className="text-red-700 line-through">
                            {entry.oldValue !== null &&
                            entry.oldValue !== undefined
                              ? String(entry.oldValue)
                              : "N/A"}
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Updated
                          </div>
                          <div className="text-green-700">
                            {entry.newValue !== null &&
                            entry.newValue !== undefined
                              ? String(entry.newValue)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No specific field changes recorded
              </div>
            )}
          </div>
        );

      case "GROUP_DELETED":
        const oldGroupData = logEntries[0]?.oldValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Group Deleted
              </div>
            </div>
            {oldGroupData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Name
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      {oldGroupData.groupName || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Code
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldGroupData.groupCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Group Type
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldGroupData.groupType || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Render HSN logs
  const renderHsnLog = (log) => {
    const { actionType, logs: logEntries } = log;

    switch (actionType) {
      case "HSN_CREATED":
        const hsnData = logEntries[0]?.newValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                HSN Created
              </div>
            </div>
            {hsnData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      HSN Code
                    </div>
                    <div className="text-sm font-semibold">
                      {hsnData.hsnCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Description
                    </div>
                    <div className="text-sm">
                      {hsnData.description || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      GST Rate
                    </div>
                    <div className="text-sm">
                      {hsnData.gstRate ? `${hsnData.gstRate}%` : "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      CESS Rate
                    </div>
                    <div className="text-sm">
                      {hsnData.cessRate ? `${hsnData.cessRate}%` : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "HSN_UPDATED":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                HSN Updated
              </div>
            </div>
            {logEntries.length > 0 ? (
              <div className="space-y-3">
                {logEntries.map((entry, idx) => {
                  const fieldNames = {
                    hsnCode: "HSN Code",
                    description: "Description",
                    gstRate: "GST Rate",
                    cessRate: "CESS Rate",
                  };

                  const fieldName =
                    fieldNames[entry.field] ||
                    entry.field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase());

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-4 gap-3 text-sm items-center"
                    >
                      <div className="font-medium text-gray-700">
                        {fieldName}
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Previous
                          </div>
                          <div className="text-red-700 line-through">
                            {entry.field.includes("Rate") && entry.oldValue
                              ? `${entry.oldValue}%`
                              : entry.oldValue !== null &&
                                  entry.oldValue !== undefined
                                ? String(entry.oldValue)
                                : "N/A"}
                          </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded p-2">
                          <div className="text-xs text-gray-500 mb-1">
                            Updated
                          </div>
                          <div className="text-green-700">
                            {entry.field.includes("Rate") && entry.newValue
                              ? `${entry.newValue}%`
                              : entry.newValue !== null &&
                                  entry.newValue !== undefined
                                ? String(entry.newValue)
                                : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-600 italic">
                No specific field changes recorded
              </div>
            )}
          </div>
        );

      case "HSN_DELETED":
        const oldHsnData = logEntries[0]?.oldValue;
        return (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                HSN Deleted
              </div>
            </div>
            {oldHsnData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      HSN Code
                    </div>
                    <div className="text-sm font-semibold line-through text-red-600">
                      {oldHsnData.hsnCode || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      Description
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldHsnData.description || "N/A"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">
                      GST Rate
                    </div>
                    <div className="text-sm line-through text-red-600">
                      {oldHsnData.gstRate ? `${oldHsnData.gstRate}%` : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return renderGenericLog(log);
    }
  };

  // Generic log renderer for unknown module types or actions
  const renderGenericLog = (log) => {
    const { logs: logEntries } = log;

    if (!logEntries || logEntries.length === 0) {
      return (
        <div className="text-sm text-gray-600 italic">
          No change details available for this action.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {logEntries.map((l, i) => {
          // Handle different field structures
          const fieldName = l.field || "Field";

          return (
            <div key={i} className="grid grid-cols-3 gap-2 text-sm">
              <div className="font-medium">
                {fieldName
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase())}
                :
              </div>
              <div className="text-red-600 line-through text-xs">
                {l.oldValue !== null && l.oldValue !== undefined
                  ? typeof l.oldValue === "object"
                    ? JSON.stringify(l.oldValue).substring(0, 100) + "..."
                    : String(l.oldValue)
                  : "N/A"}
              </div>
              <div className="text-green-600 text-xs">
                {l.newValue !== null && l.newValue !== undefined
                  ? typeof l.newValue === "object"
                    ? JSON.stringify(l.newValue).substring(0, 100) + "..."
                    : String(l.newValue)
                  : "N/A"}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Main render function for logs
  const renderLogDetails = (log) => {
    switch (log.module) {
      case "AUTH":
        return renderAuthLog(log);
      case "COMPANY":
        return renderCompanyLog(log);
      case "GROUP":
        return renderGroupLog(log);
      case "HSN":
        return renderHsnLog(log);
      case "JOURNAL":
        return renderJournalLog(log);
      case "INVOICE":
        return renderInvoiceLog(log);
      case "INVOICE_ACCOUNTING":
        return renderInvoiceAccountingLog(log);
      case "PAYMENT":
        return renderPaymentLog(log);
      case "CLIENT":
        return renderClientLog(log);
      case "VENDOR":
        return renderVendorLog(log);
      case "ACCOUNT":
        return renderAccountLog(log);
      case "PURCHASE_ORDER":
        return renderPurchaseOrderLog(log);
      default:
        return renderGenericLog(log);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Sidebar */}
      <div className="relative ml-auto w-[700px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Filters Section */}
          <div className=" border-b border-gray-200 bg-white px-6 py-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Activity Filters
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Filter system activities by date and module
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <svg
                      className="w-3 h-3 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Filters Active
                  </span>
                </div>
              </div>

              {/* Row 1: Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <div className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Select Date Range
                  </div>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* FROM DATE */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      From
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="w-4 h-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   hover:border-gray-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* TO DATE */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      To
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                          className="w-4 h-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
                          />
                        </svg>
                      </div>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   hover:border-gray-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Module Select + Navigation Buttons */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Module Select on Left - Only show for home page */}
                {isHomePage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                          />
                        </svg>
                        Filter by Module
                      </div>
                    </label>
                    <div className="relative">
                      <select
                        value={module}
                        onChange={(e) => setModule(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors appearance-none bg-white"
                      >
                        <option value="">All Modules</option>
                        <option value="AUTH">Auth</option>
                        <option value="COMPANY">Company</option>
                        <option value="GROUP">Group</option>
                        <option value="HSN">HSN</option>
                        <option value="JOURNAL">Journal</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="INVOICE_ACCOUNTING">
                          Invoice Accounting
                        </option>
                        <option value="PAYMENT">Payment</option>
                        <option value="CLIENT">Client</option>
                        <option value="VENDOR">Vendor</option>
                        <option value="ACCOUNT">Account</option>
                        <option value="PURCHASE_ORDER">Purchase Order</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons on Right */}
                <div className={isHomePage ? "" : "col-span-2"}>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <div className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Navigate Days
                    </div>
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigateDateRange("prev")}
                      className="flex-1 flex items-center justify-center px-4 py-3 border border-blue-600 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 hover:border-blue-700 transition-colors shadow-sm"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Previous Day
                    </button>
                    <button
                      onClick={() => navigateDateRange("next")}
                      className="flex-1 flex items-center justify-center px-4 py-3 border border-blue-600 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 hover:border-blue-700 transition-colors shadow-sm"
                    >
                      Next Day
                      <svg
                        className="w-4 h-4 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Action Buttons */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {fromDate && toDate && (
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="font-medium">Showing:</span>
                        <span className="ml-2 text-gray-800">
                          {formatDate(fromDate)}
                        </span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-gray-800">
                          {formatDate(toDate)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split("T")[0];
                        setFromDate(today);
                        setToDate(today);
                        if (isHomePage) {
                          setModule("");
                        }
                      }}
                      className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={loadLogs}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Loading...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          Apply Filters
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Content */}
          <div className=" p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-gray-600">Loading activity logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg
                  className="w-16 h-16 text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No activity logs found
                </h3>
                <p className="text-gray-600 max-w-md">
                  {fromDate && toDate
                    ? `No activities recorded between ${formatDate(fromDate)} and ${formatDate(toDate)}`
                    : "No activities recorded for the selected filters"}
                </p>
                <button
                  onClick={loadLogs}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-800">
                        {filteredLogs.length} activit
                        {filteredLogs.length === 1 ? "y" : "ies"} found
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {fromDate &&
                          toDate &&
                          `Showing activities from ${formatDate(fromDate)} to ${formatDate(toDate)}`}
                        {isHomePage &&
                          module &&
                          ` • Module: ${module.replace(/_/g, " ")}`}
                        {!isHomePage &&
                          modules.length > 0 &&
                          ` • Modules: ${modules.map((m) => m.replace(/_/g, " ")).join(", ")}`}
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Sorted by latest
                    </div>
                  </div>
                </div>

                {/* Logs List */}
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
                    <div
                      key={log._id}
                      className="bg-white border border-gray-500 rounded-xl shadow-xl hover:shadow-md transition-shadow"
                    >
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getActionTypeColor(log.actionType)}`}
                              >
                                {getActionDisplayText(log.actionType)}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  log.module === "PAYMENT"
                                    ? "bg-teal-100 text-teal-800 border border-teal-200"
                                    : log.module === "AUTH"
                                      ? "bg-purple-100 text-purple-800 border border-purple-200"
                                      : log.module === "COMPANY"
                                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                        : log.module === "GROUP"
                                          ? "bg-pink-100 text-pink-800 border border-pink-200"
                                          : log.module === "HSN"
                                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                                            : log.module === "JOURNAL"
                                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                                              : log.module === "INVOICE"
                                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                : log.module ===
                                                    "INVOICE_ACCOUNTING"
                                                  ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                                  : log.module === "PAYMENT"
                                                    ? "bg-green-100 text-green-800 border border-green-200"
                                                    : log.module === "CLIENT"
                                                      ? "bg-orange-100 text-orange-800 border border-orange-200"
                                                      : log.module === "VENDOR"
                                                        ? "bg-red-100 text-red-800 border border-red-200"
                                                        : log.module ===
                                                            "ACCOUNT"
                                                          ? "bg-teal-100 text-teal-800 border border-teal-200"
                                                          : log.module ===
                                                              "PURCHASE_ORDER"
                                                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                                            : "bg-gray-100 text-gray-800 border border-gray-200"
                                }`}
                              >
                                {(log.module || "General").replace(/_/g, " ")}
                              </span>
                            </div>

                            <div className="flex items-center text-sm text-gray-600">
                              <svg
                                className="w-4 h-4 mr-1.5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              <span className="font-medium mr-2">By:</span>{" "}
                              {log.performedBy?.name || "System"}
                              {log.entityId && (
                                <>
                                  <span className="mx-2 text-gray-300">•</span>
                                  <svg
                                    className="w-4 h-4 mr-1.5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                    />
                                  </svg>
                                  <span className="font-medium mr-1">ID:</span>{" "}
                                  {log.entityId.substring(0, 8)}...
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatTime(log.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(log.createdAt)}
                            </div>
                          </div>
                        </div>

                        {/* Log Details */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {renderLogDetails(log)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* End of logs message */}
                <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
                  <svg
                    className="w-5 h-5 inline-block mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  End of activity logs
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogSidebar;