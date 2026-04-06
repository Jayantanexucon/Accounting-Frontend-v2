import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../apis/api";
import { useAuth } from "../contexts/AuthContext";
import { getClientsApi } from "../apis/clientApi";
import { getallhsn } from "../apis/hsnapi";
import { getPOProgressApi } from "../apis/purchaseOrderApi";

import InvoiceCreatedModal from "../modals/InvoiceCreatedModal";
import { toast } from "react-toastify";

// Lucide Icons
import { Home, Plus, Trash2, Receipt, Download, Building, User, CreditCard, Banknote, Search, FileText, Package, Check, Loader2, ChevronDown, X, ChevronUp, ShoppingBag } from "lucide-react";
import { getCompanyByIdApi } from "../apis/userApi";

const getRemainingPOItemQuantity = (item = {}) => {
  if (item.remainingQuantity !== undefined && item.remainingQuantity !== null) {
    return Math.max(0, Number(item.remainingQuantity || 0));
  }

  return Math.max(
    0,
    Number(item.quantity || 0) - Number(item.invoicedQuantity || 0),
  );
};

const hasInvoiceablePOItems = (po = {}) =>
  (po.items || []).some((item) => getRemainingPOItemQuantity(item) > 0);

const roundMoney = (value = 0) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const poHasTaxData = (po) =>
  ((po && po.items) || []).some(
    (item) =>
      item?.hsnSac ||
      item?.hsnCode ||
      Number(item?.gstRate || 0) > 0 ||
      Number(item?.gstAmount || 0) > 0,
  );

const PAYMENT_TERM_DAYS = {
  "net-15": 15,
  "net-30": 30,
  "net-45": 45,
  "net-60": 60,
  "net-90": 90,
};

const getPaymentTermDays = (paymentTerms = "") => PAYMENT_TERM_DAYS[paymentTerms] || 0;

const addDaysToDateString = (dateLike, daysToAdd = 0) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
};

const getDateDiffInDays = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(0, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
};

const buildPaymentTermSchedule = (po = {}) => {
  const termDays = getPaymentTermDays(po.paymentTerms);
  const scheduleStart = po.referenceDate || po.poDate;
  const scheduleEnd = po.deliveryDate;

  if (!termDays || !scheduleStart || !scheduleEnd) {
    return {
      termDays: 0,
      totalInstallments: 1,
      currentInstallmentNo: 1,
      currentWindowStart: po.poDate ? new Date(po.poDate).toISOString().split("T")[0] : "",
      currentWindowEnd: po.deliveryDate ? new Date(po.deliveryDate).toISOString().split("T")[0] : "",
      label: "",
    };
  }

  const totalDurationDays = Math.max(1, getDateDiffInDays(scheduleStart, scheduleEnd));
  const totalInstallments = Math.max(1, Math.ceil(totalDurationDays / termDays));
  const currentInstallmentNo = Math.min(
    totalInstallments,
    Math.max(1, (po.linkedInvoices || []).length + 1),
  );
  const currentWindowStart = addDaysToDateString(
    scheduleStart,
    (currentInstallmentNo - 1) * termDays,
  );
  const currentWindowEnd = addDaysToDateString(
    scheduleStart,
    Math.min(currentInstallmentNo * termDays, totalDurationDays),
  );

  return {
    termDays,
    totalInstallments,
    currentInstallmentNo,
    currentWindowStart,
    currentWindowEnd,
    label: `${termDays}-day terms · Invoice ${currentInstallmentNo} of ${totalInstallments}`,
  };
};

const calculateScheduledInvoiceParts = ({
  totalAmount = 0,
  alreadyInvoicedAmount = 0,
  totalInstallments = 1,
  currentInstallmentNo = 1,
}) => {
  const normalizedTotal = Number(totalAmount || 0);
  const normalizedUsed = Number(alreadyInvoicedAmount || 0);
  const installmentAmount =
    totalInstallments > 0 ? normalizedTotal / totalInstallments : normalizedTotal;
  const scheduledTillPrevious = Math.min(
    normalizedTotal,
    installmentAmount * Math.max(0, currentInstallmentNo - 1),
  );
  const scheduledTillCurrent = Math.min(
    normalizedTotal,
    installmentAmount * Math.max(1, currentInstallmentNo),
  );
  const previousCarryForward = roundMoney(
    Math.max(0, scheduledTillPrevious - normalizedUsed),
  );
  const currentTermAmount = roundMoney(
    Math.max(0, scheduledTillCurrent - Math.max(normalizedUsed, scheduledTillPrevious)),
  );
  const recommendedInvoiceAmount = roundMoney(
    Math.max(0, scheduledTillCurrent - normalizedUsed),
  );
  const remainingAfterInvoice = roundMoney(
    Math.max(0, normalizedTotal - normalizedUsed - recommendedInvoiceAmount),
  );

  return {
    installmentAmount: roundMoney(installmentAmount),
    previousCarryForward,
    currentTermAmount,
    recommendedInvoiceAmount,
    remainingAfterInvoice,
  };
};

const getDerivedInvoicePoType = ({ poType, poCategory, billingModel }) => {
  if (poType) return poType;
  if (billingModel === "milestone") return "milestone";
  if (poCategory === "retainer") return "contract";
  return "general";
};

const normalizeInvoiceItemForPayload = (item = {}) => {
  const {
    combinedGstRate,
    totalManuallyEdited,
    baseQuantity,
    baseRate,
    poRemainingQuantity,
    sourceType,
    sourceId,
    billingUnit,
    resourceName,
    resourceRole,
    milestoneTitle,
    milestoneDescription,
    milestoneDueDate,
    periodLabel,
    ...rest
  } = item;

  return {
    ...rest,
    itemId: rest.itemId || rest.poItemId,
    poItemId: rest.poItemId || rest.itemId,
  };
};

const buildTypedInvoicePayload = ({
  invoice,
  selectedPOInfo,
  selectedPOData,
  milestoneRows,
  resourceRows,
  retainerRow,
  valueInWords,
  convertToWords,
}) => {
  const poItems = selectedPOData?.items || [];
  const getPoItemKey = (poItem = {}) => poItem.itemId || poItem._id?.toString() || "";
  const findMatchingPoItem = (matcher) => poItems.find(matcher);

  const isMilestoneSection =
    selectedPOInfo?.billingModel === "milestone" && milestoneRows.length > 0;
  const isResourceSection =
    (selectedPOInfo?.poCategory === "staffing" ||
      (selectedPOInfo?.poCategory === "project" &&
        selectedPOInfo?.billingModel === "headcount")) &&
    resourceRows.length > 0;
  const isRetainerSection =
    selectedPOInfo?.poCategory === "retainer" && retainerRow != null;

  const items = invoice.items.map(normalizeInvoiceItemForPayload);

  const payload = {
    ...invoice,
    linkedPO: invoice.linkedPO,
    linkedPORef: invoice.linkedPORef,
    currency: invoice.currency || "INR",
    poType: invoice.poType || "general",
    poCategory: selectedPOInfo?.poCategory,
    billingModel: selectedPOInfo?.billingModel,
    contractWorklog:
      invoice.poType === "contract"
        ? {
            paymentSchedule: invoice.contractPaymentSchedule || "monthly",
            daysWorked: Number(invoice.contractDaysWorked || 0),
            periodWorkingDays: Number(invoice.contractPeriodWorkingDays || 0),
          }
        : undefined,
    billTo: {
      name: invoice.billTo.name,
      address: invoice.billTo.address,
      city: invoice.billTo.city,
      state: invoice.billTo.state,
      stateCode: invoice.billTo.stateCode,
      country: invoice.billTo.country,
      pinCode: invoice.billTo.pinCode,
      taxIdentifierType: invoice.billTo.taxIdentifierType,
      taxIdentifierNumber: invoice.billTo.taxIdentifierNumber,
    },
    shipTo: {
      name: invoice.shipTo.name,
      address: invoice.shipTo.address,
      city: invoice.shipTo.city,
      state: invoice.shipTo.state,
      stateCode: invoice.shipTo.stateCode,
      country: invoice.shipTo.country,
      pinCode: invoice.shipTo.pinCode,
      taxIdentifierType: invoice.shipTo.taxIdentifierType,
      taxIdentifierNumber: invoice.shipTo.taxIdentifierNumber,
    },
    valueInWords: valueInWords || convertToWords(invoice.amountDue),
    items,
    milestones: [],
    resources: [],
    retainerDetails: null,
  };

  if (isMilestoneSection) {
    const selectedMilestones = milestoneRows
      .filter((row) => row.selected)
      .map((row) => ({
        milestoneId: row._id,
        title: row.title,
        description: row.description,
        dueDate: row.dueDate || null,
        percentage: Number(row.percentage || 0),
        originalPercentage: Number(row.originalPercentage || 0),
        originalAmount: Number(row.originalAmount || 0),
        alreadyInvoicedAmount: Number(row.alreadyInvoicedAmount || 0),
        remainingAmountBefore: Number(row.remainingAmountBefore || 0),
        remainingAmountAfter: Number(row.remainingAmountAfter || 0),
        amount: Number(row.amount || 0),
        invoicedAmount: Number(row.amount || 0),
        hsnSac: row.hsnSac || "",
        gstRate: Number(row.gstRate || 0),
        gstAmount: Number(row.gstAmount || 0),
        total: Number(row.total || 0),
      }));

    payload.milestones = selectedMilestones;
    payload.items = selectedMilestones.map((row) => ({
      itemId:
        getPoItemKey(
          findMatchingPoItem(
            (poItem) =>
              getPoItemKey(poItem) === row.milestoneId ||
              poItem.description?.trim() === row.title?.trim() ||
              roundMoney(poItem.totalAmount || poItem.total || 0) === roundMoney(row.total),
          ),
        ) || row.milestoneId,
      poItemId:
        getPoItemKey(
          findMatchingPoItem(
            (poItem) =>
              getPoItemKey(poItem) === row.milestoneId ||
              poItem.description?.trim() === row.title?.trim() ||
              roundMoney(poItem.totalAmount || poItem.total || 0) === roundMoney(row.total),
          ),
        ) || row.milestoneId,
      description: row.title,
      hsnSac: row.hsnSac,
      quantity: 1,
      rate: row.amount,
      taxableValue: row.amount,
      gstRate: row.gstRate,
      gstAmount: row.gstAmount,
      total: row.total,
      sourceType: "milestone",
      sourceId: row.milestoneId,
      milestoneTitle: row.title,
      milestoneDescription: row.description,
      milestoneDueDate: row.dueDate,
      originalAmount: row.originalAmount,
      remainingAmountBefore: row.remainingAmountBefore,
      remainingAmountAfter: row.remainingAmountAfter,
    }));
  } else if (isResourceSection) {
    const resources = resourceRows.map((row) => ({
      resourceId: row._id,
      name: row.name,
      role: row.role,
      employeeId: row.employeeId || "",
      billingUnit: row.billingUnit,
      quantity: Number(row.quantity || 0),
      rate: Number(row.rate || 0),
      taxableValue: Number(row.taxableValue || 0),
      hsnSac: row.hsnSac || "",
      gstRate: Number(row.gstRate || 0),
      gstAmount: Number(row.gstAmount || 0),
      total: Number(row.total || 0),
    }));

    payload.resources = resources;
    payload.items = resources.map((row) => ({
      itemId:
        getPoItemKey(
          findMatchingPoItem(
            (poItem) =>
              getPoItemKey(poItem) === row.resourceId ||
              poItem.description?.includes(row.name) ||
              (row.role && poItem.description?.includes(row.role)) ||
              roundMoney(poItem.rate || 0) === roundMoney(row.rate),
          ),
        ) || row.resourceId,
      poItemId:
        getPoItemKey(
          findMatchingPoItem(
            (poItem) =>
              getPoItemKey(poItem) === row.resourceId ||
              poItem.description?.includes(row.name) ||
              (row.role && poItem.description?.includes(row.role)) ||
              roundMoney(poItem.rate || 0) === roundMoney(row.rate),
          ),
        ) || row.resourceId,
      description: `${row.name}${row.role ? ` – ${row.role}` : ""} (${row.billingUnit})`,
      hsnSac: row.hsnSac,
      quantity: row.quantity,
      rate: row.rate,
      taxableValue: row.taxableValue,
      gstRate: row.gstRate,
      gstAmount: row.gstAmount,
      total: row.total,
      sourceType: "resource",
      sourceId: row.resourceId,
      billingUnit: row.billingUnit,
      resourceName: row.name,
      resourceRole: row.role,
    }));
  } else if (isRetainerSection) {
    const details = {
      description: retainerRow.description,
      periodLabel: retainerRow.periodLabel,
      amount: Number(retainerRow.amount || 0),
      hsnSac: retainerRow.hsnSac || "",
      gstRate: Number(retainerRow.gstRate || 0),
      gstAmount: Number(retainerRow.gstAmount || 0),
      total: Number(retainerRow.total || 0),
    };

    payload.retainerDetails = details;
    const matchingRetainerItem =
      findMatchingPoItem((poItem) => getRemainingPOItemQuantity(poItem) > 0) ||
      poItems[0];
    payload.items = [
      {
        itemId: getPoItemKey(matchingRetainerItem) || "retainer",
        poItemId: getPoItemKey(matchingRetainerItem) || "retainer",
        description: details.description,
        hsnSac: details.hsnSac,
        quantity: 1,
        rate: details.amount,
        taxableValue: details.amount,
        gstRate: details.gstRate,
        gstAmount: details.gstAmount,
        total: details.total,
        sourceType: "retainer",
        periodLabel: details.periodLabel,
      },
    ];
  }

  return payload;
};

