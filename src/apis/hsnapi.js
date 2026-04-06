import { API } from "./api";

/**
 * GET ALL HSN (company scoped)
 */
export const getallhsn = async (companyId) => {
  const { data } = await API.get(`/hsn/${companyId}`);
  return data;
};

/**
 * GET SINGLE HSN
 */
export const gethsnbyid = async (companyId, id) => {
  const { data } = await API.get(`/hsn/${companyId}/${id}`);
  return data;
};

/**
 * CREATE HSN
 */
export const createhsn = async (companyId, payload) => {
  const { data } = await API.post(`/hsn/${companyId}`, payload);
  return data;
};

/**
 * UPDATE HSN
 */
export const updatehsnbyid = async (companyId, id, payload) => {
  const { data } = await API.put(`/hsn/${companyId}/${id}`, payload);
  return data;
};

/**
 * DELETE HSN
 */
export const deletehsnbyid = async (companyId, id) => {
  const { data } = await API.delete(`/hsn/${companyId}/${id}`);
  return data;
};


