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
  CreditCard,
  FileText,
  Users,
  Target,
  Calendar,
  Clock,
  ArrowLeft,
  Info,
  AlertCircle,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────

const PO_CATEGORIES = [
  {
    key: "staffing",
    label: "Staffing",
    icon: Users,
    description:
      "Deploy people at client site. Bill by working day, hour, or month.",
    color: "teal",
    billingModels: [
      {
        key: "daily",
        label: "Daily Rate",
        hint: "Rate per working day × actual days worked",
      },
      {
        key: "monthly",
        label: "Monthly Rate",
        hint: "Fixed monthly rate, deduct unpaid leave",
      },
      {
        key: "hourly",
        label: "Hourly Rate",
        hint: "Rate per hour × hours logged",
      },
    ],
  },
  {
    key: "project",
    label: "Project",
    icon: Target,
    description: "Deliver a defined scope. Bill on milestones or headcount.",
    color: "blue",
    billingModels: [
      {
        key: "milestone",
        label: "Milestone Based",
        hint: "Invoice raised when milestone is completed",
      },
      {
        key: "headcount",
        label: "Headcount Based",
        hint: "People × days × rate, tracked per sprint/period",
      },
      {
        key: "fixed",
        label: "Fixed Price",
        hint: "One or more line items, no time tracking needed",
      },
    ],
  },
  {
    key: "retainer",
    label: "Retainer / AMC",
    icon: Calendar,
    description: "Ongoing fixed engagement. Auto-bill on a set schedule.",
    color: "amber",
    billingModels: [
      {
        key: "fixed",
        label: "Fixed Periodic",
        hint: "Same amount billed every month/quarter/half-year",
      },
    ],
  },
];

const PAYMENT_TERMS = [
  { value: "advance", label: "Advance" },
  { value: "immediate", label: "Immediate" },
  { value: "net-15", label: "Net 15 days" },
  { value: "net-30", label: "Net 30 days" },
  { value: "net-45", label: "Net 45 days" },
  { value: "net-60", label: "Net 60 days" },
  { value: "net-90", label: "Net 90 days" },
  { value: "on_milestone", label: "On Milestone" },
  { value: "on_delivery", label: "On Delivery" },
  { value: "cod", label: "Cash on Delivery" },
];

const PAYMENT_SCHEDULES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-yearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
  { value: "on_completion", label: "On Completion" },
];

const LEAVE_POLICIES = [
  { value: "deduct_unpaid", label: "Deduct only unpaid leaves" },
  { value: "include_paid", label: "Include paid leaves (client pays)" },
  { value: "client_specific", label: "Client specific rules" },
];

const colorMap = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    ring: "ring-teal-400",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    ring: "ring-blue-400",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    ring: "ring-amber-400",
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
  const selectedCompany = JSON.parse(
    localStorage.getItem("selectedCompany") || "{}",
  );
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
    poCategory: "project",
    billingModel: "fixed",
    poDate: today(),
    deliveryDate: today(),
    referenceDate: today(),
    poreferencevalue: "",
    currency: "INR",
    paymentTerms: "net-30",
    paymentSchedule: "monthly",
    staffingConfig: {
      defaultWorkingDaysPerMonth: 22,
      billingUnit: "day",
      overtimeRateMultiplier: 1.5,
      holidayRateMultiplier: 2.0,
      countPublicHolidaysAsWorking: false,
      leavePolicy: "deduct_unpaid",
    },
    client: {_id: "" , name: "", address: "", stateCode: "", GSTIN: "" },
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
    resources: [],
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

  // ─── Derived ────
  const selectedCategory =
    PO_CATEGORIES.find((c) => c.key === form.poCategory) || PO_CATEGORIES[1];
  const colors = colorMap[selectedCategory.color];

  // ─────────────────────────────────────────────────────────────
  //  DATA LOADING
  // ─────────────────────────────────────────────────────────────

