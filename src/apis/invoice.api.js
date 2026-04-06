import { API } from "./api";

// CREATE
export const createInvoiceApi = async (payload) => {
  const { data } = await API.post("/invoices/create", payload);
  return data;
};

//bulk upload
export const bulkCreateInvoicesApi = async (payload) => {
  const { data } = await API.post("/invoices/bulk-create", payload);
  return data;
};

// GET LIST
export const getInvoicesApi = async (companyId, params = {}) => {
  const { data } = await API.get(`/invoices/getall/${companyId}`, { params });
  return data;
};

// GET SINGLE
export const getInvoiceByIdApi = async (id) => {
  const { data } = await API.get(`/invoices/get/${id}`);
  return data;
};

// UPDATE
export const updateInvoiceApi = async (id, payload) => {
  const { data } = await API.put(`/invoices/put/${id}`, payload);
  return data;
};

// DELETE
export const deleteInvoiceApi = async (id) => {
  const { data } = await API.delete(`/invoices/delete/${id}`);
  return data;
};

// DOWNLOAD
export const downloadInvoicePdfApi = (id) => API.get(`/invoices/${id}/download/pdf`, { responseType: "blob" });

export const downloadInvoiceWordApi = (id) => API.get(`/invoices/${id}/download/word`, { responseType: "blob" });

// Search invoice by number
export const searchInvoiceByNumberApi = async (invoiceNumber) => {
  const { data } = await API.get(`/invoices/search/${invoiceNumber}`);
  return data;
};

// Get invoice by number (for ledger creation)
export const getInvoiceByNumberApi = async (invoiceNo) => {
  const { data } = await API.get(`/invoices/by-number/${invoiceNo}`);
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
  API.get(`/invoices/pending-approval/${companyId}`, { signal });

// approve / reject invoice
export const updateInvoiceApprovalApi = (id, versionNo, approvalStatus) =>
  API.put(`/invoices/update-approval/${id}`, {
    versionNo,
    approvalStatus,
  });

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
