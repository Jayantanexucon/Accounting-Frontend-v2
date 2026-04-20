import React, { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { API } from "../apis/api";
import { getClientsApi } from "../apis/clientApi"; // <-- import the correct API

const PurchaseOrderAdvancedSearch = ({
  isOpen,
  onClose,
  onSearch,
  onClear,
  companyId,
  isLoading = false,
  initialFilters = {},
  clientId = null,
}) => {
  const [filters, setFilters] = useState({
    poNumber: "",
    clientName: "",
    status: "",
    paymentTerms: "",
  });
  const [preselectedClientName, setPreselectedClientName] = useState("");

  const [dateTypes, setDateTypes] = useState({
    poDate: { selected: false, from: "", to: "" },
    createdDate: { selected: false, from: "", to: "" },
    updatedDate: { selected: false, from: "", to: "" },
    deliveryDate: { selected: false, from: "", to: "" },
  });

  const [searchOptions, setSearchOptions] = useState({
    poNumbers: [],
    clients: [], // will hold all client names (strings)
    statuses: [],
    paymentTermsList: [],
  });

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [poSearchQuery, setPoSearchQuery] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  // Dropdown visibility
  const [showPoDropdown, setShowPoDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredPoNumbers, setFilteredPoNumbers] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);

  // Cache for all clients (to avoid repeated API calls)
  const [allClients, setAllClients] = useState([]);

  // ------------------------------------------------------------------
  // 1. Load initial filters (if any)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isOpen && Object.keys(initialFilters).length > 0) {
      setFilters({
        poNumber: initialFilters.poNumber || "",
        clientName:
          initialFilters.clientName || initialFilters.vendorName || "",
        status: initialFilters.status || "",
        paymentTerms: initialFilters.paymentTerms || "",
      });

      setDateTypes({
        poDate: {
          selected: !!(initialFilters.poDateFrom || initialFilters.poDateTo),
          from: initialFilters.poDateFrom || "",
          to: initialFilters.poDateTo || "",
        },
        createdDate: {
          selected: !!(
            initialFilters.createdDateFrom || initialFilters.createdDateTo
          ),
          from: initialFilters.createdDateFrom || "",
          to: initialFilters.createdDateTo || "",
        },
        updatedDate: {
          selected: !!(
            initialFilters.updatedDateFrom || initialFilters.updatedDateTo
          ),
          from: initialFilters.updatedDateFrom || "",
          to: initialFilters.updatedDateTo || "",
        },
        deliveryDate: {
          selected: !!(
            initialFilters.deliveryDateFrom || initialFilters.deliveryDateTo
          ),
          from: initialFilters.deliveryDateFrom || "",
          to: initialFilters.deliveryDateTo || "",
        },
      });
    }
  }, [isOpen, initialFilters]);

  useEffect(() => {
    if (isOpen && clientId) {
      const fetchClientName = async () => {
        // Fetch all clients (global master data) - no companyId filter
        const res = await getClientsApi();
        const client = res.data?.find((c) => c._id === clientId);
        if (client) {
          setPreselectedClientName(client.clientName);
          setFilters((prev) => ({ ...prev, clientName: client.clientName }));
        }
      };
      fetchClientName();
    }
  }, [isOpen, clientId]);

  // ------------------------------------------------------------------
  // 2. Reset filters when modal opens (and no initial filters)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (isOpen && Object.keys(initialFilters).length === 0) {
      setFilters({
        poNumber: "",
        clientName: "",
        status: "",
        paymentTerms: "",
      });
      setDateTypes({
        poDate: { selected: false, from: "", to: "" },
        createdDate: { selected: false, from: "", to: "" },
        updatedDate: { selected: false, from: "", to: "" },
        deliveryDate: { selected: false, from: "", to: "" },
      });
      setPoSearchQuery("");
      setClientSearchQuery("");
    }
  }, [isOpen]);

  // ------------------------------------------------------------------
  // 3. Fetch all options (PO numbers, clients, statuses, terms)
  // ------------------------------------------------------------------
  const fetchOptions = async () => {
    if (!companyId) return;
    setLoadingOptions(true);
    try {
      // --- PO Numbers ---
      const poParams = { q: "", companyId };
      if (clientId) poParams.clientId = clientId; // 👈 add clientId when in client context
if (preselectedClientName) poParams.clientName = preselectedClientName;
      const poRes = await API.get("/purchase-orders/search/number", {
        params: poParams,
      });
      const poNumbers = poRes.data?.map((item) => item.label) || [];

      // --- Clients (using getClientsApi) ---
      // Fetch all clients (global master data) - no companyId filter
      const clientData = await getClientsApi();
      // Extract client names; fallback to empty array
      const clientNames = Array.isArray(clientData?.data)
        ? clientData.data.map((c) => c.clientName).filter(Boolean)
        : [];
      setAllClients(clientNames); // cache for live search

      // --- Static lists ---
      const statuses = [
        "",
        "draft",
        "issued",
        "acknowledged",
        "partially_received",
        "fully_received",
        "cancelled",
        "closed",
      ];
      const paymentTermsList = [
        "",
        "net-30",
        "net-60",
        "net-90",
        "cod",
        "advance",
        "immediate",
      ];

      setSearchOptions({
        poNumbers: ["", ...poNumbers],
        clients: ["", ...clientNames],
        statuses,
        paymentTermsList,
      });

      // Initialize filtered lists (all items)
      setFilteredPoNumbers(poNumbers);
      setFilteredClients(clientNames);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, companyId]);

  // ------------------------------------------------------------------
  // 4. Live search for PO numbers (API‑driven)
  // ------------------------------------------------------------------
