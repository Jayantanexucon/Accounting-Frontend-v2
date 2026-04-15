import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getallhsn } from "../apis/hsnapi";
import { getClientsPaginatedApi } from "../apis/clientApi";
import { getVendors, getVendorById } from "../apis/vendorApi";
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
  Building2,
  CreditCard,
  CalendarDays,
  Receipt,
  ListChecks,
  Edit2,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────

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
    key: "weekly",
    label: "Weekly",
    icon: CalendarDays,
    hint: "Invoice raised every week",
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
};

const today = () => new Date().toISOString().split("T")[0];

const STEPS = [
  { id: 1, label: "Entity", icon: Building },
  { id: 2, label: "PO Details & Items", icon: FileText },
  { id: 3, label: "Payment Terms", icon: Briefcase },
  { id: 4, label: "Review", icon: Check },
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
  const prefilledClientId = searchParams.get("clientId");
  const prefilledVendorId = searchParams.get("vendorId");
  const urlDirection = searchParams.get("direction");

  const isVendorMode = !!prefilledVendorId || urlDirection === "payable";
  const mode = isVendorMode ? "vendor" : "client";
  const lockedDirection = mode === "client" ? "receivable" : "payable";

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

  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [hsnList, setHsnList] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);
  const [distributionBreakdown, setDistributionBreakdown] = useState([]);

  const [form, setForm] = useState({
    companyId,
    direction: lockedDirection,
    paymentTerms: "",
    poCategory: "project",
    billingModel: "fixed",
    poDate: today(),
    deliveryDate: today(),
    poreferencevalue: "",
    currency: "INR",
    client: { _id: "", name: "", address: "", stateCode: "", GSTIN: "" },
    vendor: { _id: "", name: "", address: "", stateCode: "", GSTIN: "" },
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
    totalGSTAmount: 0,
    totalCGSTAmount: 0,
    totalSGSTAmount: 0,
    totalIGSTAmount: 0,
    valueInWords: "",
    withSignature: false,
    notes: "",
    invoiceSchedule: [],
  });

  const [sameAsDeliverTo, setSameAsDeliverTo] = useState(false);
  const directionColor = form.direction === "payable" ? "amber" : "blue";
  const colors = colorMap[directionColor];

  const getTotalGstRate = (hsn) => {
    if (hsn.igst && hsn.igst > 0) return Number(hsn.igst);
    return (Number(hsn.cgst) || 0) + (Number(hsn.sgst) || 0);
  };

  // Initialize milestones when paymentTerms becomes "milestone"
  useEffect(() => {
    if (form.paymentTerms === "milestone" && form.milestones.length === 0) {
      setForm(prev => ({
        ...prev,
        milestones: [{
          title: "",
          description: "",
          amount: 0,
          percentage: 0,
          dueDate: today(),
          status: "pending",
        }],
      }));
    }
  }, [form.paymentTerms]);

  // ─────────────────────────────────────────────────────────────
  //  DATA LOADING
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        if (mode === "client") {
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
            clientCode: c.clientCode,
            clientCountry: c.clientCountry || c.country,
          }));
          setClients(normalized);
        } else {
          const vendorRes = await getVendors(companyId);
          let vendorList = vendorRes.data?.data?.vendors || vendorRes.data?.vendors || [];
          const normalized = vendorList.map((v) => {
            let address = v.address || v.vendorAddress || v.billingAddress?.line1 || v.registeredAddress || "";
            let stateCode = v.stateCode || v.gstStateCode || v.vendorState || "";
            let gstin = v.gstNumber || v.gstin || v.GSTIN || "";
            return {
              _id: v._id,
              name: v.vendorName || v.name || "",
              address: address,
              stateCode: stateCode,
              GSTIN: gstin,
              taxNumber: gstin || v.panNumber || "",
              vendorName: v.vendorName,
              vendorCode: v.vendorCode,
              country: v.country || "",
              email: v.email || "",
            };
          });
          setVendors(normalized);
        }
      } catch (e) {
        console.error("Failed to load entities:", e);
        setError(`Could not load ${mode === "client" ? "clients" : "vendors"}. Please refresh.`);
      }
    })();
  }, [companyId, mode]);

  useEffect(() => {
    if (companyId) {
      getallhsn(companyId)
        .then(res => {
          let hsnArray = [];
          if (res?.data?.data) hsnArray = res.data.data;
          else if (res?.data) hsnArray = res.data;
          else if (Array.isArray(res)) hsnArray = res;
          setHsnList(hsnArray);
        })
        .catch(console.error);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      getCompanyByIdApi(companyId)
        .then((res) => setCompanyInfo(res?.data?.data || res?.data))
        .catch(console.error);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId || editId) return;
    if (prefilledClientId && mode === "client") {
      const found = clients.find(c => c._id === prefilledClientId);
      if (found) {
        setForm(prev => ({
          ...prev,
          client: found,
          deliverTo: sameAsDeliverTo ? found : prev.deliverTo,
        }));
      }
    } else if (prefilledVendorId && mode === "vendor") {
      getVendorById(prefilledVendorId)
        .then(res => {
          const vendor = res.data?.data || res.data;
          const vendorObj = {
            _id: vendor._id,
            name: vendor.vendorName || vendor.name,
            address: vendor.address || vendor.vendorAddress || vendor.billingAddress?.line1 || "",
            stateCode: vendor.stateCode || vendor.gstStateCode || "",
            GSTIN: vendor.gstNumber || vendor.gstin || "",
          };
          setForm(prev => ({
            ...prev,
            vendor: vendorObj,
            deliverTo: sameAsDeliverTo ? vendorObj : prev.deliverTo,
          }));
        })
        .catch(console.error);
    }
  }, [clients, prefilledClientId, prefilledVendorId, mode, editId, companyId, sameAsDeliverTo]);

  useEffect(() => {
    if (editId) {
      setIsEditing(true);
      getPurchaseOrderApi(editId)
        .then((res) => {
          const d = res.data?.data || res.data;
          const fmt = (date) => (date ? new Date(date).toISOString().split("T")[0] : "");
          setForm(prev => ({
            ...prev,
            ...d,
            paymentTerms: d.paymentTerms || d.billingModel || prev.paymentTerms,
            direction: d.direction || lockedDirection,
            client: d.vendor || d.client || prev.client,
            vendor: d.vendor || d.client || prev.vendor,
            deliverTo: d.deliverTo || prev.deliverTo,
            poDate: fmt(d.poDate),
            deliveryDate: fmt(d.deliveryDate),
            items: d.items?.map((item) => ({ ...item, total: item.totalAmount })) || prev.items,
            milestones: d.milestones || [],
          }));
        })
        .catch(err => {
          console.error(err);
          setError("Could not load purchase order details.");
        });
    }
  }, [editId, lockedDirection]);

  useEffect(() => {
    if (form.paymentTerms === "monthly" && form.poDate && form.deliveryDate && form.totalAmount > 0) {
      calculateMonthlyDistribution();
    } else if (form.paymentTerms === "weekly" && form.poDate && form.deliveryDate && form.totalAmount > 0) {
      calculateWeeklyDistribution();
    } else if (form.paymentTerms === "milestone" && form.milestones.length > 0) {
      calculateMilestoneBreakdown();
    } else {
      setDistributionBreakdown([]);
    }
  }, [form.paymentTerms, form.poDate, form.deliveryDate, form.totalAmount, form.milestones]);

  const calculateMonthlyDistribution = () => {
    const start = dayjs(form.poDate);
    const end = dayjs(form.deliveryDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      setDistributionBreakdown([]);
      return;
    }
    const totalDays = end.diff(start, "day") + 1;
    let numMonths = Math.ceil(totalDays / 30);
    if (numMonths < 1) numMonths = 1;
    const amountPerMonth = form.totalAmount / numMonths;
    const breakdown = [];
    let current = start.clone();
    for (let i = 0; i < numMonths; i++) {
      let monthEnd = current.add(1, "month").subtract(1, "day");
      if (monthEnd.isAfter(end)) monthEnd = end;
      breakdown.push({
        period: `${current.format("MMM YYYY")}`,
        amount: amountPerMonth,
        date: current.format("YYYY-MM-DD"),
        startDate: current.format("DD MMM YYYY"),
        endDate: monthEnd.format("DD MMM YYYY"),
      });
      current = current.add(1, "month");
    }
    setDistributionBreakdown(breakdown);
  };

  const calculateWeeklyDistribution = () => {
    const start = dayjs(form.poDate);
    const end = dayjs(form.deliveryDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      setDistributionBreakdown([]);
      return;
    }
    const totalDays = end.diff(start, "day") + 1;
    let numWeeks = Math.ceil(totalDays / 7);
    if (numWeeks < 1) numWeeks = 1;
    const amountPerWeek = form.totalAmount / numWeeks;
    const breakdown = [];
    let current = start.clone();
    for (let i = 0; i < numWeeks; i++) {
      let weekEnd = current.add(6, "day");
      if (weekEnd.isAfter(end)) weekEnd = end;
      breakdown.push({
        period: `Week ${i + 1}`,
        amount: amountPerWeek,
        date: current.format("YYYY-MM-DD"),
        startDate: current.format("DD MMM YYYY"),
        endDate: weekEnd.format("DD MMM YYYY"),
      });
      current = weekEnd.add(1, "day");
    }
    setDistributionBreakdown(breakdown);
  };

  const calculateMilestoneBreakdown = () => {
    const breakdown = form.milestones.map((m, idx) => ({
      period: m.title || `Milestone ${idx + 1}`,
      amount: m.amount || 0,
      percentage: m.percentage || 0,
      dueDate: m.dueDate,
    }));
    setDistributionBreakdown(breakdown);
  };

  const filteredEntities = (mode === "client" ? clients : vendors).filter(e => {
    if (!entitySearch.trim()) return true;
    const q = entitySearch.toLowerCase();
    return (e.name || "").toLowerCase().includes(q) || (e.taxNumber || "").toLowerCase().includes(q);
  });

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

  const selectEntity = (entity) => {
    if (mode === "client") {
      setForm(prev => ({ ...prev, client: entity, deliverTo: sameAsDeliverTo ? entity : prev.deliverTo }));
    } else {
      setForm(prev => ({ ...prev, vendor: entity, deliverTo: sameAsDeliverTo ? entity : prev.deliverTo }));
    }
    setEntityDropdownOpen(false);
    setEntitySearch("");
  };

  const addMilestone = () => {
    setForm(prev => ({
      ...prev,
      milestones: [...prev.milestones, {
        title: "",
        description: "",
        amount: 0,
        percentage: 0,
        dueDate: today(),
        status: "pending",
      }],
    }));
  };

  const removeMilestone = (idx) => {
    setForm(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== idx),
    }));
  };

  const updateMilestone = (idx, field, value) => {
    setForm(prev => {
      const milestones = [...prev.milestones];
      const newMilestone = { ...milestones[idx] };

      if (field === "percentage") {
        let percent = value === "" ? 0 : Number(value);
        if (isNaN(percent)) percent = 0;

        // Validation: Percentage cannot exceed 100%
        const totalPercentageWithoutCurrent = milestones
          .reduce((sum, m, i) => i !== idx ? sum + (m.percentage || 0) : sum, 0);

        if (percent + totalPercentageWithoutCurrent > 100) {
          setError(`Milestone percentage cannot exceed 100%. Current total: ${totalPercentageWithoutCurrent}%`);
          return prev;
        }

        newMilestone.percentage = percent;
        newMilestone.amount = (prev.totalAmount * percent) / 100;
        setError(null);
      } else if (field === "amount") {
        let amount = value === "" ? 0 : Number(value);
        if (isNaN(amount)) amount = 0;
        newMilestone.amount = amount;
        newMilestone.percentage = prev.totalAmount > 0 ? (amount / prev.totalAmount) * 100 : 0;
      } else if (field === "dueDate") {
        // Validation: Due date must be between PO date and delivery date
        const poDate = dayjs(prev.poDate);
        const deliveryDate = dayjs(prev.deliveryDate);
        const milestoneDueDate = dayjs(value);

        // Check if date is before PO date or after delivery date
        if (milestoneDueDate.isBefore(poDate, "day") || milestoneDueDate.isAfter(deliveryDate, "day")) {
          setError(`Milestone due date must be between PO Date (${poDate.format("DD MMM YYYY")}) and Delivery Date (${deliveryDate.format("DD MMM YYYY")})`);
          return prev;
        }

        newMilestone[field] = value;
        setError(null);
      } else {
        newMilestone[field] = value;
      }

      milestones[idx] = newMilestone;
      return { ...prev, milestones };
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { description: "", hsnSac: "", hsnId: null, quantity: 1, rate: 0, taxableValue: 0, gstRate: 18, gstAmount: 0, total: 0 }],
    }));
  };

  const removeItem = (idx) => {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "quantity" || field === "rate") {
        items[idx].taxableValue = items[idx].quantity * items[idx].rate;
        items[idx].gstAmount = (items[idx].taxableValue * items[idx].gstRate) / 100;
        items[idx].total = items[idx].taxableValue + items[idx].gstAmount;
      }
      let totalTaxable = 0, totalGST = 0, totalAmount = 0;
      items.forEach(item => {
        totalTaxable += Number(item.taxableValue) || 0;
        totalGST += Number(item.gstAmount) || 0;
        totalAmount += Number(item.total) || 0;
      });
      return {
        ...prev,
        items,
        totalTaxableValue: Math.round(totalTaxable * 100) / 100,
        totalGSTAmount: Math.round(totalGST * 100) / 100,
        totalCGSTAmount: Math.round((totalGST / 2) * 100) / 100,
        totalSGSTAmount: Math.round((totalGST / 2) * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        valueInWords: numberToWords(Math.round(totalAmount * 100) / 100),
      };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return mode === "client" ? !!form.client?._id : !!form.vendor?._id;
      case 2:
        return form.poDate && form.deliveryDate &&
          form.items.some(i => i.description && i.description.trim() !== "" && i.quantity > 0 && i.rate > 0);
      case 3:
        // For milestone payment terms, ensure total percentage = 100%
        if (form.paymentTerms === "milestone") {
          const totalPercentage = form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
          return totalPercentage === 100 && form.milestones.length > 0 &&
            form.milestones.every(m => m.title && m.title.trim() !== "" && m.dueDate);
        }
        return !!form.paymentTerms;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) {
      setError("Please complete all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const poData = {
        ...form,
        billingModel: { milestone: "milestone", monthly: "fixed", weekly: "fixed" }[form.paymentTerms] || "fixed",
        poCategory: "project",
      };
      let result;
      if (isEditing) {
        result = await updatePurchaseOrderApi(editId, poData);
      } else {
        result = await createPurchaseOrderApi(poData);
      }
      setSuccess(true);
      setCreatedPOId(result?.data?._id || result?._id);
      setTimeout(() => navigate("/purchase-orders"), 1500);
    } catch (err) {
      setError(err.message || "Failed to save purchase order");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Success!</h2>
          <p className="text-xs text-slate-600 mb-3">
            {isEditing ? "Purchase Order updated" : "Purchase Order created"} successfully.
          </p>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  const getQtyLabel = () => {
    if (form.paymentTerms === "weekly") return "Total Hours";
    if (form.paymentTerms === "monthly") return "Quantity";
    return "Quantity";
  };
  const getRateLabel = () => {
    if (form.paymentTerms === "weekly") return "Rate/Hour (₹)";
    return "Rate (₹)";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate("/purchase-orders")} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 mb-3">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="text-xl font-bold text-slate-800 mb-0.5">
            {isEditing ? "Edit Purchase Order" : "Create Purchase Order"}
          </h1>
          <p className="text-[11px] text-slate-500">
            {mode === "client" ? "From a Client" : "To a Vendor"} • {form.direction === "receivable" ? "Receivable" : "Payable"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-red-900">{error}</p>
          </div>
        )}

        {/* Step Indicator */}
        <div className="mb-6 bg-white rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <button
                  onClick={() => step > s.id ? setStep(s.id) : undefined}
                  disabled={step < s.id}
                  className={`flex flex-col items-center gap-0.5 transition-all ${step >= s.id ? colors.text : "text-slate-400"} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${step >= s.id ? `${colors.bg} ${colors.border} border` : "bg-slate-100 border border-slate-200"}`}>
                    {step > s.id ? <Check size={12} /> : s.id}
                  </div>
                  <span className="text-[10px] font-medium text-center max-w-[60px]">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 transition-all ${step > s.id ? colors.bg : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-5">

          {/* STEP 1: Entity */}
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-0.5">Select {mode === "client" ? "Client" : "Vendor"}</h2>
              <p className="text-[11px] text-slate-500 mb-4">Choose the {mode === "client" ? "client" : "vendor"} for this purchase order</p>
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PO Direction</label>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs border ${colors.bg} ${colors.border} ${colors.text}`}>
                  {form.direction === "receivable" ? <ArrowDownCircle size={13} /> : <ArrowUpCircle size={13} />}
                  {form.direction === "receivable" ? "Receivable — From Client" : "Payable — To Vendor"}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{mode === "client" ? "Client" : "Vendor"}</label>
                <div className="relative">
                  <input type="text" placeholder={`Search ${mode === "client" ? "clients" : "vendors"}...`} value={entitySearch} onChange={(e) => { setEntitySearch(e.target.value); setEntityDropdownOpen(true); }} onFocus={() => setEntityDropdownOpen(true)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                  {entityDropdownOpen && filteredEntities.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
                      {filteredEntities.map((entity) => (
                        <button key={entity._id} onClick={() => selectEntity(entity)} className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition">
                          <div className="font-medium text-slate-800 text-xs">{entity.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{entity.GSTIN || entity.taxNumber || "No Tax ID"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {(mode === "client" ? form.client?._id : form.vendor?._id) && (
                <div className={`mt-4 p-3 rounded-md border ${colors.bg} ${colors.border}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${colors.text}`}>{mode === "client" ? "Client" : "Vendor"} Details</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><p className="text-[10px] text-slate-500 mb-0.5">Name</p><p className="font-medium text-slate-800 text-xs">{mode === "client" ? form.client.name : form.vendor.name}</p></div>
                    <div><p className="text-[10px] text-slate-500 mb-0.5">GSTIN</p><p className="font-medium text-slate-800 text-xs">{(mode === "client" ? form.client.GSTIN : form.vendor.GSTIN) || "—"}</p></div>
                    {(mode === "client" ? form.client.stateCode : form.vendor.stateCode) && <div><p className="text-[10px] text-slate-500 mb-0.5">State Code</p><p className="font-medium text-slate-800 text-xs">{mode === "client" ? form.client.stateCode : form.vendor.stateCode}</p></div>}
                    <div className={`${(mode === "client" ? form.client.stateCode : form.vendor.stateCode) ? "" : "sm:col-span-2"}`}><p className="text-[10px] text-slate-500 mb-0.5">Address</p><p className="font-medium text-slate-800 text-xs">{(mode === "client" ? form.client.address : form.vendor.address) || "—"}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PO Details & Line Items */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-0.5">PO Details & Line Items</h2>
                <p className="text-[11px] text-slate-500 mb-4">Fill in the basic information and add line items</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PO Date</label><input type="date" value={form.poDate} onChange={(e) => set("poDate", e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" /></div>
                <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Date</label><input type="date" value={form.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" /></div>
              </div>
              <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PO Reference Number (Optional)</label><input type="text" value={form.poreferencevalue} onChange={(e) => set("poreferencevalue", e.target.value)} placeholder="e.g., PO-2024-001" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" /></div>
              <div><label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Notes (Optional)</label><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows="2" className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" /></div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 text-xs">Line Items</h3>
                  <button onClick={addItem} className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition ${colors.bg} ${colors.text}`}><Plus size={13} /> Add Item</button>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                    <div className="col-span-4">Description</div>
                    <div className="col-span-1">HSN/SAC</div>
                    <div className="col-span-1">{getQtyLabel()}</div>
                    <div className="col-span-2">{getRateLabel()}</div>
                    <div className="col-span-1">GST %</div>
                    <div className="col-span-2">Total (₹)</div>
                    <div className="col-span-1"></div>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid sm:grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 items-center">
                      <div className="sm:col-span-4"><input type="text" placeholder="Service description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-1 relative z-50">
                        <select value={item.hsnId || ""} onChange={(e) => {
                          const id = e.target.value;
                          if (!id) { updateItem(i, "hsnId", null); updateItem(i, "hsnSac", ""); updateItem(i, "gstRate", 18); return; }
                          const hsn = hsnList.find(h => h._id === id);
                          if (hsn) {
                            updateItem(i, "hsnId", id);
                            updateItem(i, "hsnSac", hsn.hsnCode);
                            if (!item.description.trim()) updateItem(i, "description", hsn.serviceType);
                            updateItem(i, "gstRate", getTotalGstRate(hsn));
                          }
                        }} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none">
                          <option value="">HSN</option>
                          {hsnList.map(hsn => <option key={hsn._id} value={hsn._id}>{hsn.hsnCode} – {hsn.serviceType}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-1"><input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} onWheel={(e) => e.target.blur()} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-2"><input type="number" min="0" value={item.rate} onChange={(e) => updateItem(i, "rate", e.target.value)} onWheel={(e) => e.target.blur()} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-1"><input type="number" min="0" max="28" value={item.gstRate} onChange={(e) => updateItem(i, "gstRate", e.target.value)} onWheel={(e) => e.target.blur()} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">₹ {item.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                      <div className="sm:col-span-1 flex justify-end">{form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={15} /></button>}</div>
                    </div>
                  ))}
                  <div className="px-4 py-3 border-b border-slate-100"><button onClick={addItem} className={`flex items-center gap-1.5 text-sm text-slate-400 transition ${colors.dashed}`}><Plus size={14} /> Add Line Item</button></div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal (taxable)</span><span>₹ {form.totalTaxableValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-slate-600"><span>CGST</span><span>₹ {form.totalCGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-slate-600"><span>SGST</span><span>₹ {form.totalSGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-200"><span>Total</span><span>₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Terms & Distribution */}
          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-0.5">Payment Terms</h2>
              <p className="text-[11px] text-slate-500 mb-4">Select how the invoicing will be structured</p>
              <div className="grid gap-2 mb-6">
                {PAYMENT_TERMS_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => set("paymentTerms", opt.key)} className={`p-3 rounded-lg border transition-all text-left ${form.paymentTerms === opt.key ? `${colors.bg} ${colors.border} ring-1 ${colors.ring}` : "bg-white border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex items-start gap-2.5">
                      <opt.icon size={15} className={form.paymentTerms === opt.key ? colors.text : "text-slate-400"} />
                      <div><p className={`font-semibold text-xs ${form.paymentTerms === opt.key ? colors.text : "text-slate-700"}`}>{opt.label}</p><p className="text-[10px] text-slate-500 mt-0.5">{opt.hint}</p></div>
                    </div>
                  </button>
                ))}
              </div>

              {/* MILESTONE SECTION */}
              {form.paymentTerms === "milestone" && (
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-xs">Milestones</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Define milestones and their payment amounts</p>
                    </div>
                    <button onClick={addMilestone} className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition ${colors.bg} ${colors.text}`}>
                      <Plus size={13} /> Add Milestone
                    </button>
                  </div>

                  {/* Percentage Progress Bar */}
                  {form.milestones.length > 0 && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-slate-700">Total Percentage Allocated</span>
                        <span className={`text-xs font-semibold ${form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0) > 100 ? "text-red-600" : "text-slate-700"}`}>
                          {form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0).toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0) > 100
                              ? "bg-red-500"
                              : form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0) === 100
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                          style={{
                            width: `${Math.min(form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0), 100)}%`,
                          }}
                        />
                      </div>
                      {form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0) > 100 && (
                        <p className="text-xs text-red-600 font-medium mt-1.5">⚠️ Total percentage exceeds 100%. Please adjust milestones.</p>
                      )}
                      {form.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0) === 100 && (
                        <p className="text-xs text-green-600 font-medium mt-1.5">✓ All milestone percentages allocated.</p>
                      )}
                    </div>
                  )}

                  {/* Milestone Table */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                      <div className="col-span-4">Milestone Name</div>
                      <div className="col-span-2">Due Date</div>
                      <div className="col-span-2">Percentage (%)</div>
                      <div className="col-span-2">Amount (₹)</div>
                      <div className="col-span-2">Description</div>
                      <div className="col-span-1"></div>
                    </div>
                    {form.milestones.map((milestone, idx) => (
                      <div key={idx} className="grid sm:grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 items-center">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="e.g., Design Phase"
                            value={milestone.title}
                            onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="date"
                            value={milestone.dueDate}
                            onChange={(e) => updateMilestone(idx, "dueDate", e.target.value)}
                            min={form.poDate}
                            max={form.deliveryDate}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={milestone.percentage}
                            onChange={(e) => updateMilestone(idx, "percentage", e.target.value)}
                            onWheel={(e) => e.target.blur()}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={milestone.amount}
                            onChange={(e) => updateMilestone(idx, "amount", e.target.value)}
                            onWheel={(e) => e.target.blur()}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Optional"
                            value={milestone.description}
                            onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          {form.milestones.length > 1 && (
                            <button onClick={() => removeMilestone(idx)} className="text-slate-300 hover:text-red-500 transition">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <button onClick={addMilestone} className={`flex items-center gap-1.5 text-sm text-slate-400 transition ${colors.dashed}`}>
                        <Plus size={14} /> Add Milestone
                      </button>
                    </div>
                  </div>

                  {/* Milestone breakdown summary */}
                  {distributionBreakdown.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
                      <h4 className="font-semibold text-slate-800 mb-2 text-xs">Milestone Breakdown</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Milestone</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-600">%</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-600">Amount (₹)</th>
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Due Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributionBreakdown.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                                <td className="px-2 py-1.5 text-slate-700">{item.period}</td>
                                <td className="px-2 py-1.5 text-right text-slate-600">{item.percentage}%</td>
                                <td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="px-2 py-1.5 text-slate-600">{item.dueDate ? dayjs(item.dueDate).format("DD MMM YYYY") : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 text-right text-xs font-semibold text-slate-800">
                        Total: ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.paymentTerms === "monthly" && (
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-slate-800 mb-1 text-xs">Monthly Distribution</h3>
                  <p className="text-[10px] text-slate-500 mb-3">Based on PO Date ({dayjs(form.poDate).format("DD MMM YYYY")}) to Delivery Date ({dayjs(form.deliveryDate).format("DD MMM YYYY")})</p>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800 mb-2">A total of <strong>{distributionBreakdown.length}</strong> monthly invoice{distributionBreakdown.length !== 1 ? "s" : ""} will be generated.</p>
                    {distributionBreakdown.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-blue-200"><th className="px-2 py-1.5 text-left font-medium text-blue-900">Month</th><th className="px-2 py-1.5 text-left font-medium text-blue-900">Period</th><th className="px-2 py-1.5 text-right font-medium text-blue-900">Amount (₹)</th></tr></thead>
                          <tbody>{distributionBreakdown.map((item, idx) => (<tr key={idx} className="border-b border-blue-100 last:border-b-0"><td className="px-2 py-1.5 font-medium text-slate-800">{item.period}</td><td className="px-2 py-1.5 text-slate-600">{item.startDate} – {item.endDate}</td><td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>))}</tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-2 text-right text-xs font-semibold text-slate-800">Total: ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              )}

              {form.paymentTerms === "weekly" && (
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-slate-800 mb-1 text-xs">Weekly Distribution</h3>
                  <p className="text-[10px] text-slate-500 mb-3">Based on PO Date ({dayjs(form.poDate).format("DD MMM YYYY")}) to Delivery Date ({dayjs(form.deliveryDate).format("DD MMM YYYY")})</p>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800 mb-2">A total of <strong>{distributionBreakdown.length}</strong> weekly invoice{distributionBreakdown.length !== 1 ? "s" : ""} will be generated.</p>
                    {distributionBreakdown.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-blue-200"><th className="px-2 py-1.5 text-left font-medium text-blue-900">Week</th><th className="px-2 py-1.5 text-left font-medium text-blue-900">Period</th><th className="px-2 py-1.5 text-right font-medium text-blue-900">Amount (₹)</th></tr></thead>
                          <tbody>{distributionBreakdown.map((item, idx) => (<tr key={idx} className="border-b border-blue-100 last:border-b-0"><td className="px-2 py-1.5 font-medium text-slate-800">{item.period}</td><td className="px-2 py-1.5 text-slate-600">{item.startDate} – {item.endDate}</td><td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>))}</tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-2 text-right text-xs font-semibold text-slate-800">Total: ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-0.5">Review & Submit</h2>
                <p className="text-[11px] text-slate-500 mb-4">Review all details carefully. Click <strong>Edit</strong> on any section to go back and make changes.</p>
              </div>

              {/* Entity Section */}
              <div className={`border ${colors.border} rounded-lg p-4 ${colors.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <Building size={14} className={colors.text} />
                    {mode === "client" ? "Client" : "Vendor"} Details
                  </h3>
                  <button onClick={() => setStep(1)} className={`flex items-center gap-1 text-xs ${colors.text} hover:opacity-70 transition`}>
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-600">Name</p>
                      <p className="font-medium text-slate-800">{mode === "client" ? form.client.name : form.vendor.name}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">GSTIN</p>
                      <p className="font-medium text-slate-800">{mode === "client" ? form.client.GSTIN : form.vendor.GSTIN || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-600">Address</p>
                      <p className="font-medium text-slate-800">{mode === "client" ? form.client.address : form.vendor.address}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">State Code</p>
                      <p className="font-medium text-slate-800">{mode === "client" ? form.client.stateCode : form.vendor.stateCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deliver To Section */}
              {mode === "client" && (
                <div className={`border ${colors.border} rounded-lg p-4 ${colors.bg}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                      <Building2 size={14} className={colors.text} />
                      Deliver To
                    </h3>
                    <button onClick={() => setStep(1)} className={`flex items-center gap-1 text-xs ${colors.text} hover:opacity-70 transition`}>
                      <Edit2 size={12} /> Edit
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="col-span-2">
                        <p className="text-slate-600">Name</p>
                        <p className="font-medium text-slate-800">{form.deliverTo.name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-600">Address</p>
                        <p className="font-medium text-slate-800">{form.deliverTo.address}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">State Code</p>
                        <p className="font-medium text-slate-800">{form.deliverTo.stateCode}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">GSTIN</p>
                        <p className="font-medium text-slate-800">{form.deliverTo.GSTIN || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PO Details & Items Section */}
              <div className={`border ${colors.border} rounded-lg p-4 ${colors.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <FileText size={14} className={colors.text} />
                    PO Details & Items
                  </h3>
                  <button onClick={() => setStep(2)} className={`flex items-center gap-1 text-xs ${colors.text} hover:opacity-70 transition`}>
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-slate-600">PO Date</p>
                      <p className="font-medium text-slate-800">{dayjs(form.poDate).format("DD MMM YYYY")}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Delivery Date</p>
                      <p className="font-medium text-slate-800">{dayjs(form.deliveryDate).format("DD MMM YYYY")}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Currency</p>
                      <p className="font-medium text-slate-800">{form.currency}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">PO Category</p>
                      <p className="font-medium text-slate-800 capitalize">{form.poCategory}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Billing Model</p>
                      <p className="font-medium text-slate-800 capitalize">{form.billingModel}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">PO Reference</p>
                      <p className="font-medium text-slate-800">{form.poreferencevalue || "—"}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border-t border-slate-200 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Items</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100">
                            <th className="px-2 py-1.5 text-left font-medium text-slate-600">Description</th>
                            <th className="px-2 py-1.5 text-center font-medium text-slate-600">Qty</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-600">Rate</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-600">GST %</th>
                            <th className="px-2 py-1.5 text-right font-medium text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                              <td className="px-2 py-1.5 text-slate-700">{item.description}</td>
                              <td className="px-2 py-1.5 text-center text-slate-700">{item.quantity}</td>
                              <td className="px-2 py-1.5 text-right text-slate-700">₹ {item.rate?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              <td className="px-2 py-1.5 text-right text-slate-700">{item.gstRate}%</td>
                              <td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Taxable Value</span>
                      <span className="font-medium text-slate-800">₹ {form.totalTaxableValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">GST Amount</span>
                      <span className="font-medium text-slate-800">₹ {form.totalGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                      <span className="font-semibold text-slate-800">Total Amount</span>
                      <span className="font-semibold text-slate-800">₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-1 italic text-slate-600">
                      <span>In Words</span>
                      <span className="text-slate-700">{form.valueInWords}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Terms Section */}
              <div className={`border ${colors.border} rounded-lg p-4 ${colors.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <CreditCard size={14} className={colors.text} />
                    Payment Terms
                  </h3>
                  <button onClick={() => setStep(3)} className={`flex items-center gap-1 text-xs ${colors.text} hover:opacity-70 transition`}>
                    <Edit2 size={12} /> Edit
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-600 text-xs">Payment Terms Type</p>
                    <p className="font-medium text-slate-800 text-xs capitalize">{form.paymentTerms}</p>
                  </div>

                  {/* Milestone Distribution */}
                  {form.paymentTerms === "milestone" && distributionBreakdown.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Milestone Breakdown</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-100">
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Milestone</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-600">%</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-600">Amount</th>
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Due Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributionBreakdown.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                                <td className="px-2 py-1.5 text-slate-700">{item.period}</td>
                                <td className="px-2 py-1.5 text-right text-slate-600">{item.percentage}%</td>
                                <td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                <td className="px-2 py-1.5 text-slate-600">{item.dueDate ? dayjs(item.dueDate).format("DD MMM YYYY") : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Monthly Distribution */}
                  {form.paymentTerms === "monthly" && distributionBreakdown.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Monthly Distribution</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-100">
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Month</th>
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Period</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-600">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributionBreakdown.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                                <td className="px-2 py-1.5 font-medium text-slate-800">{item.period}</td>
                                <td className="px-2 py-1.5 text-slate-600">{item.startDate} – {item.endDate}</td>
                                <td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Weekly Distribution */}
                  {form.paymentTerms === "weekly" && distributionBreakdown.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-xs font-semibold text-slate-700 mb-2">Weekly Distribution</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-100">
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Week</th>
                              <th className="px-2 py-1.5 text-left font-medium text-slate-600">Period</th>
                              <th className="px-2 py-1.5 text-right font-medium text-slate-600">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributionBreakdown.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                                <td className="px-2 py-1.5 font-medium text-slate-800">{item.period}</td>
                                <td className="px-2 py-1.5 text-slate-600">{item.startDate} – {item.endDate}</td>
                                <td className="px-2 py-1.5 text-right font-medium text-slate-800">₹ {item.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Signature Section */}
              <div className={`border ${colors.border} rounded-lg p-4 ${colors.bg}`}>
                <h3 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <ListChecks size={14} className={colors.text} />
                  Additional Settings
                </h3>
                <div className="space-y-3">
                  {form.notes && (
                    <div>
                      <p className="text-slate-600 text-xs">Notes</p>
                      <p className="font-medium text-slate-800 text-xs whitespace-pre-wrap">{form.notes}</p>
                    </div>
                  )}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.withSignature} onChange={(e) => set("withSignature", e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500" />
                      <span className="text-xs text-slate-600">Include digital signature in document</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between gap-3">
          <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition flex items-center gap-1.5 bg-white"><ArrowLeft size={13} /> Back</button>
          <div className="flex gap-2">
            {step < STEPS.length ? (
              <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()} className={`px-4 py-2 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${canProceed() ? `${colors.bg} ${colors.text} hover:opacity-90` : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>Continue <ChevronRight size={13} /></button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-800 text-white hover:bg-slate-700 transition flex items-center gap-1.5 disabled:opacity-60">{loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{isEditing ? "Update PO" : "Create PO"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HELPER
// ─────────────────────────────────────────────────────────────────
function numberToWords(num) {
  if (!num || num === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
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