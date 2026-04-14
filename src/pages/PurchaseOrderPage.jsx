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
    key: "hourly",
    label: "Hourly",
    icon: Clock,
    hint: "Rate per hour × total hours logged",
  },
];

const HOURLY_DISTRIBUTION_OPTIONS = [
  { key: "weekly", label: "Weekly", icon: CalendarDays, hint: "Invoice raised every week" },
  { key: "monthly", label: "Monthly", icon: Calendar, hint: "Invoice raised every month" },
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
  { id: 1, label: "Payment Terms", icon: Briefcase },
  { id: 2, label: "Entity", icon: Building },
  { id: 3, label: "Details", icon: FileText },
  { id: 4, label: "Line Items", icon: Target },
  { id: 5, label: "Distribution", icon: ListChecks },
  { id: 6, label: "Review", icon: Check },
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

  // Determine mode: client (receivable) or vendor (payable)
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

  // Data
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [hsnList, setHsnList] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);

  // Distribution state
  const [hourlyDistribution, setHourlyDistribution] = useState("monthly"); // "weekly" or "monthly"
  const [distributionBreakdown, setDistributionBreakdown] = useState([]);

  // Form state
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
    totalCGSTAmount: 0,
    totalSGSTAmount: 0,
    totalIGSTAmount: 0,
    valueInWords: "",
    withSignature: false,
    notes: "",
    // For storing distribution preferences
    distributionType: null, // "weekly", "monthly", or null
    invoiceSchedule: [], // array of { date, amount }
  });

  const [sameAsDeliverTo, setSameAsDeliverTo] = useState(false);

  const directionColor = form.direction === "payable" ? "amber" : "blue";
  const colors = colorMap[directionColor];

  // ─────────────────────────────────────────────────────────────
  //  DATA LOADING
  // ─────────────────────────────────────────────────────────────

  // Fetch clients or vendors based on mode
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

  // Fetch HSN codes
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

  // Fetch company info for deliverTo default
  useEffect(() => {
    if (companyId) {
      getCompanyByIdApi(companyId)
        .then((res) => setCompanyInfo(res?.data?.data || res?.data))
        .catch(console.error);
    }
  }, [companyId]);

  // Auto-fill entity from URL
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

  // Edit mode: fetch existing PO
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
            milestones: d.milestones || prev.milestones,
            distributionType: d.distributionType || null,
          }));
          if (d.distributionType) setHourlyDistribution(d.distributionType);
        })
        .catch(err => {
          console.error(err);
          setError("Could not load purchase order details.");
        });
    }
  }, [editId, lockedDirection]);

  // Recalculate distribution breakdown when relevant data changes
  useEffect(() => {
    if (form.paymentTerms === "monthly" && form.poDate && form.deliveryDate && form.totalAmount > 0) {
      calculateMonthlyDistribution();
    } else if (form.paymentTerms === "hourly" && form.poDate && form.deliveryDate && form.totalAmount > 0 && hourlyDistribution) {
      calculateHourlyDistribution();
    } else if (form.paymentTerms === "milestone" && form.milestones.length > 0) {
      calculateMilestoneBreakdown();
    } else {
      setDistributionBreakdown([]);
    }
  }, [form.paymentTerms, form.poDate, form.deliveryDate, form.totalAmount, form.milestones, hourlyDistribution]);

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
        period: `${current.format("MMM YYYY")} - ${monthEnd.format("MMM YYYY")}`,
        amount: amountPerMonth,
        date: current.format("YYYY-MM-DD"),
      });
      current = current.add(1, "month");
    }
    setDistributionBreakdown(breakdown);
    setForm(prev => ({ ...prev, invoiceSchedule: breakdown, distributionType: "monthly" }));
  };

  const calculateHourlyDistribution = () => {
    const start = dayjs(form.poDate);
    const end = dayjs(form.deliveryDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      setDistributionBreakdown([]);
      return;
    }
    const totalDays = end.diff(start, "day") + 1;
    let numPeriods = 0;
    if (hourlyDistribution === "weekly") {
      numPeriods = Math.ceil(totalDays / 7);
    } else {
      numPeriods = Math.ceil(totalDays / 30);
    }
    if (numPeriods < 1) numPeriods = 1;
    const amountPerPeriod = form.totalAmount / numPeriods;
    const breakdown = [];
    let current = start.clone();
    for (let i = 0; i < numPeriods; i++) {
      let periodEnd;
      if (hourlyDistribution === "weekly") {
        periodEnd = current.add(6, "day");
      } else {
        periodEnd = current.add(1, "month").subtract(1, "day");
      }
      if (periodEnd.isAfter(end)) periodEnd = end;
      breakdown.push({
        period: `${current.format("DD MMM")} - ${periodEnd.format("DD MMM")}`,
        amount: amountPerPeriod,
        date: current.format("YYYY-MM-DD"),
      });
      current = periodEnd.add(1, "day");
    }
    setDistributionBreakdown(breakdown);
    setForm(prev => ({ ...prev, invoiceSchedule: breakdown, distributionType: hourlyDistribution }));
  };

  const calculateMilestoneBreakdown = () => {
    const breakdown = form.milestones.map((m, idx) => ({
      period: m.title || `Milestone ${idx + 1}`,
      amount: m.amount || 0,
      percentage: m.percentage || 0,
      dueDate: m.dueDate,
    }));
    setDistributionBreakdown(breakdown);
    setForm(prev => ({ ...prev, invoiceSchedule: breakdown, distributionType: "milestone" }));
  };

  // Filter entities based on search
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
      setForm(prev => ({
        ...prev,
        client: entity,
        deliverTo: sameAsDeliverTo ? entity : prev.deliverTo,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        vendor: entity,
        deliverTo: sameAsDeliverTo ? entity : prev.deliverTo,
      }));
    }
    setEntityDropdownOpen(false);
    setEntitySearch("");
  };

  // Item calculations
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
    return description.length > 0 || hsnSac.length > 0 || Number(item.rate || 0) > 0 || Number(item.taxableValue || 0) > 0 || Number(item.total || 0) > 0;
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
      items: [...prev.items, { description: "", hsnSac: "", hsnId: null, quantity: 1, rate: 0, taxableValue: 0, gstRate: 18, gstAmount: 0, total: 0 }],
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

  // Milestone helpers
  const addMilestone = () => {
    setForm(prev => ({
      ...prev,
      milestones: [...prev.milestones, { title: "", description: "", percentage: 0, amount: 0, dueDate: "", status: "pending" }],
    }));
  };

  const updateMilestone = (index, field, value) => {
    setForm(prev => {
      const milestones = [...prev.milestones];
      milestones[index] = { ...milestones[index], [field]: value };
      if (field === "percentage") {
        milestones[index].amount = Math.round(((prev.totalAmount * Number(value)) / 100) * 100) / 100;
      }
      if (field === "amount") {
        milestones[index].percentage = prev.totalAmount > 0 ? Math.round((Number(value) / prev.totalAmount) * 10000) / 100 : 0;
      }
      // Update totalAmount if needed? No, totalAmount is set separately.
      return { ...prev, milestones };
    });
  };

  const removeMilestone = (index) => {
    setForm(prev => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== index) }));
  };

  // ─────────────────────────────────────────────────────────────
  //  SUBMIT
  // ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const sanitizedItems = Array.isArray(form.items) ? form.items.map(recalcItem).filter(hasMeaningfulLineItem) : [];

      const billingModelMap = { milestone: "milestone", monthly: "fixed", hourly: "hourly" };

      const entityToUse = mode === "client" ? form.client : form.vendor;

      const payload = {
        companyId,
        poNumber: form.poNumber,
        poDate: form.poDate,
        deliveryDate: form.deliveryDate,
        direction: form.direction,
        paymentTerms: form.paymentTerms,
        poCategory: form.poCategory || "project",
        billingModel: billingModelMap[form.paymentTerms] || "fixed",
        vendor: entityToUse,
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
        // Store distribution info
        distributionType: form.distributionType,
        invoiceSchedule: form.invoiceSchedule,
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
    if (step === 1) return !!form.paymentTerms;
    if (step === 2) {
      if (mode === "client") return !!form.client?.name;
      else return !!form.vendor?.name;
    }
    if (step === 3) return !!form.poDate && !!form.deliveryDate;
    if (step === 4) {
      if (form.paymentTerms === "milestone") return form.milestones.length > 0;
      return form.items.length > 0 && form.items[0].description.trim() !== "";
    }
    if (step === 5) {
      // Distribution step: for milestone and monthly it's auto, for hourly require distribution selection
      if (form.paymentTerms === "hourly") return !!hourlyDistribution;
      return true;
    }
    return true;
  };

  // ─────────────────────────────────────────────────────────────
  //  SUCCESS STATE
  // ─────────────────────────────────────────────────────────────

  if (success) {
    const entityId = mode === "client" ? form.client?._id : form.vendor?._id;
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
            Your {form.direction === "receivable" ? "Receivable" : "Payable"} PO has been saved.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate(`/purchaseorder-data/${mode === "client" ? "client" : "vendor"}/${entityId}`)} className="px-5 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
              View All POs
            </button>
            {createdPOId && (
              <button onClick={() => navigate(`/purchaseorder-data/${mode === "client" ? "client" : "vendor"}/${entityId}?openPOId=${createdPOId}`)} className="px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                View This PO
              </button>
            )}
            <button onClick={() => {
              setSuccess(false);
              setStep(1);
              setForm({
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
                items: [{ description: "", hsnSac: "", hsnId: null, quantity: 1, rate: 0, taxableValue: 0, gstRate: 18, gstAmount: 0, total: 0 }],
                milestones: [],
                totalAmount: 0,
                totalTaxableValue: 0,
                totalCGSTAmount: 0,
                totalSGSTAmount: 0,
                totalIGSTAmount: 0,
                valueInWords: "",
                withSignature: false,
                notes: "",
                distributionType: null,
                invoiceSchedule: [],
              });
              setSameAsDeliverTo(false);
              setHourlyDistribution("monthly");
              setDistributionBreakdown([]);
            }} className="px-5 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition">
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
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 transition">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-base font-semibold text-slate-800">
            {isEditing ? "Edit Purchase Order" : `New ${mode === "client" ? "Receivable" : "Payable"} PO`}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button onClick={() => step > s.id && setStep(s.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${step === s.id ? `${colors.bg} ${colors.text}` : step > s.id ? "bg-green-50 text-green-600" : "text-slate-400"}`}>
                  {step > s.id ? <Check size={11} /> : <s.icon size={11} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <ChevronRight size={12} className={step > s.id ? "text-green-400" : "text-slate-300"} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* STEP 1: Payment Terms (direction is auto-locked) */}
        {step === 1 && (
          <div>
            <div className="mb-6 p-4 rounded-xl border bg-slate-50 border-slate-200 flex items-center gap-3">
              {form.direction === "receivable" ? <ArrowDownCircle className="text-blue-600" size={20} /> : <ArrowUpCircle className="text-amber-600" size={20} />}
              <div>
                <p className="text-sm font-semibold">PO Direction: <span className="capitalize">{form.direction}</span></p>
                <p className="text-xs text-slate-500">
                  {form.direction === "receivable" ? "This PO will be raised on a client (receivable)." : "This PO will be raised from a vendor (payable)."}
                </p>
              </div>
              <div className="ml-auto text-xs text-slate-400 bg-white px-2 py-1 rounded border">Locked</div>
            </div>

            <h2 className="text-lg font-semibold text-slate-800 mb-1">Select Payment Terms</h2>
            <p className="text-sm text-slate-500 mb-6">Choose how invoicing will work for this PO.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {PAYMENT_TERMS_OPTIONS.map((pt) => {
                const isSelected = form.paymentTerms === pt.key;
                return (
                  <button key={pt.key} onClick={() => set("paymentTerms", pt.key)} className={`text-left p-5 rounded-xl border-2 transition-all ${isSelected ? `${colors.bg} ${colors.border} ring-2 ${colors.ring} ring-offset-1` : "bg-white border-slate-200 hover:border-slate-300"}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${isSelected ? colors.bg : "bg-slate-100"}`}>
                      <pt.icon size={18} className={isSelected ? colors.text : "text-slate-400"} />
                    </div>
                    <p className={`text-sm font-semibold mb-1 ${isSelected ? colors.text : "text-slate-700"}`}>{pt.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{pt.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Entity (Client or Vendor) */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">{mode === "client" ? "Client Details" : "Vendor Details"}</h2>
            <p className="text-sm text-slate-500 mb-6">Select the {mode === "client" ? "client" : "vendor"} for this PO.</p>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <div className="relative mb-4">
                <input type="text" placeholder={`Search ${mode === "client" ? "clients" : "vendors"}...`} value={entitySearch} onChange={(e) => { setEntitySearch(e.target.value); setEntityDropdownOpen(true); }} onFocus={() => setEntityDropdownOpen(true)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none" />
                {entityDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredEntities.slice(0, 10).map((e, i) => (
                      <button key={i} onClick={() => selectEntity(e)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2">
                        {mode === "client" ? <Building size={13} className="text-slate-400" /> : <Building2 size={13} className="text-slate-400" />}
                        <span className="font-medium">{e.name}</span>
                        {e.taxNumber && <span className="text-xs text-slate-400 ml-auto">{e.taxNumber}</span>}
                      </button>
                    ))}
                    {filteredEntities.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No {mode === "client" ? "clients" : "vendors"} found.</p>}
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{mode === "client" ? "Client Name *" : "Vendor Name *"}</label>
                  <input type="text" value={mode === "client" ? (form.client?.name || "") : (form.vendor?.name || "")} onChange={(e) => set(mode === "client" ? "client.name" : "vendor.name", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">GSTIN / Tax ID</label>
                  <input type="text" value={mode === "client" ? (form.client?.GSTIN || "") : (form.vendor?.GSTIN || "")} onChange={(e) => set(mode === "client" ? "client.GSTIN" : "vendor.GSTIN", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                  <input type="text" value={mode === "client" ? (form.client?.address || "") : (form.vendor?.address || "")} onChange={(e) => set(mode === "client" ? "client.address" : "vendor.address", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State Code</label>
                  <input type="text" value={mode === "client" ? (form.client?.stateCode || "") : (form.vendor?.stateCode || "")} onChange={(e) => set(mode === "client" ? "client.stateCode" : "vendor.stateCode", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" />
                </div>
              </div>
            </div>

            {/* Deliver To section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-700">Deliver To / Ship To</p>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input type="checkbox" checked={sameAsDeliverTo} onChange={(e) => {
                    setSameAsDeliverTo(e.target.checked);
                    const entity = mode === "client" ? form.client : form.vendor;
                    if (e.target.checked) set("deliverTo", { ...entity });
                  }} className="rounded border-slate-300" />
                  Same as {mode === "client" ? "client" : "vendor"}
                </label>
              </div>
              {!sameAsDeliverTo && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input type="text" value={form.deliverTo?.name || ""} onChange={(e) => set("deliverTo.name", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">GSTIN</label><input type="text" value={form.deliverTo?.GSTIN || ""} onChange={(e) => set("deliverTo.GSTIN", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                  <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Address</label><input type="text" value={form.deliverTo?.address || ""} onChange={(e) => set("deliverTo.address", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                  <div><label className="block text-xs font-medium text-slate-600 mb-1">State Code</label><input type="text" value={form.deliverTo?.stateCode || ""} onChange={(e) => set("deliverTo.stateCode", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                </div>
              )}
              {sameAsDeliverTo && <p className="text-sm text-slate-400 bg-slate-50 rounded-lg px-4 py-3">Using {mode === "client" ? "client" : "vendor"} address as delivery address.</p>}
            </div>
          </div>
        )}

        {/* STEP 3: PO Details */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">PO Details</h2>
            <p className="text-sm text-slate-500 mb-6">Dates, reference, and internal notes.</p>
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">PO Date *</label><input type="date" value={form.poDate} onChange={(e) => set("poDate", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">{form.paymentTerms === "milestone" ? "Project End Date" : "Contract End Date"} *</label><input type="date" value={form.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Reference #</label><input type="text" value={form.poreferencevalue} onChange={(e) => set("poreferencevalue", e.target.value)} placeholder="Client PO ref" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">Internal Notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Any internal notes about this PO..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none resize-none" />
            </div>
          </div>
        )}

        {/* STEP 4: Line Items / Milestones */}
        {step === 4 && (
          <div>
            {form.paymentTerms === "milestone" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Project Milestones</h2>
                <p className="text-sm text-slate-500 mb-4">Define milestones. Invoice raised when you mark each as complete.</p>
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Total Contract Value</p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Total Taxable Value (₹)</label><input type="number" value={form.totalTaxableValue} onChange={(e) => { const v = Number(e.target.value); const gst = Math.round(v * 18) / 100; setForm(prev => ({ ...prev, totalTaxableValue: v, totalCGSTAmount: Math.round((gst / 2) * 100) / 100, totalSGSTAmount: Math.round((gst / 2) * 100) / 100, totalAmount: Math.round((v + gst) * 100) / 100, valueInWords: numberToWords(Math.round((v + gst) * 100) / 100) })); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">GST (18%)</label><input type="text" readOnly value={`₹ ${(Math.round(form.totalTaxableValue * 18) / 100).toFixed(2)}`} className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-500" /></div>
                    <div><label className="block text-xs font-medium text-slate-600 mb-1">Total with GST (₹)</label><input type="text" readOnly value={`₹ ${form.totalAmount?.toFixed(2) || "0.00"}`} className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 font-medium text-slate-700" /></div>
                  </div>
                </div>
                <div className="space-y-3">
                  {form.milestones.map((m, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 grid sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2"><label className="block text-xs text-slate-500 mb-1">Milestone Title *</label><input type="text" placeholder="Milestone title" value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                          <div><label className="block text-xs text-slate-500 mb-1">% of Total</label><div className="flex items-center gap-1"><input type="number" placeholder="%" min="0" max="100" value={m.percentage} onChange={(e) => updateMilestone(i, "percentage", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /><span className="text-slate-400 text-sm">%</span></div></div>
                          <div className="flex items-end gap-2"><div className="flex-1"><label className="block text-xs text-slate-500 mb-1">Amount (₹)</label><input type="number" placeholder="Amount ₹" min="0" value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div><button onClick={() => removeMilestone(i)} className="text-slate-400 hover:text-red-500 transition pb-2"><Trash2 size={15} /></button></div>
                          <div className="sm:col-span-2"><label className="block text-xs text-slate-500 mb-1">Description (optional)</label><input type="text" placeholder="Description" value={m.description} onChange={(e) => updateMilestone(i, "description", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                          <div><label className="block text-xs text-slate-500 mb-1">Due Date</label><input type="date" value={m.dueDate} onChange={(e) => updateMilestone(i, "dueDate", e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addMilestone} className={`w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 transition flex items-center justify-center gap-2 ${colors.dashed}`}><Plus size={15} /> Add Milestone</button>
                  {form.milestones.length > 0 && <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between text-sm"><span className="text-blue-600">Total milestone allocation:</span><span className="font-medium text-blue-700">{form.milestones.reduce((s, m) => s + Number(m.percentage || 0), 0).toFixed(1)}% (₹{form.milestones.reduce((s, m) => s + Number(m.amount || 0), 0).toLocaleString()})</span></div>}
                </div>
              </>
            )}

            {(form.paymentTerms === "monthly" || form.paymentTerms === "hourly") && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">{form.paymentTerms === "monthly" ? "Monthly Line Items" : "Hourly Line Items"}</h2>
                <p className="text-sm text-slate-500 mb-4">{form.paymentTerms === "monthly" ? "Define services. Invoices auto-generated monthly." : "Enter rate per hour and total hours."}</p>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                    <div className="col-span-4">Description</div><div className="col-span-1">HSN/SAC</div><div className="col-span-1">{form.paymentTerms === "hourly" ? "Total Hours" : "Quantity"}</div><div className="col-span-2">{form.paymentTerms === "hourly" ? "Rate/Hour (₹)" : "Rate (₹)"}</div><div className="col-span-1">GST %</div><div className="col-span-2">Total (₹)</div><div className="col-span-1"></div>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid sm:grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 items-center">
                      <div className="sm:col-span-4"><input type="text" placeholder="Service description" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-1 relative z-50"><select value={item.hsnId || ""} onChange={(e) => { const id = e.target.value; if (!id) { updateItem(i, "hsnId", null); updateItem(i, "hsnSac", ""); updateItem(i, "gstRate", 18); return; } const hsn = hsnList.find(h => h._id === id); if (hsn) { updateItem(i, "hsnId", id); updateItem(i, "hsnSac", hsn.hsnCode); if (!item.description.trim()) updateItem(i, "description", hsn.serviceType); updateItem(i, "gstRate", getTotalGstRate(hsn)); } }} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none"><option value="">HSN</option>{hsnList.map(hsn => <option key={hsn._id} value={hsn._id}>{hsn.hsnCode} – {hsn.serviceType}</option>)}</select></div>
                      <div className="sm:col-span-1"><input type="number" min="0" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-2"><input type="number" min="0" value={item.rate} onChange={(e) => updateItem(i, "rate", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-1"><input type="number" min="0" max="28" value={item.gstRate} onChange={(e) => updateItem(i, "gstRate", e.target.value)} className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 outline-none" /></div>
                      <div className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">₹ {item.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                      <div className="sm:col-span-1 flex justify-end">{form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={15} /></button>}</div>
                    </div>
                  ))}
                  <div className="px-4 py-3 border-b border-slate-100"><button onClick={addItem} className={`flex items-center gap-1.5 text-sm text-slate-400 transition ${colors.dashed.replace("hover:border-", "hover:text-").split(" ")[1]}`}><Plus size={14} /> Add Line Item</button></div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Subtotal (taxable)</span><span>₹ {form.totalTaxableValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-slate-600"><span>CGST</span><span>₹ {form.totalCGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-slate-600"><span>SGST</span><span>₹ {form.totalSGSTAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-200"><span>Total</span><span>₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 5: Distribution & Breakdown */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Invoice Distribution</h2>
            <p className="text-sm text-slate-500 mb-6">Review how the total amount will be split across invoices.</p>

            {form.paymentTerms === "monthly" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-800">Monthly Invoice Schedule</h3>
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  Based on PO Date ({dayjs(form.poDate).format("DD MMM YYYY")}) and End Date ({dayjs(form.deliveryDate).format("DD MMM YYYY")}),
                  a total of <strong>{distributionBreakdown.length}</strong> monthly invoices will be generated.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr><th className="px-4 py-2 text-left">Period</th><th className="px-4 py-2 text-right">Amount (₹)</th></tr>
                    </thead>
                    <tbody>
                      {distributionBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-t"><td className="px-4 py-2">{item.period}</td><td className="px-4 py-2 text-right font-medium">₹ {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-right text-sm font-semibold">Total: ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              </div>
            )}

            {form.paymentTerms === "hourly" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-800">Invoice Frequency</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {HOURLY_DISTRIBUTION_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setHourlyDistribution(opt.key)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${hourlyDistribution === opt.key ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}` : "bg-white border-slate-200"}`}
                      >
                        <opt.icon size={20} className={hourlyDistribution === opt.key ? colors.text : "text-slate-400"} />
                        <p className={`font-semibold mt-2 ${hourlyDistribution === opt.key ? colors.text : "text-slate-700"}`}>{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {distributionBreakdown.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Receipt className="h-5 w-5 text-green-500" />
                      <h3 className="font-semibold text-slate-800">{hourlyDistribution === "weekly" ? "Weekly" : "Monthly"} Invoice Schedule</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      Based on PO Date ({dayjs(form.poDate).format("DD MMM YYYY")}) and End Date ({dayjs(form.deliveryDate).format("DD MMM YYYY")}),
                      a total of <strong>{distributionBreakdown.length}</strong> {hourlyDistribution === "weekly" ? "weekly" : "monthly"} invoices will be generated.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr><th className="px-4 py-2 text-left">Period</th><th className="px-4 py-2 text-right">Amount (₹)</th></tr>
                        </thead>
                        <tbody>
                          {distributionBreakdown.map((item, idx) => (
                            <tr key={idx} className="border-t"><td className="px-4 py-2">{item.period}</td><td className="px-4 py-2 text-right font-medium">₹ {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 text-right text-sm font-semibold">Total: ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
              </div>
            )}

            {form.paymentTerms === "milestone" && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold text-slate-800">Milestone Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr><th className="px-4 py-2 text-left">Milestone</th><th className="px-4 py-2 text-right">%</th><th className="px-4 py-2 text-right">Amount (₹)</th><th className="px-4 py-2 text-left">Due Date</th></tr>
                    </thead>
                    <tbody>
                      {distributionBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-t"><td className="px-4 py-2">{item.period}</td><td className="px-4 py-2 text-right">{item.percentage}%</td><td className="px-4 py-2 text-right font-medium">₹ {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td><td className="px-4 py-2">{item.dueDate ? dayjs(item.dueDate).format("DD MMM YYYY") : "-"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-right text-sm font-semibold">Total: ₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              </div>
            )}

            {!form.paymentTerms && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center text-amber-700 text-sm">
                Please complete previous steps first.
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Review */}
        {step === 6 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Review & Submit</h2>
            <p className="text-sm text-slate-500 mb-6">Check everything before creating the PO.</p>
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div><p className="text-xs text-slate-400 mb-1">PO Direction</p><p className="text-sm font-medium text-slate-700 capitalize">{form.direction}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Payment Terms</p><p className="text-sm font-medium text-slate-700">{PAYMENT_TERMS_OPTIONS.find(t => t.key === form.paymentTerms)?.label || "—"}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">{mode === "client" ? "Client" : "Vendor"}</p><p className="text-sm font-medium text-slate-700">{mode === "client" ? form.client?.name : form.vendor?.name}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">PO Date</p><p className="text-sm font-medium text-slate-700">{form.poDate}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Total PO Value</p><p className="text-xl font-bold text-slate-800">₹ {form.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Distribution Schedule</p><p className="text-sm font-medium text-slate-700">
                    {form.paymentTerms === "monthly" && `${distributionBreakdown.length} monthly invoices`}
                    {form.paymentTerms === "hourly" && `${distributionBreakdown.length} ${hourlyDistribution} invoices`}
                    {form.paymentTerms === "milestone" && `${form.milestones.length} milestone(s)`}
                  </p></div>
                </div>
              </div>
              {form.valueInWords && <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3"><p className="text-xs text-slate-400 mb-1">Amount in Words</p><p className="text-sm text-slate-600 italic">{form.valueInWords}</p></div>}
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.withSignature} onChange={(e) => set("withSignature", e.target.checked)} className="rounded border-slate-300 text-blue-500" /><span className="text-sm text-slate-600">Include digital signature in document</span></label>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <button onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))} className="px-5 py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition flex items-center gap-2"><ArrowLeft size={15} /> Back</button>
          {step < 6 ? (
            <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()} className={`px-6 py-2.5 text-sm font-medium rounded-xl transition flex items-center gap-2 ${canProceed() ? `${colors.bg} ${colors.text} hover:opacity-90` : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>Continue <ChevronRight size={15} /></button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-60">{loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{isEditing ? "Update PO" : "Create PO"}</button>
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