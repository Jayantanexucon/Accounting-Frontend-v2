import React, { useMemo, useRef, useState } from "react";
import DialogBox from "./DialogBox";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";
import { addAccountApi, suggestAccountScheduleMappingApi, updateAccountApi } from "../apis/accountApi";
import { API } from "../apis/api";
import { getInvoiceClientsApi } from "../apis/invoice.api";
import { getScheduleGroupsForNature, getScheduleLineItems } from "../utils/scheduleIIIConfig";

const GROUP_NATURE_DEFAULTS = {
  Asset: { accountType: "Balance Sheet", openingType: "Debit" },
  Liability: { accountType: "Balance Sheet", openingType: "Credit" },
  Equity: { accountType: "Balance Sheet", openingType: "Credit" },
  Income: { accountType: "Profit & Loss", openingType: "Credit" },
  Expense: { accountType: "Profit & Loss", openingType: "Debit" },
};

const isTradeReceivableGroup = (group) =>
  group?.scheduleLineItem === "Trade Receivables";

const isTradePayableGroup = (group) =>
  group?.scheduleLineItem === "Trade Payables";

export default function ManageLedgerModal({
  open,
  onClose = () => {},
  title = "",
  subtitle = "",
  updateAccount = () => {},
  ledgerToEdit = null,
}) {
  const { user } = useAuth();
  const isEditMode = Boolean(ledgerToEdit?._id);
  const dropdownRef = useRef(null);

  const [groups, setGroups] = React.useState([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);
  const [tempLedgers, setTempLedgers] = React.useState([]);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [invoiceClients, setInvoiceClients] = React.useState([]);
  const [showClients, setShowClients] = React.useState(false);
  const [vendors, setVendors] = React.useState([]);
  const [showVendors, setShowVendors] = React.useState(false);
  const [scheduleTouched, setScheduleTouched] = React.useState(false);

  const [form, setForm] = React.useState({
    name: "",
    groupId: "",
    groupName: "",
    openingBalance: 0,
    isActive: true,
    linkedClientId: null,
    linkedVendorId: null,
    scheduleMainHead: "",
    scheduleGroup: "",
    scheduleLineItem: "",
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group._id === form.groupId) || null,
    [groups, form.groupId]
  );

  const derivedInfo = useMemo(() => {
    if (!selectedGroup?.nature) return null;
    return {
      ...GROUP_NATURE_DEFAULTS[selectedGroup.nature],
      scheduleMainHead: form.scheduleMainHead || selectedGroup.scheduleMainHead,
      scheduleGroup: form.scheduleGroup || selectedGroup.scheduleGroup,
      scheduleLineItem: form.scheduleLineItem || selectedGroup.scheduleLineItem,
      noteNo: selectedGroup.noteNo,
    };
  }, [form.scheduleGroup, form.scheduleLineItem, form.scheduleMainHead, selectedGroup]);

  const availableScheduleGroups = useMemo(
    () => getScheduleGroupsForNature(selectedGroup?.nature),
    [selectedGroup?.nature]
  );

  const availableScheduleLineItems = useMemo(
    () => getScheduleLineItems(selectedGroup?.nature, form.scheduleGroup),
    [form.scheduleGroup, selectedGroup?.nature]
  );

  const resetAuxiliaryState = () => {
    setShowClients(false);
    setShowVendors(false);
    setInvoiceClients([]);
    setVendors([]);
  };

  const resetForm = () => {
    setForm({
      name: "",
      groupId: "",
      groupName: "",
      openingBalance: 0,
      isActive: true,
      linkedClientId: null,
      linkedVendorId: null,
      scheduleMainHead: "",
      scheduleGroup: "",
      scheduleLineItem: "",
    });
    setSearch("");
    setShowDropdown(false);
    setScheduleTouched(false);
    resetAuxiliaryState();
  };

  React.useEffect(() => {
    if (!open) return;

    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const res = await API.get("/accounting/group", {
          params: { companyId: user.company._id },
        });
        setGroups(res.data.data || []);
      } catch (error) {
        toast.error(error.message || "Failed to load groups");
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [open, user.company._id]);

  const loadReceivableOrPayableSource = async (group) => {
    resetAuxiliaryState();
    if (isTradeReceivableGroup(group)) {
      try {
        const res = await getInvoiceClientsApi(user?.company?._id);
        setInvoiceClients(res.data || []);
        setShowClients(true);
      } catch (error) {
        toast.error(error.message || "Failed to load clients");
      }
      return;
    }

    if (isTradePayableGroup(group)) {
      try {
        const res = await API.get(`/vendor/${user?.company?._id}`);
        setVendors(res.data.data?.vendors || []);
        setShowVendors(true);
      } catch (error) {
        toast.error(error.message || "Failed to load vendors");
      }
    }
  };

  const setSelectedGroupState = async (group) => {
    if (!group) {
      resetForm();
      return;
    }

    setForm((prev) => ({
      ...prev,
      groupId: group._id,
      groupName: group.name,
      linkedClientId: null,
      linkedVendorId: null,
      scheduleMainHead: group.scheduleMainHead || "",
      scheduleGroup: group.scheduleGroup || "",
      scheduleLineItem: group.scheduleLineItem || "",
    }));
    setSearch(`${group.name} (${group.nature})`);
    setShowDropdown(false);
    setScheduleTouched(false);
    await loadReceivableOrPayableSource(group);

    try {
      const res = await suggestAccountScheduleMappingApi({
        ledgerName: form.name,
        groupId: group._id,
        companyId: user.company._id,
      });
      const mapping = res.data || {};
      setForm((prev) => ({
        ...prev,
        scheduleMainHead: mapping.scheduleMainHead || group.scheduleMainHead || "",
        scheduleGroup: mapping.scheduleGroup || group.scheduleGroup || "",
        scheduleLineItem: mapping.scheduleLineItem || group.scheduleLineItem || "",
      }));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to suggest Schedule III mapping");
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === "openingBalance") {
      setForm((prev) => ({ ...prev, openingBalance: Number(value) }));
      return;
    }

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "scheduleGroup") {
      setScheduleTouched(true);
      const nextLineItems = getScheduleLineItems(selectedGroup?.nature, value);
      setForm((prev) => ({
        ...prev,
        scheduleGroup: value,
        scheduleLineItem: nextLineItems.includes(prev.scheduleLineItem) ? prev.scheduleLineItem : nextLineItems[0] || "",
      }));
      return;
    }

    if (name === "scheduleMainHead" || name === "scheduleLineItem") {
      setScheduleTouched(true);
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const filteredGroups = groups.filter((group) =>
    `${group.name} ${group.nature} ${group.scheduleGroup || ""} ${group.scheduleLineItem || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleGroupSearchChange = (value) => {
    setSearch(value);
    setShowDropdown(true);

    const currentSelectionLabel = form.groupName
      ? `${form.groupName} (${groups.find((group) => group._id === form.groupId)?.nature || ""})`
      : "";

    if (!value.trim() || value !== currentSelectionLabel) {
      setForm((prev) => ({
        ...prev,
        groupId: "",
        groupName: "",
        linkedClientId: null,
        linkedVendorId: null,
        scheduleMainHead: "",
        scheduleGroup: "",
        scheduleLineItem: "",
      }));
      setScheduleTouched(false);
      resetAuxiliaryState();
    }
  };

  const buildPayload = () => {
    if (!form.groupId) throw new Error("Account Group is required");
    if (!form.name.trim()) throw new Error("Account Name is required");
    if (!form.scheduleMainHead || !form.scheduleGroup || !form.scheduleLineItem) {
      throw new Error("Schedule III mapping is required");
    }

    const ledgerCode = form.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 12);

    return {
      ...form,
      code: ledgerCode,
      name: form.name.trim(),
    };
  };

  const handleAddAccount = () => {
    try {
      const payload = buildPayload();

      const alreadyExists = tempLedgers.some(
        (ledger, index) =>
          ledger.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
          index !== editingIndex
      );

      if (alreadyExists) {
        toast.error("Already added in the temporary list");
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

      resetForm();
      toast.success("Ledger added to temporary list");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      if (isEditMode) {
        const res = await updateAccountApi(
          ledgerToEdit._id,
          buildPayload(),
          user.company._id
        );
        updateAccount(res.data);
        toast.success("Ledger updated successfully");
        onClose();
        return;
      }

      if (tempLedgers.length === 0) {
        toast.error("No ledgers to create");
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
      toast.error(error?.response?.data?.message || error.message || "Failed to create ledgers");
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  React.useEffect(() => {
    if (open && ledgerToEdit && groups.length > 0) {
      const group = groups.find((item) => item._id === ledgerToEdit.groupId);
      setForm({
        name: ledgerToEdit.name || "",
        groupId: ledgerToEdit.groupId || "",
        groupName: ledgerToEdit.groupName || "",
        openingBalance: ledgerToEdit.openingBalance || 0,
        isActive: ledgerToEdit.isActive ?? true,
        linkedClientId: ledgerToEdit.linkedClientId || null,
        linkedVendorId: ledgerToEdit.linkedVendorId || null,
        scheduleMainHead: ledgerToEdit.scheduleMapping?.scheduleMainHead || group?.scheduleMainHead || "",
        scheduleGroup: ledgerToEdit.scheduleMapping?.scheduleGroup || group?.scheduleGroup || "",
        scheduleLineItem: ledgerToEdit.scheduleMapping?.scheduleLineItem || group?.scheduleLineItem || "",
      });
      setSearch(group ? `${group.name} (${group.nature})` : ledgerToEdit.groupName || "");
      setShowDropdown(false);
      setScheduleTouched(Boolean(ledgerToEdit.scheduleMapping?.scheduleLineItem));
      loadReceivableOrPayableSource(group);
    }
  }, [open, ledgerToEdit, groups]);

  React.useEffect(() => {
    if (!open) {
      resetForm();
      setTempLedgers([]);
      setEditingIndex(null);
      setScheduleTouched(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !form.groupId || scheduleTouched) return;

    const timeoutId = window.setTimeout(async () => {
      try {
        const res = await suggestAccountScheduleMappingApi({
          ledgerName: form.name,
          groupId: form.groupId,
          companyId: user.company._id,
        });
        const mapping = res.data || {};
        setForm((prev) => ({
          ...prev,
          scheduleMainHead: mapping.scheduleMainHead || prev.scheduleMainHead,
          scheduleGroup: mapping.scheduleGroup || prev.scheduleGroup,
          scheduleLineItem: mapping.scheduleLineItem || prev.scheduleLineItem,
        }));
      } catch {
        // Avoid noisy toasts while the user is typing the ledger name.
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [form.groupId, form.name, open, scheduleTouched, user.company._id]);

  return (
    <DialogBox
      open={open}
      onClose={onClose}
      onSubmit={isEditMode ? handleFinalSubmit : handleAddAccount}
      title={title}
      subtitle={subtitle}
      contents={
        <div className="flex gap-6">
          <div className={isEditMode ? "w-full" : "w-2/3"}>
            <form className="mt-4 space-y-6">
              <div className="relative" ref={dropdownRef}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Account Group</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => handleGroupSearchChange(e.target.value)}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search group..."
                      className="w-full rounded-lg border px-4 py-2.5"
                    />

                    {showDropdown && (
                      <div className="absolute z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border bg-white">
                        {loadingGroups && <div className="px-4 py-2 text-sm text-gray-500">Loading groups...</div>}
                        {filteredGroups.map((group) => (
                          <button
                            key={group._id}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-gray-100"
                            onClick={() => setSelectedGroupState(group)}
                          >
                            <div className="text-sm font-medium">{group.name} ({group.nature})</div>
                            <div className="text-[11px] text-gray-500">
                              {group.scheduleMainHead} • {group.scheduleGroup} • {group.scheduleLineItem}
                            </div>
                          </button>
                        ))}
                        {!loadingGroups && filteredGroups.length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">No groups found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showClients && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-semibold">Clients (Trade Receivables)</p>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {invoiceClients.length > 0 ? (
                      invoiceClients.map((client, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              name: client.name,
                              linkedClientId: client._id || null,
                              linkedVendorId: null,
                            }))
                          }
                          className="w-full rounded border border-transparent px-3 py-2 text-left text-sm hover:border-gray-300 hover:bg-white"
                        >
                          <div className="font-medium">{client.name}</div>
                          {client.gstin && <div className="text-xs text-gray-500">GSTIN: {client.gstin}</div>}
                        </button>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-gray-500">No clients found</p>
                    )}
                  </div>
                </div>
              )}

              {showVendors && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-sm font-semibold">Vendors (Trade Payables)</p>
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {vendors.length > 0 ? (
                      vendors.map((vendor) => (
                        <button
                          key={vendor._id}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              name: vendor.vendorName,
                              linkedVendorId: vendor._id,
                              linkedClientId: null,
                            }))
                          }
                          className="w-full rounded border border-transparent px-3 py-2 text-left text-sm hover:border-gray-300 hover:bg-white"
                        >
                          <div className="font-medium">{vendor.vendorName}</div>
                          <div className="text-xs text-gray-500">Code: {vendor.vendorCode}</div>
                        </button>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-gray-500">No vendors found</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold">Account Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-2.5"
                  required
                />
              </div>

              {derivedInfo && (
                <div className="grid grid-cols-1 gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-700">Derived Classification</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{derivedInfo.accountType}</p>
                    <p className="text-xs text-slate-500">Opening type: {derivedInfo.openingType}</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-700">Schedule III Mapping</p>

                    <div className="grid grid-cols-1 gap-3">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">Main Head</span>
                        <select
                          name="scheduleMainHead"
                          value={form.scheduleMainHead}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm"
                        >
                          <option value={derivedInfo.scheduleMainHead}>{derivedInfo.scheduleMainHead}</option>
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">Schedule Group</span>
                        <select
                          name="scheduleGroup"
                          value={form.scheduleGroup}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm"
                        >
                          {availableScheduleGroups.map((groupName) => (
                            <option key={groupName} value={groupName}>
                              {groupName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold text-slate-600">Line Item</span>
                        <select
                          name="scheduleLineItem"
                          value={form.scheduleLineItem}
                          onChange={handleChange}
                          className="w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm"
                        >
                          {availableScheduleLineItems.map((lineItem) => (
                            <option key={lineItem} value={lineItem}>
                              {lineItem}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {derivedInfo.noteNo && <p className="text-xs text-slate-500">Note {derivedInfo.noteNo}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-w-xs">
                <label className="text-sm font-semibold">Opening Balance</label>
                <input
                  type="number"
                  name="openingBalance"
                  value={form.openingBalance}
                  onChange={handleChange}
                  className="w-full rounded-lg border px-4 py-2.5"
                />
              </div>

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

          {!isEditMode && (
            <div className="max-h-[500px] w-1/3 overflow-y-auto border-l pl-4">
              <h3 className="mb-3 text-sm font-semibold">Temporary Ledgers</h3>

              {tempLedgers.length === 0 && <p className="text-xs text-gray-500">No ledgers added yet</p>}

              {tempLedgers.map((ledger, index) => (
                <div key={index} className="mb-2 rounded border bg-gray-50 p-2 text-sm">
                  <div className="font-medium">{ledger.name}</div>
                  <div className="text-xs text-gray-500">{ledger.groupName}</div>
                  <div className="text-[11px] text-gray-400">{ledger.openingBalance} opening balance</div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setForm(ledger);
                        const group = groups.find((item) => item._id === ledger.groupId);
                        setSearch(group ? `${group.name} (${group.nature})` : ledger.groupName);
                        setShowDropdown(false);
                        setScheduleTouched(Boolean(ledger.scheduleLineItem));
                        await loadReceivableOrPayableSource(group);
                        setEditingIndex(index);
                      }}
                      className="text-xs text-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setTempLedgers((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-xs text-red-600"
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
                  className="mt-4 w-full rounded bg-green-600 py-2 text-white"
                >
                  Final Submit All
                </button>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}
