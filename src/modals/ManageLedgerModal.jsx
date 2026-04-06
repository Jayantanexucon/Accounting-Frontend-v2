import React, { useState } from "react";
import DialogBox from "./DialogBox";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { addAccountApi } from "../apis/accountApi";
import { API } from "../apis/api";

const GROUP_DEFAULTS = {
  Asset: { type: "balanceSheet", openingType: "debit" },
  Liability: { type: "balanceSheet", openingType: "credit" },
  Equity: { type: "balanceSheet", openingType: "credit" },
  Income: { type: "revenueAccount", openingType: "credit" },
  Expense: { type: "revenueAccount", openingType: "debit" },
};

export default function ManageLedgerModal({
  open,
  onClose = () => {},
  title = "",
  subtitle = "",
  updateAccount = () => {},
}) {
  const { user } = useAuth();

  const [groups, setGroups] = React.useState([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);
  const [allowOverride, setAllowOverride] = React.useState(false);
  const [showSubType, setShowSubType] = React.useState(false);
  const [isCurrent, setIsCurrent] = React.useState(true);
  const [tempLedgers, setTempLedgers] = React.useState([]);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // For Sundry Debtors (Clients)
  const [invoiceClients, setInvoiceClients] = React.useState([]);
  const [showClients, setShowClients] = React.useState(false);

  // For Sundry Creditors (Vendors)
  const [vendors, setVendors] = React.useState([]);
  const [showVendors, setShowVendors] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    groupId: "",
    groupName: "",
    type: "",
    openingType: "",
    openingBalance: 0,
    isActive: true,
    linkedClientId: null,
    linkedVendorId: null,
  });

  /* ---------------- LOAD GROUPS ---------------- */
  React.useEffect(() => {
    if (!open) return;

    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await API.get(`/group/${user.company._id}`);
        setGroups(res.data.data || []);
      } catch (error) {
        toast.error(error.message || "Failed to load groups");
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [open]);

  /* ---------------- HANDLERS ---------------- */
  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "groupId") {
      const selectedGroup = groups.find((g) => g._id === value);
      const defaults = GROUP_DEFAULTS[selectedGroup?.nature] || {};

      // Show subType checkbox only for Balance Sheet accounts
      const isBalanceSheet = defaults.type === "balanceSheet";
      setShowSubType(isBalanceSheet);

      // Reset to current by default for Balance Sheet accounts
      if (isBalanceSheet) {
        setIsCurrent(true);
      } else {
        setIsCurrent(false);
      }

      setForm((prev) => ({
        ...prev,
        groupId: value,
        groupName: selectedGroup?.name || "",
        type: defaults.type || "",
        openingType: defaults.openingType || "",
      }));

      // 🔥 Sundry Debtors → fetch clients from invoices
      if (selectedGroup?.name === "Sundry Debtors") {
        try {
          const res = await API.get("/invoices/invoice-clients");
          setInvoiceClients(res.data.data || []);
          setShowClients(true);
          setShowVendors(false);
        } catch (error) {
          toast.error(error.message || "Failed to load clients");
          setInvoiceClients([]);
          setShowClients(false);
        }
      }
      // 🔥 Sundry Creditors → fetch vendors
      else if (selectedGroup?.name === "Sundry Creditors") {
        try {
          const res = await API.get(`/vendor/${user?.company?._id}`);
          setVendors(res.data.data?.vendors || []);
          setShowVendors(true);
          setShowClients(false);
        } catch (error) {
          toast.error(error.message || "Failed to load vendors");
          setVendors([]);
          setShowVendors(false);
        }
      }
      // Reset both lists if neither group selected
      else {
        setInvoiceClients([]);
        setShowClients(false);
        setVendors([]);
        setShowVendors(false);
      }

      setAllowOverride(false);
      return;
    }

    // Handle isCurrent checkbox
    if (name === "isCurrent") {
      setIsCurrent(checked);
      return;
    }

    // Handle manual type change (when override is allowed)
    if (name === "type") {
      const isBalanceSheet = value === "balanceSheet";
      setShowSubType(isBalanceSheet);
      if (isBalanceSheet) {
        setIsCurrent(true);
      } else {
        setIsCurrent(false);
      }

      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      return;
    }

    if (name === "openingBalance") {
      setForm((prev) => ({
        ...prev,
        openingBalance: Number(value),
      }));
      return;
    }

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const filteredGroups = groups.filter((g) =>
    `${g.name} ${g.nature}`.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddAccount = () => {
    try {
      if (!form.name || !form.groupId || !form.type || !form.openingType) {
        throw new Error("Please fill all required fields");
      }

      const ledgerCode = form.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12);

      let subTypeValue = null;
      if (form.type === "balanceSheet") {
        subTypeValue = isCurrent ? "current" : "nonCurrent";
      }

      const payload = {
        ...form,
        code: ledgerCode,
        subType: subTypeValue,
        allowOverride,
      };

      //  Check duplicate in temporary list
      const alreadyExists = tempLedgers.some(
        (ledger, index) =>
          ledger.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
          index !== editingIndex,
      );

      if (alreadyExists) {
        toast.error(error.message || "Already added in the temporary list");
        return;
      }

      if (editingIndex !== null) {
        const updated = [...tempLedgers];
        updated[editingIndex] = payload;
        setTempLedgers(updated);
        setEditingIndex(null);
      } else {
        setTempLedgers((prev) => [...prev, payload]);
      }

      // Reset form
      setForm({
        name: "",
        groupId: "",
        groupName: "",
        type: "",
        openingType: "",
        openingBalance: 0,
        isActive: true,
        linkedClientId: null,
        linkedVendorId: null,
      });
      setSearch("");
      setShowDropdown(false);

      toast.success("Ledger added to temporary list");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      if (tempLedgers.length === 0) {
        toast.error( error.message|| "No ledgers to create");
        return;
      }

      for (const ledger of tempLedgers) {
        const res = await addAccountApi(ledger, user.company._id);
        updateAccount(res.data);
      }

      toast.success("All ledgers created successfully");
      setTempLedgers([]);
      onClose();
    } catch (error) {
      toast.error(error.message || "Failed to create ledgers");
    }
  };

  /* ---------------- RESET FORM ON CLOSE ---------------- */
  React.useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        groupId: "",
        groupName: "",
        type: "",
        openingType: "",
        openingBalance: 0,
        isActive: true,
        linkedClientId: null,
        linkedVendorId: null,
      });
      setAllowOverride(false);
      setShowSubType(false);
      setIsCurrent(true);
      setShowClients(false);
      setShowVendors(false);
      setInvoiceClients([]);
      setVendors([]);
    }
  }, [open]);

  return (
    <DialogBox
      open={open}
      onClose={onClose}
      onSubmit={handleAddAccount}
      title={title}
      subtitle={subtitle}
      contents={
        <div className="flex gap-6">
          <div className="w-2/3">
            <form className="space-y-6 mt-4">
              {/* Account Group */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Account Group</label>
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search group..."
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />

                  {showDropdown && (
                    <div className="absolute w-full bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto z-50">
                      {filteredGroups.map((g) => (
                        <div
                          key={g._id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSearch(`${g.name} (${g.nature})`);
                            setShowDropdown(false);

                            handleChange({
                              target: {
                                name: "groupId",
                                value: g._id,
                              },
                            });
                          }}
                        >
                          {g.name} ({g.nature})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 🔥 SUNDRY DEBTORS - Show Clients */}
              {showClients && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-sm font-semibold mb-2">
                    Clients (from invoices)
                  </p>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {invoiceClients.length > 0 ? (
                      invoiceClients.map((c, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              name: c.name,
                              openingType: "debit",
                              type: "balanceSheet",
                            }));
                            setIsCurrent(true);
                            setShowSubType(true);
                            setShowClients(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-white border border-transparent hover:border-gray-300 text-sm"
                        >
                          <div className="font-medium">{c.name}</div>
                          {c.gstin && (
                            <div className="text-xs text-gray-500">
                              GSTIN: {c.gstin}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">
                        No clients found
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 🔥 SUNDRY CREDITORS - Show Vendors */}
              {showVendors && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="text-sm font-semibold mb-2">Vendors</p>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {vendors.length > 0 ? (
                      vendors.map((v) => (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              name: v.vendorName,
                              openingType: "credit",
                              type: "balanceSheet",
                            }));
                            setIsCurrent(true);
                            setShowSubType(true);
                            setShowVendors(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded hover:bg-white border border-transparent hover:border-gray-300 text-sm"
                        >
                          <div className="font-medium">{v.vendorName}</div>
                          <div className="text-xs text-gray-500">
                            Code: {v.vendorCode}
                          </div>
                          {v.gstin && (
                            <div className="text-xs text-gray-500">
                              GSTIN: {v.gstin}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-4">
                        No vendors found
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Account Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Account Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border rounded-lg"
                  required
                />
              </div>

              {/* Account Type + Balance Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Account Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    disabled={!allowOverride}
                    className="w-full px-4 py-2.5 border rounded-lg disabled:bg-gray-100"
                    required
                  >
                    <option value="balanceSheet">Balance Sheet</option>
                    <option value="revenueAccount">Profit & Loss</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Balance Type</label>
                  <select
                    name="openingType"
                    value={form.openingType}
                    onChange={handleChange}
                    disabled={!allowOverride}
                    className="w-full px-4 py-2.5 border rounded-lg disabled:bg-gray-100"
                    required
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              {/* Current/Non-Current Checkbox - Only for Balance Sheet */}
              {showSubType && (
                <div className="flex items-start gap-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    name="isCurrent"
                    id="isCurrentCheckbox"
                    checked={isCurrent}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 rounded mt-1"
                  />
                  <div>
                    <label
                      htmlFor="isCurrentCheckbox"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Mark as Current Asset/Liability
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {isCurrent
                        ? "✓ This account will appear under Current Assets/Current Liabilities (short-term, typically < 1 year)"
                        : "✗ This account will appear under Non-Current Assets/Non-Current Liabilities (long-term, typically > 1 year)"}
                    </p>
                  </div>
                </div>
              )}

              {/* Override Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                />
                <span className="text-xs text-gray-600">
                  Allow manual override of Account Type / Balance Type
                </span>
              </div>

              {/* Opening Balance */}
              {showSubType && (
                <div className="space-y-2 max-w-xs">
                  <label className="text-sm font-semibold">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    name="openingBalance"
                    value={form.openingBalance}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border rounded-lg"
                  />
                </div>
              )}

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                <span className="text-sm">Active Account</span>
              </div>
            </form>
          </div>

          {/* Temporary Ledger List */}
          <div className="w-1/3 border-l pl-4 max-h-[500px] overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3">Temporary Ledgers</h3>

            {tempLedgers.length === 0 && (
              <p className="text-xs text-gray-500">No ledgers added yet</p>
            )}

            {tempLedgers.map((ledger, index) => (
              <div
                key={index}
                className="border rounded p-2 mb-2 text-sm bg-gray-50"
              >
                <div className="font-medium">{ledger.name}</div>
                <div className="text-xs text-gray-500">{ledger.groupName}</div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(ledger);
                      setSearch(ledger.groupName);
                      setEditingIndex(index);
                    }}
                    className="text-blue-600 text-xs"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTempLedgers((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                    className="text-red-600 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {tempLedgers.length > 0 && (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded"
              >
                Final Submit All
              </button>
            )}
          </div>
        </div>
      }
    />
  );
}
