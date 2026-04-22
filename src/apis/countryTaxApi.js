import { API } from "./api";

/**
 * GET ALL Country Tax rates
 */
export const getAllCountryTaxApi = async () => {
  const { data } = await API.get("/masterData/countryTax");
  return data;
};

/**
 * GET Country Tax by country code (e.g. "US", "CN")
 */
export const getCountryTaxByCodeApi = async (countryCode) => {
  const { data } = await API.get(`/masterData/countryTax/byCode/${countryCode}`);
  return data;
};

/**
 * GET Country Tax by ID
 */
export const getCountryTaxByIdApi = async (id) => {
  const { data } = await API.get(`/masterData/countryTax/${id}`);
  return data;
};

/**
 * CREATE Country Tax rate
 */
export const createCountryTaxApi = async (payload) => {
  const { data } = await API.post("/masterData/countryTax", payload);
  return data;
};

/**
 * UPDATE Country Tax rate
 */
export const updateCountryTaxApi = async (id, payload) => {
  const { data } = await API.put(`/masterData/countryTax/${id}`, payload);
  return data;
};

/**
 * DELETE Country Tax rate
 */
export const deleteCountryTaxApi = async (id) => {
  const { data } = await API.delete(`/masterData/countryTax/${id}`);
  return data;
};
