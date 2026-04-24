import { API } from "./api";

export const getAuditLogsApi = async (companyId, filters = {}) => {
  // Just pass the filters object directly as params
  const { data } = await API.get(`/audit-logs/${companyId}`, { params: filters });
  return data;
};
export const getJournalAuditSummaryApi = (companyId) => {
  return API.get(`/audit-logs/${companyId}/summary`);
};

export const getJournalAuditLogsApi = (companyId, journalId) => {
  return API.get(`/audit-logs/${companyId}/${journalId}/journal-updates`);
};

export const getInvoiceUpdatesApi = (companyId, invoiceId, params = {}) => {
  return API.get(`/audit-logs/${companyId}/${invoiceId}/invoice-updates`, {
    params: params
  });
};