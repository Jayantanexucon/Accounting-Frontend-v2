import { API } from "./api";

export const addJournalApi = async (form, companyId) => {
  const { data } = await API.post(`/journal/${companyId}`, form);
  return data;
};



export const allJournalApi = async (companyId, params = {}, signal) => {
  const { data } = await API.get(`/journal/${companyId}`, { 
    params, 
    signal 
  });
  return data; 
};

export const getJournalByIdApi = async (companyId, journalId) => {
  const { data } = await API.get(`/journal/${companyId}/${journalId}`);
  return data;
};

export const deleteJournalApi = async (companyId, journalId) => {
  const { data } = await API.delete(`/journal/${companyId}/${journalId}`);
  return data;
};
export const updateJournalApi = async (companyId, journalId, payload) => {
  const { data } = await API.put(`/journal/${companyId}/${journalId}`, payload);
  return data;
};


export const getJournalStatsApi = async (companyId, params = {}, signal) => {
  const { data } = await API.get(`/journal/${companyId}/stats`, { 
    params, 
    signal 
  });
  return data;
};

export const getJournalApprovalRequestsApi = async (companyId) => {
  const { data } = await API.get(`/journal/${companyId}/approval-requests`);
  return data;
};

export const requestJournalEditApprovalApi = async (
  companyId,
  journalId,
  payload,
) => {
  const { data } = await API.post(
    `/journal/${companyId}/${journalId}/request-edit`,
    payload,
  );
  return data;
};

export const requestJournalDeleteApprovalApi = async (companyId, journalId) => {
  const { data } = await API.post(`/journal/${companyId}/${journalId}/request-delete`);
  return data;
};

export const updateJournalApprovalRequestApi = async (
  companyId,
  requestId,
  status,
) => {
  const { data } = await API.put(
    `/journal/${companyId}/approval-requests/${requestId}`,
    { status },
  );
  return data;
};

// ── Excel Bulk Upload ──────────────────────────────────────────────────────────

/**
 * Upload an Excel file and get a preview of grouped journal entries.
 * @param {string} companyId
 * @param {FormData} formData  — must contain a field named "file"
 */
export const uploadJournalExcelApi = async (companyId, formData) => {
  const { data } = await API.post(`/journal-excel/${companyId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/**
 * Save only the valid journal entries returned by the preview step.
 * @param {string} companyId
 * @param {{ validEntries: Array }} payload
 */
export const confirmJournalExcelApi = async (companyId, payload) => {
  const { data } = await API.post(`/journal-excel/${companyId}/confirm`, payload);
  return data;
};
