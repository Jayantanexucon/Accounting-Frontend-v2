import { X } from "lucide-react";

export default function FilterBadge({ filters, onRemove, onClearAll }) {
  const getFilterLabel = (key, value) => {
    switch (key) {
      case "dateRange":
        if (value.from || value.to) {
          return `Date: ${value.from ? new Date(value.from).toLocaleDateString() : "Any"} - ${value.to ? new Date(value.to).toLocaleDateString() : "Any"}`;
        }
        return null;
      case "amountRange":
        if (value.min !== "" || value.max !== "") {
          return `Amount: ${value.min !== "" ? `≥ ${value.min}` : ""}${value.min !== "" && value.max !== "" ? " - " : ""}${value.max !== "" ? `≤ ${value.max}` : ""}`;
        }
        return null;
      case "amountType":
        return value !== "both" ? `Type: ${value === "debit" ? "Debit Only" : "Credit Only"}` : null;
      case "accountGroups":
        return value.length > 0 ? `Groups: ${value.length} selected` : null;
      case "journalIds":
        return value.length > 0 ? `Journals: ${value.length} selected` : null;
      case "partyName":
        return value ? `Party: ${value}` : null;
      default:
        return null;
    }
  };

  const activeFilters = Object.entries(filters)
    .map(([key, value]) => ({
      key,
      label: getFilterLabel(key, value),
    }))
    .filter((filter) => filter.label !== null);

  if (activeFilters.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-800">Active Filters:</span>
          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            {activeFilters.length} filter{activeFilters.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={onClearAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline">
          Clear All
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFilters.map(({ key, label }) => (
          <div key={key} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 rounded-full">
            <span className="text-xs text-blue-700">{label}</span>
            <button onClick={() => onRemove(key)} className="p-0.5 hover:bg-blue-100 rounded-full">
              <X size={12} className="text-blue-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
