import { useEffect, useMemo, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import {
  getDefaultScheduleMappingForGroupName,
  getScheduleGroupsForNature,
  getScheduleLineItems,
  SCHEDULE_III_GROUP_OPTIONS,
} from "../utils/scheduleIIIConfig.js";

export default function GroupForm({
  onSubmit,
  onClose,
  initial,
  submitError = "",
  onClearSubmitError,
}) {
  const [form, setForm] = useState({
    name: "",
    nature: "",
    balanceType: "Debit",
    scheduleMainHead: "",
    scheduleGroup: "",
    scheduleLineItem: "",
    noteNo: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        nature: initial.nature || "",
        balanceType: initial.balanceType || "Debit",
        scheduleMainHead: initial.scheduleMainHead || "",
        scheduleGroup: initial.scheduleGroup || "",
        scheduleLineItem: initial.scheduleLineItem || "",
        noteNo: initial.noteNo || "",
      });
      setErrors({});
      return;
    }

    setForm({
      name: "",
      nature: "",
      balanceType: "Debit",
      scheduleMainHead: "",
      scheduleGroup: "",
      scheduleLineItem: "",
      noteNo: "",
    });
    setErrors({});
  }, [initial]);

  const availableGroups = useMemo(
    () => getScheduleGroupsForNature(form.nature),
    [form.nature]
  );
  const availableLineItems = useMemo(
    () => getScheduleLineItems(form.nature, form.scheduleGroup),
    [form.nature, form.scheduleGroup]
  );

  const validate = (values) => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Group name is required";
    if (!values.nature) nextErrors.nature = "Nature is required";
    if (!values.scheduleMainHead) nextErrors.scheduleMainHead = "Schedule main head is required";
    if (!values.scheduleGroup) nextErrors.scheduleGroup = "Schedule group is required";
    if (!values.scheduleLineItem) nextErrors.scheduleLineItem = "Schedule line item is required";

    const config = SCHEDULE_III_GROUP_OPTIONS[values.nature];
    if (config && values.scheduleMainHead && values.scheduleMainHead !== config.scheduleMainHead) {
      nextErrors.scheduleMainHead = `For ${values.nature}, main head must be ${config.scheduleMainHead}`;
    }
    if (config && values.scheduleGroup && !Object.keys(config.groups).includes(values.scheduleGroup)) {
      nextErrors.scheduleGroup = "Invalid schedule group for selected nature";
    }
    if (
      config &&
      values.scheduleGroup &&
      values.scheduleLineItem &&
      !(config.groups[values.scheduleGroup] || []).includes(values.scheduleLineItem)
    ) {
      nextErrors.scheduleLineItem = "Invalid line item for selected schedule group";
    }

    return nextErrors;
  };

  const applyNatureDefaults = (nature, groupName = form.name) => {
    const config = SCHEDULE_III_GROUP_OPTIONS[nature];
    if (!config) {
      setForm((prev) => ({
        ...prev,
        nature,
        balanceType: "Debit",
        scheduleMainHead: "",
        scheduleGroup: "",
        scheduleLineItem: "",
      }));
      return;
    }

    const defaultMapping = getDefaultScheduleMappingForGroupName(groupName, nature);
    setForm((prev) => ({
      ...prev,
      nature,
      balanceType: config.balanceType,
      scheduleMainHead: config.scheduleMainHead,
      scheduleGroup: defaultMapping?.scheduleGroup || "",
      scheduleLineItem: defaultMapping?.scheduleLineItem || "",
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (submitError) onClearSubmitError?.();

    if (name === "name") {
      setForm((prev) => {
        const next = { ...prev, name: value };
        if (prev.nature) {
          const defaultMapping = getDefaultScheduleMappingForGroupName(value, prev.nature);
          if (defaultMapping) {
            next.scheduleMainHead = defaultMapping.scheduleMainHead;
            next.scheduleGroup = defaultMapping.scheduleGroup;
            next.scheduleLineItem = defaultMapping.scheduleLineItem;
            next.balanceType = defaultMapping.balanceType;
          }
        }
        return next;
      });
      return;
    }

    if (name === "nature") {
      applyNatureDefaults(value);
      return;
    }

    if (name === "scheduleGroup") {
      setForm((prev) => ({
        ...prev,
        scheduleGroup: value,
        scheduleLineItem: "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(form);
  };

  const helperText = getDefaultScheduleMappingForGroupName(form.name, form.nature);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b bg-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{initial ? "Update Group" : "Add New Group"}</h2>
          <button onClick={onClose} className="text-gray-600 transition hover:text-gray-900">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {submitError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">{submitError}</div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sub Group Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter group name"
              required
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nature</label>
            <select
              name="nature"
              value={form.nature}
              required
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            >
              <option value="">Select Nature</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
            {errors.nature && <p className="mt-1 text-xs text-red-600">{errors.nature}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Balance Type</label>
            <input
              value={form.balanceType}
              readOnly
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Schedule Main Head</label>
            <input
              name="scheduleMainHead"
              value={form.scheduleMainHead}
              readOnly
              className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-600"
            />
            {errors.scheduleMainHead && <p className="mt-1 text-xs text-red-600">{errors.scheduleMainHead}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Schedule Group</label>
            <select
              name="scheduleGroup"
              value={form.scheduleGroup}
              onChange={handleChange}
              disabled={!form.nature}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Select Schedule Group</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
            {errors.scheduleGroup && <p className="mt-1 text-xs text-red-600">{errors.scheduleGroup}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Schedule Line Item</label>
            <select
              name="scheduleLineItem"
              value={form.scheduleLineItem}
              onChange={handleChange}
              disabled={!form.scheduleGroup}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Select Line Item</option>
              {availableLineItems.map((lineItem) => (
                <option key={lineItem} value={lineItem}>
                  {lineItem}
                </option>
              ))}
            </select>
            {errors.scheduleLineItem && <p className="mt-1 text-xs text-red-600">{errors.scheduleLineItem}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note No</label>
            <input
              name="noteNo"
              value={form.noteNo}
              onChange={handleChange}
              placeholder="Optional note number"
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            />
          </div>

          {helperText && (
            <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                Suggested mapping detected for this group name:
                <div className="mt-1 font-semibold">
                  {helperText.scheduleMainHead} • {helperText.scheduleGroup} • {helperText.scheduleLineItem}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-md bg-neutral-700 px-4 py-2 text-sm text-white transition hover:bg-neutral-800"
            >
              {initial ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
