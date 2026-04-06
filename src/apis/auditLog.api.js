import { API } from "./api";

export const getAuditLogsApi = async (companyId, filters = {}) => {
  // Just pass the filters object directly as params
  const { data } = await API.get(`/audit-logs/${companyId}`, { params: filters });
  return data;
};
export const getJournalAuditSummaryApi = (companyId) => {
  return API.get(`/audit-logs/${companyId}/audit-summary`);
};

export const getJournalAuditLogsApi = (companyId, journalId) => {
  return API.get(`/audit-logs/${companyId}/${journalId}/audit-logs`);
};

export const getInvoiceUpdatesApi = (companyId, invoiceId, params = {}) => {
  return API.get(`/audit-logs/${companyId}/${invoiceId}/updates`, {
    params: params
  });
};