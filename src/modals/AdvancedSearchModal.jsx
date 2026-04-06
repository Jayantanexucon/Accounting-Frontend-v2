import { useState, useEffect, useCallback } from "react";
import { X, Calendar, DollarSign, Users, Filter, Search, ChevronDown, ChevronUp, Hash, Building, Check } from "lucide-react";
import { formatCurrency } from "../utils/formatUtil";
import { toast } from "react-toastify";
import { allJournalApi } from "../apis/journalApi";
import { useAuth } from "../contexts/AuthContext";
import { useMemo } from "react";

export default function AdvancedSearchModal({ open, onClose, filters: initialFilters, onApplyFilters, availableAccountGroups = [] }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    dateRange: { from: null, to: null },
    amountRange: { min: "", max: "" },
    amountType: "both", // "debit", "credit", or "both"
    accountGroups: [],
    journalIds: [], // Changed to array for multiple selection
    partyName: "",
  });

  const [expandedSections, setExpandedSections] = useState({
    temporal: true,
    financial: false,
    relational: false,
  });

  // State for journals
  const [journals, setJournals] = useState([]);
  const [loadingJournals, setLoadingJournals] = useState(false);
  const [journalSearch, setJournalSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Initialize with provided filters
  useEffect(() => {
    if (initialFilters) {
      // Convert journalId to journalIds array for backward compatibility
      const normalizedFilters = { ...initialFilters };
      if (normalizedFilters.journalId && !normalizedFilters.journalIds) {
        normalizedFilters.journalIds = [normalizedFilters.journalId];
        delete normalizedFilters.journalId;
      } else if (!normalizedFilters.journalIds) {
        normalizedFilters.journalIds = [];
      }
      setFilters(normalizedFilters);
    }
  }, [initialFilters]);

  // Fetch journals when modal opens
  useEffect(() => {
    if (open && user?.company?._id) {
      fetchJournals();
    }
  }, [open, user?.company?._id]);

  const fetchJournals = async () => {
    try {
      setLoadingJournals(true);
      const controller = new AbortController();
      const response = await allJournalApi(user.company._id, {}, controller.signal);
      setJournals(response.data || []);
    } catch (error) {
      console.error("Error fetching journals:", error);
      toast.error("Failed to load journals");
    } finally {
      setLoadingJournals(false);
    }
  };

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleDateChange = useCallback((field, date) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date,
      },
    }));
  }, []);

  const handleAmountChange = useCallback((field, value) => {
    const numValue = value === "" ? "" : parseFloat(value) || 0;
    setFilters((prev) => ({
      ...prev,
      amountRange: {
        ...prev.amountRange,
        [field]: numValue,
      },
    }));
  }, []);

  const toggleAccountGroup = useCallback((group) => {
    setFilters((prev) => ({
      ...prev,
      accountGroups: prev.accountGroups.includes(group) ? prev.accountGroups.filter((g) => g !== group) : [...prev.accountGroups, group],
    }));
  }, []);

  const toggleJournal = useCallback((journalId) => {
    setFilters((prev) => ({
      ...prev,
      journalIds: prev.journalIds.includes(journalId) ? prev.journalIds.filter((id) => id !== journalId) : [...prev.journalIds, journalId],
    }));
  }, []);

  const handleApply = useCallback(() => {
    // Validate date range
    if (filters.dateRange.from && filters.dateRange.to && new Date(filters.dateRange.from) > new Date(filters.dateRange.to)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    // Validate amount range
    if (filters.amountRange.min !== "" && filters.amountRange.max !== "" && parseFloat(filters.amountRange.min) > parseFloat(filters.amountRange.max)) {
      toast.error("Minimum amount cannot be greater than maximum");
      return;
    }

    onApplyFilters(filters);
    onClose();
  }, [filters, onApplyFilters, onClose]);

  const handleClearAll = useCallback(() => {
    const clearedFilters = {
      dateRange: { from: null, to: null },
      amountRange: { min: "", max: "" },
      amountType: "both",
      accountGroups: [],
      journalIds: [],
      partyName: "",
    };
    setFilters(clearedFilters);
    setJournalSearch("");
    setGroupSearch("");
    onApplyFilters(clearedFilters);
    toast.info("All filters cleared");
  }, [onApplyFilters]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.amountRange.min !== "" || filters.amountRange.max !== "") count++;
    if (filters.amountType !== "both") count++;
    if (filters.accountGroups.length > 0) count++;
    if (filters.journalIds.length > 0) count++;
    if (filters.partyName) count++;
    return count;
  }, [filters]);

  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  // Filter journals based on search
  const filteredJournals = useMemo(() => {
    return journals
      .filter((journal) => {
        const searchLower = journalSearch.toLowerCase();
        const journalRef = journal.number || journal.name || journal._id;
        return journalRef.toLowerCase().includes(searchLower) || (journal.narration && journal.narration.toLowerCase().includes(searchLower));
      })
      .slice(0, 10); // Limit to 10 results for better UX
  }, [journals, journalSearch]);

  // Filter account groups based on search
  const filteredAccountGroups = useMemo(() => {
    const searchLower = groupSearch.toLowerCase();
    return availableAccountGroups.filter((group) => group.toLowerCase().includes(searchLower));
  }, [availableAccountGroups, groupSearch]);

  const selectAllAccountGroups = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      accountGroups: [...availableAccountGroups],
    }));
  }, [availableAccountGroups]);

  const clearAllAccountGroups = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      accountGroups: [],
    }));
  }, []);

  const selectAllJournals = useCallback(() => {
    const allJournalIds = filteredJournals.map((journal) => journal.number || journal.name || journal._id);
    setFilters((prev) => ({
      ...prev,
      journalIds: [...allJournalIds],
    }));
  }, [filteredJournals]);

  const clearAllJournals = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      journalIds: [],
    }));
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop with blur effect */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="border-b border-gray-200/50 px-6 py-4 bg-white/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Advanced Transaction Search</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Filter transactions across all ledger accounts
                    {getActiveFilterCount() > 0 && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {getActiveFilterCount()} active filter{getActiveFilterCount() !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100/50 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Temporal Filter Section */}
              <div className="border border-gray-200/50 rounded-lg bg-white/50 backdrop-blur-sm">
                <button onClick={() => toggleSection("temporal")} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-gray-600" />
                    <span className="font-medium text-gray-900">Date Range</span>
                  </div>
                  {expandedSections.temporal ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {expandedSections.temporal && (
                  <div className="p-4 border-t border-gray-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                        <input
                          type="date"
                          value={formatDateForInput(filters.dateRange.from)}
                          onChange={(e) => handleDateChange("from", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                        <input
                          type="date"
                          value={formatDateForInput(filters.dateRange.to)}
                          onChange={(e) => handleDateChange("to", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Filter transactions by posting date</p>
                  </div>
                )}
              </div>

              {/* Financial Filter Section */}
              <div className="border border-gray-200/50 rounded-lg bg-white/50 backdrop-blur-sm">
                <button onClick={() => toggleSection("financial")} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 rounded-t-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign size={18} className="text-gray-600" />
                    <span className="font-medium text-gray-900">Amount & Type</span>
                  </div>
                  {expandedSections.financial ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {expandedSections.financial && (
                  <div className="p-4 border-t border-gray-200/50 space-y-4">
                    {/* Amount Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            value={filters.amountRange.min}
                            onChange={(e) => handleAmountChange("min", e.target.value)}
                            placeholder="0"
                            step="0.01"
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            value={filters.amountRange.max}
                            onChange={(e) => handleAmountChange("max", e.target.value)}
                            placeholder="1000000"
                            step="0.01"
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Amount Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                      <div className="flex gap-3">
                        {["both", "debit", "credit"].map((type) => (
                          <button
                            key={type}
                            onClick={() => setFilters((prev) => ({ ...prev, amountType: type }))}
                            className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                              filters.amountType === type
                                ? type === "debit"
                                  ? "bg-blue-100 border-blue-300 text-blue-700"
                                  : type === "credit"
                                  ? "bg-green-100 border-green-300 text-green-700"
                                  : "bg-purple-100 border-purple-300 text-purple-700"
                                : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {type === "both" && "Both"}
                            {type === "debit" && "Debit Only"}
                            {type === "credit" && "Credit Only"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Combined Account Groups and Journal Trail - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Groups */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-gray-600" />
                      <label className="block text-sm font-medium text-gray-700">Account Groups</label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={selectAllAccountGroups} className="text-xs text-blue-600 hover:text-blue-800">
                        Select All
                      </button>
                      <button onClick={clearAllAccountGroups} className="text-xs text-gray-600 hover:text-gray-800">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Search or select account groups..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/90"
                    />

                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white/80">
                      {filteredAccountGroups.length > 0 ? (
                        filteredAccountGroups.map((group) => (
                          <div
                            key={group}
                            onClick={() => toggleAccountGroup(group)}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors flex items-center justify-between ${
                              filters.accountGroups.includes(group) ? "bg-blue-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 border border-gray-300 rounded flex items-center justify-center ${
                                  filters.accountGroups.includes(group) ? "bg-blue-600 border-blue-600" : "bg-white"
                                }`}
                              >
                                {filters.accountGroups.includes(group) && <Check size={12} className="text-white" />}
                              </div>
                              <span className="text-sm text-gray-700">{group}</span>
                            </div>
                            {filters.accountGroups.includes(group) && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">{groupSearch ? "No account groups found" : "No account groups available"}</div>
                      )}
                    </div>

                    {filters.accountGroups.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">Selected: {filters.accountGroups.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Journal Trail */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash size={18} className="text-gray-600" />
                      <label className="block text-sm font-medium text-gray-700">Journal Trail</label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={selectAllJournals} className="text-xs text-blue-600 hover:text-blue-800">
                        Select All
                      </button>
                      <button onClick={clearAllJournals} className="text-xs text-gray-600 hover:text-gray-800">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={journalSearch}
                      onChange={(e) => setJournalSearch(e.target.value)}
                      placeholder="Search or select journals..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/90"
                    />

                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white/80">
                      {loadingJournals ? (
                        <div className="p-4 text-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading journals...</p>
                        </div>
                      ) : filteredJournals.length > 0 ? (
                        filteredJournals.map((journal, index) => {
                          const journalRef = journal.number || journal.name || journal._id;
                          const isSelected = filters.journalIds.includes(journalRef);
                          return (
                            <div
                              key={journal._id || index}
                              onClick={() => toggleJournal(journalRef)}
                              className={`p-3 border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors flex items-center justify-between ${isSelected ? "bg-blue-50" : ""}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 border border-gray-300 rounded flex items-center justify-center ${isSelected ? "bg-blue-600 border-blue-600" : "bg-white"}`}>
                                    {isSelected && <Check size={12} className="text-white" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-gray-900 truncate">{journalRef}</div>
                                    {journal.narration && <div className="text-xs text-gray-600 mt-1 truncate">{journal.narration}</div>}
                                    {journal.date && <div className="text-xs text-gray-500 mt-1">{new Date(journal.date).toLocaleDateString()}</div>}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 ml-2"></div>}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-gray-500">{journalSearch ? "No journals found" : "No journals available"}</p>
                          {journalSearch && <p className="text-xs text-gray-400 mt-1">Try a different search term</p>}
                        </div>
                      )}
                    </div>

                    {filters.journalIds.length > 0 && (
                      <div className="mt-2">
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-blue-800 font-medium">Selected Journals: {filters.journalIds.length}</p>
                              <p className="text-sm text-blue-900 truncate">
                                {filters.journalIds.slice(0, 3).join(", ")}
                                {filters.journalIds.length > 3 && ` and ${filters.journalIds.length - 3} more`}
                              </p>
                            </div>
                            <button onClick={clearAllJournals} className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-2">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Party Name */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building size={18} className="text-gray-600" />
                  <label className="block text-sm font-medium text-gray-700">Party Name Contains</label>
                </div>
                <input
                  type="text"
                  value={filters.partyName}
                  onChange={(e) => setFilters((prev) => ({ ...prev, partyName: e.target.value }))}
                  placeholder="Search by party/client/vendor name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200/50 px-6 py-4 bg-gray-50/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 rounded-md transition-colors"
                disabled={getActiveFilterCount() === 0}
              >
                Clear All Filters
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50/50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleApply} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2">
                  <Search size={16} />
                  Apply Filters
                  {getActiveFilterCount() > 0 && <span className="px-2 py-0.5 bg-white text-blue-600 text-xs font-medium rounded-full">{getActiveFilterCount()}</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