useEffect(() => {
  if (!companyId) return;

  const fetchPoNumbers = async () => {
    try {
      const params = { q: poSearchQuery, companyId };
      if (clientId) params.clientId = clientId;
      if (preselectedClientName) params.clientName = preselectedClientName;
      const res = await API.get("/purchase-orders/search/number", { params });
      const filtered = res.data?.map((item) => item.label) || [];
      setFilteredPoNumbers(filtered);
    } catch (error) {
      console.error("Error searching PO numbers:", error);
    }
  };

  const debounceTimer = setTimeout(fetchPoNumbers, 300);
  return () => clearTimeout(debounceTimer);
}, [poSearchQuery, companyId, clientId, preselectedClientName]);

  // ------------------------------------------------------------------
  // 5. Live search for clients – CLIENT‑SIDE filtering (no search API)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (clientSearchQuery.trim() === "") {
      setFilteredClients(allClients);
    } else {
      const filtered = allClients.filter((name) =>
        name?.toLowerCase().includes(clientSearchQuery.toLowerCase()),
      );
      setFilteredClients(filtered);
    }
  }, [clientSearchQuery, allClients]);

  // ------------------------------------------------------------------
  // 6. Handlers for inputs and dropdowns
  // ------------------------------------------------------------------
  const handlePoNumberChange = (e) => {
    const value = e.target.value;
    setFilters({ ...filters, poNumber: value });
    setPoSearchQuery(value);
    setShowPoDropdown(true);
  };

  const handleClientNameChange = (e) => {
    const value = e.target.value;
    setFilters({ ...filters, clientName: value });
    setClientSearchQuery(value);
    setShowClientDropdown(true);
  };

  const handlePoSelect = (poNumber) => {
    setFilters({ ...filters, poNumber });
    setPoSearchQuery(poNumber);
    setShowPoDropdown(false);
  };

  const handleClientSelect = (clientName) => {
    setFilters({ ...filters, clientName });
    setClientSearchQuery(clientName);
    setShowClientDropdown(false);
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleDateTypeToggle = (dateType) => {
    setDateTypes((prev) => ({
      ...prev,
      [dateType]: {
        ...prev[dateType],
        selected: !prev[dateType].selected,
      },
    }));
  };

  const handleDateChange = (dateType, field, value) => {
    setDateTypes((prev) => ({
      ...prev,
      [dateType]: {
        ...prev[dateType],
        [field]: value,
      },
    }));
  };

  // ------------------------------------------------------------------
  // 7. Apply filters
  // ------------------------------------------------------------------
  const handleSearch = () => {
    const dateFilters = {};
    if (dateTypes.poDate.selected) {
      if (dateTypes.poDate.from) dateFilters.poDateFrom = dateTypes.poDate.from;
      if (dateTypes.poDate.to) dateFilters.poDateTo = dateTypes.poDate.to;
    }
    if (dateTypes.createdDate.selected) {
      if (dateTypes.createdDate.from)
        dateFilters.createdDateFrom = dateTypes.createdDate.from;
      if (dateTypes.createdDate.to)
        dateFilters.createdDateTo = dateTypes.createdDate.to;
    }
    if (dateTypes.updatedDate.selected) {
      if (dateTypes.updatedDate.from)
        dateFilters.updatedDateFrom = dateTypes.updatedDate.from;
      if (dateTypes.updatedDate.to)
        dateFilters.updatedDateTo = dateTypes.updatedDate.to;
    }
    if (dateTypes.deliveryDate.selected) {
      if (dateTypes.deliveryDate.from)
        dateFilters.deliveryDateFrom = dateTypes.deliveryDate.from;
      if (dateTypes.deliveryDate.to)
        dateFilters.deliveryDateTo = dateTypes.deliveryDate.to;
    }

    const activeFilters = Object.entries(filters).reduce(
      (acc, [key, value]) => {
        if (value && value.trim() !== "") acc[key] = value;
        return acc;
      },
      {},
    );

    onSearch({ ...activeFilters, ...dateFilters });
    onClose();
  };

  const handleClear = () => {
    setFilters({
      poNumber: "",
      clientName: "",
      status: "",
      paymentTerms: "",
    });
    setDateTypes({
      poDate: { selected: false, from: "", to: "" },
      createdDate: { selected: false, from: "", to: "" },
      updatedDate: { selected: false, from: "", to: "" },
      deliveryDate: { selected: false, from: "", to: "" },
    });
    setPoSearchQuery("");
    setClientSearchQuery("");
    setShowPoDropdown(false);
    setShowClientDropdown(false);
    if (onClear) onClear();
  };

  // ------------------------------------------------------------------
  // 8. Click outside to close dropdowns
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPoDropdown && !event.target.closest(".po-search-container")) {
        setShowPoDropdown(false);
      }
      if (
        showClientDropdown &&
        !event.target.closest(".client-search-container")
      ) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPoDropdown, showClientDropdown]);

  if (!isOpen) return null;

  // ------------------------------------------------------------------
  // 9. Helpers for formatting
  // ------------------------------------------------------------------
  const selectedDateCount = Object.values(dateTypes).filter(
    (t) => t.selected,
  ).length;

  const formatStatus = (status) => {
    const map = {
      draft: "Draft",
      issued: "Issued",
      acknowledged: "Acknowledged",
      partially_received: "Partially Received",
      fully_received: "Fully Received",
      cancelled: "Cancelled",
      closed: "Closed",
    };
    return map[status] || status;
  };

  const formatPaymentTerms = (terms) => {
    const map = {
      "net-30": "Net 30 Days",
      "net-60": "Net 60 Days",
      "net-90": "Net 90 Days",
      cod: "Cash on Delivery",
      advance: "Advance Payment",
      immediate: "Immediate Payment",
    };
    return map[terms] || terms;
  };

  // ------------------------------------------------------------------
  // 10. Render (identical UI, only labels changed)
  // ------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Advanced Search
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Filter purchase orders by multiple criteria
              </p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-gray-100 p-2 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PO Number */}
              <div className="space-y-1.5 po-search-container">
  <label className="block text-xs font-medium text-gray-700">PO Number</label>
  <div className="relative">
    <input
      type="text"
      name="poNumber"
      value={filters.poNumber}
      onChange={handlePoNumberChange}
      onFocus={() => setShowPoDropdown(true)}
      placeholder="Type to search PO numbers..."
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all pr-10"
    />
    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
      <ChevronDown size={16} className="text-gray-400" />
    </div>
    {showPoDropdown && (
      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
        {loadingOptions ? (
          <div className="px-3 py-2 text-sm text-gray-500">Loading PO numbers...</div>
        ) : filteredPoNumbers.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500">No PO numbers found</div>
        ) : (
          <ul className="py-1">
            {filteredPoNumbers.map((poNumber, index) => (
              <li
                key={index}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handlePoSelect(poNumber)}
              >
                {poNumber}
              </li>
            ))}
          </ul>
        )}
      </div>
    )}
  </div>
