import { API } from "./api";

// GET ALL vendors of one company
export const getVendors = (companyId) => API.get(`/vendor/${companyId}`);

// CREATE vendor (companyId needed)
export const createVendor = (companyId, data) =>
  API.post(`/vendor/${companyId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// GET vendor by ID
export const getVendorById = (vendorId) =>
  API.get(`/vendor/details/${vendorId}`);

// UPDATE vendor (NO companyId needed)
export const updateVendor = (vendorId, data) =>
  API.put(`/vendor/update/${vendorId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// DELETE vendor
export const deleteVendor = (vendorId) =>
  API.delete(`/vendor/delete/${vendorId}`);

// MARK vendor as completed
export const completeVendor = (vendorId) =>
  API.put(`/vendor/complete/${vendorId}`);

export const getPaginatedVendors = async (companyId, page, limit) => {
  const res = await API.get(`/vendor/${companyId}?page=${page}&limit=${limit}`);
  return res.data;
};

