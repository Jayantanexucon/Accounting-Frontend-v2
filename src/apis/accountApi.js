import { API } from "./api";

export const getAccountsApi = async (companyId) => {
  const { data } = await API.get(`/account/${companyId}`);
  return data;
};

export const addAccountApi = async (form, companyId) => {
  const { data } = await API.post(`/account/${companyId}`, form);
  return data;
};

export const updateAccountApi = async (accountId, form, companyId) => {
  const { data } = await API.put(`/account/${companyId}/${accountId}`, form);
  return data;
};

export const getLedgerApi = async (accountId, companyId, signal) => {
  const { data } = await API.get(`/account/${companyId}/ledger/${accountId}`, {
    signal,
  });
  return data;
};

export const getAccountBasedOnYearApi = async (companyId, signal) => {
  const { data } = await API.get(`/account/${companyId}/year`, {
    signal,
  });
  return data;
};

export const getAccountByPeriodApi = async (companyId, periodData, signal) => {
  const { data } = await API.get(`/account/${companyId}/period`, {
    params: periodData,
    signal,
  });
  return data;
};


export const getMonthlyFinancialSummaryFYApi = async (companyId, year, signal) => {
  const { data } = await API.get(`/account/${companyId}/financial-summary/monthly`, {
    params: { year },
    signal,
  });

  return data;
};
