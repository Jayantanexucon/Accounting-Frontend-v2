import { API } from "./api";

export const getScheduleIIIBalanceSheetApi = async (companyId, params, signal) => {
  const { data } = await API.get(`/reports/${companyId}/schedule-iii/balance-sheet`, {
    params,
    signal,
  });
  return data;
};

export const getScheduleIIIProfitLossApi = async (companyId, params, signal) => {
  const { data } = await API.get(`/reports/${companyId}/schedule-iii/profit-loss`, {
    params,
    signal,
  });
  return data;
};