const applyContractProrationForItems = ({
  items = [],
  poType,
  paymentSchedule,
  daysWorked,
  periodWorkingDays,
}) => {
  if (poType !== "contract" || !items.length) {
    return items;
  }

  const parsedDaysWorked = Number(daysWorked || 0);
  if (!Number.isFinite(parsedDaysWorked) || parsedDaysWorked <= 0) {
    return items;
  }

  return items.map((item) => {
    const quantity = Number((item.baseQuantity ?? item.quantity) || 0);
    const rate = Number((item.baseRate ?? item.rate) || 0);
    if (quantity <= 0 || rate < 0) return item;

    let adjustedQuantity = quantity;
    let adjustedTaxable = roundMoney(quantity * rate);

    if (paymentSchedule === "daily") {
      const maxFromPo = Number(item.poRemainingQuantity || 0);
      adjustedQuantity =
        maxFromPo > 0
          ? Math.min(parsedDaysWorked, maxFromPo)
          : parsedDaysWorked;
      adjustedTaxable = roundMoney(adjustedQuantity * rate);
    } else {
      const parsedPeriodDays = Number(periodWorkingDays || 0);
      if (Number.isFinite(parsedPeriodDays) && parsedPeriodDays > 0) {
        adjustedTaxable = roundMoney((quantity * rate) * (parsedDaysWorked / parsedPeriodDays));
      }
    }

    const gstRate = Number(item.gstRate || 0);
    const adjustedGst = roundMoney((adjustedTaxable * gstRate) / 100);
    const adjustedTotal = roundMoney(adjustedTaxable + adjustedGst);

    return {
      ...item,
      quantity: adjustedQuantity,
      taxableValue: adjustedTaxable,
      gstAmount: adjustedGst,
      total: adjustedTotal,
      totalManuallyEdited: false,
    };
  });
};

const ManualInvoicePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editInvoiceId = searchParams.get("edit");
  const editPendingId = searchParams.get("editPending");
  const selectedPoId = searchParams.get("poId");
  const editableInvoiceId = editInvoiceId || editPendingId;
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [hsnList, setHsnList] = useState([]);
  const [loadingHsn, setLoadingHsn] = useState(false);
  const poIdFromUrl = searchParams.get("poId");
  const [isFromPO, setIsFromPO] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isEditPendingMode, setIsEditPendingMode] = useState(false);
const [pendingVersionNo, setPendingVersionNo] = useState(null);
const [autoSelectedPoId, setAutoSelectedPoId] = useState(null);
// Track selected PO type metadata for rendering the correct input section
const [selectedPOInfo, setSelectedPOInfo] = useState(null); // { poCategory, billingModel, poNumber }
const [selectedPOData, setSelectedPOData] = useState(null);
// Milestone-based PO: rows the user fills in
const [milestoneRows, setMilestoneRows] = useState([]); // [{ _id, title, description, dueDate, percentage, amount, gstRate, hsnSac, status }]
// Staffing / headcount PO: rows the user fills in
const [resourceRows, setResourceRows] = useState([]);  // [{ _id, name, role, billingUnit, rate, quantity, hsnSac, gstRate }]
// Retainer PO: single row
const [retainerRow, setRetainerRow] = useState(null);  // { description, periodLabel, amount, hsnSac, gstRate }
    // Add state for company details
const [companyDetails, setCompanyDetails] = useState({
  companyName: "",
  address: "",
  gstNumber: "",
  panNumber: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
});
    const [loadingCompany, setLoadingCompany] = useState(false);

  const [invoice, setInvoice] = useState({
    invoiceNo: "Auto-generated on save",
    linkedPO: "",
    linkedPORef: "",
    poreferencevalue: "",
    poType: "general",
    contractPaymentSchedule: "",
    contractDaysWorked: "",
    contractPeriodWorkingDays: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    paymentDueDate: "",
    referenceDate: new Date().toISOString().split("T")[0],
    currency: "INR",
    amountDue: 0,
    paymentMode: "Bank-Transfer",
    companyId: user?.company?._id || "",
    billTo: {
      name: "",
      address: "",
      city: "",
      state: "",
      stateCode: "",
      country: "",
      pinCode: "",
      taxIdentifierType: "",
      taxIdentifierNumber: "",
    },
    shipTo: {
      name: "",
      address: "",
      city: "",
      state: "",
      stateCode: "",
      country: "",
      pinCode: "",
      taxIdentifierType: "",
      taxIdentifierNumber: "",
    },
    items: [
      {
        description: "",
        hsnSac: "",
        quantity: 1,
        rate: 0,
        taxableValue: 0,
        gstRate: 0,
        gstAmount: 0,
        total: 0,
        combinedGstRate: 0,
        totalManuallyEdited: false,
      },
    ],
    totalTaxableValue: 0,
    totalCGSTAmount: 0,
    totalSGSTAmount: 0,
    totalIGSTAmount: 0,
    tdsAmount: 0,
    withSignature: false,
    netPayable: 0,
  });

  const [sameAsBillTo, setSameAsBillTo] = useState(false);
  const [valueInWords, setValueInWords] = useState("");
  const [manualAmountEdit, setManualAmountEdit] = useState(false);
  const [manualTdsEdit, setManualTdsEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [existingDescriptions, setExistingDescriptions] = useState([]);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [billToDropdownOpen, setBillToDropdownOpen] = useState(false);
  const [shipToDropdownOpen, setShipToDropdownOpen] = useState(false);
  const [billToSearch, setBillToSearch] = useState("");
  const [shipToSearch, setShipToSearch] = useState("");
  const [filteredBillToClients, setFilteredBillToClients] = useState([]);
  const [filteredShipToClients, setFilteredShipToClients] = useState([]);
  const [editingBillTo, setEditingBillTo] = useState(false);
  const [editingShipTo, setEditingShipTo] = useState(false);

  // New states for PO dropdown
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [poDropdownOpen, setPoDropdownOpen] = useState(false);
  const [poSearch, setPoSearch] = useState("");
  const [filteredPOs, setFilteredPOs] = useState([]);

        // Get company ID from localStorage or user context
        const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany"));
        const companyId = selectedCompany?._id || user?.company?._id;

    // Fetch company details from API
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        setLoadingCompany(true);


        if (!companyId) {
          console.error("No company ID found");
          // Use fallback values if no company ID
          setCompanyDetails({
            companyName: "Nexucon Consultancy Services Pvt Ltd",
            address: "Methopara, 60/N/3, Madhyamgram, North Twenty Four Parganas, West Bengal, 700132",
            gstNumber: "19AAICN7264L1ZR",
            panNumber: "AAICN7264L",
            bankName: "ICICI Bank",
            accountName: "NEXUCON CONSULTANCY SERVICES PRIVATE",
            accountNumber: "128005500629",
            ifscCode: "ICIC0001280",
            branch: "Baranagar",
          });
          return;
        }

        const response = await getCompanyByIdApi(companyId);
        const companyData = response.data || {};

        // Format address from registeredAddress object
        const formatAddress = (addressObj) => {
          if (!addressObj) return "";
          const parts = [];
          if (addressObj.line1) parts.push(addressObj.line1);
          if (addressObj.city) parts.push(addressObj.city);
          if (addressObj.state) parts.push(addressObj.state);
          if (addressObj.country) parts.push(addressObj.country);
          if (addressObj.pincode) parts.push(addressObj.pincode);
          return parts.join(", ");
        };

        // Update company details state with API data
        setCompanyDetails({
          companyName: companyData.tradeName || companyData.name || "Nexucon Consultancy Services Pvt Ltd",
          address: formatAddress(companyData.registeredAddress) || "Methopara, 60/N/3, Madhyamgram, North Twenty Four Parganas, West Bengal, 700132",
          gstNumber: companyData.taxDetails?.gstNumber || "19AAICN7264L1ZR", // Note: API doesn't show gstNumber in taxDetails
          panNumber: companyData.taxDetails?.pan || "AAICN7264L",
          bankName: companyData.bankDetails?.bankName || "ICICI Bank",
          accountName: companyData.bankDetails?.accountHolderName || "NEXUCON CONSULTANCY SERVICES PRIVATE",
          accountNumber: companyData.bankDetails?.accountNumber || "128005500629",
          ifscCode: companyData.bankDetails?.ifsc || "ICIC0001280",
          branch: companyData.branchName || "Baranagar",
        });
      } catch (error) {
        console.error("Error fetching company details:", error);
      } finally {
        setLoadingCompany(false);
      }
    };

    fetchCompanyDetails();
  }, [user?.company?._id]);
  

  // Fetch invoice for editing
useEffect(() => {
  const invoiceId = editableInvoiceId;
  if (!invoiceId) return;

  const applyInvoiceDataToForm = (dataToLoad, loadedInvoiceId, loadedPendingVersionNo = null) => {
    const safeDate = (d) => (d && !isNaN(new Date(d)) ? new Date(d).toISOString().split("T")[0] : "");

	    setInvoice((prev) => ({
	      ...prev,
	      ...dataToLoad,
	      poType: dataToLoad.poType || "general",
	      contractPaymentSchedule:
	        dataToLoad.contractWorklog?.paymentSchedule || "",
	      contractDaysWorked: dataToLoad.contractWorklog?.daysWorked ?? "",
	      contractPeriodWorkingDays:
	        dataToLoad.contractWorklog?.periodWorkingDays ?? "",
	      linkedPO:
	        dataToLoad.linkedPO?._id ||
	        dataToLoad.linkedPO ||
	        dataToLoad.purchaseOrderId ||
	        dataToLoad.poId ||
	        prev.linkedPO,
	      linkedPORef:
	        dataToLoad.linkedPORef ||
	        dataToLoad.linkedPO?.poNumber ||
	        prev.linkedPORef,
	      invoiceDate: safeDate(dataToLoad.invoiceDate),
      dueDate: safeDate(dataToLoad.dueDate),
      paymentDueDate: safeDate(dataToLoad.paymentDueDate),
      referenceDate: safeDate(dataToLoad.referenceDate),
      items: dataToLoad.items.map((item) => ({
        ...item,
        hsnSac: item.hsnSac || item.hsnCode || "",
        baseQuantity: item.baseQuantity ?? item.quantity,
        baseRate: item.baseRate ?? item.rate,
        combinedGstRate: item.gstRate || 0,
        totalManuallyEdited: Boolean(item.totalManuallyEdited),
      })),
      billTo: {
        name: dataToLoad.billTo?.name || "",
        address: dataToLoad.billTo?.address || "",
        city: dataToLoad.billTo?.city || "",
        state: dataToLoad.billTo?.state || "",
        stateCode: dataToLoad.billTo?.stateCode || "",
        country: dataToLoad.billTo?.country || "",
        pinCode: dataToLoad.billTo?.pinCode || "",
        taxIdentifierType: dataToLoad.billTo?.taxIdentifierType || "",
        taxIdentifierNumber: dataToLoad.billTo?.taxIdentifierNumber || dataToLoad.billTo?.GSTIN || "",
      },
      shipTo: {
        name: dataToLoad.shipTo?.name || "",
        address: dataToLoad.shipTo?.address || "",
        city: dataToLoad.shipTo?.city || "",
        state: dataToLoad.shipTo?.state || "",
        stateCode: dataToLoad.shipTo?.stateCode || "",
        country: dataToLoad.shipTo?.country || "",
        pinCode: dataToLoad.shipTo?.pinCode || "",
        taxIdentifierType: dataToLoad.shipTo?.taxIdentifierType || "",
        taxIdentifierNumber: dataToLoad.shipTo?.taxIdentifierNumber || dataToLoad.shipTo?.GSTIN || "",
      },
    }));

    setValueInWords(dataToLoad.valueInWords || "");
    setCreatedInvoiceId(loadedInvoiceId);
    setPendingVersionNo(loadedPendingVersionNo);
    setSameAsBillTo(
      JSON.stringify(dataToLoad.billTo) === JSON.stringify(dataToLoad.shipTo),
    );
  };

  const fetchInvoiceForEdit = async () => {
    setLoadingInvoice(true);
    if (editInvoiceId) {
      setIsEditMode(true);
      setIsEditPendingMode(false);
    } else if (editPendingId) {
      setIsEditMode(false);
      setIsEditPendingMode(true);
    }

    try {
      if (editPendingId && location.state?.pendingVersion?.snapshot) {
        applyInvoiceDataToForm(
          location.state.pendingVersion.snapshot,
          invoiceId,
          location.state.pendingVersion.versionNo || null,
        );
        return;
      }

      const response = await API.get(`/invoices/get/${invoiceId}`);
      const invoiceData = response.data?.data;

      if (!invoiceData || Array.isArray(invoiceData)) {
        throw new Error("Invalid invoice data for edit");
      }

      let dataToLoad = invoiceData;
      if (editPendingId) {
        // For pending edit, use the snapshot from pendingVersion
        if (!invoiceData.pendingVersion) {
          toast.error("No pending version found for this invoice");
          navigate("/invoice-data");
          return;
        }
        dataToLoad = invoiceData.pendingVersion.snapshot;
      }
      applyInvoiceDataToForm(
        dataToLoad,
        invoiceId,
        invoiceData.pendingVersion?.versionNo || null,
      );
    } catch (error) {
      console.error("Error fetching invoice for edit:", error);
      setError("Failed to load invoice for editing");
    } finally {
      setLoadingInvoice(false);
    }
  };

  fetchInvoiceForEdit();
}, [editableInvoiceId, editPendingId, location.state, navigate]);

  // Fetch clients and existing descriptions from API
  useEffect(() => {
    if (!user?.company?._id) return;

    const fetchInitialData = async () => {
      setLoadingClients(true);
      setLoadingDescriptions(true);
      try {
        const clientsResponse = await getClientsApi(user.company._id);
        setClients(clientsResponse.data || []);
        setFilteredBillToClients(clientsResponse.data || []);
        setFilteredShipToClients(clientsResponse.data || []);

        const invoicesResponse = await API.get(`/invoices/getall/${user.company._id}`, { params: { limit: 100 } });

        const descriptions = new Set();

        invoicesResponse.data?.data?.forEach((invoice) => {
          invoice.items?.forEach((item) => {
            if (item.description?.trim()) {
              descriptions.add(item.description.trim());
            }
          });
        });

        setExistingDescriptions([...descriptions]);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      } finally {
        setLoadingClients(false);
        setLoadingDescriptions(false);
      }
    };

    fetchInitialData();
  }, [user?.company?._id]);

  // Fetch Purchase Orders for dropdown
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      if (!user?.company?._id) return;

      setLoadingPOs(true);
      try {
        const response = await API.get(`/purchase-orders/company/${companyId}`);
        const poList = response.data?.data || [];

        const activePOs = poList.filter(
          (po) =>
            !["CLOSED", "FULLY_INVOICED"].includes(po.status) &&
            Number(po.remainingInvoicableAmount ?? po.totalAmount ?? 0) > 0,
        );
        
        setPurchaseOrders(activePOs);
        setFilteredPOs(activePOs);
      } catch (err) {
        console.error("Error fetching purchase orders:", err);
        setError("Failed to load purchase orders");
      } finally {
        setLoadingPOs(false);
      }
    };

    fetchPurchaseOrders();
  }, [companyId, user?.company?._id]);
  
  // Auto-select PO from URL parameter (if present)
