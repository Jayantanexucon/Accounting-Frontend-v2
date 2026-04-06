import dayjs from "dayjs";
import {
  Edit,
  Download,
  Eye,
  Mail,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function InvoiceExpandedDetails({ invoice }) {
  const formatDate = (date) =>
    date ? dayjs(date).format("DD-MMM-YYYY") : "-";

  return (
    <div className="border-t bg-gray-50 p-4 text-sm">
      {/* TOP SUMMARY */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-base">
            {invoice.invoiceNo}
          </h3>
          <p className="text-gray-500 text-xs">
            {formatDate(invoice.invoiceDate)} •{" "}
            {invoice.billTo?.name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-gray-500 text-xs">Total Amount</p>
          <p className="text-lg font-bold">
            ₹ {(invoice.amountDue || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-3 gap-6">
        {/* VENDOR DETAILS */}
        <div>
          <p className="font-semibold mb-2">Vendor Details</p>
          <p className="font-medium">{invoice.billTo?.name}</p>
          <p className="text-xs text-gray-600">
            {invoice.billTo?.address}
          </p>
          <p className="text-xs text-gray-600">
            GSTIN: {invoice.billTo?.GSTIN || "-"}
          </p>
          <p className="text-xs text-gray-600">
            State: {invoice.billTo?.state || "-"}
          </p>
        </div>

        {/* FINANCIAL DETAILS */}
        <div>
          <p className="font-semibold mb-2">Financial Details</p>

          <div className="flex justify-between">
            <span>Taxable Value</span>
            <span>₹ {invoice.taxableValue || 0}</span>
          </div>

          <div className="flex justify-between">
            <span>Total Tax</span>
            <span>₹ {invoice.totalTax || 0}</span>
          </div>

          <div className="flex justify-between">
            <span>Payment Terms</span>
            <span>{invoice.paymentTerms || "-"}</span>
          </div>

          <div className="flex justify-between">
            <span>Due Date</span>
            <span>{formatDate(invoice.dueDate)}</span>
          </div>
        </div>

        {/* TAX BREAKDOWN */}
        <div>
          <p className="font-semibold mb-2">Tax Breakdown</p>

          <div className="flex justify-between">
            <span>CGST</span>
            <span>₹ {invoice.cgst || 0}</span>
          </div>

          <div className="flex justify-between">
            <span>SGST</span>
            <span>₹ {invoice.sgst || 0}</span>
          </div>

          <div className="flex justify-between">
            <span>IGST</span>
            <span>₹ {invoice.igst || 0}</span>
          </div>

          <hr className="my-2" />

          <div className="flex justify-between font-semibold">
            <span>Total Amount</span>
            <span>₹ {(invoice.amountDue || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* ACTION BAR */}
      <div className="mt-4 flex gap-4 border-t pt-3">
        <Link
          to={`/master-data/manual-invoice?edit=${invoice._id}`}
          className="flex items-center gap-1 text-blue-600"
        >
          <Edit size={14} /> Edit
        </Link>

        <button className="flex items-center gap-1">
          <Download size={14} /> PDF
        </button>

        <button className="flex items-center gap-1">
          <Eye size={14} /> Preview
        </button>

        <button className="flex items-center gap-1">
          <Mail size={14} /> Email
        </button>

        <span className="ml-auto flex items-center gap-1 text-green-600">
          <CheckCircle size={14} /> Approved
        </span>
      </div>
    </div>
  );
}
