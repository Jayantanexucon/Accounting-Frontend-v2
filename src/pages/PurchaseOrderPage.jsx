import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getallhsn } from "../apis/hsnapi";
import { getClientsPaginatedApi } from "../apis/clientApi";
import {
  createPurchaseOrderApi,
  getPurchaseOrderApi,
  updatePurchaseOrderApi,
} from "../apis/purchaseOrderApi";
import { getCompanyByIdApi } from "../apis/userApi";
import {
  X,
  ChevronDown,
  Loader2,
  Check,
  Plus,
  Trash2,
  Building,
  FileText,
  Target,
  Calendar,
  Clock,
  ArrowLeft,
  Info,
  AlertCircle,
  ChevronRight,
  Briefcase,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────

// PO Direction: Receivable = we are seller/vendor, Payable = we are buyer
const PO_DIRECTIONS = [
  {
    key: "receivable",
    label: "Receivable",
    icon: ArrowDownCircle,
    description: "We are providing services/goods. Invoice will be raised on the client.",
    color: "blue",
  },
  {
    key: "payable",
    label: "Payable",
    icon: ArrowUpCircle,
    description: "We are receiving services/goods. We will pay the vendor.",
    color: "amber",
  },
];

// Payment Terms (billing model)
const PAYMENT_TERMS_OPTIONS = [
  {
    key: "milestone",
    label: "Milestone Based",
    icon: Target,
    hint: "Invoice raised when each milestone is completed",
  },
  {
    key: "monthly",
    label: "Monthly",
    icon: Calendar,
    hint: "Fixed monthly invoice raised at the start/end of each month",
  },
  {
    key: "hourly",
    label: "Hourly",
    icon: Clock,
    hint: "Rate per hour × total hours logged",
  },
];

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    ring: "ring-blue-400",
    dashed: "hover:border-blue-300 hover:text-blue-500",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    ring: "ring-amber-400",
    dashed: "hover:border-amber-300 hover:text-amber-500",
  },
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    ring: "ring-teal-400",
    dashed: "hover:border-teal-300 hover:text-teal-500",
  },
};

