// BulkPurchaseOrderPage.jsx (with client preselection support)
import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API } from "../apis/api";
import { getClientsApi } from "../apis/clientApi";
import { getallhsn } from "../apis/hsnapi";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  FileText,
  AlertCircle,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ArrowLeft } from "lucide-react";
import { useRef } from "react";

// Helper to convert number to words (copied from main PO page)
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
      return ones[Math.floor(num / 100)] + " Hundred " + numToWords(num % 100);
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
  if (paise > 0) result += " and " + numToWords(paise);
  return result + " Only";
};

export default function BulkPurchaseOrderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const clientId = queryParams.get("clientId");

  const selectedCompany = JSON.parse(localStorage.getItem("selectedCompany"));
  const companyId = selectedCompany?._id;

  const [clients, setClients] = useState([]);
  const [hsnList, setHsnList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [enrichedPOs, setEnrichedPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [preselectedClient, setPreselectedClient] = useState(null);

  // Fetch master data (global - no companyId filter)
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Always fetch all data (global master data) - no companyId filter
        const [clientsRes, hsnRes] = await Promise.all([
          getClientsApi(),
          getallhsn(),
        ]);
        setClients(clientsRes.data || []);
        setHsnList(hsnRes.data || []);
      } catch (err) {
        setError("Could not load master data. Please refresh.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Find preselected client from the loaded clients list
  useEffect(() => {
    if (clientId && clients.length > 0) {
      const client = clients.find((c) => c._id === clientId);
      setPreselectedClient(client);
    } else {
      setPreselectedClient(null);
    }
  }, [clientId, clients]);

  // Download template (conditional)
  const downloadTemplate = () => {
    const baseColumns = [
      "Client Reference",
      "PO Date",
      "Delivery Date",
      "Currency",
      "Payment Terms",
      "With Signature",
      "Notes",
      "Item Description",
      "HSN Code",
      "Quantity",
      "Rate",
    ];
    const headers = preselectedClient
      ? baseColumns
      : ["Client Code", ...baseColumns];

    const exampleRow1 = preselectedClient
      ? [
          "REF-001",
          "01/03/2026",
          "05/03/2026",
          "INR",
          "Net 30",
          "No",
          "Urgent order",
          "Steel Rod",
          "1001",
          10,
          500,
        ]
      : [
          "CL001",
          "REF-001",
          "01/03/2026",
          "05/03/2026",
          "INR",
          "Net 30",
          "No",
          "Urgent order",
          "Steel Rod",
          "1001",
          10,
          500,
        ];

    const exampleRow2 = preselectedClient
      ? [
          "REF-001",
          "01/03/2026",
          "05/03/2026",
          "INR",
          "Net 30",
          "No",
          "Urgent order",
          "Iron Sheet",
          "1010",
          5,
          1200,
        ]
      : [
          "CL001",
          "REF-001",
          "01/03/2026",
          "05/03/2026",
          "INR",
          "Net 30",
          "No",
          "Urgent order",
          "Iron Sheet",
          "1010",
          5,
          1200,
        ];

    const wsData = [headers, exampleRow1, exampleRow2];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Bulk_PO_Template.xlsx");
  };

  // Drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Enrich a minimal PO for preview
  const enrichPO = useCallback(
    (minimalPO) => {
      // If we have a preselected client, use it; otherwise look up by clientCode
      const client =
        preselectedClient ||
        clients.find((c) => c.clientCode === minimalPO.clientCode);
      if (!client) return null;

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
        client.gstNumber || client.panNumber || client.vatNumber || "";

      let totalTaxable = 0,
        totalCGST = 0,
        totalSGST = 0,
        totalIGST = 0,
        totalAmount = 0;
      const items = minimalPO.items
        .map((item) => {
          const hsn = hsnList.find((h) => h.hsnCode === item.hsnCode);
          if (!hsn) return null;

          const qty = Number(item.quantity) || 0;
          const rate = Number(item.rate) || 0;
          const taxable = qty * rate;
          const cgst = (taxable * (hsn.cgst || 0)) / 100;
          const sgst = (taxable * (hsn.sgst || 0)) / 100;
          const gstAmt = cgst + sgst;
          const total = taxable + gstAmt;

          totalTaxable += taxable;
          totalCGST += cgst;
          totalSGST += sgst;
          totalAmount += total;

          return {
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: qty,
            rate,
            taxableValue: parseFloat(taxable.toFixed(2)),
            gstRate: parseFloat((hsn.cgst + hsn.sgst).toFixed(2)),
            gstAmount: parseFloat(gstAmt.toFixed(2)),
            cgst: parseFloat(cgst.toFixed(2)),
            sgst: parseFloat(sgst.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
          };
        })
        .filter(Boolean);

      totalTaxable = parseFloat(totalTaxable.toFixed(2));
      totalCGST = parseFloat(totalCGST.toFixed(2));
      totalSGST = parseFloat(totalSGST.toFixed(2));
      totalAmount = parseFloat(totalAmount.toFixed(2));

      return {
        clientReference: minimalPO.clientReference,
        poDate: minimalPO.poDate,
        deliveryDate: minimalPO.deliveryDate,
        currency: minimalPO.currency,
        paymentTerms: minimalPO.paymentTerms,
        withSignature: minimalPO.withSignature,
        notes: minimalPO.notes,
        client: {
          name: client.clientName,
          address: fullAddress,
          stateCode: client.stateCode || client.clientState || "",
          taxNumber,
          taxIdentifierType: client.taxIdentifierType || "",
        },
        items,
        totals: {
          taxable: totalTaxable,
          cgst: totalCGST,
          sgst: totalSGST,
          igst: totalIGST,
          total: totalAmount,
          inWords: convertToWords(totalAmount),
        },
      };
    },
    [clients, hsnList, preselectedClient],
  );

  // Upload handler
  const handleUpload = async () => {
    if (!file) return setError("Please select a file");
    if (clients.length === 0 || hsnList.length === 0) {
      return setError("Master data still loading. Please wait.");
    }

    const formData = new FormData();
    formData.append("file", file);
    if (clientId) {
      formData.append("clientId", clientId);
    }

    try {
      setLoading(true);
      setError(null);
      const res = await API.post(`/bulk-po/${companyId}/upload`, formData);
      const preview = res.data.preview;
      setPreviewData(preview);
      const enriched = preview.validPOs
        .map((po) => enrichPO(po))
        .filter(Boolean);
      setEnrichedPOs(enriched);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // Download failed rows (unchanged)
  const downloadFailedRows = () => {
    if (!previewData?.failedRows?.length) return;

    const firstRow = previewData.failedRows[0].data;
    const baseColumns = Object.keys(firstRow).filter(
      (key) =>
        !key.startsWith("_") &&
        key !== "rowNumber" &&
        key !== "errors" &&
        key !== "isValid",
    );
    const columns = [...baseColumns, "Error"];

    const wsData = [columns];
    previewData.failedRows.forEach((fr) => {
      const row = fr.data;
      const rowValues = baseColumns.map((col) => row[col] || "");
      rowValues.push(fr.error);
      wsData.push(rowValues);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Failed Rows");
    XLSX.writeFile(
      wb,
      `Failed_PO_Rows_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewData && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [previewData]);

  // Confirm & Save
  const handleConfirm = async () => {
    if (!previewData?.validPOs?.length) return;
    try {
      setSaving(true);
      await API.post(`/bulk-po/${companyId}/confirm`, {
        validPOs: previewData.validPOs,
        clientId: clientId || undefined,
      });
      alert("Bulk POs saved successfully!");
      setPreviewData(null);
      setEnrichedPOs([]);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Confirmation failed");
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading master data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative text-center mb-8">
          {/* Back Button - Top Left */}
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 transition"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            Bulk Purchase Order Upload
          </h1>

          <p className="mt-2 text-sm text-gray-600 max-w-2xl mx-auto">
            Upload an Excel file with multiple purchase orders. All rows with
            the same Client Reference will be grouped into one PO.
          </p>
        </div>

        {/* Preselected client banner */}
        {preselectedClient && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <p className="text-sm text-blue-700">
              Uploading POs for client:{" "}
              <strong>{preselectedClient.clientName}</strong> (
              {preselectedClient.clientCode}). The "Client Code" column is not
              required in the Excel file.
            </p>
          </div>
        )}

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-lg font-semibold text-white flex items-center">
              <Upload className="mr-2" size={20} />
              Upload Excel File
            </h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1 w-full">
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {file ? file.name : "Drag & drop or click to select"}
                  </p>
                  {file && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </button>
                <button
                  onClick={handleUpload}
                  disabled={loading || !file}
                  className="inline-flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  ) : null}
                  Upload & Preview
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Format Guide & Rules – unchanged, but we may add a note about client column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Format Guide – we can modify the table conditionally, but keep as is for simplicity */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Info className="mr-2 h-5 w-5 text-blue-600" />
                Required Excel Format
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                {preselectedClient ? (
                  <>
                    <strong>Client Code column is NOT required</strong> – all
                    rows will be assigned to {preselectedClient.clientName}.
                  </>
                ) : (
                  "Client Code column is required."
                )}{" "}
                Dates must be in{" "}
                <span className="font-mono bg-gray-100 px-1">DD/MM/YYYY</span>{" "}
                format.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Column
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Required
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-3 py-2 font-mono">Client Reference</td>
                      <td>Yes</td>
                      <td>Your client's reference (may be duplicate)</td>
                    </tr>
                    {!preselectedClient && (
                      <tr>
                        <td className="px-3 py-2 font-mono">Client Code</td>
                        <td>Yes</td>
                        <td>Must exist in your client master</td>
                      </tr>
                    )}
                    <tr>
                      <td className="px-3 py-2 font-mono">PO Date</td>
                      <td>Yes</td>
                      <td>Order date (DD/MM/YYYY)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Delivery Date</td>
                      <td>Yes</td>
                      <td>Expected delivery date</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Currency</td>
                      <td>No</td>
                      <td>Defaults to INR</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Payment Terms</td>
                      <td>No</td>
                      <td>Net 30, Net 60, etc. (default Net 30)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">With Signature</td>
                      <td>No</td>
                      <td>Yes/No (default No)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Notes</td>
                      <td>No</td>
                      <td>Any additional notes</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Item Description</td>
                      <td>Yes</td>
                      <td>Product/service description</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">HSN Code</td>
                      <td>Yes</td>
                      <td>Must exist in your HSN master</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Quantity</td>
                      <td>Yes</td>
                      <td>Positive number</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono">Rate</td>
                      <td>Yes</td>
                      <td>Unit price (positive)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rules & Guidelines – unchanged */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-amber-600" />
                Rules & Guidelines
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 mt-0.5">
                    1
                  </span>
                  <span>
                    Rows with the same <strong>Client Reference</strong> are
                    grouped into a single purchase order.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 mt-0.5">
                    2
                  </span>
                  <span>
                    All header fields (Dates, Currency, etc.) must be identical
                    for all rows of the same reference; otherwise the entire
                    group is rejected.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 mt-0.5">
                    3
                  </span>
                  <span>
                    If any row in a group fails validation (missing fields,
                    invalid data, or master data not found), the whole group is
                    marked as failed.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 mt-0.5">
                    4
                  </span>
                  <span>
                    Dates must be in{" "}
                    <span className="font-mono bg-gray-100 px-1">
                      DD/MM/YYYY
                    </span>{" "}
                    format (e.g., 01/03/2026).
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mr-2 mt-0.5">
                    5
                  </span>
                  <span>
                    GST is calculated based on the HSN master. Currently assumes
                    intra‑state supply (CGST+SGST).
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview Section – same as before */}
        {previewData && (
          <div ref={previewRef} className="mb-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wider">
                  Total Rows
                </p>
                <p className="text-3xl font-bold text-gray-800">
                  {previewData.totalRows}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-sm text-green-600 uppercase tracking-wider">
                  Valid POs
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {previewData.validPOs.length}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-sm text-red-600 uppercase tracking-wider">
                  Failed Rows
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {previewData.failedRows.length}
                </p>
              </div>
            </div>

            {/* Failed Rows */}
            {previewData.failedRows.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
                <div className="bg-red-50 px-6 py-4 border-b border-red-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-red-700 flex items-center">
                    <XCircle className="mr-2" size={20} />
                    Failed Rows ({previewData.failedRows.length})
                  </h3>
                  <button
                    onClick={downloadFailedRows}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Failed Rows
                  </button>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Row
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Client Reference
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.failedRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.rowNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.clientReference}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600">
                            {row.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Valid POs */}
            {enrichedPOs.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <CheckCircle className="mr-2 text-green-600" size={24} />
                  Valid Purchase Orders ({enrichedPOs.length})
                </h2>
                {enrichedPOs.map((po, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                  >
                    {/* Header */}
                    <div
                      className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center cursor-pointer hover:bg-gray-100"
                      onClick={() =>
                        setExpanded(expanded === index ? null : index)
                      }
                    >
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          Ref: {po.clientReference}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Client: {po.client.name} | {po.currency} | Terms:{" "}
                          {po.paymentTerms}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold text-gray-700">
                          Total: {po.totals.total.toFixed(2)}
                        </span>
                        {expanded === index ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expanded === index && (
                      <div className="p-6">
                        {/* Header Fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm bg-blue-50 p-4 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-700">
                              PO Date:
                            </span>{" "}
                            {po.poDate}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Delivery Date:
                            </span>{" "}
                            {po.deliveryDate}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Currency:
                            </span>{" "}
                            {po.currency}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Payment Terms:
                            </span>{" "}
                            {po.paymentTerms}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              With Signature:
                            </span>{" "}
                            {po.withSignature ? "Yes" : "No"}
                          </div>
                          {po.notes && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">
                                Notes:
                              </span>{" "}
                              {po.notes}
                            </div>
                          )}
                        </div>

                        {/* Client Info */}
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-700 mb-2">
                            Client Details
                          </p>
                          <p className="text-sm">{po.client.name}</p>
                          <p className="text-sm text-gray-600">
                            {po.client.address}
                          </p>
                          <p className="text-sm text-gray-600">
                            State Code: {po.client.stateCode || "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Tax: {po.client.taxNumber}
                          </p>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full border text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left">#</th>
                                <th className="px-3 py-2 text-left">
                                  Description
                                </th>
                                <th className="px-3 py-2 text-left">HSN</th>
                                <th className="px-3 py-2 text-right">Qty</th>
                                <th className="px-3 py-2 text-right">Rate</th>
                                <th className="px-3 py-2 text-right">
                                  Taxable
                                </th>
                                <th className="px-3 py-2 text-right">GST%</th>
                                <th className="px-3 py-2 text-right">CGST</th>
                                <th className="px-3 py-2 text-right">SGST</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {po.items.map((item, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-center">
                                    {i + 1}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.description}
                                  </td>
                                  <td className="px-3 py-2">{item.hsnCode}</td>
                                  <td className="px-3 py-2 text-right">
                                    {item.quantity}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.rate.toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.taxableValue.toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.gstRate.toFixed(2)}%
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.cgst.toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.sgst.toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {item.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                          <div className="bg-gray-100 p-4 rounded-lg w-64">
                            <div className="flex justify-between text-sm">
                              <span>Taxable:</span>
                              <span className="font-medium">
                                {po.totals.taxable.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>CGST:</span>
                              <span className="font-medium">
                                {po.totals.cgst.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>SGST:</span>
                              <span className="font-medium">
                                {po.totals.sgst.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold border-t mt-2 pt-2">
                              <span>Total:</span>
                              <span>{po.totals.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-gray-50 italic text-sm rounded">
                          <span className="font-medium">Amount in words: </span>
                          {po.totals.inWords}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Confirm Button */}
                <div className="text-center mt-6">
                  <button
                    onClick={handleConfirm}
                    disabled={saving}
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    ) : null}
                    Confirm & Save {previewData.validPOs.length} Purchase Orders
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
