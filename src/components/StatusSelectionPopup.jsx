import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";

const StatusSelectionPopup = ({ isOpen, onClose, onSelectStatus, loading }) => {
  const [selectedStatus, setSelectedStatus] = useState("active");

  const statuses = [
    { value: "active", label: "Active", color: "bg-green-500" },
    { value: "inprogress", label: "In Progress", color: "bg-yellow-500" },
    { value: "completed", label: "Completed", color: "bg-gray-500" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-[360px] p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Select Invoice Status</h3>
          <button onClick={onClose} disabled={loading}>
            <X />
          </button>
        </div>

        <div className="space-y-3">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStatus(s.value)}
              disabled={loading}
              className={`w-full p-3 border rounded-lg flex items-center gap-3
                ${
                  selectedStatus === s.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full ${s.color} flex items-center justify-center`}
              >
                {selectedStatus === s.value && (
                  <Check className="text-white" size={14} />
                )}
              </div>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={() => onSelectStatus(selectedStatus)}
            disabled={loading}
            className="px-4 py-2 bg-neutral-700 text-white rounded-lg"
          >
            {loading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusSelectionPopup;
