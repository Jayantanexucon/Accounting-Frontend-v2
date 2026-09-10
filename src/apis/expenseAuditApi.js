import { API } from "./api";

export const getExpenseAuditOverviewApi = async (companyId, financialYearEnding) => {
  const { data } = await API.get(`/accounting/expense-audit/overview/${companyId}`, {
    params: { financialYearEnding },
  });
  return data;
};

export const listAuditIdentifiersApi = async (companyId) => {
  const { data } = await API.get(`/accounting/expense-audit/identifiers/${companyId}`);
  return data;
};

export const createAuditIdentifierApi = async (payload) => {
  const { data } = await API.post("/accounting/expense-audit/identifiers", payload);
  return data;
};

export const updateAuditIdentifierApi = async ({ id, ...payload }) => {
  const { data } = await API.put(`/accounting/expense-audit/identifiers/${id}`, payload);
  return data;
};

export const deleteAuditIdentifierApi = async ({ id, companyId }) => {
  const { data } = await API.delete(`/accounting/expense-audit/identifiers/${id}`, { params: { companyId } });
  return data;
};

export const uploadExpenseAuditApi = async (payload) => {
  const { data } = await API.post("/accounting/expense-audit/upload", payload);
  return data;
};
