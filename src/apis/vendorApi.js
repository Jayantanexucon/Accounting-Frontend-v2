import { API } from "./api";

// GET ALL vendors (global master data - no companyId filter)
export const getVendors = () => API.get(`/masterData/vendor`);

// CREATE vendor (companyId needed)
export const createVendor = (companyId, data) =>
  API.post(`/masterData/vendor/${companyId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// GET vendor by ID
export const getVendorById = (vendorId) =>
  API.get(`/masterData/vendor/details/${vendorId}`);

// UPDATE vendor (NO companyId needed)
export const updateVendor = (vendorId, data) =>
  API.put(`/masterData/vendor/update/${vendorId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// DELETE vendor
export const deleteVendor = (vendorId) =>
  API.delete(`/masterData/vendor/delete/${vendorId}`);

// MARK vendor as completed
export const completeVendor = (vendorId) =>
  API.put(`/masterData/vendor/complete/${vendorId}`);

export const getPaginatedVendors = async (page, limit) => {
  // Always fetch all vendors (global master data) - no companyId filter
  const res = await API.get(`/masterData/vendor?page=${page}&limit=${limit}`);
  return res.data;
};