const today = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────────────────────────
//  STEP LABELS
// ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "PO Type", icon: Briefcase },
  { id: 2, label: "Client", icon: Building },
  { id: 3, label: "Details", icon: FileText },
  { id: 4, label: "Line Items", icon: Target },
  { id: 5, label: "Review", icon: Check },
];

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function PurchaseOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("edit");
  // clientId passed from ClientPurchaseOrders page: /purchase-order?clientId=xxx
  const prefilledClientId = searchParams.get("clientId");

  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany") || "{}");
  const companyId =
    localStorage.getItem("selectedCompanyId") ||
    user?.company?._id ||
    selectedCompany?._id;

  const [step, setStep] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdPOId, setCreatedPOId] = useState(null);

  // Data
  const [clients, setClients] = useState([]);
  const [hsnList, setHsnList] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    companyId,
    // NEW: direction + paymentTerms (billing model)
    direction: "",          // "receivable" | "payable"
    paymentTerms: "",       // "milestone" | "monthly" | "hourly"
    // legacy fields kept for backend compatibility
    poCategory: "project",
    billingModel: "fixed",
    poDate: today(),
    deliveryDate: today(),
    poreferencevalue: "",
    currency: "INR",
    client: { _id: "", name: "", address: "", stateCode: "", GSTIN: "" },
    deliverTo: { name: "", address: "", stateCode: "", GSTIN: "" },
    items: [
      {
        description: "",
        hsnSac: "",
        hsnId: null,
        quantity: 1,
        rate: 0,
        taxableValue: 0,
        gstRate: 18,
        gstAmount: 0,
        total: 0,
      },
    ],
    milestones: [],
    totalAmount: 0,
    totalTaxableValue: 0,
    totalCGSTAmount: 0,
    totalSGSTAmount: 0,
    totalIGSTAmount: 0,
    valueInWords: "",
    withSignature: false,
    notes: "",
  });

  const [sameAsClient, setSameAsClient] = useState(false);

  // ─── Derived colors based on direction ───
  const directionColor = form.direction === "payable" ? "amber" : "blue";
  const colors = colorMap[directionColor];

  // ─────────────────────────────────────────────────────────────
  //  DATA LOADING
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const clientsRes = await getClientsPaginatedApi({ companyId, limit: 1000, page: 1 });
        let clientsArray = [];
        if (clientsRes?.data?.clients) clientsArray = clientsRes.data.clients;
        else if (clientsRes?.clients) clientsArray = clientsRes.clients;
        else if (Array.isArray(clientsRes)) clientsArray = clientsRes;

        const normalized = clientsArray.map((c) => ({
          _id: c._id,
          name: c.name || c.clientName || c.contactPerson || "",
          address: c.address || c.clientAddress || c.billingAddress?.line1 || "",
          stateCode: c.stateCode || c.gstStateCode || c.clientState || "",
          GSTIN: c.GSTIN || c.gstNumber || "",
          taxNumber: c.taxNumber || c.gstNumber || "",
          clientName: c.clientName || c.name,
        }));
        setClients(normalized);

        // Auto-fill client if navigated from a client's PO page
        if (prefilledClientId && !editId) {
          const found = normalized.find((c) => c._id === prefilledClientId);
          if (found) {
            setForm((prev) => ({
              ...prev,
              client: found,
              deliverTo: found, // default deliverTo same as client
            }));
            setSameAsClient(true);
          }
        }

        // Fetch HSN
        const hsnRes = await getallhsn(companyId);
        let hsnArray = [];
        if (hsnRes?.data?.data) hsnArray = hsnRes.data.data;
        else if (hsnRes?.data) hsnArray = hsnRes.data;
        else if (Array.isArray(hsnRes)) hsnArray = hsnRes;
        setHsnList(hsnArray);
      } catch (e) {
        console.error("Failed to load clients or HSN:", e);
        setError("Could not load clients. Please refresh the page.");
      }
    })();
  }, [companyId]);

  const filteredClients = clients.filter((c) => {
    if (!clientSearch?.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.clientName || "").toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (companyId) {
      getCompanyByIdApi(companyId)
        .then((res) => setCompanyInfo(res?.data?.data || res?.data))
        .catch(console.error);
    }
  }, [companyId]);

  useEffect(() => {
    if (editId) {
      setIsEditing(true);
      getPurchaseOrderApi(editId)
        .then((res) => {
          const d = res.data?.data || res.data;
          const fmt = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");
          setForm((prev) => ({
            ...prev,
            ...d,
            // map stored billingModel back to paymentTerms
            paymentTerms: d.paymentTerms || d.billingModel || prev.paymentTerms,
            direction: d.direction || prev.direction,
            client: d.vendor || d.client || prev.client,
            deliverTo: d.deliverTo || prev.deliverTo,
            poDate: fmt(d.poDate),
            deliveryDate: fmt(d.deliveryDate),
            items: d.items?.map((item) => ({ ...item, total: item.totalAmount })) || prev.items,
          }));
        })
        .catch((err) => {
          console.error("Failed to load PO for editing:", err);
          setError("Could not load purchase order details.");
        });
    }
  }, [editId]);

  // ─────────────────────────────────────────────────────────────
  //  FORM HELPERS
  // ─────────────────────────────────────────────────────────────

  const set = (path, value) => {
    setForm((prev) => {
      const parts = path.split(".");
      if (parts.length === 1) return { ...prev, [path]: value };
      const updated = { ...prev };
      let ref = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        ref[parts[i]] = { ...ref[parts[i]] };
        ref = ref[parts[i]];
      }
      ref[parts[parts.length - 1]] = value;
      return updated;
    });
  };

  const selectClient = (client) => {
    setForm((prev) => ({
      ...prev,
      client,
      deliverTo: sameAsClient ? client : prev.deliverTo,
    }));
    setClientDropdownOpen(false);
    setClientSearch("");
  };

  // ─── Item calculations ───

  const recalcItem = (item) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const gstRate = Number(item.gstRate) || 0;
    const taxableValue = Math.round(qty * rate * 100) / 100;
    const gstAmount = Math.round(taxableValue * gstRate) / 100;
    const total = Math.round((taxableValue + gstAmount) * 100) / 100;
    return { ...item, taxableValue, gstAmount, total, totalAmount: total };
  };

  const hasMeaningfulLineItem = (item) => {
    if (!item) return false;
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const hsnSac = typeof item.hsnSac === "string" ? item.hsnSac.trim() : "";
    return (
      description.length > 0 ||
      hsnSac.length > 0 ||
      Number(item.rate || 0) > 0 ||
      Number(item.taxableValue || 0) > 0 ||
      Number(item.total || item.totalAmount || 0) > 0
    );
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = recalcItem({ ...items[index], [field]: value });
      return { ...prev, items, ...recalcTotals(items) };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { description: "", hsnSac: "", hsnId: null, quantity: 1, rate: 0, taxableValue: 0, gstRate: 18, gstAmount: 0, total: 0 },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items, ...recalcTotals(items) };
    });
  };

  const getTotalGstRate = (hsn) => {
    if (hsn.igst && hsn.igst > 0) return Number(hsn.igst);
    return (Number(hsn.cgst) || 0) + (Number(hsn.sgst) || 0);
  };

  const recalcTotals = (items) => {
    const totalTaxableValue = items.reduce((s, i) => s + (Number(i.taxableValue) || 0), 0);
    const totalGST = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
    const totalAmount = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const cgst = Math.round((totalGST / 2) * 100) / 100;
    const sgst = Math.round((totalGST / 2) * 100) / 100;
    return {
      totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
      totalCGSTAmount: cgst,
      totalSGSTAmount: sgst,
      totalIGSTAmount: 0,
      totalAmount: Math.round(totalAmount * 100) / 100,
      valueInWords: numberToWords(Math.round(totalAmount * 100) / 100),
    };
  };

  // ─── Milestone helpers ───

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { title: "", description: "", percentage: 0, amount: 0, dueDate: "", status: "pending" },
      ],
    }));
  };

  const updateMilestone = (index, field, value) => {
    setForm((prev) => {
      const milestones = [...prev.milestones];
      milestones[index] = { ...milestones[index], [field]: value };
      if (field === "percentage") {
        milestones[index].amount =
          Math.round(((prev.totalAmount * Number(value)) / 100) * 100) / 100;
      }
      if (field === "amount") {
        milestones[index].percentage =
          prev.totalAmount > 0
            ? Math.round((Number(value) / prev.totalAmount) * 10000) / 100
            : 0;
      }
      return { ...prev, milestones };
    });
  };

  const removeMilestone = (index) => {
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  };

  // ─────────────────────────────────────────────────────────────
  //  SUBMIT
  // ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const sanitizedItems = Array.isArray(form.items)
        ? form.items.map(recalcItem).filter(hasMeaningfulLineItem)
        : [];

      // Map paymentTerms to billingModel for backend compatibility
      const billingModelMap = {
        milestone: "milestone",
        monthly: "fixed",   // monthly invoicing = fixed periodic
        hourly: "hourly",
      };

      const payload = {
        companyId,
        poNumber: form.poNumber,
        poDate: form.poDate,
        deliveryDate: form.deliveryDate,
        // Store new fields
        direction: form.direction,
        paymentTerms: form.paymentTerms,
        // Legacy fields for backward compatibility
        poCategory: form.poCategory || "project",
        billingModel: billingModelMap[form.paymentTerms] || "fixed",
        vendor: form.client,
        deliverTo: form.deliverTo,
        items: sanitizedItems.map((item) => ({
          description: item.description,
          hsnSac: item.hsnSac,
          hsnId: item.hsnId,
          quantity: item.quantity,
          rate: item.rate,
          taxableValue: item.taxableValue,
          gstRate: item.gstRate,
          gstAmount: item.gstAmount,
          totalAmount: item.total,
        })),
        totalTaxableValue: form.totalTaxableValue,
        totalGSTAmount: (form.totalCGSTAmount || 0) + (form.totalSGSTAmount || 0),
        totalAmount: form.totalAmount,
        valueInWords: form.valueInWords,
        notes: form.notes,
        ...(form.poreferencevalue && { poreferencevalue: form.poreferencevalue }),
        ...(form.paymentTerms === "monthly" && { paymentSchedule: "monthly" }),
        ...(form.milestones?.length && { milestones: form.milestones }),
      };

      let res;
      if (isEditing && editId) {
        res = await updatePurchaseOrderApi(editId, payload);
      } else {
        res = await createPurchaseOrderApi(payload);
      }

      const createdId = res.data?.data?._id || res.data?._id;
      setCreatedPOId(createdId);
      setSuccess(true);
    } catch (e) {
      console.error("PO submission error:", e);
      setError(e.response?.data?.message || e.message || "Failed to save Purchase Order");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  STEP VALIDATION
  // ─────────────────────────────────────────────────────────────

  const canProceed = () => {
    if (step === 1) return !!form.direction && !!form.paymentTerms;
    if (step === 2) return !!form.client?.name;
    if (step === 3) return !!form.poDate && !!form.deliveryDate;
    if (step === 4) {
      if (form.paymentTerms === "milestone") return form.milestones.length > 0;
      return form.items.length > 0 && form.items[0].description.trim() !== "";
    }
    return true;
  };

  // ─────────────────────────────────────────────────────────────
  //  SUCCESS STATE
  // ─────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={28} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Purchase Order {isEditing ? "Updated" : "Created"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Your {form.direction === "receivable" ? "Receivable" : "Payable"} PO (
            {PAYMENT_TERMS_OPTIONS.find((t) => t.key === form.paymentTerms)?.label}) has been saved successfully.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() =>
                navigate(`/purchaseorder-data/client/${form.client._id}?openPOId=${createdPOId}`)
              }
              className="px-5 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
            >
              View All POs
            </button>
            {createdPOId && (
              <button
                onClick={() =>
                  navigate(`/purchaseorder-data/client/${form.client._id}?openPOId=${createdPOId}`)
                }
                className="px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                View This PO
              </button>
            )}
            <button
              onClick={() => {
                setSuccess(false);
                setStep(1);
                setForm((prev) => ({
                  ...prev,
                  direction: "",
                  paymentTerms: "",
                  items: [{ description: "", hsnSac: "", hsnId: null, quantity: 1, rate: 0, taxableValue: 0, gstRate: 18, gstAmount: 0, total: 0 }],
                  milestones: [],
                  totalAmount: 0,
                  totalTaxableValue: 0,
                  notes: "",
                }));
              }}
              className="px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              New PO
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold text-slate-800">
            {isEditing ? "Edit Purchase Order" : "New Purchase Order"}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition
                    ${step === s.id ? `${colors.bg} ${colors.text}` : step > s.id ? "bg-green-50 text-green-600" : "text-slate-400"}`}
                >
                  {step > s.id ? <Check size={11} /> : <s.icon size={11} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={12} className={step > s.id ? "text-green-400" : "text-slate-300"} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── STEP 1: PO Type ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              What kind of Purchase Order is this?
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Select the PO direction and payment terms to get started.
            </p>

            {/* Direction Selection */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                1. Select PO Direction
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {PO_DIRECTIONS.map((dir) => {
                  const c = colorMap[dir.color];
                  const isSelected = form.direction === dir.key;
                  return (
                    <button
                      key={dir.key}
                      onClick={() => set("direction", dir.key)}
                      className={`text-left p-5 rounded-xl border-2 transition-all
                        ${isSelected ? `${c.bg} ${c.border} ring-2 ${c.ring} ring-offset-1` : "bg-white border-slate-200 hover:border-slate-300"}`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isSelected ? c.bg : "bg-slate-100"}`}
                      >
                        <dir.icon size={20} className={isSelected ? c.text : "text-slate-400"} />
                      </div>
                      <p className={`text-sm font-semibold mb-1 ${isSelected ? c.text : "text-slate-700"}`}>
                        {dir.label}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">{dir.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Terms Selection — only visible after direction is chosen */}
            {form.direction && (
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  2. Select Payment Terms
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {PAYMENT_TERMS_OPTIONS.map((pt) => {
                    const c = colors;
                    const isSelected = form.paymentTerms === pt.key;
                    return (
                      <button
                        key={pt.key}
                        onClick={() => set("paymentTerms", pt.key)}
                        className={`text-left p-5 rounded-xl border-2 transition-all
                          ${isSelected ? `${c.bg} ${c.border} ring-2 ${c.ring} ring-offset-1` : "bg-white border-slate-200 hover:border-slate-300"}`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isSelected ? c.bg : "bg-slate-100"}`}
                        >
                          <pt.icon size={18} className={isSelected ? c.text : "text-slate-400"} />
                        </div>
                        <p className={`text-sm font-semibold mb-1 ${isSelected ? c.text : "text-slate-700"}`}>
                          {pt.label}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">{pt.hint}</p>
                      </button>
                    );
                  })}
                </div>
                {!form.paymentTerms && (
                  <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                    <Info size={12} /> You must select a payment term to proceed.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Client ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Client Details</h2>
            <p className="text-sm text-slate-500 mb-6">
              {prefilledClientId
                ? "Client details have been pre-filled. You can update them if needed."
                : "Who is this PO raised for?"}
            </p>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Bill To (Client)</p>

              {/* Client search — only shown if not prefilled or user wants to change */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search existing clients..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setClientDropdownOpen(true); }}
                  onFocus={() => setClientDropdownOpen(true)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none"
                />
                {clientDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.slice(0, 10).map((c, i) => (
                      <button
                        key={i}
                        onClick={() => selectClient(c)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Building size={13} className="text-slate-400" />
                        <span>{c.name}</span>
                        {c.taxNumber && (
                          <span className="text-xs text-slate-400 ml-auto">{c.taxNumber}</span>
                        )}
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-400">No clients found. Fill in manually below.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Auto-fill notice */}
              {prefilledClientId && form.client?.name && (
                <div className={`flex items-center gap-2 ${colors.bg} ${colors.border} border rounded-lg px-3 py-2 mb-4 text-xs ${colors.text}`}>
                  <Check size={12} />
                  Client auto-filled from context. Select a different client above if needed.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { field: "client.name", label: "Client Name *", required: true },
                  { field: "client.GSTIN", label: "GSTIN", required: false },
                  { field: "client.address", label: "Billing Address", required: false, span: true },
                  { field: "client.stateCode", label: "State Code", required: false },
                ].map(({ field, label, required, span }) => (
                  <div key={field} className={span ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      type="text"
                      value={field.split(".").reduce((o, k) => o?.[k], form) || ""}
                      onChange={(e) => set(field, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Deliver To */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-700">Deliver To / Ship To</p>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsClient}
                    onChange={(e) => {
                      setSameAsClient(e.target.checked);
                      if (e.target.checked) set("deliverTo", { ...form.client });
                    }}
                    className="rounded border-slate-300"
                  />
                  Same as client
                </label>
              </div>
              {!sameAsClient && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { field: "deliverTo.name", label: "Name *" },
                    { field: "deliverTo.GSTIN", label: "GSTIN" },
                    { field: "deliverTo.address", label: "Address", span: true },
                    { field: "deliverTo.stateCode", label: "State Code" },
                  ].map(({ field, label, span }) => (
                    <div key={field} className={span ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                      <input
                        type="text"
                        value={field.split(".").reduce((o, k) => o?.[k], form) || ""}
                        onChange={(e) => set(field, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
              {sameAsClient && (
                <p className="text-sm text-slate-400 bg-slate-50 rounded-lg px-4 py-3">
                  Using client billing address as delivery address.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: PO Details ── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">PO Details</h2>
            <p className="text-sm text-slate-500 mb-6">Dates, reference, and internal notes.</p>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PO Date *</label>
                  <input
                    type="date"
                    value={form.poDate}
                    onChange={(e) => set("poDate", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {form.paymentTerms === "milestone" ? "Project End Date" : "Contract End Date"} *
                  </label>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => set("deliveryDate", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Reference #</label>
                  <input
                    type="text"
                    value={form.poreferencevalue}
                    onChange={(e) => set("poreferencevalue", e.target.value)}
                    placeholder="Client PO ref"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Summary badge showing selected type */}
            <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 mb-4 flex items-center gap-3`}>
              <div>
                <p className={`text-xs font-semibold ${colors.text} mb-0.5`}>Selected PO Type</p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">
                    {PO_DIRECTIONS.find((d) => d.key === form.direction)?.label}
                  </span>{" "}
                  ·{" "}
                  <span className="font-medium">
                    {PAYMENT_TERMS_OPTIONS.find((t) => t.key === form.paymentTerms)?.label}
                  </span>
                </p>
                {form.paymentTerms === "monthly" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Invoices will be generated automatically every month.
                  </p>
                )}
                {form.paymentTerms === "hourly" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Line items use Rate/Hour × Total Hours to calculate amounts.
                  </p>
                )}
                {form.paymentTerms === "milestone" && (
                  <p className="text-xs text-slate-500 mt-1">
                    Invoice is raised when you mark each milestone as complete.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">Internal Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                placeholder="Any internal notes about this PO..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* ── STEP 4: Line Items / Milestones ── */}
        {step === 4 && (
          <div>
            {/* ─── MILESTONE ─── */}
            {form.paymentTerms === "milestone" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Project Milestones</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Define milestones. An invoice will be raised when you mark each milestone as complete.
                </p>

                {/* Total Contract Value */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Total Contract Value</p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Total Taxable Value (₹)
                      </label>
                      <input
                        type="number"
                        value={form.totalTaxableValue}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const gst = Math.round(v * 18) / 100;
                          setForm((prev) => ({
                            ...prev,
                            totalTaxableValue: v,
                            totalCGSTAmount: Math.round((gst / 2) * 100) / 100,
                            totalSGSTAmount: Math.round((gst / 2) * 100) / 100,
                            totalAmount: Math.round((v + gst) * 100) / 100,
                            valueInWords: numberToWords(Math.round((v + gst) * 100) / 100),
                          }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">GST (18%)</label>
                      <input
                        type="text"
                        readOnly
                        value={`₹ ${(Math.round(form.totalTaxableValue * 18) / 100).toFixed(2)}`}
                        className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Total with GST (₹)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`₹ ${form.totalAmount?.toFixed(2) || "0.00"}`}
                        className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 font-medium text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Milestone cards */}
                <div className="space-y-3">
                  {form.milestones.map((m, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 grid sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs text-slate-500 mb-1">Milestone Title *</label>
                            <input
                              type="text"
                              placeholder="Milestone title"
                              value={m.title}
                              onChange={(e) => updateMilestone(i, "title", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">% of Total</label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="%"
                                min="0"
                                max="100"
                                value={m.percentage}
                                onChange={(e) => updateMilestone(i, "percentage", e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                              />
                              <span className="text-slate-400 text-sm">%</span>
                            </div>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">Amount (₹)</label>
                              <input
                                type="number"
                                placeholder="Amount ₹"
                                min="0"
                                value={m.amount}
                                onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                              />
                            </div>
                            <button
                              onClick={() => removeMilestone(i)}
                              className="text-slate-400 hover:text-red-500 transition pb-2"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs text-slate-500 mb-1">
                              Description (optional)
                            </label>
                            <input
                              type="text"
                              placeholder="Description"
                              value={m.description}
                              onChange={(e) => updateMilestone(i, "description", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Due Date</label>
                            <input
                              type="date"
                              value={m.dueDate}
                              onChange={(e) => updateMilestone(i, "dueDate", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addMilestone}
                    className={`w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 transition flex items-center justify-center gap-2 ${colors.dashed}`}
                  >
                    <Plus size={15} /> Add Milestone
                  </button>

                  {form.milestones.length > 0 && (
                    <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between text-sm">
                      <span className="text-blue-600">Total milestone allocation:</span>
                      <span className="font-medium text-blue-700">
                        {form.milestones.reduce((s, m) => s + Number(m.percentage || 0), 0).toFixed(1)}%
                        {" "}(₹{" "}
                        {form.milestones.reduce((s, m) => s + Number(m.amount || 0), 0).toLocaleString()})
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── MONTHLY Line Items ─── */}
            {form.paymentTerms === "monthly" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Monthly Line Items</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Define the services covered under this PO. An invoice will be automatically generated each month.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2 text-xs text-amber-700">
                  <Info size={14} className="mt-0.5 flex-shrink-0" />
                  Monthly invoices will be raised based on these line items. The same items and amounts will recur each billing cycle.
                </div>

                <LineItemsTable
                  items={form.items}
                  hsnList={hsnList}
                  updateItem={updateItem}
                  addItem={addItem}
                  removeItem={removeItem}
                  getTotalGstRate={getTotalGstRate}
                  colors={colors}
                  qtyLabel="Quantity"
                  rateLabel="Rate (₹)"
                />

                <TotalsBar form={form} />
              </>
            )}

            {/* ─── HOURLY Line Items ─── */}
            {form.paymentTerms === "hourly" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Hourly Line Items</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Enter the rate per hour and total hours for each service. The total amount is calculated automatically.
                </p>

                <LineItemsTable
                  items={form.items}
                  hsnList={hsnList}
                  updateItem={updateItem}
                  addItem={addItem}
                  removeItem={removeItem}
                  getTotalGstRate={getTotalGstRate}
                  colors={colors}
                  qtyLabel="Total Hours"
                  rateLabel="Rate/Hour (₹)"
                />

                <TotalsBar form={form} />
              </>
            )}
          </div>
        )}

        {/* ── STEP 5: Review ── */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Review & Submit</h2>
            <p className="text-sm text-slate-500 mb-6">Check everything before creating the PO.</p>

            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">PO Direction</p>
                    <p className="text-sm font-medium text-slate-700">
                      {PO_DIRECTIONS.find((d) => d.key === form.direction)?.label || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Payment Terms</p>
                    <p className="text-sm font-medium text-slate-700">
                      {PAYMENT_TERMS_OPTIONS.find((t) => t.key === form.paymentTerms)?.label || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Client</p>
                    <p className="text-sm font-medium text-slate-700">{form.client.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">PO Date</p>
                    <p className="text-sm font-medium text-slate-700">{form.poDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Total PO Value</p>
                    <p className="text-xl font-bold text-slate-800">
                      ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {form.paymentTerms === "milestone" && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Milestones</p>
                      <p className="text-sm font-medium text-slate-700">
                        {form.milestones.length} milestone(s) defined
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {form.valueInWords && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
                  <p className="text-xs text-slate-400 mb-1">Amount in Words</p>
                  <p className="text-sm text-slate-600 italic">{form.valueInWords}</p>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.withSignature}
                  onChange={(e) => set("withSignature", e.target.checked)}
                  className="rounded border-slate-300 text-blue-500"
                />
                <span className="text-sm text-slate-600">Include digital signature in document</span>
              </label>
            </div>
          </div>
        )}

        {/* ── NAVIGATION ── */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="px-5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-2"
          >
            <ArrowLeft size={15} /> Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => canProceed() && setStep(step + 1)}
              disabled={!canProceed()}
              className={`px-6 py-2.5 text-sm font-medium rounded-xl transition flex items-center gap-2
                ${canProceed()
                  ? `${colors.bg} ${colors.text} hover:opacity-90`
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {isEditing ? "Update PO" : "Create PO"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  LINE ITEMS TABLE (reused for Monthly and Hourly)
// ─────────────────────────────────────────────────────────────────

function LineItemsTable({ items, hsnList, updateItem, addItem, removeItem, getTotalGstRate, colors, qtyLabel, rateLabel }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
        <div className="col-span-4">Description</div>
        <div className="col-span-1">HSN/SAC</div>
        <div className="col-span-1">{qtyLabel}</div>
        <div className="col-span-2">{rateLabel}</div>
        <div className="col-span-1">GST %</div>
        <div className="col-span-2">Total (₹)</div>
        <div className="col-span-1"></div>
      </div>

      {items.map((item, i) => (
        <div key={i} className="grid sm:grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 items-center">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Service description"
              value={item.description}
              onChange={(e) => updateItem(i, "description", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
            />
          </div>
          <div className="sm:col-span-1 relative z-50">
            <select
              value={item.hsnId || ""}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) {
                  updateItem(i, "hsnId", null);
                  updateItem(i, "hsnSac", "");
                  updateItem(i, "gstRate", 18);
                  return;
                }
                const selectedHsn = hsnList.find((h) => h._id === selectedId);
                if (selectedHsn) {
                  updateItem(i, "hsnId", selectedId);
                  updateItem(i, "hsnSac", selectedHsn.hsnCode);
                  if (!item.description.trim()) updateItem(i, "description", selectedHsn.serviceType);
                  updateItem(i, "gstRate", getTotalGstRate(selectedHsn));
                }
              }}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
            >
              <option value="">HSN</option>
              {hsnList.map((hsn) => (
                <option key={hsn._id} value={hsn._id}>
                  {hsn.hsnCode} – {hsn.serviceType}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <input
              type="number"
              min="0"
              value={item.quantity}
              onChange={(e) => updateItem(i, "quantity", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
              title={qtyLabel}
            />
          </div>
          <div className="sm:col-span-2">
            <input
              type="number"
              min="0"
              value={item.rate}
              onChange={(e) => updateItem(i, "rate", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
              title={rateLabel}
            />
          </div>
          <div className="sm:col-span-1">
            <input
              type="number"
              min="0"
              max="28"
              value={item.gstRate}
              onChange={(e) => updateItem(i, "gstRate", e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              ₹ {item.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="sm:col-span-1 flex justify-end">
            {items.length > 1 && (
              <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="px-4 py-3 border-b border-slate-100">
        <button
          onClick={addItem}
          className={`flex items-center gap-1.5 text-sm text-slate-400 transition ${colors.dashed.replace("hover:border-", "hover:text-").split(" ")[1]}`}
        >
          <Plus size={14} /> Add Line Item
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TOTALS BAR
// ─────────────────────────────────────────────────────────────────

function TotalsBar({ form }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 space-y-1.5 text-sm">
      <div className="flex justify-between text-slate-600">
        <span>Subtotal (taxable)</span>
        <span>₹ {form.totalTaxableValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex justify-between text-slate-600">
        <span>CGST</span>
        <span>₹ {form.totalCGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex justify-between text-slate-600">
        <span>SGST</span>
        <span>₹ {form.totalSGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-200">
        <span>Total</span>
        <span>₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

function numberToWords(num) {
  if (!num || num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + inWords(n % 10000000) : "");
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = inWords(rupees) + " Rupees";
  if (paise > 0) result += " and " + inWords(paise) + " Paise";
  return result + " Only";
}