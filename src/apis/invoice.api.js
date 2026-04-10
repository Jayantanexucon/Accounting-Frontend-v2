import { API } from "./api";

const INVOICE_BASE = "/invoices";
const ACCOUNTING_PAYMENT_BASE = "/accounting/payment";

const normalizeInvoicePayload = (payload = {}) => {
  const normalizedItems = (payload.items || []).map((item) => ({
    ...item,
    totalAmount:
      item.totalAmount ??
      item.total ??
      Number(item.taxableValue || 0) + Number(item.gstAmount || 0),
  }));

  return {
    ...payload,
    items: normalizedItems,
  };
};

// CREATE
export const createInvoiceApi = async (payload) => {
  const { data } = await API.post(INVOICE_BASE, normalizeInvoicePayload(payload));
  return data;
};

//bulk upload
export const bulkCreateInvoicesApi = async (payload) => {
  const { data } = await API.post(INVOICE_BASE, payload);
  return data;
};

// GET LIST
export const getInvoicesApi = async (companyId, params = {}) => {
  const { data } = await API.get(INVOICE_BASE, {
    params: { companyId, ...params },
  });
  return data;
};

const normalizePaymentMode = (paymentMode = "") => {
  const map = {
    bank_transfer: "BANK_TRANSFER",
    cash: "CASH",
    cheque: "CHEQUE",
    card: "CREDIT_CARD",
    online: "DIGITAL_WALLET",
    upi: "DIGITAL_WALLET",
    other: "OTHER",
  };

  return map[paymentMode] || "BANK_TRANSFER";
};

// GET SINGLE
export const getInvoiceByIdApi = async (id) => {
  const { data } = await API.get(`${INVOICE_BASE}/${id}`);
  return data;
};

// UPDATE
export const updateInvoiceApi = async (id, payload) => {
  const { data } = await API.put(`${INVOICE_BASE}/${id}`, normalizeInvoicePayload(payload));
  return data;
};

// DELETE
export const deleteInvoiceApi = async (id) => {
  const { data } = await API.delete(`${INVOICE_BASE}/${id}`);
  return data;
};

// DOWNLOAD
export const downloadInvoicePdfApi = (id) =>
  API.get(`${INVOICE_BASE}/${id}/export`, {
    params: { format: "pdf" },
    responseType: "blob",
  });

export const downloadInvoiceWordApi = (id) =>
  API.get(`${INVOICE_BASE}/${id}/export`, {
    params: { format: "word" },
    responseType: "blob",
  });

// Search invoice by number
export const searchInvoiceByNumberApi = async (invoiceNumber) => {
  const { data } = await API.get(`${INVOICE_BASE}/search/number`, {
    params: { invoiceNo: invoiceNumber },
  });
  return data;
};

// Get invoice by number (for ledger creation)
export const getInvoiceByNumberApi = async (invoiceNo) => {
  const { data } = await API.get(`${INVOICE_BASE}/search/number`, {
    params: { invoiceNo },
  });
  return data;
};

// Get clients from invoices
export const getInvoiceClientsApi = async (companyId) => {
  const { data } = await API.get("/masterData/client", {
    params: companyId ? { companyId } : {},
  });
  return data;
};

// Get TDS details for client
export const getClientTdsDetailsApi = async (clientId) => {
  const { data } = await API.get(`/invoices/client/${clientId}/tds`);
  return data;
};

// Create ledger from invoice
export const createLedgerFromInvoiceApi = async (payload) => {
  const { data } = await API.post(`${INVOICE_BASE}/${payload.invoiceId}/post-sales-journal`);
  return data;
};

// Get all invoice numbers for dropdown
export const getAllInvoiceNumbersApi = async () => {
  const invoices = await getInvoicesApi("", { limit: 10000 });
  return invoices;
};

// Get pending invoice approvals
export const pendingApprovalInvoiceApi = (companyId, signal) =>
  API.get(`${INVOICE_BASE}/approvals/pending`, {
    params: { companyId },
    signal,
  });

// approve / reject invoice
export const updateInvoiceApprovalApi = (id, versionNo, approvalStatus) =>
  API.post(
    `${INVOICE_BASE}/${id}/${approvalStatus === "Approved" ? "approve" : "reject"}`,
    { versionNo, approvalStatus }
  );

export const validateInvoiceAccountsApi = async (companyId) => {
  return {
    data: {
      allRequiredAccountsExist: true,
      missingAccounts: [],
    },
  };
};

export const createClientLedgerFromInvoiceApi = async (companyId, invoiceId) => {
  const { data } = await API.post(`${INVOICE_BASE}/${invoiceId}/post-sales-journal`);
  return data;
};

export const createJournalFromInvoiceApi = async (companyId, invoiceId) => {
  const { data } = await API.post(`${INVOICE_BASE}/${invoiceId}/post-sales-journal`);
  return data;
};

export const completeInvoiceAccountingApi = async (companyId, invoiceId) => {
  const { data } = await API.post(`${INVOICE_BASE}/${invoiceId}/post-sales-journal`);
  return data;
};

export const getInvoiceAccountingStatusApi = async (companyId, invoiceId) => {
  const { data } = await API.get(`${INVOICE_BASE}/${invoiceId}`);
  return data;
};

export const postInvoiceSalesJournalApi = async (invoiceId) => {
  const { data } = await API.post(`${INVOICE_BASE}/${invoiceId}/post-sales-journal`);
  return data;
};

export const getInvoicePaymentsApi = async (companyId, invoiceId) => {
  const { data } = await API.get(`${ACCOUNTING_PAYMENT_BASE}/invoice/search`, {
    params: { companyId, invoiceId },
  });
  return data;
};

export const recordInvoicePaymentApi = async ({
  invoiceId,
  companyId,
  clientId,
  amountPaid,
  tdsAmount,
  paymentDate,
  referenceNumber,
  remarks,
  paymentMode,
}) => {
  const normalizedAmountPaid = Number(amountPaid || 0);
  const normalizedTdsAmount = Number(tdsAmount || 0);

  const paymentRecord = await API.post(ACCOUNTING_PAYMENT_BASE, {
    invoiceId,
    companyId,
    clientId,
    amountPaid: normalizedAmountPaid,
    tdsAmount: normalizedTdsAmount,
    grossAmount: normalizedAmountPaid + normalizedTdsAmount,
    paymentMode: normalizePaymentMode(paymentMode),
    paymentDate,
    reference: referenceNumber,
    notes: remarks,
  });

  const invoicePayment = await API.post(`${INVOICE_BASE}/${invoiceId}/payment`, {
    paidAmount: normalizedAmountPaid,
    tdsAmount: normalizedTdsAmount,
    paymentDate,
    reference: referenceNumber,
  });

  return {
    payment: paymentRecord.data,
    invoice: invoicePayment.data,
  };
};

export const getInvoiceTdsReportApi = async ({
  companyId,
  fromDate,
  toDate,
}) => {
  const now = new Date();
  const start = fromDate || `${now.getFullYear()}-01-01`;
  const end = toDate || `${now.getFullYear()}-12-31`;
  const { data } = await API.get(`${ACCOUNTING_PAYMENT_BASE}/report/tds`, {
    params: {
      companyId,
      startDate: start,
      endDate: end,
    },
  });
  return data;
};
