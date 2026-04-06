import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../apis/api";
import { X } from "lucide-react";

export default function CreateAccountPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    accountGroup: "",
    accountType: "",
    accountName: "",
    accountCode: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.accountGroup || !formData.accountType || !formData.accountName || !formData.accountCode) {
      alert("Please fill all required fields");
      return;
    }

    try {
      await API.post("/accounts/create", formData);
      navigate("/chart");
    } catch (err) {
      // console.log("API Error:", err.response?.data);
      alert("Failed to create account");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-blue-100 flex justify-center items-start py-10 p-6">
      <div className="bg-white/70 backdrop-blur-md w-full max-w-lg p-8 rounded-2xl shadow-2xl border border-white/40">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-900 drop-shadow-sm">Create New Account</h2>
          <button onClick={() => navigate("/chart")}>
            <X className="w-6 h-6 text-green-700" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="font-medium text-green-800 mb-1 block">Account Group *</label>
            <select
              name="accountGroup"
              value={formData.accountGroup}
              onChange={handleChange}
              className="w-full border border-green-100 bg-white/70 focus:border-green-300 focus:ring-green-200 rounded-lg p-3 shadow-sm outline-none"
            >
              <option value="">Select group</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="font-medium text-green-800 mb-1 block">Account Type *</label>
            <input
              type="text"
              name="accountType"
              className="w-full border border-green-100 bg-white/70 focus:border-green-300 focus:ring-green-200 rounded-lg p-3 shadow-sm outline-none"
              value={formData.accountType}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="font-medium text-green-800 mb-1 block">Account Name *</label>
            <input
              type="text"
              name="accountName"
              className="w-full border border-green-100 bg-white/70 focus:border-green-300 focus:ring-green-200 rounded-lg p-3 shadow-sm outline-none"
              value={formData.accountName}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="font-medium text-green-800 mb-1 block">Account Code *</label>
            <input
              type="text"
              name="accountCode"
              className="w-full border border-green-100 bg-white/70 focus:border-green-300 focus:ring-green-200 rounded-lg p-3 shadow-sm outline-none"
              value={formData.accountCode}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="font-medium text-green-800 mb-1 block">Description</label>
            <textarea
              name="description"
              className="w-full border border-green-100 bg-white/70 focus:border-green-300 focus:ring-green-200 rounded-lg p-3 shadow-sm outline-none"
              rows="3"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 justify-end mt-6">
          <button className="px-4 py-2 rounded-lg border border-green-400 text-green-700 hover:bg-green-50 transition" onClick={() => navigate("/chart")}>
            Cancel
          </button>

          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-md transition">
            {loading ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
