import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ClipboardCheck, Edit3, LayoutGrid, Layers, Plus, Tag, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import {
  createAuditCategoryApi,
  createAuditIdentifierApi,
  deleteAuditCategoryApi,
  deleteAuditIdentifierApi,
  listAuditCategoriesApi,
  listAuditIdentifiersApi,
  updateAuditCategoryApi,
  updateAuditIdentifierApi,
} from "../apis/expenseAuditApi";

const emptyCategory = { name: "", description: "" };
const emptyIdentifier = { name: "", description: "", categoryId: "" };

/*
 * Register future master-data types here. Each one shows up as a clickable
 * card in "Browse master data". Add a matching `activeMaster === "KEY"` block below.
 */
const MASTERS = [
  {
    key: "AUDIT",
    label: "Audit category and identifier",
    description: "Audit categories and the identifiers (SAL, salary, IMPS) mapped to each.",
    icon: ClipboardCheck,
  },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export default function AccountingMasterDataPage() {
  const { user } = useAuth();
  const companyId = JSON.parse(localStorage.getItem("selectedCompany") || "{}")._id || user?.company?._id;
  const queryClient = useQueryClient();
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [identifierForm, setIdentifierForm] = useState(emptyIdentifier);
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingIdentifierId, setEditingIdentifierId] = useState("");
  const [activeMaster, setActiveMaster] = useState("AUDIT");
  const [browseOpen, setBrowseOpen] = useState(true);

  const categoriesQuery = useQuery({
    queryKey: ["audit-categories", companyId],
    queryFn: () => listAuditCategoriesApi(companyId),
    enabled: Boolean(companyId),
  });
  const identifiersQuery = useQuery({
    queryKey: ["audit-identifiers", companyId],
    queryFn: () => listAuditIdentifiersApi(companyId),
    enabled: Boolean(companyId),
  });
  const categories = categoriesQuery.data?.data || [];
  const identifiers = identifiersQuery.data?.data || [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["audit-categories", companyId] });
    queryClient.invalidateQueries({ queryKey: ["audit-identifiers", companyId] });
    queryClient.invalidateQueries({ queryKey: ["expense-audit", companyId] });
  };

  const categoryMutation = useMutation({
    mutationFn: editingCategoryId ? updateAuditCategoryApi : createAuditCategoryApi,
    onSuccess: () => {
      refresh();
      setCategoryForm(emptyCategory);
      setEditingCategoryId("");
      toast.success("Category saved");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not save category"),
  });
  const identifierMutation = useMutation({
    mutationFn: editingIdentifierId ? updateAuditIdentifierApi : createAuditIdentifierApi,
    onSuccess: () => {
      refresh();
      setIdentifierForm(emptyIdentifier);
      setEditingIdentifierId("");
      toast.success("Identifier saved");
    },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not save identifier"),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: deleteAuditCategoryApi,
    onSuccess: () => { refresh(); toast.success("Category deleted"); },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not delete category"),
  });
  const deleteIdentifierMutation = useMutation({
    mutationFn: deleteAuditIdentifierApi,
    onSuccess: () => { refresh(); toast.success("Identifier deleted"); },
    onError: (error) => toast.error(error?.response?.data?.message || "Could not delete identifier"),
  });

  const submitCategory = (event) => {
    event.preventDefault();
    if (!categoryForm.name.trim()) return toast.error("Enter a category");
    categoryMutation.mutate(editingCategoryId
      ? { id: editingCategoryId, companyId, ...categoryForm }
      : { companyId, ...categoryForm });
  };
  const submitIdentifier = (event) => {
    event.preventDefault();
    if (!identifierForm.name.trim()) return toast.error("Enter an identifier");
    if (!identifierForm.categoryId) return toast.error("Select a category for this identifier");
    identifierMutation.mutate(editingIdentifierId
      ? { id: editingIdentifierId, companyId, ...identifierForm }
      : { companyId, ...identifierForm });
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setCategoryForm({ name: category.name, description: category.description || "" });
  };
  const cancelEditCategory = () => {
    setEditingCategoryId("");
    setCategoryForm(emptyCategory);
  };
  const startEditIdentifier = (identifier) => {
    setEditingIdentifierId(identifier._id);
    setIdentifierForm({
      name: identifier.name,
      description: identifier.description || "",
      categoryId: identifier.categoryId || "",
    });
  };
  const cancelEditIdentifier = () => {
    setEditingIdentifierId("");
    setIdentifierForm(emptyIdentifier);
  };

  // Display-only: record count shown on each master card
  const masterCounts = { AUDIT: categories.length + identifiers.length };
  const activeMasterMeta = MASTERS.find((master) => master.key === activeMaster);

  // Display-only helper: how many identifiers belong to each category
  const identifierCountFor = (categoryId) => identifiers.filter((item) => item.categoryId === categoryId).length;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 pb-8 xl:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold text-slate-500">Accounting</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">Master Data Management</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["Master types", MASTERS.length],
            ["Categories", categories.length],
            ["Identifiers", identifiers.length],
          ].map(([label, value]) => (
            <div key={label} className="min-w-[96px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold text-slate-500">{label}</p>
              <p className="text-lg font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setBrowseOpen((open) => !open)}
          aria-expanded={browseOpen}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span className="flex items-center gap-3">
            <LayoutGrid size={16} className="text-slate-500" />
            <span className="text-sm font-bold text-slate-900">Browse master data</span>
            {activeMasterMeta && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{activeMasterMeta.label}</span>
            )}
          </span>
          <ChevronDown size={16} className={`text-slate-400 transition ${browseOpen ? "rotate-180" : ""}`} />
        </button>

        {browseOpen && (
          <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {MASTERS.map(({ key, label, description, icon: Icon }) => {
              const selected = activeMaster === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveMaster(key)}
                  aria-pressed={selected}
                  className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-bold"><Icon size={16} /> {label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {masterCounts[key] ?? 0}
                    </span>
                  </div>
                  <p className={`mt-2 text-xs leading-5 ${selected ? "text-slate-300" : "text-slate-500"}`}>{description}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {activeMaster === "AUDIT" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">Managing</p>
              <h2 className="text-xl font-bold text-slate-900">Audit category and identifier</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Add a category first, then add identifiers (like SAL, salary or IMPS) that belong to it. A category can have many identifiers.
              </p>
            </div>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{categories.length} categories</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{identifiers.length} identifiers</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(320px,2fr)_3fr]">
            {/* ---------- Categories ---------- */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Layers size={16} /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Categories</h3>
                  <p className="text-xs text-slate-500">Groups that identifiers are mapped to</p>
                </div>
              </div>

              <form
                onSubmit={submitCategory}
                className={`space-y-3 px-5 py-4 ${editingCategoryId ? "bg-amber-50/60" : "bg-slate-50/60"}`}
              >
                {editingCategoryId && (
                  <p className="text-xs font-semibold text-amber-700">Editing category. Save your changes or cancel.</p>
                )}
                <Field label="Category name">
                  <input
                    value={categoryForm.name}
                    onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                    placeholder="e.g. Salary"
                    className={inputClass}
                  />
                </Field>
                <Field label="Description (optional)">
                  <input
                    value={categoryForm.description}
                    onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
                    placeholder="What does this category cover?"
                    className={inputClass}
                  />
                </Field>
                <div className="flex gap-2">
                  <button
                    disabled={categoryMutation.isPending}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Plus size={15} /> {editingCategoryId ? "Update category" : "Add category"}
                  </button>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={cancelEditCategory}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
              </form>

              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {categoriesQuery.isLoading && <li className="px-5 py-6 text-center text-sm text-slate-400">Loading categories…</li>}
                {!categoriesQuery.isLoading && !categories.length && (
                  <li className="px-5 py-8 text-center text-sm text-slate-400">No categories yet. Add your first one above.</li>
                )}
                {categories.map((category) => (
                  <li
                    key={category._id}
                    className={`flex items-center gap-3 px-5 py-3 ${editingCategoryId === category._id ? "bg-amber-50/60" : "hover:bg-slate-50"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                      <p className="truncate text-xs text-slate-500">{category.description || "No description"}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {identifierCountFor(category._id)} identifiers
                    </span>
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        title="Edit category"
                        aria-label={`Edit category ${category.name}`}
                        onClick={() => startEditCategory(category)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        title="Delete category"
                        aria-label={`Delete category ${category.name}`}
                        onClick={() => deleteCategoryMutation.mutate({ id: category._id, companyId })}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* ---------- Identifiers ---------- */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><Tag size={16} /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Identifiers</h3>
                  <p className="text-xs text-slate-500">Keywords that map a transaction to a category</p>
                </div>
              </div>

              <form
                onSubmit={submitIdentifier}
                className={`grid gap-3 px-5 py-4 md:grid-cols-2 ${editingIdentifierId ? "bg-amber-50/60" : "bg-slate-50/60"}`}
              >
                {editingIdentifierId && (
                  <p className="text-xs font-semibold text-amber-700 md:col-span-2">Editing identifier. Save your changes or cancel.</p>
                )}
                <Field label="Category">
                  <select
                    value={identifierForm.categoryId}
                    onChange={(event) => setIdentifierForm({ ...identifierForm, categoryId: event.target.value })}
                    className={inputClass}
                  >
                    <option value="">{categories.length ? "Select a category" : "Add a category first"}</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Identifier">
                  <input
                    value={identifierForm.name}
                    onChange={(event) => setIdentifierForm({ ...identifierForm, name: event.target.value })}
                    placeholder="e.g. SAL, salary, IMPS"
                    className={inputClass}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Description (optional)">
                    <input
                      value={identifierForm.description}
                      onChange={(event) => setIdentifierForm({ ...identifierForm, description: event.target.value })}
                      placeholder="Where does this identifier appear?"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <button
                    disabled={identifierMutation.isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Plus size={15} /> {editingIdentifierId ? "Update identifier" : "Add identifier"}
                  </button>
                  {editingIdentifierId && (
                    <button
                      type="button"
                      onClick={cancelEditIdentifier}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Identifier</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {identifiersQuery.isLoading && (
                      <tr><td colSpan="4" className="px-5 py-6 text-center text-slate-400">Loading identifiers…</td></tr>
                    )}
                    {identifiers.map((identifier) => {
                      const categoryName = categories.find((category) => category._id === identifier.categoryId)?.name;
                      return (
                        <tr
                          key={identifier._id}
                          className={editingIdentifierId === identifier._id ? "bg-amber-50/60" : "hover:bg-slate-50"}
                        >
                          <td className="px-5 py-3 font-semibold text-slate-800">
                            {categoryName || <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">Unmapped</span>}
                          </td>
                          <td className="px-5 py-3">
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{identifier.name}</span>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{identifier.description || "-"}</td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              title="Edit identifier"
                              aria-label={`Edit identifier ${identifier.name}`}
                              onClick={() => startEditIdentifier(identifier)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              title="Delete identifier"
                              aria-label={`Delete identifier ${identifier.name}`}
                              onClick={() => deleteIdentifierMutation.mutate({ id: identifier._id, companyId })}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!identifiersQuery.isLoading && !identifiers.length && (
                      <tr>
                        <td colSpan="4" className="px-5 py-10 text-center text-slate-400">
                          No identifiers yet. Pick a category above and add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}