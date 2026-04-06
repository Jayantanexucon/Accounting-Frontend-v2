import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function GroupForm({ onSubmit, onClose, initial }) {
  const [form, setForm] = useState({
    name: "",
    nature: "",
    balanceType: "Debit",
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        nature: initial.nature || "",
        balanceType: initial.balanceType || "Debit",
      });
    }
  }, [initial]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{initial ? "Update Group" : "Add New Group"}</h2>

          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 transition">
            <X size={22} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter group name"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                         focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600 bg-gray-50"
            />
          </div>

          {/* Nature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nature of Group</label>
            <select
              name="nature"
              value={form.nature}
              required
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                         focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600 bg-gray-50"
            >
              <option value="">Select Nature of Group</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>

          {/* Balance Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Balance Type</label>
            <select
              name="balanceType"
              value={form.balanceType}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm 
                         focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600 bg-gray-50"
            >
              <option value="Debit">Debit</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 
                         text-sm hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-neutral-700 text-white rounded-md text-sm 
                         hover:bg-neutral-800 transition"
            >
              {initial ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
