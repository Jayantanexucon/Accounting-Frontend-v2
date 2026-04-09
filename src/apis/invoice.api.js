import { API } from "./api";

const INVOICE_BASE = "api/invoices/";

// CREATE
export const createInvoiceApi = async (payload) => {
  const { data } = await API.post(INVOICE_BASE, payload);
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

// GET SINGLE
export const getInvoiceByIdApi = async (id) => {
  const { data } = await API.get(`${INVOICE_BASE}/${id}`);
  return data;
};

// UPDATE
export const updateInvoiceApi = async (id, payload) => {
  const { data } = await API.put(`${INVOICE_BASE}/${id}`, payload);
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
  });

export const downloadInvoiceWordApi = (id) =>
  API.get(`${INVOICE_BASE}/${id}/export`, {
    params: { format: "word" },
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
export const getInvoiceClientsApi = async () => {
  const { data } = await API.get("/invoices/invoice-clients");
  return data;
};

// Get TDS details for client
export const getClientTdsDetailsApi = async (clientId) => {
  const { data } = await API.get(`/invoices/client/${clientId}/tds`);
  return data;
};

// Create ledger from invoice
export const createLedgerFromInvoiceApi = async (payload) => {
  const { data } = await API.post("/invoices/:companyId/create-ledger", payload);
  return data;
};

// Get all invoice numbers for dropdown
export const getAllInvoiceNumbersApi = async () => {
  const { data } = await API.get("/invoices/all-numbers");
  return data;
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
  const { data } = await API.get(`/invoice-accounting/validate-accounts/${companyId}`);
  return data;
};

export const createClientLedgerFromInvoiceApi = async (companyId, invoiceId) => {
  const { data } = await API.post(`/invoice-accounting/${companyId}/create-ledger`, { invoiceId });
  return data;
};

export const createJournalFromInvoiceApi = async (companyId, invoiceId) => {
  const { data } = await API.post(`/invoice-accounting/${companyId}/create-journal`, { invoiceId });
  return data;
};

export const completeInvoiceAccountingApi = async (companyId, invoiceId) => {
  const { data } = await API.post(`/invoice-accounting/${companyId}/complete-accounting`, { invoiceId });
  return data;
};

export const getInvoiceAccountingStatusApi = async (companyId, invoiceId) => {
  const { data } = await API.get(`/invoice-accounting/${companyId}/status/${invoiceId}`);
  return data;
};