useEffect(() => {
  if (!companyId) return;

  (async () => {
    try {
      // Use paginated API instead
      const clientsRes = await getClientsPaginatedApi({
        companyId,
        limit: 1000,   // get all clients
        page: 1,
      });
      
      console.log("Clients paginated response:", clientsRes);

      // Extract clients array (structure: data.data.clients)
      let clientsArray = [];
      if (clientsRes?.data?.clients) {
        clientsArray = clientsRes.data.clients;
      } else if (clientsRes?.clients) {
        clientsArray = clientsRes.clients;
      } else if (Array.isArray(clientsRes)) {
        clientsArray = clientsRes;
      }

      // Normalize client data (same as before)
      const normalized = clientsArray.map((c) => ({
        _id: c._id,
        name: c.name || c.clientName || c.contactPerson || "",
        address: c.address || c.clientAddress || (c.billingAddress?.line1) || "",
        stateCode: c.stateCode || c.gstStateCode || c.clientState || "",
        GSTIN: c.GSTIN || c.gstNumber || "",
        taxNumber: c.taxNumber || c.gstNumber || "",
        clientName: c.clientName || c.name,
      }));

      setClients(normalized);
      console.log("Normalized clients:", normalized);

      // Fetch HSN (unchanged)
      const hsnRes = await getallhsn(companyId);
      let hsnArray = [];
      if (hsnRes?.data?.data) {
        hsnArray = hsnRes.data.data;
      } else if (hsnRes?.data) {
        hsnArray = hsnRes.data;
      } else if (Array.isArray(hsnRes)) {
        hsnArray = hsnRes;
      }
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
          client: d.vendor || d.client || prev.client,   // ✅ map vendor → client
          deliverTo: d.deliverTo || prev.deliverTo,
          poDate: fmt(d.poDate),
          deliveryDate: fmt(d.deliveryDate),
          referenceDate: fmt(d.referenceDate),
          items: d.items?.map(item => ({ ...item, total: item.totalAmount })) || prev.items,
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

  const selectCategory = (categoryKey) => {
    const cat = PO_CATEGORIES.find((c) => c.key === categoryKey);
    set("poCategory", categoryKey);
    set("billingModel", cat?.billingModels[0]?.key || "fixed");
  };

  const selectClient = (client) => {
  setForm((prev) => ({
    ...prev,
    client: client,                    // store the whole client object (includes _id)
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
    const description =
      typeof item.description === "string" ? item.description.trim() : "";
    const hsnSac = typeof item.hsnSac === "string" ? item.hsnSac.trim() : "";

    return (
      description.length > 0 ||
      hsnSac.length > 0 ||
      Number(item.rate || 0) > 0 ||
      Number(item.taxableValue || 0) > 0 ||
      Number(item.total || item.totalAmount || 0) > 0 ||
      Number(item.gstAmount || 0) > 0
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
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items, ...recalcTotals(items) };
    });
  };
  const getTotalGstRate = (hsn) => {
  // If IGST is defined and non-zero, use it; otherwise sum CGST+SGST
  if (hsn.igst && hsn.igst > 0) return Number(hsn.igst);
  return (Number(hsn.cgst) || 0) + (Number(hsn.sgst) || 0);
};
  const recalcTotals = (items) => {
    const totalTaxableValue = items.reduce(
      (s, i) => s + (Number(i.taxableValue) || 0),
      0,
    );
    const totalGST = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
    const totalAmount = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
    // Simplified: split GST evenly CGST/SGST (intra-state); for IGST set both to 0
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
        {
          title: "",
          description: "",
          percentage: 0,
          amount: 0,
          dueDate: "",
          status: "pending",
        },
      ],
    }));
  };

  const updateMilestone = (index, field, value) => {
    setForm((prev) => {
      const milestones = [...prev.milestones];
      milestones[index] = { ...milestones[index], [field]: value };
      // auto-compute amount from percentage
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

  // ─── Resource helpers ───

  const addResource = () => {
    setForm((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          name: "",
          role: "",
          ratePerDay: 0,
          ratePerHour: 0,
          ratePerMonth: 0,
          startDate: "",
          endDate: "",
        },
      ],
    }));
  };

  const updateResource = (index, field, value) => {
    setForm((prev) => {
      const resources = [...prev.resources];
      resources[index] = { ...resources[index], [field]: value };
      return { ...prev, resources };
    });
  };

  const removeResource = (index) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.filter((_, i) => i !== index),
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

    // Build payload matching backend expectations
    const payload = {
      companyId,
      poNumber: form.poNumber, // will be auto-generated if not present
      poDate: form.poDate,
      deliveryDate: form.deliveryDate,
      poCategory: form.poCategory,
      billingModel: form.billingModel,
      paymentTerms: form.paymentTerms,
      vendor: form.client,        // ✅ map client → vendor
      deliverTo: form.deliverTo,
      items: sanitizedItems.map(item => ({
        description: item.description,
        hsnSac: item.hsnSac,
        hsnId: item.hsnId,
        quantity: item.quantity,
        rate: item.rate,
        taxableValue: item.taxableValue,
        gstRate: item.gstRate,
        gstAmount: item.gstAmount,
        totalAmount: item.total,   // ✅ backend expects totalAmount
      })),
      totalTaxableValue: form.totalTaxableValue,
      totalGSTAmount: (form.totalCGSTAmount || 0) + (form.totalSGSTAmount || 0),
      totalAmount: form.totalAmount,
      valueInWords: form.valueInWords,
      notes: form.notes,
      ...(form.poreferencevalue && { poreferencevalue: form.poreferencevalue }),
      ...(form.paymentSchedule && { paymentSchedule: form.paymentSchedule }),
      ...(form.staffingConfig && { staffingConfig: form.staffingConfig }),
      ...(form.milestones?.length && { milestones: form.milestones }),
      ...(form.resources?.length && { resources: form.resources }),
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
    if (step === 1) return !!form.poCategory && !!form.billingModel;
    if (step === 2) return !!form.client?.name;
    if (step === 3) return !!form.poDate && !!form.deliveryDate;
    if (step === 4) {
      if (form.billingModel === "milestone") return form.milestones.length > 0;
      if (
        ["staffing", "headcount"].includes(form.billingModel) ||
        form.poCategory === "staffing"
      ) {
        return form.resources.length > 0;
      }
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
            Your {selectedCategory.label} PO has been saved successfully.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
  <button
    onClick={() => navigate(`/purchaseorder-data/client/${form.client._id}?openPOId=${createdPOId}`)}
    className="px-5 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition"
  >
    View All POs
  </button>
  {createdPOId && (
    <button
      onClick={() => navigate(`/purchaseorder-data/client/${form.client._id}?openPOId=${createdPOId}`)}
      className="px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition"
    >
      View This PO
    </button>
  )}
  <button
    onClick={() => {
      setSuccess(false);
      setStep(1);
      // reset form as before...
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
                  <ChevronRight
                    size={12}
                    className={
                      step > s.id ? "text-green-400" : "text-slate-300"
                    }
                  />
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
              This determines how invoices are calculated and raised.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              {PO_CATEGORIES.map((cat) => {
                const c = colorMap[cat.color];
                const isSelected = form.poCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => selectCategory(cat.key)}
                    className={`text-left p-5 rounded-xl border-2 transition-all
                      ${isSelected ? `${c.bg} ${c.border} ring-2 ${c.ring} ring-offset-1` : "bg-white border-slate-200 hover:border-slate-300"}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isSelected ? c.bg : "bg-slate-100"}`}
                    >
                      <cat.icon
                        size={18}
                        className={isSelected ? c.text : "text-slate-400"}
                      />
                    </div>
                    <p
                      className={`text-sm font-semibold mb-1 ${isSelected ? c.text : "text-slate-700"}`}
                    >
                      {cat.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {cat.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Billing model selector */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-3">
                How should invoices be calculated?
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {selectedCategory.billingModels.map((bm) => {
                  const isSelected = form.billingModel === bm.key;
                  const c = colorMap[selectedCategory.color];
                  return (
                    <button
                      key={bm.key}
                      onClick={() => set("billingModel", bm.key)}
                      className={`text-left p-4 rounded-lg border transition-all
                        ${isSelected ? `${c.bg} ${c.border}` : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <p
                        className={`text-sm font-medium mb-1 ${isSelected ? c.text : "text-slate-700"}`}
                      >
                        {bm.label}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {bm.hint}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Staffing-specific config */}
            {form.poCategory === "staffing" && (
              <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl p-5">
                <p className="text-sm font-medium text-teal-800 mb-4 flex items-center gap-2">
                  <Info size={14} /> Staffing Configuration
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Default Working Days / Month
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.staffingConfig.defaultWorkingDaysPerMonth}
                      onChange={(e) =>
                        set(
                          "staffingConfig.defaultWorkingDaysPerMonth",
                          Number(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Standard agreement (e.g. 22 or 26)
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Leave Policy
                    </label>
                    <select
                      value={form.staffingConfig.leavePolicy}
                      onChange={(e) =>
                        set("staffingConfig.leavePolicy", e.target.value)
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 outline-none"
                    >
                      {LEAVE_POLICIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Holiday Work Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.staffingConfig.holidayRateMultiplier}
                        onChange={(e) =>
                          set(
                            "staffingConfig.holidayRateMultiplier",
                            Number(e.target.value),
                          )
                        }
                        className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                      />
                      <span className="text-xs text-slate-400">× day rate</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Overtime Rate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={form.staffingConfig.overtimeRateMultiplier}
                        onChange={(e) =>
                          set(
                            "staffingConfig.overtimeRateMultiplier",
                            Number(e.target.value),
                          )
                        }
                        className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                      />
                      <span className="text-xs text-slate-400">× day rate</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Client ── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Client Details
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Who is this PO raised for?
            </p>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Bill To (Client)
              </p>
              {/* Client search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search existing clients..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientDropdownOpen(true);
                  }}
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
                          <span className="text-xs text-slate-400 ml-auto">
                            {c.taxNumber}
                          </span>
                        )}
                      </button>
                    ))}
                    {clients.filter((c) =>
                      c.name
                        ?.toLowerCase()
                        .includes(clientSearch.toLowerCase()),
                    ).length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-400">
                        No clients found. Fill in manually below.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    field: "client.name",
                    label: "Client Name *",
                    required: true,
                  },
                  { field: "client.GSTIN", label: "GSTIN", required: false },
                  {
                    field: "client.address",
                    label: "Billing Address",
                    required: false,
                    span: true,
                  },
                  {
                    field: "client.stateCode",
                    label: "State Code",
                    required: false,
                  },
                ].map(({ field, label, required, span }) => (
                  <div key={field} className={span ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={
                        field.split(".").reduce((o, k) => o?.[k], form) || ""
                      }
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
                <p className="text-sm font-medium text-slate-700">
                  Deliver To / Ship To
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsClient}
                    onChange={(e) => {
                      setSameAsClient(e.target.checked);
                      if (e.target.checked)
                        set("deliverTo", { ...form.client });
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
                    {
                      field: "deliverTo.address",
                      label: "Address",
                      span: true,
                    },
                    { field: "deliverTo.stateCode", label: "State Code" },
                  ].map(({ field, label, span }) => (
                    <div key={field} className={span ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={
                          field.split(".").reduce((o, k) => o?.[k], form) || ""
                        }
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
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              PO Details
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Dates, payment terms, and other administrative details.
            </p>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    PO Date *
                  </label>
                  <input
                    type="date"
                    value={form.poDate}
                    onChange={(e) => set("poDate", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {form.poCategory === "staffing"
                      ? "Contract End Date"
                      : "Delivery Date"}{" "}
                    *
                  </label>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => set("deliveryDate", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Reference #
                  </label>
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

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Payment Settings
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => set("paymentTerms", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {(form.poCategory === "retainer" ||
                  form.billingModel === "milestone") && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Invoice Schedule
                    </label>
                    <select
                      value={form.paymentSchedule}
                      onChange={(e) => set("paymentSchedule", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                    >
                      {PAYMENT_SCHEDULES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Internal Notes
              </label>
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

        {/* ── STEP 4: Line Items / Milestones / Resources ── */}
        {step === 4 && (
          <div>
            {/* MILESTONE-based */}
            {form.billingModel === "milestone" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">
                  Project Milestones
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Define milestones. An invoice will be raised when you mark
                  each milestone as complete.
                </p>

                {/* First set the total PO value */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    Total Contract Value
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Total Taxable Value (₹)
                      </label>
                      <input
                        type="number"
                        // min=""
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
                            valueInWords: numberToWords(
                              Math.round((v + gst) * 100) / 100,
                            ),
                          }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        GST (18%)
                      </label>
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

                {/* Milestones */}
                <div className="space-y-3">
                  {form.milestones.map((m, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 grid sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Milestone title"
                              value={m.title}
                              onChange={(e) =>
                                updateMilestone(i, "title", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="%"
                                min="0"
                                max="100"
                                value={m.percentage}
                                onChange={(e) =>
                                  updateMilestone(
                                    i,
                                    "percentage",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                              />
                              <span className="text-slate-400 text-sm">%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <input
                                type="number"
                                placeholder="Amount ₹"
                                min="0"
                                value={m.amount}
                                onChange={(e) =>
                                  updateMilestone(i, "amount", e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                              />
                            </div>
                            <button
                              onClick={() => removeMilestone(i)}
                              className="text-slate-400 hover:text-red-500 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="Description (optional)"
                              value={m.description}
                              onChange={(e) =>
                                updateMilestone(
                                  i,
                                  "description",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={m.dueDate}
                              onChange={(e) =>
                                updateMilestone(i, "dueDate", e.target.value)
                              }
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addMilestone}
                    className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl text-sm text-slate-400 hover:text-blue-500 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={15} /> Add Milestone
                  </button>
                  {form.milestones.length > 0 && (
                    <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between text-sm">
                      <span className="text-blue-600">
                        Total milestone allocation:
                      </span>
                      <span className="font-medium text-blue-700">
                        {form.milestones
                          .reduce((s, m) => s + Number(m.percentage || 0), 0)
                          .toFixed(1)}
                        % (₹{" "}
                        {form.milestones
                          .reduce((s, m) => s + Number(m.amount || 0), 0)
                          .toLocaleString()}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* STAFFING / HEADCOUNT — resource roster */}
            {(form.poCategory === "staffing" ||
              form.billingModel === "headcount") && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">
                  Resources / Headcount
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Add the people who will be deployed. Rates here are used when
                  attendance is submitted.
                </p>

                <div className="space-y-3">
                  {form.resources.map((r, i) => (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-xl p-4"
                    >
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) =>
                              updateResource(i, "name", e.target.value)
                            }
                            placeholder="Resource name"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">
                            Role / Designation
                          </label>
                          <input
                            type="text"
                            value={r.role}
                            onChange={(e) =>
                              updateResource(i, "role", e.target.value)
                            }
                            placeholder="e.g. Senior Developer"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          {form.billingModel === "daily" ||
                          form.staffingConfig?.billingUnit === "day" ? (
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">
                                Rate / Day (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={r.ratePerDay}
                                onChange={(e) =>
                                  updateResource(
                                    i,
                                    "ratePerDay",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                              />
                            </div>
                          ) : form.billingModel === "hourly" ||
                            form.staffingConfig?.billingUnit === "hour" ? (
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">
                                Rate / Hour (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={r.ratePerHour}
                                onChange={(e) =>
                                  updateResource(
                                    i,
                                    "ratePerHour",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                              />
                            </div>
                          ) : (
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">
                                Rate / Month (₹)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={r.ratePerMonth}
                                onChange={(e) =>
                                  updateResource(
                                    i,
                                    "ratePerMonth",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                              />
                            </div>
                          )}
                          <button
                            onClick={() => removeResource(i)}
                            className="text-slate-400 hover:text-red-500 transition pb-2"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={r.startDate || ""}
                            onChange={(e) =>
                              updateResource(i, "startDate", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            value={r.endDate || ""}
                            onChange={(e) =>
                              updateResource(i, "endDate", e.target.value)
                            }
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-400/30 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addResource}
                    className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-teal-300 rounded-xl text-sm text-slate-400 hover:text-teal-500 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={15} /> Add Resource
                  </button>
                </div>

                {/* Also show total PO value for staffing */}
                <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    PO Ceiling Value (optional but recommended)
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Total PO Value (₹ incl. GST)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.totalAmount}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setForm((prev) => ({
                            ...prev,
                            totalAmount: v,
                            totalTaxableValue:
                              Math.round((v / 1.18) * 100) / 100,
                            valueInWords: numberToWords(v),
                          }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Sets the maximum invoiceable limit for this PO
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* FIXED / RETAINER — standard line items */}
            {(form.billingModel === "fixed" ||
              (form.poCategory !== "staffing" &&
                form.billingModel !== "milestone" &&
                form.billingModel !== "headcount")) && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">
                  Line Items
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  Services or deliverables covered under this PO.
                </p>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-1">HSN/SAC</div>
                    <div className="col-span-1">Qty</div>
                    <div className="col-span-2">Rate (₹)</div>
                    <div className="col-span-1">GST %</div>
                    <div className="col-span-2">Total (₹)</div>
                    <div className="col-span-1"></div>
                  </div>

                  {form.items.map((item, i) => (
                    <div
                      key={i}
                      className="grid sm:grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Service description"
                          value={item.description}
                          onChange={(e) =>
                            updateItem(i, "description", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-1 relative z-50">
  <select
    value={item.hsnId || ""}
    onChange={(e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        // User cleared the selection
        updateItem(i, "hsnId", null);
        updateItem(i, "hsnSac", "");
        updateItem(i, "gstRate", 18);
        return;
      }
      const selectedHsn = hsnList.find((h) => h._id === selectedId);
      if (selectedHsn) {
        updateItem(i, "hsnId", selectedId);
        updateItem(i, "hsnSac", selectedHsn.hsnCode);
        // Auto-fill description only if it's currently empty
        if (!item.description.trim()) {
          updateItem(i, "description", selectedHsn.serviceType);
        }
        const totalGst = getTotalGstRate(selectedHsn);
        updateItem(i, "gstRate", totalGst);
      }
    }}
    className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
  >
    <option value="">Select HSN</option>
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
                          onChange={(e) =>
                            updateItem(i, "quantity", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(i, "rate", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <input
                          type="number"
                          min="0"
                          max="28"
                          value={item.gstRate}
                          onChange={(e) =>
                            updateItem(i, "gstRate", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-sm font-medium text-slate-700">
                          ₹{" "}
                          {item.total?.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        {form.items.length > 1 && (
                          <button
                            onClick={() => removeItem(i)}
                            className="text-slate-300 hover:text-red-500 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="px-4 py-3 border-b border-slate-100">
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-700 transition"
                    >
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>

                  {/* Totals */}
                  <div className="px-4 py-4 bg-slate-50 space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal (taxable)</span>
                      <span>
                        ₹{" "}
                        {form.totalTaxableValue?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST</span>
                      <span>
                        ₹{" "}
                        {form.totalCGSTAmount?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST</span>
                      <span>
                        ₹{" "}
                        {form.totalSGSTAmount?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-200">
                      <span>Total</span>
                      <span>
                        ₹{" "}
                        {form.totalAmount?.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 5: Review ── */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Review & Submit
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Check everything before creating the PO.
            </p>

            <div className="space-y-4">
              {/* Summary card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">PO Type</p>
                    <p className="text-sm font-medium text-slate-700">
                      {selectedCategory.label} —{" "}
                      {
                        PO_CATEGORIES.flatMap((c) => c.billingModels).find(
                          (b) => b.key === form.billingModel,
                        )?.label
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Client</p>
                    <p className="text-sm font-medium text-slate-700">
                      {form.client.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">PO Date</p>
                    <p className="text-sm font-medium text-slate-700">
                      {form.poDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Payment Terms</p>
                    <p className="text-sm font-medium text-slate-700">
                      {PAYMENT_TERMS.find((t) => t.value === form.paymentTerms)
                        ?.label || form.paymentTerms}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">
                      Total PO Value
                    </p>
                    <p className="text-xl font-bold text-slate-800">
                      ₹{" "}
                      {form.totalAmount?.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  {form.poCategory === "staffing" && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Resources</p>
                      <p className="text-sm font-medium text-slate-700">
                        {form.resources.length} person(s) rostered
                      </p>
                    </div>
                  )}
                  {form.billingModel === "milestone" && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Milestones</p>
                      <p className="text-sm font-medium text-slate-700">
                        {form.milestones.length} milestone(s) defined
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in words */}
              {form.valueInWords && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
                  <p className="text-xs text-slate-400 mb-1">Amount in Words</p>
                  <p className="text-sm text-slate-600 italic">
                    {form.valueInWords}
                  </p>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.withSignature}
                  onChange={(e) => set("withSignature", e.target.checked)}
                  className="rounded border-slate-300 text-blue-500"
                />
                <span className="text-sm text-slate-600">
                  Include digital signature in document
                </span>
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
                ${
                  canProceed()
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
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              {isEditing ? "Update PO" : "Create PO"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

function numberToWords(num) {
  if (!num || num === 0) return "Zero Rupees Only";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    );
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = inWords(rupees) + " Rupees";
  if (paise > 0) result += " and " + inWords(paise) + " Paise";
  return result + " Only";
}
