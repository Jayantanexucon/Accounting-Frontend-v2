import { API } from "./api";

/**
 * GET ALL HSN (global master data - no companyId filter)
 */
export const getallhsn = async () => {
  const { data } = await API.get(`/masterData/hsn`);
  return data;
};

/**
 * GET SINGLE HSN (global master data - no companyId filter)
 */
export const gethsnbyid = async (id) => {
  const { data } = await API.get(`/masterData/hsn/${id}`);
  return data;
};

/**
 * CREATE HSN
 */
export const createhsn = async (companyId, payload) => {
  const { data } = await API.post(`/masterData/hsn/${companyId}`, payload);
  return data;
};

/**
 * UPDATE HSN
 */
export const updatehsnbyid = async (companyId, id, payload) => {
  const { data } = await API.put(`/masterData/hsn/${companyId}/${id}`, payload);
  return data;
};

/**
 * DELETE HSN
 */
export const deletehsnbyid = async (companyId, id) => {
  const { data } = await API.delete(`/masterData/hsn/${companyId}/${id}`);
  return data;
};