useEffect(() => {
  // Only run if we have a poId in the URL and we haven't already selected it
  if (poIdFromUrl && !autoSelectedPoId) {
    const po = purchaseOrders.find(p => p._id === poIdFromUrl);
    if (po) {
      // PO is already in the list, select it directly
      handleSelectPO(po);
      setAutoSelectedPoId(poIdFromUrl);
    } else {
      // PO not in the list (maybe fully invoiced), fetch it directly
      const fetchAndSelectPO = async () => {
        try {
          const response = await API.get(`/purchase-orders/${poIdFromUrl}`);
          if (response.data.success) {
            handleSelectPO(response.data.data);
            setAutoSelectedPoId(poIdFromUrl);
          } else {
            toast.error("Failed to load purchase order details");
          }
        } catch (err) {
          console.error("Error fetching PO for auto-select:", err);
          toast.error("Failed to load purchase order");
        }
      };
      fetchAndSelectPO();
    }
  }
}, [poIdFromUrl, purchaseOrders, autoSelectedPoId]);
  // Filter POs based on search
  useEffect(() => {
    if (poSearch) {
      const query = poSearch.toLowerCase();
      const filtered = purchaseOrders.filter(
        (po) =>
          po.poNumber?.toLowerCase().includes(query) ||
          po.poreferencevalue?.toLowerCase().includes(query),
      );
      setFilteredPOs(filtered);
    } else {
      setFilteredPOs(purchaseOrders);
    }
  }, [poSearch, purchaseOrders]);

  // Calculate due date based on invoice date (7 days after)
  useEffect(() => {
    if (invoice.invoiceDate && !isEditMode && !selectedPOInfo?.termDays) {
      const invoiceDate = new Date(invoice.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(invoiceDate.getDate() + 7);

      const formattedDueDate = dueDate.toISOString().split("T")[0];
      setInvoice((prev) => ({
        ...prev,
        dueDate: formattedDueDate,
      }));
    }
  }, [invoice.invoiceDate, isEditMode, selectedPOInfo?.termDays]);

  // Filter billTo clients based on search - BUG FIXED
  useEffect(() => {
    const getClientTaxNumber = (c) => c.gstNumber || c.panNumber || c.einNumber || c.vatNumber || c.ssnNumber || c.nationalIdNumber || "";

    if (billToSearch) {
      const filtered = clients.filter(
        (client) => client.clientName?.toLowerCase().includes(billToSearch.toLowerCase()) || getClientTaxNumber(client).toLowerCase().includes(billToSearch.toLowerCase()),
      );
      setFilteredBillToClients(filtered);
    } else {
      setFilteredBillToClients(clients);
    }
  }, [billToSearch, clients]);
  
  useEffect(() => {
  if (!poIdFromUrl) {
    setAutoSelectedPoId(null);
  }
}, [poIdFromUrl]);
  // Filter shipTo clients based on search - BUG FIXED
  useEffect(() => {
    const getClientTaxNumber = (c) => c.gstNumber || c.panNumber || c.einNumber || c.vatNumber || c.ssnNumber || c.nationalIdNumber || "";

    if (shipToSearch) {
      const filtered = clients.filter(
        (client) => client.clientName?.toLowerCase().includes(shipToSearch.toLowerCase()) || getClientTaxNumber(client).toLowerCase().includes(shipToSearch.toLowerCase()),
      );
      setFilteredShipToClients(filtered);
    } else {
      setFilteredShipToClients(clients);
    }
  }, [shipToSearch, clients]);

  const convertToWords = (num) => {
    if (num === 0) return "Zero Only";

    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertTwoDigits = (n) => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    };

    let integerPart = Math.floor(Math.abs(num));
    let result = "";

    // Crores (10,000,000)
    if (integerPart >= 10000000) {
      const crores = Math.floor(integerPart / 10000000);
      result += convertTwoDigits(crores) + " Crore ";
      integerPart %= 10000000;
    }

    // Lakhs (100,000)
    if (integerPart >= 100000) {
      const lakhs = Math.floor(integerPart / 100000);
      result += convertTwoDigits(lakhs) + " Lakh ";
      integerPart %= 100000;
    }

    // Thousands (1,000)
    if (integerPart >= 1000) {
      const thousands = Math.floor(integerPart / 1000);
      result += convertTwoDigits(thousands) + " Thousand ";
      integerPart %= 1000;
    }

    // Hundreds (100)
    if (integerPart >= 100) {
      result += ones[Math.floor(integerPart / 100)] + " Hundred ";
      integerPart %= 100;
    }

    // Remaining two digits
    if (integerPart > 0) {
      result += convertTwoDigits(integerPart) + " ";
    }

    result = result.trim() + " Only";

    if (num < 0) {
      result = "Minus " + result;
    }

    return result;
  };

  useEffect(() => {
    if (!manualAmountEdit) {
      let taxableValue = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      invoice.items.forEach((item) => {
        taxableValue += item.taxableValue || 0;
        const gstAmount = item.gstAmount || 0;

        // Only apply CGST/SGST if both billTo and shipTo state codes are present and equal
        if (invoice.billTo.stateCode && invoice.shipTo.stateCode && invoice.billTo.stateCode === invoice.shipTo.stateCode) {
          cgst += Math.round(gstAmount / 2);
          sgst += Math.round(gstAmount / 2);
        } else {
          igst += Math.round(gstAmount);
        }
      });

      // Round the total amount to nearest whole number
      const totalAmount = Math.round(taxableValue + cgst + sgst + igst);

      let tdsAmount = invoice.tdsAmount || 0;

      if (!manualTdsEdit) {
        tdsAmount = 0;

        invoice.items.forEach((item) => {
          const selectedHsn = hsnList.find((h) => h.hsnCode === item.hsnSac);

          if (selectedHsn?.tdsRate && selectedHsn.tdsRate > 0) {
            tdsAmount += Math.round((item.taxableValue * selectedHsn.tdsRate) / 100);
          }
        });
      }

      const netPayable = totalAmount;

      setInvoice((prev) => ({
        ...prev,
        totalTaxableValue: parseFloat(taxableValue.toFixed(2)),
        amountDue: parseFloat(netPayable.toFixed(2)),
        totalCGSTAmount: parseFloat(cgst.toFixed(2)),
        totalSGSTAmount: parseFloat(sgst.toFixed(2)),
        totalIGSTAmount: parseFloat(igst.toFixed(2)),
        tdsAmount,
        netPayable: parseFloat(netPayable.toFixed(2)),
      }));

      setValueInWords(convertToWords(netPayable));
    }
  }, [invoice.items, invoice.billTo.stateCode, invoice.shipTo.stateCode, manualAmountEdit, manualTdsEdit, hsnList]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prev) => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    setManualAmountEdit(true);
  };

  const handleTdsChange = (value) => {
    setInvoice((prev) => ({
      ...prev,
      tdsAmount: parseFloat(value) || 0,
    }));
    setManualTdsEdit(true);
  };

  const handleBillToChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prev) => ({
      ...prev,
      billTo: { ...prev.billTo, [name]: value },
    }));

    if (sameAsBillTo) {
      setInvoice((prev) => ({
        ...prev,
        shipTo: { ...prev.shipTo, [name]: value },
      }));
    }
  };

  const handleShipToChange = (e) => {
    const { name, value } = e.target;
    setInvoice((prev) => ({
      ...prev,
      shipTo: { ...prev.shipTo, [name]: value },
    }));
  };

  const handleSameAsBillTo = (checked) => {
    setSameAsBillTo(checked);
    if (checked) {
      setInvoice((prev) => ({
        ...prev,
        shipTo: { ...prev.billTo },
      }));
      setEditingShipTo(false);
    } else {
      setInvoice((prev) => ({
        ...prev,
        shipTo: {
          name: "",
          address: "",
          city: "",
          state: "",
          stateCode: "",
          country: "",
          pinCode: "",
          taxIdentifierType: "",
          taxIdentifierNumber: "",
        },
      }));
    }
  };

  const handleAddItem = () => {
    if (isFromPO) return;

    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: "",
          hsnSac: "",
          quantity: 1,
          rate: 0,
          taxableValue: 0,
          gstRate: 0,
          gstAmount: 0,
          total: 0,
          combinedGstRate: 0,
          totalManuallyEdited: false,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (invoice.items.length > 1) {
      setInvoice((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoice.items];
    newItems[index][field] = value;
    const maxAllowedTotal = Number(
      newItems[index].maxAllowedInvoiceAmount ?? newItems[index].total ?? 0,
    );

    if (field === "quantity" && newItems[index].poRemainingQuantity !== undefined) {
      const maxQuantity = Number(newItems[index].poRemainingQuantity || 0);
      const parsedQuantity = parseFloat(value);

      if (!Number.isNaN(parsedQuantity)) {
        newItems[index].quantity = Math.min(parsedQuantity, maxQuantity);
      }
    }

    // 🔹 HSN CHANGE
    if (field === "hsnSac") {
      const selectedHsn = hsnList.find((hsn) => hsn.hsnCode === value);

      // ✅ RESET GST RATE
      newItems[index].gstRate = 0;
      newItems[index].combinedGstRate = 0;

      if (selectedHsn) {
        // GST logic - BUG FIXED: Proper GST rate calculation
        let combinedGstRate = 0;
        if (invoice.billTo.stateCode && invoice.shipTo.stateCode && invoice.billTo.stateCode === invoice.shipTo.stateCode) {
          combinedGstRate = selectedHsn.cgst + selectedHsn.sgst;
        } else {
          combinedGstRate = selectedHsn.igst;
        }

        newItems[index].gstRate = combinedGstRate;
        newItems[index].combinedGstRate = combinedGstRate;
      }
    }

    if (field === "total") {
      const rate = parseFloat(newItems[index].rate) || 0;
      const gstRate = parseFloat(newItems[index].gstRate) || 0;
      const manualTotal = Math.max(
        0,
        Math.min(parseFloat(value) || 0, maxAllowedTotal || parseFloat(value) || 0),
      );
      const taxableValue = parseFloat(
        (
          gstRate > 0
            ? manualTotal / (1 + gstRate / 100)
            : manualTotal
        ).toFixed(2),
      );
      const gstAmount = Math.max(
        0,
        parseFloat((manualTotal - taxableValue).toFixed(2)),
      );
      const quantity = rate > 0 ? parseFloat((taxableValue / rate).toFixed(4)) : 0;

      newItems[index].quantity = quantity;
      newItems[index].taxableValue = taxableValue;
      newItems[index].gstAmount = gstAmount;
      newItems[index].total = manualTotal;
      newItems[index].combinedGstRate = gstRate;
      newItems[index].totalManuallyEdited = true;

      setInvoice((prev) => ({
        ...prev,
        items: newItems,
      }));

      setManualAmountEdit(false);
      return;
    }

    const rate = parseFloat(newItems[index].rate) || 0;
    const gstRate = parseFloat(newItems[index].gstRate) || 0;
    let quantity = parseFloat(newItems[index].quantity) || 0;
    let taxableValue;

    if (field === "taxableValue") {
      taxableValue = Math.max(0, roundMoney(parseFloat(value) || 0));
      quantity = rate > 0 ? parseFloat((taxableValue / rate).toFixed(4)) : quantity;

      if (newItems[index].poRemainingQuantity !== undefined) {
        const maxQuantity = Number(newItems[index].poRemainingQuantity || 0);
        if (quantity > maxQuantity) {
          quantity = maxQuantity;
          taxableValue = roundMoney(quantity * rate);
        }
      }

      newItems[index].quantity = quantity;
    } else {
      taxableValue = roundMoney(quantity * rate);
    }

    let gstAmount = roundMoney((taxableValue * gstRate) / 100);
    let total = roundMoney(taxableValue + gstAmount);

    if (maxAllowedTotal > 0 && total > maxAllowedTotal) {
      total = maxAllowedTotal;
      taxableValue = roundMoney(
        (
          gstRate > 0
            ? total / (1 + gstRate / 100)
            : total
        ),
      );
      gstAmount = Math.max(0, roundMoney(total - taxableValue));
      newItems[index].quantity = rate > 0 ? parseFloat((taxableValue / rate).toFixed(4)) : quantity;
    }

    const currentTermAmount = Number(newItems[index].currentTermAmount || 0);
    const currentTermRemainingAmount = Math.max(
      0,
      roundMoney(currentTermAmount - total),
    );
    const baseRemainingAfterInvoice = Number(
      newItems[index].baseRemainingAfterInvoice ?? newItems[index].remainingAfterInvoice ?? 0,
    );

    newItems[index].taxableValue = taxableValue;
    newItems[index].gstAmount = gstAmount;
    newItems[index].total = total;
    newItems[index].currentTermRemainingAmount = currentTermRemainingAmount;
    newItems[index].remainingAfterInvoice = roundMoney(
      baseRemainingAfterInvoice + currentTermRemainingAmount,
    );
    newItems[index].totalManuallyEdited = false;

    setInvoice((prev) => ({
      ...prev,
      items: newItems,
    }));

    setManualAmountEdit(false);
  };

  const handleClearBillTo = () => {
    setInvoice((prev) => ({
      ...prev,
      billTo: {
        name: "",
        address: "",
        city: "",
        state: "",
        stateCode: "",
        country: "",
        pinCode: "",
        taxIdentifierType: "",
        taxIdentifierNumber: "",
      },
    }));
    setBillToSearch("");
    setEditingBillTo(true);
  };

  const handleSelectBillToClient = (client) => {
    if (!client) return;

    const taxIdentifierNumber = client.gstNumber || client.panNumber || client.einNumber || client.vatNumber || client.ssnNumber || client.nationalIdNumber || "";
    const taxIdentifierType =
      client.taxIdentifierType ||
      (client.gstNumber ? "GST" : client.panNumber ? "PAN" : client.einNumber ? "EIN" : client.vatNumber ? "VAT" : client.ssnNumber ? "SSN" : client.nationalIdNumber ? "National ID" : "");

    const billToData = {
      name: client.clientName || "",
      address: client.clientAddress || "",
      city: client.clientCity || "",
      state: client.clientState || "",
      stateCode: client.stateCode || client.gstStateCode || "",
      country: client.clientCountry || "",
      pinCode: client.pinCode || "",
      taxIdentifierType: taxIdentifierType,
      taxIdentifierNumber: taxIdentifierNumber,
    };

    setInvoice((prev) => ({
      ...prev,
      billTo: billToData,
      shipTo: sameAsBillTo ? billToData : prev.shipTo,
    }));

    setBillToDropdownOpen(false);
    setBillToSearch("");
    setEditingBillTo(false);
  };

  const handleSelectShipToClient = (client) => {
    if (!client || sameAsBillTo) return;

    const taxIdentifierNumber = client.gstNumber || client.panNumber || client.einNumber || client.vatNumber || client.ssnNumber || client.nationalIdNumber || "";
    const taxIdentifierType =
      client.taxIdentifierType ||
      (client.gstNumber ? "GST" : client.panNumber ? "PAN" : client.einNumber ? "EIN" : client.vatNumber ? "VAT" : client.ssnNumber ? "SSN" : client.nationalIdNumber ? "National ID" : "");

    setInvoice((prev) => ({
      ...prev,
      shipTo: {
        name: client.clientName || "",
        address: client.clientAddress || "",
        city: client.clientCity || "",
        state: client.clientState || "",
        stateCode: client.stateCode || client.gstStateCode || "",
        country: client.clientCountry || "",
        pinCode: client.pinCode || "",
        taxIdentifierType: taxIdentifierType,
        taxIdentifierNumber: taxIdentifierNumber,
      },
    }));

    setShipToDropdownOpen(false);
    setShipToSearch("");
    setEditingShipTo(false);
  };

  const handleClearShipTo = () => {
    setInvoice((prev) => ({
      ...prev,
      shipTo: {
        name: "",
        address: "",
        city: "",
        state: "",
        stateCode: "",
        country: "",
        pinCode: "",
        taxIdentifierType: "",
        taxIdentifierNumber: "",
      },
    }));
    setShipToSearch("");
    setEditingShipTo(true);
  };

  const handleEditBillTo = () => {
    setEditingBillTo(true);
    setBillToSearch(invoice.billTo.name);
  };

  const handleEditShipTo = () => {
    setEditingShipTo(true);
    setShipToSearch(invoice.shipTo.name);
  };

  // Handle PO selection - populates typed state based on PO billing model
  const handleSelectPO = async (po) => {
    if (!po) return;

    const paymentModeMap = {
      "net-30": "Bank-Transfer",
      "net-60": "Bank-Transfer",
      "net-90": "Bank-Transfer",
      cod: "Cash",
      advance: "Bank-Transfer",
      immediate: "Bank-Transfer",
    };

    setError(null);

    let selectedPO = po;
    try {
      const poResponse = await getPOProgressApi(po._id, companyId);
      selectedPO = poResponse?.data || po;
    } catch (err) {
      console.error("Error fetching fresh PO progress:", err);
    }

    const poCategory = selectedPO.poCategory || "project";
    const billingModel = selectedPO.billingModel || "fixed";
    const paymentTermSchedule = buildPaymentTermSchedule(selectedPO);

    const buildAddress = (src) => ({
      name: src?.name || "",
      address: src?.address || "",
      city: src?.city || "",
      state: src?.state || "",
      stateCode: src?.stateCode || "",
      country: src?.country || "",
      pinCode: src?.pinCode || "",
      taxIdentifierType: src?.GSTIN ? "GST" : "",
      taxIdentifierNumber: src?.GSTIN || "",
    });

    // ── Reset all typed section states ────────────────────────
    setMilestoneRows([]);
    setResourceRows([]);
    setRetainerRow(null);

    // ── Determine which UI section to populate ────────────────
    let derivedItems = []; // always kept in sync with invoice.items

    // ──────────────────────────────────────────────────────────
    // CASE 1 – MILESTONE billing (project + milestone)
    // ──────────────────────────────────────────────────────────
    if (billingModel === "milestone" && Array.isArray(selectedPO.milestones) && selectedPO.milestones.length > 0) {
      const openMilestoneAmount = (milestone) =>
        Number(milestone.remainingAmount ?? milestone.amount ?? 0);
      const milestoneInvoiceIndex = Math.max(
        0,
        Math.min(
          (selectedPO.linkedInvoices || []).length,
          selectedPO.milestones.length - 1,
        ),
      );
      const currentMilestoneIndex = selectedPO.milestones.findIndex(
        (m, idx) => idx >= milestoneInvoiceIndex && openMilestoneAmount(m) > 0,
      );
      const visibleMilestoneIndex =
        currentMilestoneIndex >= 0 ? currentMilestoneIndex : milestoneInvoiceIndex;

      const rows = selectedPO.milestones
        .map((m, idx) => ({ milestone: m, index: idx }))
        .filter(({ milestone, index }) =>
          index <= visibleMilestoneIndex &&
          milestone.status !== "invoiced" &&
          openMilestoneAmount(milestone) > 0,
        )
        .map(({ milestone: m }) => ({
          _id: m._id?.toString() || String(Math.random()),
          title: m.title || "",
          description: m.description || "",
          dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "",
          percentage: Number(
            selectedPO.totalAmount > 0
              ? (((Number(m.remainingAmount ?? m.amount ?? 0) / Number(selectedPO.totalAmount || 1)) * 100).toFixed(2))
              : 0,
          ),
          originalPercentage: Number(m.percentage || 0),
          originalAmount: Number(m.amount || 0),
          alreadyInvoicedAmount: Number(m.invoicedAmount || 0),
          remainingAmountBefore: Number(m.remainingAmount ?? m.amount ?? 0),
          remainingAmountAfter: 0,
          amount: Number(m.remainingAmount ?? m.amount ?? 0),
          hsnSac: "",
          gstRate: 0,
          gstAmount: 0,
          total: Number(m.remainingAmount ?? m.amount ?? 0),
          selected: true, // user can deselect milestones they don't want to invoice now
        }));

      if (rows.length === 0) {
        const milestones = selectedPO.milestones || [];
        const allMilestonesFullyInvoiced =
          milestones.length > 0 &&
          milestones.every(
            (m) =>
              m.status === "invoiced" ||
              Number(m.remainingAmount ?? m.amount ?? 0) <= 0,
          );

        setError(
          allMilestonesFullyInvoiced
            ? "All milestones for this PO are already invoiced."
            : "No milestones with open amount are available for invoice creation.",
        );
        setPoDropdownOpen(false);
        return;
      }

      setMilestoneRows(rows);
      // Sync to items (each milestone = 1 line item with qty:1, rate = milestone amount)
      derivedItems = rows.map((r) => ({
        itemId: r._id,
        poItemId: r._id,
        description: r.title,
        hsnSac: r.hsnSac,
        quantity: 1,
        rate: r.amount,
        taxableValue: r.amount,
        gstRate: r.gstRate,
        gstAmount: r.gstAmount,
        total: r.total,
        combinedGstRate: r.gstRate,
        totalManuallyEdited: false,
      }));
    }

    // ──────────────────────────────────────────────────────────
    // CASE 2 – STAFFING (daily / monthly / hourly) or project headcount with resources
    // ──────────────────────────────────────────────────────────
    else if (
      (poCategory === "staffing" || (poCategory === "project" && billingModel === "headcount")) &&
      Array.isArray(selectedPO.resources) && selectedPO.resources.length > 0
    ) {
      const billingUnitLabel = billingModel === "daily" ? "Days"
        : billingModel === "hourly" ? "Hours"
        : "Months";

      const rows = selectedPO.resources
        .filter((r) => r.isActive !== false)
        .map((r) => {
          const rate = billingModel === "daily" || billingModel === "headcount"
            ? Number(r.ratePerDay || 0)
            : billingModel === "hourly"
            ? Number(r.ratePerHour || 0)
            : Number(r.ratePerMonth || 0);

          return {
            _id: r._id?.toString() || String(Math.random()),
            name: r.name || "",
            role: r.role || "",
            employeeId: r.employeeId || "",
            billingUnit: billingUnitLabel,
            rate,
            quantity: 1, // user enters actual days/hours/months
            hsnSac: "",
            gstRate: 0,
            gstAmount: 0,
            taxableValue: rate * 1,
            total: rate * 1,
          };
        });

      if (rows.length === 0) {
        // No resources — fall through to line-item path
      } else {
        setResourceRows(rows);
        derivedItems = rows.map((r) => ({
          itemId: r._id,
          poItemId: r._id,
          description: `${r.name}${r.role ? ` – ${r.role}` : ""} (${r.billingUnit})`,
          hsnSac: r.hsnSac,
          quantity: r.quantity,
          rate: r.rate,
          taxableValue: r.taxableValue,
          gstRate: r.gstRate,
          gstAmount: r.gstAmount,
          total: r.total,
          combinedGstRate: r.gstRate,
          totalManuallyEdited: false,
        }));
      }
    }

    // ──────────────────────────────────────────────────────────
    // CASE 3 – RETAINER (fixed, no items / milestones / resources)
    // ──────────────────────────────────────────────────────────
    else if (poCategory === "retainer" && !(Array.isArray(selectedPO.items) && selectedPO.items.some((i) => getRemainingPOItemQuantity(i) > 0))) {
      const scheduleLabel = selectedPO.paymentSchedule
        ? selectedPO.paymentSchedule.charAt(0).toUpperCase() + selectedPO.paymentSchedule.slice(1)
        : "Periodic";

      const row = {
        description: `Retainer Services – ${scheduleLabel} Billing`,
        periodLabel: scheduleLabel,
        amount: Number(selectedPO.totalAmount || 0),
        hsnSac: "",
        gstRate: 0,
        gstAmount: 0,
        total: Number(selectedPO.totalAmount || 0),
      };
      setRetainerRow(row);
      derivedItems = [{
        itemId: "",
        poItemId: "",
        description: row.description,
        hsnSac: row.hsnSac,
        quantity: 1,
        rate: row.amount,
        taxableValue: row.amount,
        gstRate: row.gstRate,
        gstAmount: row.gstAmount,
        total: row.total,
        combinedGstRate: row.gstRate,
        totalManuallyEdited: false,
      }];
    }

    // ──────────────────────────────────────────────────────────
    // CASE 4 – LINE ITEMS (project-fixed, project with items, general)
    // ──────────────────────────────────────────────────────────
    if (derivedItems.length === 0) {
      const remainingItems = (selectedPO.items || [])
        .map((item) => {
          const remainingQuantity = getRemainingPOItemQuantity(item);
          if (remainingQuantity <= 0) return null;
          const rate = Number(item.rate || 0);
          const gstRate = Number(item.gstRate || 0);
          const originalTotal = Number(item.totalAmount || item.total || 0);
          const scheduledParts = calculateScheduledInvoiceParts({
            totalAmount: originalTotal,
            alreadyInvoicedAmount: Number(item.invoicedAmount || 0),
            totalInstallments: paymentTermSchedule.totalInstallments,
            currentInstallmentNo: paymentTermSchedule.currentInstallmentNo,
          });
          const scheduledTotal =
            paymentTermSchedule.totalInstallments > 1
              ? scheduledParts.recommendedInvoiceAmount
              : roundMoney(
                  Math.max(0, originalTotal - Number(item.invoicedAmount || 0)),
                );
          const taxableValue = Number(
            (
              gstRate > 0
                ? scheduledTotal / (1 + gstRate / 100)
                : scheduledTotal
            ).toFixed(2),
          );
          const gstAmount = Number((scheduledTotal - taxableValue).toFixed(2));
          const quantity = rate > 0 ? Number((taxableValue / rate).toFixed(4)) : remainingQuantity;
          const currentTermAmount = scheduledParts.currentTermAmount || scheduledTotal;
          return {
            itemId: item.itemId || item._id,
            poItemId: item.itemId || item._id,
            description: item.description || "",
            hsnSac: item.hsnSac || item.hsnCode || "",
            quantity,
            baseQuantity: remainingQuantity,
            baseRate: rate,
            poRemainingQuantity: remainingQuantity,
            rate,
            taxableValue,
            gstRate,
            gstAmount,
            total: scheduledTotal,
            maxAllowedInvoiceAmount: scheduledTotal,
            installmentAmount: scheduledParts.installmentAmount,
            previousCarryForward: scheduledParts.previousCarryForward,
            currentTermAmount,
            currentTermRemainingAmount: 0,
            baseRemainingAfterInvoice: scheduledParts.remainingAfterInvoice,
            remainingAfterInvoice: scheduledParts.remainingAfterInvoice,
            combinedGstRate: item.combinedGstRate || gstRate,
            totalManuallyEdited: false,
          };
        })
        .filter(Boolean);

      if (remainingItems.length === 0) {
        setError("All items for this PO are already invoiced.");
        setPoDropdownOpen(false);
        return;
      }
      derivedItems = remainingItems;
    }

    const totalTaxableValue = derivedItems.reduce((s, i) => s + Number(i.taxableValue || 0), 0);
    const totalGSTAmount = derivedItems.reduce((s, i) => s + Number(i.gstAmount || 0), 0);

    setInvoice((prev) => ({
      ...prev,
      linkedPO: selectedPO._id,
      linkedPORef: selectedPO.poNumber || "",
      poreferencevalue: selectedPO.poreferencevalue || "",
      poType: getDerivedInvoicePoType({
        poType: selectedPO.poType,
        poCategory,
        billingModel,
      }),
      contractPaymentSchedule: selectedPO.contractDetails?.paymentSchedule || "",
      contractDaysWorked: "",
      contractPeriodWorkingDays: selectedPO.contractDetails?.defaultWorkingDays || "",
      referenceDate: paymentTermSchedule.currentWindowStart || (selectedPO.poDate ? new Date(selectedPO.poDate).toISOString().split("T")[0] : prev.referenceDate),
      invoiceDate: paymentTermSchedule.currentWindowStart || prev.invoiceDate,
      dueDate: paymentTermSchedule.currentWindowEnd || (selectedPO.deliveryDate ? new Date(selectedPO.deliveryDate).toISOString().split("T")[0] : prev.dueDate),
      currency: selectedPO.currency || "INR",
      paymentMode: paymentModeMap[selectedPO.paymentTerms] || "Bank-Transfer",
      billTo: buildAddress(selectedPO.client),
      shipTo: buildAddress(selectedPO.deliverTo),
      items: derivedItems,
      totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
      totalCGSTAmount: selectedPO.totalCGSTAmount || 0,
      totalSGSTAmount: selectedPO.totalSGSTAmount || 0,
      totalIGSTAmount: selectedPO.totalIGSTAmount || 0,
      amountDue: Number((totalTaxableValue + totalGSTAmount).toFixed(2)),
    }));

    setSelectedPOInfo({
      poCategory,
      billingModel,
      poNumber: selectedPO.poNumber,
      poId: selectedPO._id,
      paymentTerms: selectedPO.paymentTerms,
      label: paymentTermSchedule.label,
      ...paymentTermSchedule,
    });
    setSelectedPOData(selectedPO);
    setPoDropdownOpen(false);
    setPoSearch(selectedPO.poNumber || "");
    setIsFromPO(true);
  };

  useEffect(() => {
    if (!selectedPoId || editableInvoiceId || isFromPO) return;

    handleSelectPO({ _id: selectedPoId });
  }, [selectedPoId, editableInvoiceId, isFromPO]);

  useEffect(() => {
    if (!isFromPO || invoice.poType !== "contract") return;

    const recalculatedItems = applyContractProrationForItems({
      items: invoice.items || [],
      poType: invoice.poType,
      paymentSchedule: invoice.contractPaymentSchedule,
      daysWorked: invoice.contractDaysWorked,
      periodWorkingDays: invoice.contractPeriodWorkingDays,
    });

    if (JSON.stringify(recalculatedItems) === JSON.stringify(invoice.items)) {
      return;
    }

    setInvoice((prev) => ({
      ...prev,
      items: recalculatedItems,
    }));
  }, [
    isFromPO,
    invoice.poType,
    invoice.contractPaymentSchedule,
    invoice.contractDaysWorked,
    invoice.contractPeriodWorkingDays,
  ]);

  // ── Sync milestoneRows → invoice.items ───────────────────────
  const syncMilestoneRowsToItems = (rows) => {
    const selectedRows = rows.filter((r) => r.selected);
    const items = selectedRows.map((r) => ({
      itemId: r._id,
      poItemId: r._id,
      description: r.title,
      hsnSac: r.hsnSac || "",
      quantity: 1,
      rate: r.amount,
      taxableValue: r.amount,
      gstRate: r.gstRate || 0,
      gstAmount: r.gstAmount || 0,
      total: r.total,
      combinedGstRate: r.gstRate || 0,
      totalManuallyEdited: false,
    }));
    setInvoice((prev) => ({ ...prev, items }));
  };

  const handleMilestoneRowChange = (idx, field, value) => {
    setMilestoneRows((prev) => {
      const updated = prev.map((r, i) => {
        if (i !== idx) return r;
        const row = { ...r, [field]: value };
        if (field === "amount") {
          const normalizedAmount = Math.max(
            0,
            Math.min(Number(value || 0), Number(row.remainingAmountBefore || 0)),
          );
          row.amount = normalizedAmount;
          row.percentage = Number(
            selectedPOData?.totalAmount > 0
              ? (((normalizedAmount / Number(selectedPOData.totalAmount || 1)) * 100).toFixed(2))
              : 0,
          );
          row.remainingAmountAfter = roundMoney(
            Math.max(0, Number(row.remainingAmountBefore || 0) - normalizedAmount),
          );
        }
        // Recompute GST and total whenever amount or gstRate changes
        if (field === "amount" || field === "gstRate" || field === "hsnSac") {
          // If hsnSac changed, pick gstRate from hsnList
          if (field === "hsnSac") {
            const hsn = hsnList.find((h) => h.hsnCode === value);
            if (hsn) row.gstRate = hsn.igst || (hsn.cgst + hsn.sgst) || 0;
          }
          const amt = Number(row.amount || 0);
          const gstRate = Number(field === "gstRate" ? value : row.gstRate) || 0;
          row.gstAmount = roundMoney((amt * gstRate) / 100);
          row.total = roundMoney(amt + row.gstAmount);
        }
        return row;
      });
      syncMilestoneRowsToItems(updated);
      return updated;
    });
  };

  const handleMilestoneToggle = (idx) => {
    setMilestoneRows((prev) => {
      const updated = prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r);
      syncMilestoneRowsToItems(updated);
      return updated;
    });
  };

  // ── Sync resourceRows → invoice.items ────────────────────────
  const syncResourceRowsToItems = (rows) => {
    const items = rows.map((r) => {
      const taxableValue = roundMoney(r.quantity * r.rate);
      const gstAmount = roundMoney((taxableValue * (r.gstRate || 0)) / 100);
      const total = roundMoney(taxableValue + gstAmount);
      return {
        itemId: r._id,
        poItemId: r._id,
        description: `${r.name}${r.role ? ` – ${r.role}` : ""} (${r.billingUnit})`,
        hsnSac: r.hsnSac || "",
        quantity: r.quantity,
        rate: r.rate,
        taxableValue,
        gstRate: r.gstRate || 0,
        gstAmount,
        total,
        combinedGstRate: r.gstRate || 0,
        totalManuallyEdited: false,
      };
    });
    setInvoice((prev) => ({ ...prev, items }));
  };

  const handleResourceRowChange = (idx, field, value) => {
    setResourceRows((prev) => {
      const updated = prev.map((r, i) => {
        if (i !== idx) return r;
        const row = { ...r, [field]: value };
        if (field === "hsnSac") {
          const hsn = hsnList.find((h) => h.hsnCode === value);
          if (hsn) row.gstRate = hsn.igst || (hsn.cgst + hsn.sgst) || 0;
        }
        const taxableValue = roundMoney(Number(row.quantity) * Number(row.rate));
        row.gstAmount = roundMoney((taxableValue * (row.gstRate || 0)) / 100);
        row.total = roundMoney(taxableValue + row.gstAmount);
        row.taxableValue = taxableValue;
        return row;
      });
      syncResourceRowsToItems(updated);
      return updated;
    });
  };

  // ── Sync retainerRow → invoice.items ─────────────────────────
  const syncRetainerRowToItems = (row) => {
    if (!row) return;
    const gstAmount = roundMoney((row.amount * (row.gstRate || 0)) / 100);
    const total = roundMoney(row.amount + gstAmount);
    setInvoice((prev) => ({
      ...prev,
      items: [{
        itemId: "",
        poItemId: "",
        description: row.description,
        hsnSac: row.hsnSac || "",
        quantity: 1,
        rate: row.amount,
        taxableValue: row.amount,
        gstRate: row.gstRate || 0,
        gstAmount,
        total,
        combinedGstRate: row.gstRate || 0,
        totalManuallyEdited: false,
      }],
    }));
  };

  const handleRetainerRowChange = (field, value) => {
    setRetainerRow((prev) => {
      const row = { ...prev, [field]: value };
      if (field === "hsnSac") {
        const hsn = hsnList.find((h) => h.hsnCode === value);
        if (hsn) row.gstRate = hsn.igst || (hsn.cgst + hsn.sgst) || 0;
      }
      const gstAmount = roundMoney((row.amount * (row.gstRate || 0)) / 100);
      row.gstAmount = gstAmount;
      row.total = roundMoney(row.amount + gstAmount);
      syncRetainerRowToItems(row);
      return row;
    });
  };

  const showTypedTaxFields = poHasTaxData(selectedPOData);

	  const handleClearPO = () => {
	    setInvoice((prev) => ({
	      ...prev,
	      linkedPO: "",
	      linkedPORef: "",
	      poreferencevalue: "",
        poType: "general",
        contractPaymentSchedule: "",
        contractDaysWorked: "",
        contractPeriodWorkingDays: "",
	    }));
    setPoSearch("");
    setIsFromPO(false);
    setSelectedPOInfo(null);
    setSelectedPOData(null);
    setMilestoneRows([]);
    setResourceRows([]);
    setRetainerRow(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

	    // Enhanced validation
	    if (!invoice.linkedPO && !editableInvoiceId) {
	      setError("Invoice must be created from a purchase order.");
	      return;
	    }

	    if (!invoice.invoiceDate || !invoice.dueDate || !invoice.billTo.name || !invoice.billTo.address || !invoice.shipTo.name || invoice.items.length === 0) {
	      setError("Please fill in all required fields and add at least one item.");
	      return;
	    }

    if (invoice.poType === "contract") {
      const daysWorked = Number(invoice.contractDaysWorked || 0);
      if (!Number.isFinite(daysWorked) || daysWorked <= 0) {
        setError("For contract PO invoices, please enter days worked.");
        return;
      }
    }

    // Validate items — milestone/resource/retainer types use taxableValue/total instead of qty*rate
    const isMilestoneSection = selectedPOInfo?.billingModel === "milestone" && milestoneRows.length > 0;
    const isResourceSection  = (selectedPOInfo?.poCategory === "staffing" || (selectedPOInfo?.poCategory === "project" && selectedPOInfo?.billingModel === "headcount")) && resourceRows.length > 0;
    const isRetainerSection  = selectedPOInfo?.poCategory === "retainer" && retainerRow != null;

    if (isMilestoneSection) {
      const selectedMilestones = milestoneRows.filter((r) => r.selected);
      if (selectedMilestones.length === 0) {
        setError("Please select at least one milestone to invoice.");
        return;
      }
      const badMilestone = selectedMilestones.find((r) => !r.title || Number(r.amount || 0) <= 0);
      if (badMilestone) {
        setError("Each selected milestone must have a title and amount greater than 0.");
        return;
      }
    } else if (isRetainerSection) {
      if (Number(retainerRow.amount || 0) <= 0) {
        setError("Retainer amount must be greater than 0.");
        return;
      }
    } else {
      const invalidItems = invoice.items.filter((item) => !item.description || item.quantity <= 0 || item.rate <= 0);
      if (invalidItems.length > 0) {
        setError("Please ensure all items have a description, quantity > 0, and rate > 0.");
        return;
      }
    }

    // Save directly instead of showing popup
    handleStatusSelect("POSTED");
  };

  const handleStatusSelect = async (status) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

	    try {
	      const completeInvoice = {
          ...buildTypedInvoicePayload({
            invoice,
            selectedPOInfo,
            selectedPOData,
            milestoneRows,
            resourceRows,
            retainerRow,
            valueInWords,
            convertToWords,
          }),
	        status: status,
	        companyId: user?.company?._id,
	      };

      // Convert dates to ISO strings
      completeInvoice.invoiceDate = new Date(completeInvoice.invoiceDate).toISOString();
      completeInvoice.dueDate = new Date(completeInvoice.dueDate).toISOString();
      if (completeInvoice.paymentDueDate) {
        completeInvoice.paymentDueDate = new Date(completeInvoice.paymentDueDate).toISOString();
      }
      if (completeInvoice.referenceDate) {
        completeInvoice.referenceDate = new Date(completeInvoice.referenceDate).toISOString();
      }

      let response;
      
      if ((isEditMode || isEditPendingMode) && editableInvoiceId) {
        // ✅ UPDATE EXISTING INVOICE
        response = await API.put(`/invoices/put/${editableInvoiceId}`, completeInvoice);

        // // console.log("Edit API Response:", response.data);

        // ✅ For edit mode, use the current state data instead of API response
        // because API returns ref/snapshot structure, but we have clean data in state
        const invoiceToDisplay = {
          // Use current invoice state which has all the clean data
          ...invoice,
          // Add essential fields from API response
          _id: editableInvoiceId,
          invoiceNo: invoice.invoiceNo,
          companyId: user?.company?._id,
          status: status,
          approvalStatus: "Pending", // Edit always creates pending approval
          createdAt: response.data?.data?.createdAt || invoice.createdAt,
          updatedAt: new Date().toISOString(),
          // Ensure all financial fields are present
          currency: invoice.currency || "INR",
          totalTaxableValue: invoice.totalTaxableValue,
          totalCGSTAmount: invoice.totalCGSTAmount,
          totalSGSTAmount: invoice.totalSGSTAmount,
          totalIGSTAmount: invoice.totalIGSTAmount,
          amountDue: invoice.amountDue,
          netPayable: invoice.netPayable,
          tdsAmount: invoice.tdsAmount || 0,
          valueInWords: valueInWords,
          // Include billTo and shipTo properly
          billTo: invoice.billTo,
          shipTo: invoice.shipTo,
          // Include items
          items: invoice.items,
          // Include other fields
          paymentMode: invoice.paymentMode,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          paymentDueDate: invoice.paymentDueDate,
          referenceDate: invoice.referenceDate,
          poreferencevalue: invoice.poreferencevalue,
          withSignature: invoice.withSignature,
        };

        // // console.log("Invoice to display in modal:", invoiceToDisplay);

	        setCreatedInvoiceId(editableInvoiceId);
	        setCreatedInvoice(invoiceToDisplay);
	        setShowSuccessModal(true);

        toast.success("Invoice update submitted for approval.");
      } else {
        // ✅ CREATE NEW INVOICE
        delete completeInvoice.invoiceNo;
        response = await API.post("/invoices/create", completeInvoice);

        // // console.log("Create API Response:", response.data);

        const generatedInvoiceNo = response.data.data.invoiceNo;
        setCreatedInvoiceId(response.data.data._id);

        // Update invoice number in state
        setInvoice((prev) => ({
          ...prev,
          invoiceNo: generatedInvoiceNo,
        }));

	        // For create, use the API response directly
	        setCreatedInvoice(response.data.data);
	        setShowSuccessModal(true);

        toast.success("Invoice created and submitted for approval.");
      }

      // // console.log("Invoice saved successfully:", response.data);
	    } catch (err) {
	      console.error("Error saving invoice:", err);
	      const backendMessage =
	        err.response?.data?.message ||
	        err.response?.data?.error ||
	        (Array.isArray(err.response?.data?.error) ? err.response.data.error.join(", ") : "");
	      setError(backendMessage ? `Failed to save invoice: ${backendMessage}` : "Failed to save invoice. Please try again.");
	    } finally {
	      setLoading(false);
	    }
  };

  const handleDownloadPdf = async () => {
    if (!createdInvoiceId) {
      setError("Please create an invoice first before downloading");
      return;
    }

    try {
      const response = await API.get(`/invoices/${createdInvoiceId}/download/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoice.invoiceNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setError("Failed to download PDF invoice");
    }
  };

  const handleDownloadWord = async () => {
    if (!createdInvoiceId) {
      setError("Please create an invoice first before downloading");
      return;
    }
    
    try {
      const response = await API.get(`/invoices/${createdInvoiceId}/download/word`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoice.invoiceNo}.docx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading Word document:", error);
      setError("Failed to download Word invoice");
    }
  };

  const getTotalAmount = () => {
    return invoice.items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2);
  };

  useEffect(() => {
    const fetchHsn = async () => {
      setLoadingHsn(true);
      try {
        const res = await getallhsn(user.company._id);
        setHsnList(res.data || []);
      } catch (e) {
        console.error("HSN fetch failed", e);
      } finally {
        setLoadingHsn(false);
      }
    };

    fetchHsn();
  }, []);

  if (loadingInvoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleGoToList = () => {
    navigate("/invoice-data");
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header/Logo Section */}
        <div className="glass-card rounded-[2.5rem] shadow-premium mb-8 border border-white/20 overflow-hidden">
          <div className="p-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md">
            <img 
              src="https://res.cloudinary.com/dxqzklc00/image/upload/v1736234703/Nexu_oauth_lpewoq.png" 
              alt="Company Logo" 
              className="h-20 object-contain mb-4 transform hover:scale-105 transition-transform" 
            />
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-6 uppercase">Tax Invoice</h1>

            <button 
              type="button" 
              onClick={handleGoToList} 
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all flex items-center font-bold shadow-sm group"
            >
              <ShoppingBag className="h-5 w-5 mr-3 text-blue-600 group-hover:scale-110 transition-transform" />
              View All Invoices
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
                {/* Company Details */}
                {/* Company Details */}
                <div className="glass-card rounded-[2.5rem] shadow-premium mb-8 border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex items-center">
                    <Building className="mr-3 text-blue-400" size={24} />
                    <h2 className="text-xl font-bold tracking-tight">
                      Company Details
                      {loadingCompany && <Loader2 className="ml-3 animate-spin text-blue-400" size={18} />}
                    </h2>
                  </div>
                  <div className="p-6">
                    {loadingCompany ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-600 mb-1">Company Name</h3>
                          <p className="text-gray-900">{companyDetails.companyName}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-600 mb-1">Company Address</h3>
                          <p className="text-gray-900">{companyDetails.address}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">GSTIN</h3>
                            <p className="text-gray-900">{companyDetails.gstNumber}</p>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-600 mb-1">PAN</h3>
                            <p className="text-gray-900">{companyDetails.panNumber}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="bg-white rounded-xl shadow-lg mb-6">
                  <div className="bg-neutral-700 text-white p-4 rounded-t-xl flex items-center">
                    <Receipt className="mr-2" size={20} />
                    <h2 className="text-lg font-semibold">Invoice Details</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Invoice No */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No</label>
                        <input type="text" name="invoiceNo" value={invoice.invoiceNo} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" readOnly />
                      </div>

                      {/* Buyer's Order Reference - Now with PO Dropdown */}
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Purchase Order</label>

                        <div className="relative">
                          <input
                            type="text"
                            name="linkedPORef"
                            value={poDropdownOpen ? poSearch : invoice.linkedPORef || poSearch}
                            onChange={(e) => {
                              setPoSearch(e.target.value);
                              setPoDropdownOpen(true);
                            }}
                            onFocus={() => setPoDropdownOpen(true)}
                            placeholder="Search or select PO..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            {loadingPOs ? (
                              <Loader2 className="animate-spin text-gray-400" size={20} />
                            ) : invoice.poreferencevalue ? (
                              <X size={20} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={handleClearPO} />
                            ) : (
                              <ChevronDown className={`text-gray-400 cursor-pointer ${poDropdownOpen ? "transform rotate-180" : ""}`} size={20} onClick={() => setPoDropdownOpen(!poDropdownOpen)} />
                            )}
                          </div>
                        </div>

                        {/* PO Dropdown List */}
                        {poDropdownOpen && (
                          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {loadingPOs ? (
                              <div className="p-4 text-center">
                                <Loader2 className="animate-spin mx-auto" size={20} />
                              </div>
                            ) : filteredPOs.length > 0 ? (
                              filteredPOs.map((po) => (
                                <div key={po._id} className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0" onClick={() => handleSelectPO(po)}>
                                  <div className="font-medium text-blue-600">{po.poNumber}</div>
                                  <div className="text-sm text-gray-500">
                                    <div>Client: {po.client?.name}</div>
                                    <div>
                                      Amount: {po.currency} {po.totalAmount?.toFixed(2)}
                                    </div>
                                    <div className="text-red-600 font-semibold">
                                      Open: {po.currency} {Number(po.remainingInvoicableAmount ?? Math.max(0, (po.totalAmount || 0) - (po.totalInvoicedAmount || 0))).toFixed(2)} / {po.totalAmount?.toFixed(2)}
                                    </div>
                                    <div>Date: {new Date(po.poDate).toLocaleDateString()}</div>
                                    <div>
                                      Status: <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">{po.status}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">No purchase orders found</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client PO Reference</label>
                        <input
                          type="text"
                          name="poreferencevalue"
                          value={invoice.poreferencevalue || ""}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                      </div>

                      {invoice.poType === "contract" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Contract Payment Type
                            </label>
                            <input
                              type="text"
                              value={invoice.contractPaymentSchedule || "-"}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Days Worked
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={invoice.contractDaysWorked}
                              onChange={(e) =>
                                setInvoice((prev) => ({
                                  ...prev,
                                  contractDaysWorked: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Enter worked days"
                            />
                          </div>
                          {invoice.contractPaymentSchedule !== "daily" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period Working Days
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={invoice.contractPeriodWorkingDays}
                                onChange={(e) =>
                                  setInvoice((prev) => ({
                                    ...prev,
                                    contractPeriodWorkingDays: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="e.g. 22"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Payment Mode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                        <select name="paymentMode" value={invoice.paymentMode} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option value="Bank-Transfer">Bank Transfer</option>
                          <option value="Credit-Card">Credit Card</option>
                          <option value="Debit-Card">Debit Card</option>
                          <option value="UPI">UPI</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                      </div>

                      {/* Amount Due */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Due</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">{invoice.currency}</span>
                          </div>
                          <input
                            type="number"
                            name="amountDue"
                            value={invoice.amountDue.toFixed(2)}
                            onChange={handleAmountChange}
                            className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            readOnly
                          />
                        </div>
                      </div>

                      {/* Invoice Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                        <input type="date" name="invoiceDate" value={invoice.invoiceDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                      </div>

                      {/* Due Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input type="date" name="dueDate" value={invoice.dueDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due Date</label>
                        <input
                          type="date"
                          name="paymentDueDate"
                          value={invoice.paymentDueDate || ""}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Currency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                        <select name="currency" value={invoice.currency} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="INR">INR - Indian Rupee</option>
                          <option value="JPY">JPY - Japanese Yen</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                        </select>
                      </div>

                      {/* Reference Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Date</label>
                        <input type="date" name="referenceDate" value={invoice.referenceDate} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Details */}
                <div className="bg-white rounded-xl shadow-lg mb-6">
                  <div className="bg-neutral-700 text-white p-4 rounded-t-xl flex items-center">
                    <User className="mr-2" size={20} />
                    <h2 className="text-lg font-semibold">Client Details</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Bill To */}
                      <div className="glass-card p-6 rounded-[2rem] border border-white/20 shadow-premium">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <User size={20} className="text-blue-500" />
                            Bill To
                          </h3>
                          {invoice.billTo.name && !editingBillTo && (
                            <div className="flex space-x-2">
                              <button type="button" onClick={handleEditBillTo} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                                Edit
                              </button>
                              <button type="button" onClick={handleClearBillTo} className="flex items-center text-sm text-red-600 hover:text-red-800">
                                <X size={16} className="mr-1" />
                                Clear
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Select Client Dropdown (Only show when editing or no client selected) */}
                        {!invoice.billTo.name || editingBillTo ? (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Client</label>
                            <div className="relative">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Search client..."
                                  value={billToSearch}
                                  onChange={(e) => {
                                    setBillToSearch(e.target.value);
                                    setBillToDropdownOpen(true);
                                  }}
                                  onFocus={() => setBillToDropdownOpen(true)}
                                  className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-12 font-medium"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                  {loadingClients ? (
                                    <Loader2 className="animate-spin text-gray-400" size={20} />
                                  ) : (
                                    <ChevronDown
                                      className={`text-gray-400 cursor-pointer ${billToDropdownOpen ? "transform rotate-180" : ""}`}
                                      size={20}
                                      onClick={() => setBillToDropdownOpen(!billToDropdownOpen)}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* Dropdown List */}
                              {billToDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {loadingClients ? (
                                    <div className="p-4 text-center">
                                      <Loader2 className="animate-spin mx-auto" size={20} />
                                    </div>
                                  ) : filteredBillToClients.length > 0 ? (
                                    filteredBillToClients.map((client) => (
                                      <div
                                        key={client._id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                        onClick={() => handleSelectBillToClient(client)}
                                      >
                                        <div className="font-medium">{client.clientName}</div>
                                        <div className="text-sm text-gray-500">
                                          {client.gstNumber && <span>GST: {client.gstNumber}</span>}
                                          {client.panNumber && <span>PAN: {client.panNumber}</span>}
                                          {client.einNumber && <span>EIN: {client.einNumber}</span>}
                                          {client.stateCode && <span className="ml-2">State: {client.stateCode}</span>}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-gray-500">No clients found</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Client Details Display (Read-only when client is selected) */
                          <div className="mb-4">
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Client Name</label>
                                  <p className="text-sm font-medium">{invoice.billTo.name}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">{invoice.billTo.taxIdentifierType || "Tax ID"}</label>
                                  <p className="text-sm">{invoice.billTo.taxIdentifierNumber || "N/A"}</p>
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-500">Address</label>
                                  <p className="text-sm">{invoice.billTo.address}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">City</label>
                                  <p className="text-sm">{invoice.billTo.city || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">State</label>
                                  <p className="text-sm">{invoice.billTo.state || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">State Code</label>
                                  <p className="text-sm">{invoice.billTo.stateCode || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Country</label>
                                  <p className="text-sm">{invoice.billTo.country || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Pin Code</label>
                                  <p className="text-sm">{invoice.billTo.pinCode || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Manual Input Fields (Only show when editing and no client is selected from dropdown) */}
                        {(!invoice.billTo.name || editingBillTo) && (
                          <div className="space-y-4 mt-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                              <input type="text" name="name" value={invoice.billTo.name} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                              <textarea name="address" value={invoice.billTo.address} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows="3" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <input type="text" name="city" value={invoice.billTo.city} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <input type="text" name="state" value={invoice.billTo.state} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
                                <input type="text" name="stateCode" value={invoice.billTo.stateCode} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <input type="text" name="country" value={invoice.billTo.country} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                                <input type="text" name="pinCode" value={invoice.billTo.pinCode} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Identifier Type</label>
                                <select name="taxIdentifierType" value={invoice.billTo.taxIdentifierType} onChange={handleBillToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                  <option value="">Select Type</option>
                                  <option value="GST">GST</option>
                                  <option value="PAN">PAN</option>
                                  <option value="EIN">EIN</option>
                                  <option value="VAT">VAT</option>
                                  <option value="SSN">SSN</option>
                                  <option value="National ID">National ID</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Identifier Number</label>
                              <input
                                type="text"
                                name="taxIdentifierNumber"
                                value={invoice.billTo.taxIdentifierNumber}
                                onChange={handleBillToChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ship To */}
                      <div className="glass-card p-6 rounded-[2rem] border border-white/20 shadow-premium">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <ShoppingBag size={20} className="text-amber-500" />
                            Ship To
                          </h3>
                          <div className="flex items-center">
                            <input type="checkbox" id="sameAsBillTo" checked={sameAsBillTo} onChange={(e) => handleSameAsBillTo(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
                            <label htmlFor="sameAsBillTo" className="ml-2 text-sm text-gray-700">
                              Same as Bill To
                            </label>
                          </div>
                          {invoice.shipTo.name && !sameAsBillTo && !editingShipTo && (
                            <div className="flex space-x-2">
                              <button type="button" onClick={handleEditShipTo} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
                                Edit
                              </button>
                              <button type="button" onClick={handleClearShipTo} className="flex items-center text-sm text-red-600 hover:text-red-800">
                                <X size={16} className="mr-1" />
                                Clear
                              </button>
                            </div>
                          )}
                        </div>

                        {/* If same as bill to, show bill to details */}
                        {sameAsBillTo ? (
                          <div className="mb-4">
                            <div className="p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Client Name</label>
                                  <p className="text-sm font-medium">{invoice.billTo.name}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">{invoice.billTo.taxIdentifierType || "Tax ID"}</label>
                                  <p className="text-sm">{invoice.billTo.taxIdentifierNumber || "N/A"}</p>
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-500">Address</label>
                                  <p className="text-sm">{invoice.billTo.address}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">City</label>
                                  <p className="text-sm">{invoice.billTo.city || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">State</label>
                                  <p className="text-sm">{invoice.billTo.state || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">State Code</label>
                                  <p className="text-sm">{invoice.billTo.stateCode || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Country</label>
                                  <p className="text-sm">{invoice.billTo.country || "N/A"}</p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500">Pin Code</label>
                                  <p className="text-sm">{invoice.billTo.pinCode || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Select Client Dropdown (Only show when editing or no client selected) */}
                            {!invoice.shipTo.name || editingShipTo ? (
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Select Shipping Address</label>
                                <div className="relative">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      placeholder="Search client..."
                                      value={shipToSearch}
                                      onChange={(e) => {
                                        setShipToSearch(e.target.value);
                                        setShipToDropdownOpen(true);
                                      }}
                                      onFocus={() => setShipToDropdownOpen(true)}
                                      className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all pr-12 font-medium"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                      {loadingClients ? (
                                        <Loader2 className="animate-spin text-gray-400" size={20} />
                                      ) : (
                                        <ChevronDown
                                          className={`text-gray-400 cursor-pointer ${shipToDropdownOpen ? "transform rotate-180" : ""}`}
                                          size={20}
                                          onClick={() => setShipToDropdownOpen(!shipToDropdownOpen)}
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Dropdown List */}
                                  {shipToDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      {loadingClients ? (
                                        <div className="p-4 text-center">
                                          <Loader2 className="animate-spin mx-auto" size={20} />
                                        </div>
                                      ) : filteredShipToClients.length > 0 ? (
                                        filteredShipToClients.map((client) => (
                                          <div
                                            key={client._id}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                            onClick={() => handleSelectShipToClient(client)}
                                          >
                                            <div className="font-medium">{client.clientName}</div>
                                            <div className="text-sm text-gray-500">
                                              {client.gstNumber && <span>GST: {client.gstNumber}</span>}
                                              {client.panNumber && <span>PAN: {client.panNumber}</span>}
                                              {client.einNumber && <span>EIN: {client.einNumber}</span>}
                                              {client.stateCode && <span className="ml-2">State: {client.stateCode}</span>}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="p-4 text-center text-gray-500">No clients found</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Client Details Display (Read-only when client is selected) */
                              <div className="mb-4">
                                <div className="p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">Client Name</label>
                                      <p className="text-sm font-medium">{invoice.shipTo.name}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">{invoice.shipTo.taxIdentifierType || "Tax ID"}</label>
                                      <p className="text-sm">{invoice.shipTo.taxIdentifierNumber || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-xs font-medium text-gray-500">Address</label>
                                      <p className="text-sm">{invoice.shipTo.address}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">City</label>
                                      <p className="text-sm">{invoice.shipTo.city || "N/A"}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">State</label>
                                      <p className="text-sm">{invoice.shipTo.state || "N/A"}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">State Code</label>
                                      <p className="text-sm">{invoice.shipTo.stateCode || "N/A"}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">Country</label>
                                      <p className="text-sm">{invoice.shipTo.country || "N/A"}</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500">Pin Code</label>
                                      <p className="text-sm">{invoice.shipTo.pinCode || "N/A"}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Manual Input Fields (Only show when editing and no client is selected from dropdown) */}
                            {(!invoice.shipTo.name || editingShipTo) && !sameAsBillTo && (
                              <div className="space-y-4 mt-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                                  <input type="text" name="name" value={invoice.shipTo.name} onChange={handleShipToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                  <textarea
                                    name="address"
                                    value={invoice.shipTo.address}
                                    onChange={handleShipToChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    rows="3"
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input type="text" name="city" value={invoice.shipTo.city} onChange={handleShipToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input type="text" name="state" value={invoice.shipTo.state} onChange={handleShipToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State Code</label>
                                    <input type="text" name="stateCode" value={invoice.shipTo.stateCode} onChange={handleShipToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <input type="text" name="country" value={invoice.shipTo.country} onChange={handleShipToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                                    <input type="text" name="pinCode" value={invoice.shipTo.pinCode} onChange={handleShipToChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Identifier Type</label>
                                    <select
                                      name="taxIdentifierType"
                                      value={invoice.shipTo.taxIdentifierType}
                                      onChange={handleShipToChange}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                      <option value="">Select Type</option>
                                      <option value="GST">GST</option>
                                      <option value="PAN">PAN</option>
                                      <option value="EIN">EIN</option>
                                      <option value="VAT">VAT</option>
                                      <option value="SSN">SSN</option>
                                      <option value="National ID">National ID</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Identifier Number</label>
                                  <input
                                    type="text"
                                    name="taxIdentifierNumber"
                                    value={invoice.shipTo.taxIdentifierNumber}
                                    onChange={handleShipToChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ══ PO TYPE SPECIFIC BILLING SECTION ══════════════════════════ */}
                {selectedPOInfo?.billingModel === "milestone" && milestoneRows.length > 0 ? (
                  /* ── MILESTONE SECTION ── */
                  <div className="glass-card rounded-[2.5rem] shadow-premium mb-8 border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package size={24} />
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">Milestone Billing</h2>
                          <p className="text-indigo-200 text-xs mt-0.5">
                            {selectedPOInfo?.label || "Select milestones to invoice from this purchase order"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold border border-white/30">
                        {milestoneRows.filter(r => r.selected).length} / {milestoneRows.length} selected
                      </span>
                    </div>
                    <div className="p-6 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest w-8">✓</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">#</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Milestone Title</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Due Date</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Original %</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Original Amount (₹)</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Already Invoiced (₹)</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Remaining (₹)</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Invoice %</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Invoice Amount (₹)</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Remaining After (₹)</th>
                            {showTypedTaxFields && (
                              <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">HSN/SAC</th>
                            )}
                            {showTypedTaxFields && (
                              <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">GST %</th>
                            )}
                            {showTypedTaxFields && (
                              <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">GST Amt</th>
                            )}
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {milestoneRows.map((row, idx) => (
                            <tr key={row._id} className={`transition-colors ${row.selected ? "bg-indigo-50/30" : "bg-slate-50/50 opacity-60"}`}>
                              <td className="px-3 py-3">
                                <input type="checkbox" checked={row.selected} onChange={() => handleMilestoneToggle(idx)}
                                  className="w-4 h-4 accent-indigo-600 cursor-pointer" />
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-slate-600 text-sm">{idx + 1}</td>
                              <td className="px-3 py-3">
                                <input type="text" value={row.title}
                                  onChange={(e) => handleMilestoneRowChange(idx, "title", e.target.value)}
                                  disabled={!row.selected}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm min-w-[160px] disabled:bg-slate-100" />
                                {row.description && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">{row.description}</p>}
                                {(row.alreadyInvoicedAmount > 0 || row.remainingAmountBefore > 0) && (
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    Already invoiced: {(row.alreadyInvoicedAmount || 0).toFixed(2)} · Open for invoice: {(row.remainingAmountBefore || 0).toFixed(2)}
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-slate-600 whitespace-nowrap">
                                {row.dueDate || "—"}
                              </td>
                              <td className="px-3 py-3 text-center text-sm font-medium text-slate-700">
                                {row.originalPercentage > 0 ? `${row.originalPercentage}%` : "—"}
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                                {(row.originalAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                                {(row.alreadyInvoicedAmount || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-bold text-amber-700">
                                {(row.remainingAmountBefore || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-3 text-center text-sm font-medium text-slate-700">
                                {row.percentage > 0 ? `${row.percentage}%` : "—"}
                              </td>
                              <td className="px-3 py-3">
                                <input type="number" value={row.amount} min="0" max={row.remainingAmountBefore || 0} step="0.01"
                                  onChange={(e) => handleMilestoneRowChange(idx, "amount", parseFloat(e.target.value) || 0)}
                                  disabled={!row.selected}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm min-w-[110px] disabled:bg-slate-100" />
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-bold text-emerald-700">
                                {(row.remainingAmountAfter || 0).toFixed(2)}
                              </td>
                              {showTypedTaxFields && (
                                <td className="px-3 py-3">
                                  <select value={row.hsnSac}
                                    onChange={(e) => handleMilestoneRowChange(idx, "hsnSac", e.target.value)}
                                    disabled={!row.selected}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm min-w-[140px] disabled:bg-slate-100">
                                    <option value="">No HSN</option>
                                    {hsnList.map((h) => (
                                      <option key={h._id} value={h.hsnCode}>{h.hsnCode} – {h.serviceType}</option>
                                    ))}
                                  </select>
                                </td>
                              )}
                              {showTypedTaxFields && (
                                <td className="px-3 py-3">
                                  <input type="number" value={row.gstRate} min="0" max="100" step="0.1"
                                    onChange={(e) => handleMilestoneRowChange(idx, "gstRate", parseFloat(e.target.value) || 0)}
                                    disabled={!row.selected}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm disabled:bg-slate-100" />
                                </td>
                              )}
                              {showTypedTaxFields && (
                                <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                                  {(row.gstAmount || 0).toFixed(2)}
                                </td>
                              )}
                              <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">
                                {(row.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end mt-4">
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 rounded-xl w-72">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="opacity-80">Milestones selected:</span>
                            <span className="font-bold">{milestoneRows.filter(r => r.selected).length}</span>
                          </div>
                          <div className="flex justify-between text-base font-black">
                            <span>Invoice Total:</span>
                            <span>{invoice.currency} {invoice.items.reduce((s, i) => s + (i.total || 0), 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                ) : selectedPOInfo && (selectedPOInfo.poCategory === "staffing" || (selectedPOInfo.poCategory === "project" && selectedPOInfo.billingModel === "headcount")) && resourceRows.length > 0 ? (
                  /* ── STAFFING / RESOURCE SECTION ── */
                  <div className="glass-card rounded-[2.5rem] shadow-premium mb-8 border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 flex items-center gap-3">
                      <User size={24} />
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">
                          {selectedPOInfo.billingModel === "daily" ? "Daily Rate Billing"
                            : selectedPOInfo.billingModel === "hourly" ? "Hourly Rate Billing"
                            : selectedPOInfo.billingModel === "monthly" ? "Monthly Rate Billing"
                            : "Headcount Billing"}
                        </h2>
                        <p className="text-amber-200 text-xs mt-0.5">
                          Enter actual {selectedPOInfo.billingModel === "daily" || selectedPOInfo.billingModel === "headcount" ? "days" : selectedPOInfo.billingModel === "hourly" ? "hours" : "months"} worked for each resource
                        </p>
                      </div>
                    </div>
                    <div className="p-6 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">#</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Resource Name</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Rate (₹)</th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">
                              {selectedPOInfo.billingModel === "daily" || selectedPOInfo.billingModel === "headcount" ? "Days Worked"
                                : selectedPOInfo.billingModel === "hourly" ? "Hours Worked"
                                : "Months"}
                            </th>
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Taxable Value (₹)</th>
                            {showTypedTaxFields && (
                              <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">HSN/SAC</th>
                            )}
                            {showTypedTaxFields && (
                              <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">GST %</th>
                            )}
                            {showTypedTaxFields && (
                              <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">GST Amt</th>
                            )}
                            <th className="px-3 py-3 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {resourceRows.map((row, idx) => (
                            <tr key={row._id} className="hover:bg-amber-50/20">
                              <td className="px-3 py-3 text-center font-bold text-slate-600 text-sm">{idx + 1}</td>
                              <td className="px-3 py-3">
                                <input type="text" value={row.name}
                                  onChange={(e) => handleResourceRowChange(idx, "name", e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm min-w-[130px]" />
                                {row.employeeId && <p className="text-[10px] text-slate-400 mt-0.5">ID: {row.employeeId}</p>}
                              </td>
                              <td className="px-3 py-3">
                                <input type="text" value={row.role}
                                  onChange={(e) => handleResourceRowChange(idx, "role", e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm min-w-[100px]" />
                              </td>
                              <td className="px-3 py-3">
                                <input type="number" value={row.rate} min="0" step="1"
                                  onChange={(e) => handleResourceRowChange(idx, "rate", parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm min-w-[100px]" />
                              </td>
                              <td className="px-3 py-3">
                                <input type="number" value={row.quantity} min="0" step="0.5"
                                  onChange={(e) => handleResourceRowChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 border border-amber-300 bg-amber-50 rounded text-right text-sm font-bold" />
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                                {(row.taxableValue || 0).toFixed(2)}
                              </td>
                              {showTypedTaxFields && (
                                <td className="px-3 py-3">
                                  <select value={row.hsnSac}
                                    onChange={(e) => handleResourceRowChange(idx, "hsnSac", e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm min-w-[140px]">
                                    <option value="">No HSN</option>
                                    {hsnList.map((h) => (
                                      <option key={h._id} value={h.hsnCode}>{h.hsnCode} – {h.serviceType}</option>
                                    ))}
                                  </select>
                                </td>
                              )}
                              {showTypedTaxFields && (
                                <td className="px-3 py-3">
                                  <input type="number" value={row.gstRate} min="0" max="100" step="0.1"
                                    onChange={(e) => handleResourceRowChange(idx, "gstRate", parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm" />
                                </td>
                              )}
                              {showTypedTaxFields && (
                                <td className="px-3 py-3 text-right text-sm font-medium text-slate-700">
                                  {(row.gstAmount || 0).toFixed(2)}
                                </td>
                              )}
                              <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">
                                {(row.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end mt-4">
                        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4 rounded-xl w-72">
                          <div className="flex justify-between text-base font-black">
                            <span>Invoice Total:</span>
                            <span>{invoice.currency} {invoice.items.reduce((s, i) => s + (i.total || 0), 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                ) : selectedPOInfo?.poCategory === "retainer" && retainerRow ? (
                  /* ── RETAINER SECTION ── */
                  <div className="glass-card rounded-[2.5rem] shadow-premium mb-8 border border-white/20 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 flex items-center gap-3">
                      <CreditCard size={24} />
                      <div>
                        <h2 className="text-xl font-bold tracking-tight">Retainer Billing</h2>
                        <p className="text-emerald-200 text-xs mt-0.5">Fixed {retainerRow.periodLabel} retainer from this purchase order</p>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-5">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Service Description</label>
                          <input type="text" value={retainerRow.description}
                            onChange={(e) => handleRetainerRowChange("description", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                        </div>
                        <div className={`grid grid-cols-1 ${showTypedTaxFields ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4`}>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Billing Period</label>
                            <input type="text" value={retainerRow.periodLabel} readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-slate-50 font-medium" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Retainer Amount (₹)</label>
                            <input type="number" value={retainerRow.amount} min="0" step="0.01"
                              onChange={(e) => handleRetainerRowChange("amount", parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-right font-bold" />
                          </div>
                          {showTypedTaxFields && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">HSN/SAC Code</label>
                              <select value={retainerRow.hsnSac}
                                onChange={(e) => handleRetainerRowChange("hsnSac", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm">
                                <option value="">No HSN</option>
                                {hsnList.map((h) => (
                                  <option key={h._id} value={h.hsnCode}>{h.hsnCode} – {h.serviceType}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className={`grid grid-cols-1 ${showTypedTaxFields ? "sm:grid-cols-3" : "sm:grid-cols-1"} gap-4`}>
                          {showTypedTaxFields && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                              <input type="number" value={retainerRow.gstRate} min="0" max="100" step="0.1"
                                onChange={(e) => handleRetainerRowChange("gstRate", parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm" />
                            </div>
                          )}
                          {showTypedTaxFields && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">GST Amount (₹)</label>
                              <input type="number" value={(retainerRow.gstAmount || 0).toFixed(2)} readOnly
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-slate-50 text-right" />
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-bold text-emerald-800 mb-1">Invoice Total (₹)</label>
                            <input type="number" value={(retainerRow.total || 0).toFixed(2)} readOnly
                              className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-sm bg-emerald-100 text-right font-black text-emerald-900" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                ) : (
                  /* ── DEFAULT LINE ITEMS (project-fixed, general, contract) ── */
                  <div className="glass-card rounded-[2.5rem] shadow-premium mb-8 border border-white/20 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                      <div className="flex items-center">
                        <Package className="mr-3" size={24} />
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">Line Items</h2>
                          {selectedPOInfo?.label && (
                            <p className="text-blue-200 text-xs mt-0.5">{selectedPOInfo.label}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={isFromPO}
                        className={`px-5 py-2 backdrop-blur-md text-white rounded-xl flex items-center gap-2 transition-all font-bold border border-white/30 shadow-lg ${
                          isFromPO
                            ? "bg-white/10 opacity-50 cursor-not-allowed"
                            : "bg-white/20 hover:bg-white/30"
                        }`}
                      >
                        <Plus className="mr-2" size={20} />
                        Add Item
                      </button>
                    </div>
                    <div className="p-6">
                      {invoice.items.length > 0 ? (
                        <>
                          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                            <table className="min-w-full divide-y divide-slate-100">
                              <thead className="bg-slate-50/50">
                                <tr>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">S. No.</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Description</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Prev Remaining</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Current Term</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">HSN/SAC</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Rate</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Taxable Value</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Term Remaining</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">GST %</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">GST Amount</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Total</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Remaining After</th>
                                  <th className="px-4 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-transparent divide-y divide-slate-50">
                                {invoice.items.map((item, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 py-3 text-center font-semibold text-gray-700 align-top">{index + 1}</td>

                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                        list="descriptions"
                                        className="w-full px-2 py-1 border border-gray-300 rounded"
                                        placeholder="Item description..."
                                      />
                                      <datalist id="descriptions">
                                        {existingDescriptions.map((desc, i) => (
                                          <option key={i} value={desc} />
                                        ))}
                                      </datalist>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 align-top min-w-[120px]">
                                      {(item.previousCarryForward || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-700 align-top min-w-[120px]">
                                      {(item.currentTermAmount || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <select
                                        value={item.hsnSac}
                                        onChange={(e) => handleItemChange(index, "hsnSac", e.target.value)}
                                        disabled={isFromPO}
                                        className={`w-full px-2 py-1 border rounded ${isFromPO ? "border-gray-200 bg-slate-50 text-slate-500 cursor-not-allowed" : "border-gray-300"}`}
                                      >
                                        <option value="" disabled>
                                          Select HSN/SAC
                                        </option>
                                        {hsnList.map((hsn) => (
                                          <option key={hsn._id} value={hsn.hsnCode}>
                                            {hsn.hsnCode} - {hsn.serviceType} ({hsn.cgst + hsn.sgst}% CGST+SGST / {hsn.igst}% IGST)
                                          </option>
                                        ))}
                                      </select>
                                      {(() => {
                                        const selectedHsn = hsnList.find((hsn) => hsn.hsnCode === item.hsnSac);

                                        if (selectedHsn?.tdsRate && selectedHsn.tdsRate > 0) {
                                          return <div className="text-[10px] text-gray-500 mt-1">TDS @ {selectedHsn.tdsRate}%</div>;
                                        }
                                        return null;
                                      })()}
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                        className="w-full min-w-[120px] px-3 py-2 border border-gray-300 rounded text-right"
                                        min="0"
                                        max={item.poRemainingQuantity || undefined}
                                        step="0.0001"
                                        inputMode="decimal"
                                      />
                                      {item.poRemainingQuantity !== undefined && (
                                        <div className="mt-1 text-[10px] text-amber-600 text-right">
                                          Left: {item.poRemainingQuantity}
                                        </div>
                                      )}
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="number"
                                        value={item.rate}
                                        readOnly
                                        className="w-full min-w-[120px] px-3 py-2 border border-gray-200 rounded text-right bg-slate-50 text-slate-500"
                                        min="0"
                                        step="1"
                                        inputMode="decimal"
                                      />
                                    </td>

                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="number"
                                        value={item.taxableValue}
                                        onChange={(e) => handleItemChange(index, "taxableValue", e.target.value)}
                                        className="w-full min-w-[140px] px-3 py-2 border border-gray-300 rounded text-right"
                                        min="0"
                                        step="0.01"
                                        inputMode="decimal"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-amber-600 align-top min-w-[130px]">
                                      {(item.currentTermRemainingAmount || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium align-top">
                                      <input
                                        type="number"
                                        value={item.gstRate}
                                        readOnly
                                        className="w-full min-w-[100px] px-3 py-2 border border-gray-200 rounded text-right bg-slate-50 text-slate-500"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium align-top">{item.gstAmount?.toFixed(2) || "0.00"}</td>
                                    <td className="px-4 py-3 align-top">
                                      <input
                                        type="number"
                                        value={item.total}
                                        readOnly={isFromPO}
                                        onChange={(e) => handleItemChange(index, "total", e.target.value)}
                                        className={`w-full min-w-[150px] px-3 py-2 border rounded text-right font-semibold ${isFromPO ? "border-gray-200 bg-slate-50 text-slate-500" : "border-gray-300 text-gray-900"}`}
                                        min="0"
                                        max={item.maxAllowedInvoiceAmount || undefined}
                                        step="0.01"
                                      />
                                      <div className="mt-1 text-[10px] text-gray-500 text-right">
                                        {isFromPO ? "Auto total" : item.totalManuallyEdited ? "Manual total" : "Auto total"}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-amber-700 align-top min-w-[130px]">
                                      {(item.remainingAfterInvoice || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        disabled={invoice.items.length === 1}
                                        className={`text-red-500 hover:text-red-700 ${
                                          invoice.items.length === 1
                                            ? "opacity-50 cursor-not-allowed"
                                            : ""
                                        }`}
                                      >
                                        <Trash2 size={20} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-end mt-4">
                            <div className="bg-gradient-to-r from-neutral-500 to-neutral-700 text-white p-4 rounded-lg w-64">
                              <h3 className="text-lg font-bold text-right">
                                Total: {invoice.currency} {getTotalAmount()}
                              </h3>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Package className="mx-auto text-gray-400 mb-2" size={48} />
                          <p className="text-gray-500">No items added yet. Click "Add Item" to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bank & Amount Details */}
                <div className="bg-white rounded-xl shadow-lg mb-6">
                  <div className="bg-neutral-700 text-white p-4 rounded-t-xl flex items-center">
                    <Banknote className="mr-2" size={20} />
                    <h2 className="text-lg font-semibold">Bank & Amount Details</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Bank Details */}
                      <div className="bg-gradient-to-r from-neutral-700 to-neutral-500 text-white p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                        {loadingCompany ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="animate-spin" size={24} />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-semibold opacity-90 mb-1">Bank Name</h4>
                              <p>{companyDetails.bankName}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold opacity-90 mb-1">Account Name</h4>
                              <p>{companyDetails.accountName}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold opacity-90 mb-1">Account Number</h4>
                                <p>{companyDetails.accountNumber}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold opacity-90 mb-1">IFSC Code</h4>
                                <p>{companyDetails.ifscCode}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold opacity-90 mb-1">Branch</h4>
                              <p>{companyDetails.branch}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Amount Details */}
                      <div className="glass-card p-8 rounded-[2.5rem] border border-white/20 shadow-premium">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Banknote size={20} className="text-emerald-500" />
                          Amount Details
                        </h3>
                        <div className="space-y-4">
                          {/* Total Taxable Value */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Taxable Value</label>
                              <input
                                type="number"
                                name="totalTaxableValue"
                                value={invoice.totalTaxableValue.toFixed(2)}
                                onChange={handleAmountChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                                readOnly
                              />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">TDS (Reference Only)</label>
                            <input
                              type="number"
                              value={invoice.tdsAmount}
                              onChange={(e) => handleTdsChange(e.target.value)}
                              className="w-full px-3 py-2 border rounded bg-white"
                              min="0"
                              step="0.01"
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                              Auto-calculated by default. You can manually adjust it for special cases.
                            </p>
                          </div>

                           <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Total</label>
                             <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-blue-600">₹</span>
                               <input 
                                 value={invoice.netPayable.toFixed(2)} 
                                 readOnly 
                                 className="w-full pl-8 pr-4 py-4 bg-blue-50/50 border-2 border-blue-100 rounded-2xl font-black text-2xl text-blue-700 shadow-inner" 
                               />
                             </div>
                           </div>

                          {/* Value in Words */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Value in Words</label>
                            <textarea
                              value={valueInWords}
                              onChange={(e) => setValueInWords(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                              rows="2"
                              readOnly
                            />
                          </div>

                          {/* CGST & SGST */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Total CGST</label>
                              <input
                                type="number"
                                name="totalCGSTAmount"
                                value={invoice.totalCGSTAmount.toFixed(2)}
                                onChange={handleAmountChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Total SGST</label>
                              <input
                                type="number"
                                name="totalSGSTAmount"
                                value={invoice.totalSGSTAmount.toFixed(2)}
                                onChange={handleAmountChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                readOnly
                              />
                            </div>
                          </div>

                          {/* IGST */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total IGST</label>
                            <input
                              type="number"
                              name="totalIGSTAmount"
                              value={invoice.totalIGSTAmount.toFixed(2)}
                              onChange={handleAmountChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Generation Options */}
                <div className="bg-white rounded-xl shadow-lg mb-6">
                  <div className="bg-neutral-700 text-white p-4 rounded-t-xl flex items-center">
                    <Download className="mr-2" size={20} />
                    <h2 className="text-lg font-semibold">PDF Generation Options</h2>
                  </div>
                  <div className="p-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="digitalSignature"
                            checked={invoice.withSignature}
                            onChange={(e) =>
                              setInvoice((prev) => ({
                                ...prev,
                                withSignature: e.target.checked,
                              }))
                            }
                            className="h-5 w-5 text-blue-600 rounded"
                          />
                          <label htmlFor="digitalSignature" className="ml-2 text-gray-700 font-medium">
                            Include Digital Signature
                          </label>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${invoice.withSignature ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"}`}>
                          {invoice.withSignature ? "With Signature" : "Without Signature"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-4 mt-12 pb-10">
                  <button
                    type="button"
                    onClick={handleGoToList}
                    className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold shadow-sm"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all font-black shadow-lg shadow-blue-600/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        {isEditMode ? "Update Invoice" : "Generate Invoice"}
                      </>
                    )}
                  </button>
                </div>

                {/* Messages and Post-action Options */}
                <div className="mt-8 space-y-4">
                  {error && <div className="text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3 font-medium">Error: {error}</div>}
                  {successMessage && (
                    <div className="text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 font-medium">
                      <Check className="h-5 w-5" />
                      {successMessage}
                    </div>
                  )}

                  {/* Download Buttons - Only visible after generation */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={!createdInvoiceId}
                      className={`px-6 py-3 text-white rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-bold ${
                        !createdInvoiceId ? "bg-slate-300 cursor-not-allowed" : "bg-gradient-to-r from-orange-500 to-pink-500 hover:scale-105"
                      }`}
                    >
                      <Download size={20} />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadWord}
                      disabled={!createdInvoiceId}
                      className={`px-6 py-3 text-white rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-bold ${
                        !createdInvoiceId ? "bg-slate-300 cursor-not-allowed" : "bg-gradient-to-r from-green-500 to-teal-500 hover:scale-105"
                      }`}
                    >
                      <Download size={20} />
                      Download Word
                    </button>
                  </div>
                </div>
              </form>


              {/* Success Modal */}
              <InvoiceCreatedModal
                open={showSuccessModal}
                onClose={() => {
                  setShowSuccessModal(false);
                  navigate("/invoice-data");
                }}
                invoice={createdInvoice}
                isEdit={isEditMode}
              />
            </div>
          </div>
        );
};

export default ManualInvoicePage;
