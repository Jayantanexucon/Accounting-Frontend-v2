import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getallhsn } from "../apis/hsnapi";
import { getClientsApi } from "../apis/clientApi";
import {
  createPurchaseOrderApi,
  getPurchaseOrderApi,
  updatePurchaseOrderApi,
  getPurchaseOrdersApi,
} from "../apis/purchaseOrderApi";
import {
  X,
  ChevronDown,
  Loader2,
  Check,
  Download,
  Plus,
  Trash2,
  Building,
  User,
  CreditCard,
  Banknote,
  FileText,
  Package,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { API } from "../apis/api";
import { getCompanyByIdApi } from "../apis/userApi";
import { ArrowLeft } from "lucide-react";
import { getCompanyGstStateCode, getPlaceOfSupplyCode } from "../utils/gstState";
import countryRules from "../utils/countryRules";

const clampNumber = (value = 0, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(Number(value || 0), min), max);

export default function PurchaseOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get("edit");
  const clientIdParam = searchParams.get("clientId");
  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany"));
  const companyId = localStorage.getItem("selectedCompanyId") || user?.company?._id || selectedCompany?._id;

  // ---------- Company state (dynamic) ----------
  const [companyInfo, setCompanyInfo] = useState(null);
  const [companyStateCode, setCompanyStateCode] = useState("");
  const [loadingCompany, setLoadingCompany] = useState(false);

  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [hsnList, setHsnList] = useState([]);
  const [loadingHsn, setLoadingHsn] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingPO, setExistingPO] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // ---------- PO State ----------
  const [purchaseOrder, setPurchaseOrder] = useState({
    poNumber: "Auto-generated on save",
    poreferencevalue: "",
    poDate: new Date().toISOString().split("T")[0],
    deliveryDate: new Date().toISOString().split("T")[0],
    referenceDate: new Date().toISOString().split("T")[0],
    companyId: companyId,
    currency: "INR",
    totalAmount: 0,
    paymentTerms: "net-30",
    poType: "general",
    contractDetails: {
      paymentSchedule: "monthly",
      defaultWorkingDays: 22,
    },
    client: {
      _id: "",
      name: "",
      address: "",
      stateCode: "",
      taxNumber: "",
      taxIdentifierType: "",
    },
    deliverTo: {
      _id: "",
      name: "",
      address: "",
      stateCode: "",
      taxNumber: "",
      taxIdentifierType: "",
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
      },
    ],
    totalTaxableValue: 0,
    totalCGSTAmount: 0,
    totalSGSTAmount: 0,
    totalIGSTAmount: 0,
    valueInWords: "",
    withSignature: false,
    status: "draft",
    notes: "",
  });

  const [sameAsClient, setSameAsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [createdPOId, setCreatedPOId] = useState(null);

  // Client dropdown state
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [editingClient, setEditingClient] = useState(false);

  // Deliver To dropdown state
  const [deliverToDropdownOpen, setDeliverToDropdownOpen] = useState(false);
  const [deliverToSearch, setDeliverToSearch] = useState("");
  const [editingDeliverTo, setEditingDeliverTo] = useState(false);

  const [existingDescriptions, setExistingDescriptions] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);

  // ---------- 1. Fetch existing PO if editing ----------
  useEffect(() => {
    if (editId) {
      const fetchExistingPO = async () => {
        try {
          const response = await getPurchaseOrderApi(editId);
          const poData = response.data;
          // setExistingPO(poData);
          setIsEditing(true);
          setCreatedPOId(editId);

          const formatDate = (date) =>
            date ? new Date(date).toISOString().split("T")[0] : "";

          setPurchaseOrder({
            poNumber: poData.poNumber,
            companyId: user?.company?._id,
            poreferencevalue: poData.poreferencevalue || "",
            poDate: formatDate(poData.poDate),
            deliveryDate: formatDate(poData.deliveryDate),
            referenceDate: formatDate(poData.referenceDate),
            currency: poData.currency || "INR",
            totalAmount: poData.totalAmount || 0,
            paymentTerms: poData.paymentTerms || "net-30",
            poType: poData.poType || "general",
            contractDetails: {
              paymentSchedule:
                poData.contractDetails?.paymentSchedule || "monthly",
              defaultWorkingDays:
                poData.contractDetails?.defaultWorkingDays || 22,
            },
            client: {
              _id: poData.client?._id || "",
              name: poData.client?.name || "",
              address: poData.client?.address || "",
              stateCode: poData.client?.stateCode || "",
              taxNumber: poData.client?.GSTIN || poData.client?.taxNumber || "",
              taxIdentifierType: poData.client?.taxIdentifierType || "",
            },
            deliverTo: {
              _id: poData.deliverTo?._id || "",
              name: poData.deliverTo?.name || "",
              address: poData.deliverTo?.address || "",
              stateCode: poData.deliverTo?.stateCode || "",
              taxNumber:
                poData.deliverTo?.GSTIN || poData.deliverTo?.taxNumber || "",
              taxIdentifierType: poData.deliverTo?.taxIdentifierType || "",
            },
            items: poData.items || [
              {
                description: "",
                hsnSac: "",
                quantity: 1,
                rate: 0,
                taxableValue: 0,
                gstRate: 0,
                gstAmount: 0,
                total: 0,
              },
            ],
            totalTaxableValue: poData.totalTaxableValue || 0,
            totalCGSTAmount: poData.totalCGSTAmount || 0,
            totalSGSTAmount: poData.totalSGSTAmount || 0,
            totalIGSTAmount: poData.totalIGSTAmount || 0,
            valueInWords: poData.valueInWords || "",
            withSignature: poData.withSignature || false,
            status: poData.status || "draft",
            notes: poData.notes || "",
          });
          const baselineData = {
            poreferencevalue: poData.poreferencevalue || "",
            poDate: formatDate(poData.poDate),
            deliveryDate: formatDate(poData.deliveryDate),
            referenceDate: formatDate(poData.referenceDate),
            currency: poData.currency || "INR",
            paymentTerms: poData.paymentTerms || "net-30",
            poType: poData.poType || "general",
            contractDetails: {
              paymentSchedule:
                poData.contractDetails?.paymentSchedule || "monthly",
              defaultWorkingDays:
                poData.contractDetails?.defaultWorkingDays || 22,
            },
            notes: poData.notes || "",
            withSignature: poData.withSignature || false,
            client: {
              name: poData.client?.name || "",
              address: poData.client?.address || "",
              stateCode: poData.client?.stateCode || "",
              taxNumber: poData.client?.GSTIN || poData.client?.taxNumber || "",
              taxIdentifierType: poData.client?.taxIdentifierType || "",
            },
            deliverTo: {
              name: poData.deliverTo?.name || "",
              address: poData.deliverTo?.address || "",
              stateCode: poData.deliverTo?.stateCode || "",
              taxNumber:
                poData.deliverTo?.GSTIN || poData.deliverTo?.taxNumber || "",
              taxIdentifierType: poData.deliverTo?.taxIdentifierType || "",
            },
            items: poData.items?.map((item) => ({
              description: item.description || "",
              hsnSac: item.hsnSac || "",
              quantity: item.quantity,
              rate: item.rate,
              gstRate: item.gstRate,
            })),
          };

          setExistingPO(JSON.stringify(baselineData));

          const clientStr = JSON.stringify(poData.client);
          const deliverStr = JSON.stringify(poData.deliverTo);
          setSameAsClient(clientStr === deliverStr);
        } catch (error) {
          console.error("Error fetching PO:", error);
          setError("Failed to load purchase order for editing.");
        }
      };
      fetchExistingPO();
    }
  }, [editId]);

  const isFormChanged = () => {
    if (!existingPO) return false;

    const currentData = {
      poreferencevalue: purchaseOrder.poreferencevalue || "",
      poDate: purchaseOrder.poDate,
      deliveryDate: purchaseOrder.deliveryDate,
      referenceDate: purchaseOrder.referenceDate,
      currency: purchaseOrder.currency,
      paymentTerms: purchaseOrder.paymentTerms,
      poType: purchaseOrder.poType || "general",
      contractDetails: {
        paymentSchedule:
          purchaseOrder.contractDetails?.paymentSchedule || "monthly",
        defaultWorkingDays:
          Number(purchaseOrder.contractDetails?.defaultWorkingDays || 22),
      },
      notes: purchaseOrder.notes || "",
      withSignature: purchaseOrder.withSignature,
      client: {
        name: purchaseOrder.client.name || "",
        address: purchaseOrder.client.address || "",
        stateCode: purchaseOrder.client.stateCode || "",
        taxNumber: purchaseOrder.client.taxNumber || "",
        taxIdentifierType: purchaseOrder.client.taxIdentifierType || "",
      },
      deliverTo: {
        name: purchaseOrder.deliverTo.name || "",
        address: purchaseOrder.deliverTo.address || "",
        stateCode: purchaseOrder.deliverTo.stateCode || "",
        taxNumber: purchaseOrder.deliverTo.taxNumber || "",
        taxIdentifierType: purchaseOrder.deliverTo.taxIdentifierType || "",
      },
      items: purchaseOrder.items.map((item) => ({
        description: item.description || "",
        hsnSac: item.hsnSac || "",
        quantity: item.quantity,
        rate: item.rate,
        gstRate: item.gstRate,
      })),
    };

    return JSON.stringify(currentData) !== existingPO;
  };

  // ---------- 2. Fetch COMPANY info (NEW) ----------
  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.company?._id) return;
      setLoadingCompany(true);
      try {
        const response = await getCompanyByIdApi(companyId);
        const companyData = response?.data || {};
        const formatAddress = (addressObj) =>
          [
            addressObj?.line1,
            addressObj?.city,
            addressObj?.state,
            addressObj?.country,
            addressObj?.pincode,
          ]
            .filter(Boolean)
            .join(", ");
        setCompanyInfo({
          companyName: companyData.tradeName || companyData.name || "",
          address: formatAddress(companyData.registeredAddress),
          gstin: companyData.taxDetails?.gstin || "",
          panNumber: companyData.taxDetails?.pan || "",
          tanNumber: companyData.taxDetails?.tan || "",
          bankName: companyData.bankDetails?.bankName || "",
          accountName: companyData.bankDetails?.accountHolderName || "",
          accountNumber: companyData.bankDetails?.accountNumber || "",
          ifscCode: companyData.bankDetails?.ifsc || "",
          branch: companyData.branchName || "",
        });
        setCompanyStateCode(getCompanyGstStateCode(companyData));
      } catch (error) {
        console.error("Error fetching company:", error);
        setError("Failed to load company information.");
      } finally {
        setLoadingCompany(false);
      }
    };
    fetchCompany();
  }, [user?.company?._id]);

  // ---------- 3. Fetch clients, HSN, and existing descriptions ----------
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.company?._id) return;

      try {
        setLoadingClients(true);

        const res = await getClientsApi(user.company._id);
        const clientsList = Array.isArray(res?.data) ? res.data : [];

        const activeClients = clientsList.filter((c) => c.isActive !== false);

        const mappedClients = activeClients.map((client) => {
          const fullAddress = [
            client.clientAddress,
            client.clientCity,
            client.clientState,
            client.pinCode,
            client.clientCountry,
          ]
            .filter(Boolean)
            .join(", ");

          const taxNumber =
            client.gstNumber ||
            client.panNumber ||
            client.vatNumber ||
            client.einNumber ||
            client.ssnNumber ||
            client.companyNumber ||
            client.nationalIdNumber ||
            client.taxIdentificationNumber ||
            "";
          const stateCode =
            client.stateCode || client.clientState || client.state || "";

          return {
            _id: client._id,
            clientCode: client.clientCode || "",
            clientName: client.clientName || "",
            contactPerson: client.contactPerson || "",
            phone: client.contactNumber || "",
            email: client.email || "",
            address: fullAddress,
            stateCode: stateCode,
            country: client.clientCountry || "India",
            taxIdentifierType: client.taxIdentifierType || "",
            taxNumber: taxNumber,
            rawClient: client,
          };
        });

        setClients(mappedClients);
        setFilteredClients(mappedClients);

        // ---------- HSN ----------
        setLoadingHsn(true);
        const hsnRes = await getallhsn(user.company._id);
        setHsnList(hsnRes.data || []);

        // ---------- Existing Descriptions ----------
        setLoadingDescriptions(true);
        const poRes = await getPurchaseOrdersApi(companyId, { limit: 100 });

        const descSet = new Set();
        poRes.data?.forEach((po) =>
          po.items?.forEach((item) => {
            if (item.description?.trim()) {
              descSet.add(item.description.trim());
            }
          }),
        );

        setExistingDescriptions([...descSet]);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError("Failed to load initial data.");
      } finally {
        setLoadingClients(false);
        setLoadingHsn(false);
        setLoadingDescriptions(false);
      }
    };

    fetchInitialData();
  }, [user?.company?._id]);

  // ---------- 4. Pre-select client if ?clientId=xxx is present (UPDATED) ----------
  useEffect(() => {
    if (clientIdParam && !isEditing && clients.length > 0) {
      const selectedClient = clients.find((c) => c._id === clientIdParam);
      if (selectedClient) {
        handleSelectClient(selectedClient);
        setSameAsClient(true);
        // Hide the dropdown and manual editing when client is preselected
        setEditingClient(false);
        setClientDropdownOpen(false);
        setEditingDeliverTo(false);
        setDeliverToDropdownOpen(false);
      }
    }
  }, [clientIdParam, clients, isEditing]);

  // ---------- 5. Auto‑calculate delivery date (7 days after PO date) ----------
  useEffect(() => {
    if (purchaseOrder.poDate && !isEditing) {
      const poDate = new Date(purchaseOrder.poDate);
      const delivery = new Date(poDate);
      delivery.setDate(poDate.getDate() + 7);
      setPurchaseOrder((prev) => ({
        ...prev,
        deliveryDate: delivery.toISOString().split("T")[0],
      }));
    }
  }, [purchaseOrder.poDate, isEditing]);

  // ---------- 6. Filter clients based on search ----------
  useEffect(() => {
    if (clientSearch) {
      const filtered = clients.filter(
        (c) =>
          c.clientName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.taxNumber?.toLowerCase().includes(clientSearch.toLowerCase()),
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientSearch, clients]);

  // ---------- 7. Filter deliverTo clients based on search ----------
  const [filteredDeliverToClients, setFilteredDeliverToClients] = useState([]);
  useEffect(() => {
    if (deliverToSearch) {
      const filtered = clients.filter(
        (c) =>
          c.clientName?.toLowerCase().includes(deliverToSearch.toLowerCase()) ||
          c.taxNumber?.toLowerCase().includes(deliverToSearch.toLowerCase()),
      );
      setFilteredDeliverToClients(filtered);
    } else {
      setFilteredDeliverToClients(clients);
    }
  }, [deliverToSearch, clients]);

  // ---------- 8. Recalculate totals when items or state codes change ----------
  useEffect(() => {
    const placeOfSupplyCode = getPlaceOfSupplyCode({
      deliverTo: purchaseOrder.deliverTo,
      client: purchaseOrder.client,
    });
    const sameState =
      companyStateCode &&
      placeOfSupplyCode &&
      companyStateCode === placeOfSupplyCode;

    let taxable = 0,
      cgst = 0,
      sgst = 0,
      igst = 0;
    purchaseOrder.items.forEach((item) => {
      const itemTaxable = item.taxableValue || 0;
      const itemGst = item.gstAmount || 0;
      taxable += itemTaxable;

      if (sameState) {
        cgst += Math.round(itemGst / 2);
        sgst += Math.round(itemGst / 2);
      } else {
        igst += Math.round(itemGst);
      }
    });

    const totalAmount = parseFloat((taxable + cgst + sgst + igst).toFixed(2));
    const valueInWords = convertToWords(totalAmount);

    setPurchaseOrder((prev) => ({
      ...prev,
      totalTaxableValue: parseFloat(taxable.toFixed(2)),
      totalAmount,
      totalCGSTAmount: parseFloat(cgst.toFixed(2)),
      totalSGSTAmount: parseFloat(sgst.toFixed(2)),
      totalIGSTAmount: parseFloat(igst.toFixed(2)),
      valueInWords,
    }));
  }, [
    purchaseOrder.items,
    purchaseOrder.deliverTo.stateCode,
    purchaseOrder.client.stateCode,
    companyStateCode,
  ]);

  // ---------- 9. Recalculate GST rates for items when state codes change ----------
  useEffect(() => {
    const placeOfSupplyCode = getPlaceOfSupplyCode({
      deliverTo: purchaseOrder.deliverTo,
      client: purchaseOrder.client,
    });
    if (!companyStateCode || !placeOfSupplyCode)
      return;

    const sameState = companyStateCode === placeOfSupplyCode;

    const newItems = purchaseOrder.items.map((item) => {
      if (!item.hsnSac) return item;

      const selectedHsn = hsnList.find((hsn) => hsn.hsnCode === item.hsnSac);
      if (!selectedHsn) return item;

      let gstRate = 0;
      if (sameState) {
        gstRate = selectedHsn.cgst + selectedHsn.sgst;
      } else {
        gstRate = selectedHsn.igst;
      }

      if (item.gstRate !== gstRate) {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const taxableValue = parseFloat((quantity * rate).toFixed(2));
        const gstAmount = parseFloat(
          ((taxableValue * gstRate) / 100).toFixed(2),
        );
        const total = parseFloat((taxableValue + gstAmount).toFixed(2));

        return {
          ...item,
          gstRate,
          taxableValue,
          gstAmount,
          total,
        };
      }
      return item;
    });

    if (JSON.stringify(newItems) !== JSON.stringify(purchaseOrder.items)) {
      setPurchaseOrder((prev) => ({ ...prev, items: newItems }));
    }
  }, [
    purchaseOrder.deliverTo.stateCode,
    purchaseOrder.client.stateCode,
    companyStateCode,
    hsnList,
  ]);

  // ---------- Convert number to words ----------
  const convertToWords = (amount) => {
    if (!amount || isNaN(amount)) return "";

    const ones = [
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

    const tens = [
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

    const numToWords = (num) => {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + " " + ones[num % 10];
      if (num < 1000)
        return (
          ones[Math.floor(num / 100)] + " Hundred " + numToWords(num % 100)
        );
      if (num < 100000)
        return (
          numToWords(Math.floor(num / 1000)) +
          " Thousand " +
          numToWords(num % 1000)
        );
      if (num < 10000000)
        return (
          numToWords(Math.floor(num / 100000)) +
          " Lakh " +
          numToWords(num % 100000)
        );
      return (
        numToWords(Math.floor(num / 10000000)) +
        " Crore " +
        numToWords(num % 10000000)
      );
    };

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = numToWords(rupees);
    if (paise > 0) {
      result += " and " + numToWords(paise);
    }

    return result + " Only";
  };

  // ---------- Handlers ----------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPurchaseOrder((prev) => ({ ...prev, [name]: value }));
  };

  const handleContractDetailsChange = (e) => {
    const { name, value } = e.target;
    setPurchaseOrder((prev) => ({
      ...prev,
      contractDetails: {
        ...prev.contractDetails,
        [name]:
          name === "defaultWorkingDays"
            ? Math.max(1, Number(value || 1))
            : value,
      },
    }));
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setPurchaseOrder((prev) => ({
      ...prev,
      client: { ...prev.client, [name]: value },
    }));
    if (sameAsClient) {
      setPurchaseOrder((prev) => ({
        ...prev,
        deliverTo: { ...prev.deliverTo, [name]: value },
      }));
    }
  };

  const handleDeliverToChange = (e) => {
    const { name, value } = e.target;
    setPurchaseOrder((prev) => ({
      ...prev,
      deliverTo: { ...prev.deliverTo, [name]: value },
    }));
  };

  const handleSameAsClient = (checked) => {
    setSameAsClient(checked);
    if (checked) {
      setPurchaseOrder((prev) => ({
        ...prev,
        deliverTo: { ...prev.client },
      }));
      setEditingDeliverTo(false);
      setDeliverToDropdownOpen(false);
    } else {
      setPurchaseOrder((prev) => ({
        ...prev,
        deliverTo: {
          _id: "",
          name: "",
          address: "",
          stateCode: "",
          taxNumber: "",
          taxIdentifierType: "",
        },
      }));
    }
  };

  const handleSelectClient = (client) => {
    if (!client) return;

    setPurchaseOrder((prev) => ({
      ...prev,
      client: {
        _id: client._id,
        name: client.clientName,
        address: client.address,
        stateCode: client.stateCode,
        taxNumber: client.taxNumber,
        taxIdentifierType: client.taxIdentifierType,
      },
    }));

    if (sameAsClient) {
      setPurchaseOrder((prev) => ({
        ...prev,
        deliverTo: {
          _id: client._id,
          name: client.clientName,
          address: client.address,
          stateCode: client.stateCode,
          taxNumber: client.taxNumber,
          taxIdentifierType: client.taxIdentifierType,
        },
      }));
    }

    setClientDropdownOpen(false);
    setClientSearch("");
    setEditingClient(false);
  };

  const handleClearClient = () => {
    setPurchaseOrder((prev) => ({
      ...prev,
      client: {
        _id: "",
        name: "",
        address: "",
        stateCode: "",
        taxNumber: "",
        taxIdentifierType: "",
      },
    }));
    setClientSearch("");
    setEditingClient(true);
  };

  const handleEditClient = () => {
    setEditingClient(true);
    setClientSearch(purchaseOrder.client.name);
  };

  // Deliver To handlers
  const handleSelectDeliverTo = (client) => {
    if (!client) return;

    setPurchaseOrder((prev) => ({
      ...prev,
      deliverTo: {
        _id: client._id,
        name: client.clientName,
        address: client.address,
        stateCode: client.stateCode,
        taxNumber: client.taxNumber,
        taxIdentifierType: client.taxIdentifierType,
      },
    }));

    setDeliverToDropdownOpen(false);
    setDeliverToSearch("");
    setEditingDeliverTo(false);
  };

  const handleClearDeliverTo = () => {
    setPurchaseOrder((prev) => ({
      ...prev,
      deliverTo: {
        _id: "",
        name: "",
        address: "",
        stateCode: "",
        taxNumber: "",
        taxIdentifierType: "",
      },
    }));
    setDeliverToSearch("");
    setEditingDeliverTo(true);
  };

  const handleEditDeliverTo = () => {
    setEditingDeliverTo(true);
    setDeliverToSearch(purchaseOrder.deliverTo.name);
  };

  const handleAddItem = () => {
    setPurchaseOrder((prev) => ({
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
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (purchaseOrder.items.length > 1) {
      setPurchaseOrder((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...purchaseOrder.items];
    newItems[index][field] = value;

    if (field === "hsnSac" && value) {
      const selectedHsn = hsnList.find((hsn) => hsn.hsnCode === value);
      if (selectedHsn) {
        const placeOfSupplyCode = getPlaceOfSupplyCode({
          deliverTo: purchaseOrder.deliverTo,
          client: purchaseOrder.client,
        });
        const sameState =
          companyStateCode &&
          placeOfSupplyCode &&
          companyStateCode === placeOfSupplyCode;
        let gstRate = 0;
        if (sameState) {
          gstRate = selectedHsn.cgst + selectedHsn.sgst;
        } else {
          gstRate = selectedHsn.igst;
        }
        newItems[index].gstRate = gstRate;
      }
    }

    let quantity = parseFloat(newItems[index].quantity) || 0;
    const rate = parseFloat(newItems[index].rate) || 0;
    const gstRate = parseFloat(newItems[index].gstRate) || 0;

    let taxableValue = parseFloat((quantity * rate).toFixed(2));
    if (field === "taxableValue") {
      taxableValue = clampNumber(parseFloat(value) || 0, 0);
      quantity = rate > 0 ? parseFloat((taxableValue / rate).toFixed(4)) : 0;
      newItems[index].quantity = quantity;
    }

    const gstAmount = parseFloat(((taxableValue * gstRate) / 100).toFixed(2));
    const total = parseFloat((taxableValue + gstAmount).toFixed(2));

    newItems[index].taxableValue = taxableValue;
    newItems[index].gstAmount = gstAmount;
    newItems[index].total = total;

    setPurchaseOrder((prev) => ({ ...prev, items: newItems }));
  };

  // ---------- Helper to get tax label ----------
  const getTaxLabel = (type) => {
    switch (type) {
      case "GST":
        return "GSTIN";
      case "PAN":
        return "PAN";
      case "VAT":
        return "VAT";
      case "EIN":
        return "EIN";
      case "SSN":
        return "SSN";
      case "CompanyNumber":
        return "Company No.";
      case "NationalID":
        return "National ID";
      default:
        return "Tax ID";
    }
  };

  // ---------- Validation & Submit ----------
  const validateForm = () => {
    const errors = [];
    if (!purchaseOrder.poDate) errors.push("PO Date is required");
    if (!purchaseOrder.deliveryDate) errors.push("Delivery Date is required");
    if (!purchaseOrder.client.name) errors.push("Client Name is required");
    if (!purchaseOrder.client.address)
      errors.push("Client Address is required");
    if (!purchaseOrder.deliverTo.name)
      errors.push("Deliver To Name is required");
    if (!purchaseOrder.deliverTo.address)
      errors.push("Deliver To Address is required");
    if (purchaseOrder.items.length === 0) {
      errors.push("At least one item is required");
    } else {
      purchaseOrder.items.forEach((item, idx) => {
        if (!item.description)
          errors.push(`Item ${idx + 1}: Description is required`);
        if (!item.quantity || item.quantity <= 0)
          errors.push(`Item ${idx + 1}: Quantity must be greater than 0`);
        if (!item.rate || item.rate < 0)
          errors.push(`Item ${idx + 1}: Rate must be 0 or greater`);
      });
    }
    if (purchaseOrder.poType === "contract") {
      if (!purchaseOrder.contractDetails?.paymentSchedule) {
        errors.push("Contract payment schedule is required");
      }
      if (Number(purchaseOrder.contractDetails?.defaultWorkingDays || 0) <= 0) {
        errors.push("Default working days must be greater than 0");
      }
    }
    return errors;
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError(null);
  //   const validationErrors = validateForm();
  //   if (validationErrors.length) {
  //     setError(validationErrors.join(". "));
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     const completePO = {
  //       ...purchaseOrder,
  //       client: {
  //         name: purchaseOrder.client.name.trim(),
  //         address: purchaseOrder.client.address.trim(),
  //         stateCode: purchaseOrder.client.stateCode?.trim() || "",
  //         GSTIN: purchaseOrder.client.taxNumber?.trim() || "",
  //         taxIdentifierType: purchaseOrder.client.taxIdentifierType || "",
  //       },
  //       deliverTo: {
  //         name: purchaseOrder.deliverTo.name.trim(),
  //         address: purchaseOrder.deliverTo.address.trim(),
  //         stateCode: purchaseOrder.deliverTo.stateCode?.trim() || "",
  //         GSTIN: purchaseOrder.deliverTo.taxNumber?.trim() || "",
  //         taxIdentifierType: purchaseOrder.deliverTo.taxIdentifierType || "",
  //       },
  //       items: purchaseOrder.items.map((item) => ({
  //         ...item,
  //         description: item.description.trim(),
  //         hsnSac: item.hsnSac?.trim() || "",
  //       })),
  //     };
  //     delete completePO.poNumber;

  //     let response;
  //     if (isEditing && createdPOId) {
  //       response = await updatePurchaseOrderApi(createdPOId, completePO);
  //       setSuccessMessage("Purchase Order updated successfully!");
  //     } else {
  //       response = await createPurchaseOrderApi(completePO);
  //       setSuccessMessage("Purchase Order created successfully!");
  //       setCreatedPOId(response.data._id);
  //       setPurchaseOrder((prev) => ({
  //         ...prev,
  //         poNumber: response.data.poNumber,
  //       }));
  //       setIsEditing(true);
  //     }
  //     setTimeout(() => setSuccessMessage(null), 5000);
  //   } catch (err) {
  //     console.error("Error saving PO:", err);
  //     setError(err.response?.data?.message || "Failed to save purchase order.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const validationErrors = validateForm();
    if (validationErrors.length) {
      setError(validationErrors.join(". "));
      return;
    }

    // Decide action but DO NOT call API yet
    if (isEditing && createdPOId) {
      setPendingAction("update");
    } else {
      setPendingAction("create");
    }

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);
    if (pendingAction === "update" && !isFormChanged()) {
      setShowConfirmModal(false);
      return;
    }

    try {
      const completePO = {
        ...purchaseOrder,
        client: {
          name: purchaseOrder.client.name.trim(),
          address: purchaseOrder.client.address.trim(),
          stateCode: purchaseOrder.client.stateCode?.trim() || "",
          GSTIN: purchaseOrder.client.taxNumber?.trim() || "",
          taxIdentifierType: purchaseOrder.client.taxIdentifierType || "",
        },
        deliverTo: {
          name: purchaseOrder.deliverTo.name.trim(),
          address: purchaseOrder.deliverTo.address.trim(),
          stateCode: purchaseOrder.deliverTo.stateCode?.trim() || "",
          GSTIN: purchaseOrder.deliverTo.taxNumber?.trim() || "",
          taxIdentifierType: purchaseOrder.deliverTo.taxIdentifierType || "",
        },
        items: purchaseOrder.items.map((item) => ({
          ...item,
          description: item.description.trim(),
          hsnSac: item.hsnSac?.trim() || "",
        })),
        poType: purchaseOrder.poType || "general",
        contractDetails:
          purchaseOrder.poType === "contract"
            ? {
                paymentSchedule:
                  purchaseOrder.contractDetails?.paymentSchedule || "monthly",
                defaultWorkingDays: Number(
                  purchaseOrder.contractDetails?.defaultWorkingDays || 22,
                ),
              }
            : undefined,
      };

      delete completePO.poNumber;

      if (pendingAction === "update" && createdPOId) {
        await updatePurchaseOrderApi(createdPOId, completePO);
      } else {
        const response = await createPurchaseOrderApi(completePO);
        setCreatedPOId(response.data._id);
      }

      // Show success modal
      setShowSuccessModal(true);

      // Redirect after delay
      setTimeout(() => {
        navigate(-1);
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save purchase order.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!createdPOId) {
      setError("Please save the purchase order first before downloading");
      return;
    }

    try {
      const response = await API.get(
        `/purchase-orders/${createdPOId}/download/pdf`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `PurchaseOrder_${purchaseOrder.poNumber}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setError("Failed to download PDF purchase order. Please try again.");
    }
  };

  const handleDownloadWord = async () => {
    if (!createdPOId) {
      setError("Please save the purchase order first before downloading");
      return;
    }

    try {
      const response = await API.get(
        `/purchase-orders/${createdPOId}/download/word`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `PurchaseOrder_${purchaseOrder.poNumber}.docx`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading Word document:", error);
      setError("Failed to download Word purchase order. Please try again.");
    }
  };

  const handleGoToList = () => navigate("/purchaseorder-data");

  // ---------- Loading state ----------
  if (loadingClients || loadingHsn || loadingCompany) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-neutral-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading purchase order data...</p>
        </div>
      </div>
    );
  }

  // ---------- JSX ----------
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4" style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#60a5fa 100%)" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all text-white">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  {isEditing ? `Edit Purchase Order` : "New Purchase Order"}
                  {isEditing && purchaseOrder.poNumber && (
                    <span className="ml-2 text-blue-200 font-mono text-sm">#{purchaseOrder.poNumber}</span>
                  )}
                </h1>
                <p className="text-blue-200 text-[11px] font-medium mt-0.5">
                  {clientIdParam && purchaseOrder?.client?.name
                    ? `For client: ${purchaseOrder.client.name}`
                    : "Fill in the details below"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && (
                <span className="px-3 py-1.5 bg-white/20 border border-white/30 text-white text-[10px] font-black rounded-xl uppercase tracking-wider">
                  Editing
                </span>
              )}
              <button onClick={handleGoToList} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl border border-white/30 transition-all">
                <ShoppingBag className="h-3.5 w-3.5" />
                All POs
              </button>
            </div>
          </div>
          {/* Company logo strip */}
          <div className="flex items-center justify-center py-3 border-b border-slate-100">
            <img src="https://res.cloudinary.com/dxqzklc00/image/upload/v1736234703/Nexu_oauth_lpewoq.png" alt="Logo" className="h-10 object-contain" />
          </div>
        </div>

        {/* ---------- TOP CLIENT SUMMARY (when preselected via clientId) ---------- */}
        {clientIdParam && !isEditing && purchaseOrder.client.name && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500 mb-5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex flex-wrap items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <User className="h-6 w-6 text-blue-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center">
                    {purchaseOrder.client.name}
                    <span className="ml-3 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      Client
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span className="text-gray-700">
                        {purchaseOrder.client.address}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">
                        {getTaxLabel(purchaseOrder.client.taxIdentifierType)}:
                      </span>{" "}
                      <span className="text-gray-800">
                        {purchaseOrder.client.taxNumber || "N/A"}
                      </span>
                    </div>
                    {purchaseOrder.client.stateCode && (
                      <div>
                        <span className="font-medium text-gray-600">
                          State Code:
                        </span>{" "}
                        <span className="text-gray-800">
                          {purchaseOrder.client.stateCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500">
                  Ship To (same as client)
                </p>
                <p className="text-sm font-medium">
                  {purchaseOrder.client.address}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Company Details - DYNAMIC from API */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
            <div className="flex items-center px-5 py-3.5 border-b border-slate-100" style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
              <Building className="mr-2 text-indigo-600" size={16} />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Company Details</h2>
            </div>
            <div className="p-6">
              {companyInfo ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">
                      Company Name
                    </h3>
                    <p className="text-gray-900">
                      {companyInfo.companyName ||
                        "Nexucon Consultancy Services Pvt Ltd"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-1">
                      Company Address
                    </h3>
                    <p className="text-gray-900">
                      {companyInfo.address ||
                        "Methopara, 60/N/3, Madhyamgram, North Twenty Four Parganas, West Bengal, 700132"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">
                        GSTIN
                      </h3>
                      <p className="text-gray-900">
                        {companyInfo.gstin }
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">
                        PAN
                      </h3>
                      <p className="text-gray-900">
                        {companyInfo.panNumber || "AAICN7264L"}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-1">
                        TAN
                      </h3>
                      <p className="text-gray-900">
                        {companyInfo.tanNumber || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading company details...</p>
              )}
            </div>
          </div>

          {/* Purchase Order Details (unchanged) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
            <div className="flex items-center px-5 py-3.5 border-b border-slate-100" style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
              <FileText className="mr-2 text-indigo-600" size={16} />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Purchase Order Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    name="poNumber"
                    value={purchaseOrder.poNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client PO  Reference
                  </label>
                  <input
                    type="text"
                    name="poreferencevalue"
                    value={purchaseOrder.poreferencevalue}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Client reference number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    name="paymentTerms"
                    value={purchaseOrder.paymentTerms}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="net-30">Net 30</option>
                    <option value="net-60">Net 60</option>
                    <option value="net-90">Net 90</option>
                    <option value="cod">Cash on Delivery</option>
                    <option value="advance">Advance Payment</option>
                    <option value="immediate">Immediate Payment</option>
                  </select>
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Type
                  </label>
                  <select
                    name="poType"
                    value={purchaseOrder.poType || "general"}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="general">General</option>
                    <option value="milestone">Milestone</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                {purchaseOrder.poType === "contract" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contract Payment Type
                      </label>
                      <select
                        name="paymentSchedule"
                        value={
                          purchaseOrder.contractDetails?.paymentSchedule ||
                          "monthly"
                        }
                        onChange={handleContractDetailsChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="monthly">Monthly Payment</option>
                        <option value="quarterly">Quarterly Payment</option>
                        <option value="half-yearly">Half Yearly Payment</option>
                        <option value="daily">Daily Payment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Working Days
                      </label>
                      <input
                        type="number"
                        name="defaultWorkingDays"
                        value={
                          purchaseOrder.contractDetails?.defaultWorkingDays ||
                          22
                        }
                        onChange={handleContractDetailsChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )} */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">
                        {purchaseOrder.currency}
                      </span>
                    </div>
                    <input
                      type="number"
                      name="totalAmount"
                      value={purchaseOrder.totalAmount.toFixed(2)}
                      readOnly
                      className="w-full pl-14 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Date *
                  </label>
                  <input
                    type="date"
                    name="poDate"
                    value={purchaseOrder.poDate}
                    onChange={handleInputChange}
                    className="w-full min-w-[11rem] px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={purchaseOrder.deliveryDate}
                    onChange={handleInputChange}
                    className="w-full min-w-[11rem] px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={purchaseOrder.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Date
                  </label>
                  <input
                    type="date"
                    name="referenceDate"
                    value={purchaseOrder.referenceDate}
                    onChange={handleInputChange}
                    className="w-full min-w-[11rem] px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={purchaseOrder.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                  placeholder="Additional notes or instructions..."
                />
              </div>
            </div>
          </div>

          {/* ---------- CLIENT DETAILS SECTION (hidden when client is preselected and not editing) ---------- */}
          {(!clientIdParam || isEditing) && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
              <div className="flex items-center px-5 py-3.5 border-b border-slate-100" style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
                <User className="mr-2 text-indigo-600" size={16} />
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Client Details</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Client Section */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-neutral-700">
                        Client *
                      </h3>
                      {purchaseOrder.client.name && !editingClient && (
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={handleEditClient}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={handleClearClient}
                            className="flex items-center text-sm text-red-600 hover:text-red-800"
                          >
                            <X size={16} className="mr-1" /> Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {!purchaseOrder.client.name || editingClient ? (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Client
                          {loadingClients && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Loading...)
                            </span>
                          )}
                          <span className="ml-2 text-xs text-gray-500">
                            ({filteredClients.length} clients)
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search client..."
                            value={clientSearch}
                            onChange={(e) => {
                              setClientSearch(e.target.value);
                              setClientDropdownOpen(true);
                            }}
                            onFocus={() => setClientDropdownOpen(true)}
                            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-400 pr-10"
                          />
                          <ChevronDown
                            className={`absolute right-3 top-2.5 text-gray-400 cursor-pointer ${
                              clientDropdownOpen ? "rotate-180" : ""
                            }`}
                            size={20}
                            onClick={() =>
                              setClientDropdownOpen(!clientDropdownOpen)
                            }
                          />
                          {clientDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {filteredClients.length ? (
                                filteredClients.map((client) => (
                                  <div
                                    key={client._id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                    onClick={() => handleSelectClient(client)}
                                  >
                                    <div className="font-medium">
                                      {client.clientName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      <span>
                                        {getTaxLabel(client.taxIdentifierType)}:{" "}
                                        {client.taxNumber || "N/A"}
                                      </span>
                                      {client.stateCode && (
                                        <span className="ml-2">
                                          State: {client.stateCode}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-gray-500">
                                  No clients found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              Client Name
                            </label>
                            <p className="text-sm font-medium">
                              {purchaseOrder.client.name}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              {getTaxLabel(
                                purchaseOrder.client.taxIdentifierType,
                              )}
                            </label>
                            <p className="text-sm">
                              {purchaseOrder.client.taxNumber || "N/A"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500">
                              Address
                            </label>
                            <p className="text-sm">
                              {purchaseOrder.client.address}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              State Code
                            </label>
                            <p className="text-sm">
                              {purchaseOrder.client.stateCode || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(!purchaseOrder.client.name || editingClient) && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Client Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={purchaseOrder.client.name}
                            onChange={handleClientChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address *
                          </label>
                          <textarea
                            name="address"
                            value={purchaseOrder.client.address}
                            onChange={handleClientChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              State Code
                            </label>
                            <input
                              type="text"
                              name="stateCode"
                              value={purchaseOrder.client.stateCode}
                              onChange={handleClientChange}
                              maxLength="2"
                              placeholder="e.g., 19"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tax ID
                            </label>
                            <input
                              type="text"
                              name="taxNumber"
                              value={purchaseOrder.client.taxNumber}
                              onChange={handleClientChange}
                              placeholder="Tax identification number"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          {purchaseOrder.client.taxIdentifierType && (
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tax ID Type
                              </label>
                              <input
                                type="text"
                                name="taxIdentifierType"
                                value={purchaseOrder.client.taxIdentifierType}
                                onChange={handleClientChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deliver To Section with Dropdown */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-900 mr-4">
                          Deliver To *
                        </h3>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="sameAsClient"
                            checked={sameAsClient}
                            onChange={(e) =>
                              handleSameAsClient(e.target.checked)
                            }
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <label
                            htmlFor="sameAsClient"
                            className="ml-2 text-sm text-gray-700"
                          >
                            Same as Client
                          </label>
                        </div>
                      </div>
                      {!sameAsClient &&
                        purchaseOrder.deliverTo.name &&
                        !editingDeliverTo && (
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={handleEditDeliverTo}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={handleClearDeliverTo}
                              className="flex items-center text-sm text-red-600 hover:text-red-800"
                            >
                              <X size={16} className="mr-1" /> Clear
                            </button>
                          </div>
                        )}
                    </div>

                    {sameAsClient ? (
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              Client Name
                            </label>
                            <p className="text-sm font-medium">
                              {purchaseOrder.client.name}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              {getTaxLabel(
                                purchaseOrder.client.taxIdentifierType,
                              )}
                            </label>
                            <p className="text-sm">
                              {purchaseOrder.client.taxNumber || "N/A"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500">
                              Address
                            </label>
                            <p className="text-sm">
                              {purchaseOrder.client.address}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500">
                              State Code
                            </label>
                            <p className="text-sm">
                              {purchaseOrder.client.stateCode || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {!purchaseOrder.deliverTo.name || editingDeliverTo ? (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Delivery Address
                              <span className="ml-2 text-xs text-gray-500">
                                ({filteredDeliverToClients.length} clients)
                              </span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search client for delivery..."
                                value={deliverToSearch}
                                onChange={(e) => {
                                  setDeliverToSearch(e.target.value);
                                  setDeliverToDropdownOpen(true);
                                }}
                                onFocus={() => setDeliverToDropdownOpen(true)}
                                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-400 pr-10"
                              />
                              <ChevronDown
                                className={`absolute right-3 top-2.5 text-gray-400 cursor-pointer ${
                                  deliverToDropdownOpen ? "rotate-180" : ""
                                }`}
                                size={20}
                                onClick={() =>
                                  setDeliverToDropdownOpen(
                                    !deliverToDropdownOpen,
                                  )
                                }
                              />
                              {deliverToDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                  {filteredDeliverToClients.length ? (
                                    filteredDeliverToClients.map((client) => (
                                      <div
                                        key={client._id}
                                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                        onClick={() =>
                                          handleSelectDeliverTo(client)
                                        }
                                      >
                                        <div className="font-medium">
                                          {client.clientName}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          <span>
                                            {getTaxLabel(
                                              client.taxIdentifierType,
                                            )}
                                            : {client.taxNumber || "N/A"}
                                          </span>
                                          {client.stateCode && (
                                            <span className="ml-2">
                                              State: {client.stateCode}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-4 text-center text-gray-500">
                                      No clients found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  Name
                                </label>
                                <p className="text-sm font-medium">
                                  {purchaseOrder.deliverTo.name}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  {getTaxLabel(
                                    purchaseOrder.deliverTo.taxIdentifierType,
                                  )}
                                </label>
                                <p className="text-sm">
                                  {purchaseOrder.deliverTo.taxNumber || "N/A"}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-500">
                                  Address
                                </label>
                                <p className="text-sm">
                                  {purchaseOrder.deliverTo.address}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  State Code
                                </label>
                                <p className="text-sm">
                                  {purchaseOrder.deliverTo.stateCode || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {(!purchaseOrder.deliverTo.name ||
                          editingDeliverTo) && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Name *
                              </label>
                              <input
                                type="text"
                                name="name"
                                value={purchaseOrder.deliverTo.name}
                                onChange={handleDeliverToChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address *
                              </label>
                              <textarea
                                name="address"
                                value={purchaseOrder.deliverTo.address}
                                onChange={handleDeliverToChange}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  State Code
                                </label>
                                <input
                                  type="text"
                                  name="stateCode"
                                  value={purchaseOrder.deliverTo.stateCode}
                                  onChange={handleDeliverToChange}
                                  maxLength="2"
                                  placeholder="e.g., 19"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tax ID
                                </label>
                                <input
                                  type="text"
                                  name="taxNumber"
                                  value={purchaseOrder.deliverTo.taxNumber}
                                  onChange={handleDeliverToChange}
                                  placeholder="Tax identification number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Section (unchanged) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100" style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
              <div className="flex items-center">
                <CreditCard className="mr-2 text-indigo-600" size={16} />
                <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Items</h2>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
              >
                <Plus className="mr-2 text-indigo-600" size={16} />
                Add Item
              </button>
            </div>
            <div className="p-6">
              {purchaseOrder.items.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                            S. No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Description *
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            HSN/SAC
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Qty *
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Rate *
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Taxable Value
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            GST %
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            GST Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {purchaseOrder.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-3 text-center font-semibold text-gray-700">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "description",
                                    e.target.value,
                                  )
                                }
                                list="descriptions"
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                placeholder="Item description..."
                                required
                              />
                              <datalist id="descriptions">
                                {existingDescriptions.map((desc, i) => (
                                  <option key={i} value={desc} />
                                ))}
                              </datalist>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={item.hsnSac}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "hsnSac",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              >
                                <option value="">Select HSN/SAC</option>
                                {hsnList.map((hsn) => (
                                  <option key={hsn._id} value={hsn.hsnCode}>
                                    {hsn.hsnCode} - {hsn.serviceType} (
                                    {hsn.cgst + hsn.sgst}% CGST+SGST /{" "}
                                    {hsn.igst}% IGST)
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                required
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.rate}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "rate",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                min="0"
                                step="0.01"
                                required
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.taxableValue}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "taxableValue",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              <input
                                type="number"
                                value={item.gstRate}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "gstRate",
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                min="0"
                                max="100"
                                step="0.01"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {item.gstAmount?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {item.total?.toFixed(2) || "0.00"}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                disabled={purchaseOrder.items.length === 1}
                                className={`text-red-500 hover:text-red-700 ${
                                  purchaseOrder.items.length === 1
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
                        Total: {purchaseOrder.currency}{" "}
                        {purchaseOrder.totalAmount.toFixed(2)}
                      </h3>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="mx-auto text-gray-400 mb-2" size={48} />
                  <p className="text-gray-500">
                    No items added yet. Click "Add Item" to get started.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bank & Amount Details - DYNAMIC from companyInfo */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
            <div className="flex items-center px-5 py-3.5 border-b border-slate-100" style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
              <Banknote className="mr-2 text-indigo-600" size={16} />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Bank & Amount Details</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bank Details */}
                <div className="bg-gradient-to-r from-neutral-700 to-neutral-500 text-white p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                  {companyInfo ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold opacity-90 mb-1">
                          Bank Name
                        </h4>
                        <p>{companyInfo.bankName || "ICICI Bank"}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold opacity-90 mb-1">
                          Account Name
                        </h4>
                        <p>
                          {companyInfo.accountName ||
                            "NEXUCON CONSULTANCY SERVICES PRIVATE"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold opacity-90 mb-1">
                            Account Number
                          </h4>
                          <p>{companyInfo.accountNumber || "128005500629"}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold opacity-90 mb-1">
                            IFSC Code
                          </h4>
                          <p>{companyInfo.ifscCode || "ICIC0001280"}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold opacity-90 mb-1">
                          Branch
                        </h4>
                        <p>{companyInfo.branch || "Baranagar"}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-300">Loading bank details...</p>
                  )}
                </div>

                {/* Amount Details (unchanged) */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Amount Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Taxable Value
                      </label>
                      <input
                        type="number"
                        name="totalTaxableValue"
                        value={purchaseOrder.totalTaxableValue.toFixed(2)}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Value in Words
                      </label>
                      <textarea
                        value={purchaseOrder.valueInWords}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        rows="2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total CGST
                        </label>
                        <input
                          type="number"
                          name="totalCGSTAmount"
                          value={purchaseOrder.totalCGSTAmount.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total SGST
                        </label>
                        <input
                          type="number"
                          name="totalSGSTAmount"
                          value={purchaseOrder.totalSGSTAmount.toFixed(2)}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total IGST
                      </label>
                      <input
                        type="number"
                        name="totalIGSTAmount"
                        value={purchaseOrder.totalIGSTAmount.toFixed(2)}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Generation Options (unchanged) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-5 overflow-hidden">
            <div className="flex items-center px-5 py-3.5 border-b border-slate-100" style={{background:"linear-gradient(90deg,#f8fafc 0%,#eff6ff 100%)"}}>
              <Download className="mr-2 text-indigo-600" size={16} />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">PDF Generation Options</h2>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="digitalSignature"
                      checked={purchaseOrder.withSignature}
                      onChange={(e) =>
                        setPurchaseOrder((prev) => ({
                          ...prev,
                          withSignature: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <label
                      htmlFor="digitalSignature"
                      className="ml-2 text-gray-700 font-medium"
                    >
                      Include Digital Signature
                    </label>
                  </div>
                  <span
                    className={`px-3 py-1 text-sm rounded-full ${
                      purchaseOrder.withSignature
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {purchaseOrder.withSignature
                      ? "With Signature"
                      : "Without Signature"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  When selected, the generated document will include a digital
                  signature placeholder.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center space-y-4 mt-8">
            <button
              type="submit"
              disabled={loading || (isEditing && !isFormChanged())}
              className={`px-8 py-3 text-white rounded-lg shadow-lg font-semibold text-lg ${
                loading || (isEditing && !isFormChanged())
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-neutral-700 hover:bg-neutral-800"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2 inline" />
              ) : null}
              {isEditing ? "Update Purchase Order" : "Create Purchase Order"}
            </button>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!createdPOId}
                className={`px-6 py-2 text-white rounded-lg flex items-center ${
                  !createdPOId
                    ? "bg-gray-400"
                    : "bg-gradient-to-r from-orange-500 to-pink-500"
                }`}
              >
                <Download className="mr-2 text-indigo-600" size={16} /> Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadWord}
                disabled={!createdPOId}
                className={`px-6 py-2 text-white rounded-lg flex items-center ${
                  !createdPOId
                    ? "bg-gray-400"
                    : "bg-gradient-to-r from-green-500 to-teal-500"
                }`}
              >
                <Download className="mr-2 text-indigo-600" size={16} /> Download Word
              </button>
            </div>
            {error && (
              <div className="w-full max-w-2xl bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="w-full max-w-2xl bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <Check className="h-5 w-5 text-green-400 inline mr-2" />
                <p className="text-sm text-green-700 inline">
                  {successMessage}
                </p>
              </div>
            )}
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 -mt-100">
          {/* Replace bg-white, rounded, shadow with your PO card classes */}
          <div className="bg-blue-100 rounded-lg p-6 w-96 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {pendingAction === "update"
                ? "Confirm Update"
                : "Confirm Creation"}
            </h2>

            <p className="text-gray-600 mb-6">
              {pendingAction === "update"
                ? "Are you sure you want to update this Purchase Order?"
                : "Are you sure you want to create this Purchase Order?"}
            </p>

            {/* Buttons container - adjust justify to match your layout (center/end) */}
            <div className="flex justify-between gap-4">
              {/* Cancel button - replace classes with your PO's secondary button style */}
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-300 rounded-md text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>

              {/* Confirm button - replace with your primary button style from PO */}
              <button
                onClick={executeSave}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-800 text-white rounded-md font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 -mt-100">
          {/* Match card style with your PO success/notification cards */}
          <div className="bg-blue-100 rounded-lg p-6 w-96 shadow-xl text-center">
            <div className="text-green-600 text-4xl mb-3">✓</div>

            <h2 className="text-lg font-semibold mb-2">
              {pendingAction === "update"
                ? "Purchase Order Updated Successfully!"
                : "Purchase Order Created Successfully!"}
            </h2>

            <p className="text-gray-600 text-sm">Redirecting back...</p>
          </div>
        </div>
      )}
    </div>
  );
}