</div>

              {/* Client Name – now using getClientsApi */}
              {!clientId && (
                <div className="space-y-1.5 client-search-container">
                  <label className="block text-xs font-medium text-gray-700">
                    Client Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="clientName"
                      value={filters.clientName}
                      onChange={handleClientNameChange}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Type to search clients..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all pr-10"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <ChevronDown size={16} className="text-gray-400" />
                    </div>
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <ul className="py-1">
                          {filteredClients.map((clientName, index) => (
                            <li
                              key={index}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => handleClientSelect(clientName)}
                            >
                              {clientName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {loadingOptions && (
                    <p className="text-xs text-gray-500 mt-1">
                      Loading clients...
                    </p>
                  )}
                </div>
              )}
              {clientId && (
                <div className="space-y-1.5 client-search-container rounded-md text-xs text-blue-800">
                  Filtering for client: <strong>{preselectedClientName}</strong>
                </div>
              )}

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">All Statuses</option>
                  {searchOptions.statuses
                    .filter((item) => item !== "")
                    .map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Payment Terms */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={filters.paymentTerms}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">All Terms</option>
                  {searchOptions.paymentTermsList
                    .filter((item) => item !== "")
                    .map((term) => (
                      <option key={term} value={term}>
                        {formatPaymentTerms(term)}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Date Type Selection */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-700 mb-3">
                Select Date Type(s)
              </label>
              <div className="flex items-center gap-6">
                {/* PO Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.poDate.selected}
                      onChange={() => handleDateTypeToggle("poDate")}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.poDate.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.poDate.selected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.poDate.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    PO Date
                  </span>
                </label>
                {/* Created Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.createdDate.selected}
                      onChange={() => handleDateTypeToggle("createdDate")}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.createdDate.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.createdDate.selected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.createdDate.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    Created Date
                  </span>
                </label>
                {/* Updated Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.updatedDate.selected}
                      onChange={() => handleDateTypeToggle("updatedDate")}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.updatedDate.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.updatedDate.selected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.updatedDate.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    Updated Date
                  </span>
                </label>
                {/* Delivery Date */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={dateTypes.deliveryDate.selected}
                      onChange={() => handleDateTypeToggle("deliveryDate")}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        dateTypes.deliveryDate.selected
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 group-hover:border-gray-400"
                      }`}
                    >
                      {dateTypes.deliveryDate.selected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      dateTypes.deliveryDate.selected
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-gray-900"
                    }`}
                  >
                    Delivery Date
                  </span>
                </label>
              </div>
            </div>

            {/* Dynamic Date Range Inputs */}
            {selectedDateCount > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-4">
                  {/* PO Date Range */}
                  {dateTypes.poDate.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        PO Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.poDate.from}
                            onChange={(e) =>
                              handleDateChange("poDate", "from", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.poDate.to}
                            onChange={(e) =>
                              handleDateChange("poDate", "to", e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Created Date Range */}
                  {dateTypes.createdDate.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Created Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.createdDate.from}
                            onChange={(e) =>
                              handleDateChange(
                                "createdDate",
                                "from",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.createdDate.to}
                            onChange={(e) =>
                              handleDateChange(
                                "createdDate",
                                "to",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Updated Date Range */}
                  {dateTypes.updatedDate.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Updated Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.updatedDate.from}
                            onChange={(e) =>
                              handleDateChange(
                                "updatedDate",
                                "from",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.updatedDate.to}
                            onChange={(e) =>
                              handleDateChange(
                                "updatedDate",
                                "to",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Delivery Date Range */}
                  {dateTypes.deliveryDate.selected && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Delivery Date Range
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            From
                          </label>
                          <input
                            type="date"
                            value={dateTypes.deliveryDate.from}
                            onChange={(e) =>
                              handleDateChange(
                                "deliveryDate",
                                "from",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-500">
                            To
                          </label>
                          <input
                            type="date"
                            value={dateTypes.deliveryDate.to}
                            onChange={(e) =>
                              handleDateChange(
                                "deliveryDate",
                                "to",
                                e.target.value,
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow transition-all ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Applying...
                  </div>
                ) : (
                  "Apply Filters"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderAdvancedSearch;
