import { API } from "./api";

/**
 * Get all users
 */
export const getUsersApi = async () => {
  const { data } = await API.get(`/users`);
  return data;
};

/**
 * Create new user (Super Admin)
 */
export const createUserApi = async (payload) => {
  const { data } = await API.post(`/users`, payload);
  return data;
};

/**
 * Edit user (name, role, email, block)
 */
export const editUserApi = async (id, payload) => {
  const { data } = await API.put(`/users/${id}`, payload);
  return data;
};

/**
 * Update permissions (Permission Modal)
 */
export const updateUserPermissionsApi = async (userId, payload) => {
  const { data } = await API.put(`/users/${userId}/permissions`, {
    companyId: payload.companyId,
    permissions: payload.permissions,
  });
  return data;
};

export const createCompanyApi = async (payload) => {
  const { data } = await API.post("/users/company", payload);
  return data;
};

export const updateCompanyApi = async (companyId, payload) => {
  const { data } = await API.put(`/users/company/${companyId}`, payload);
  return data;
};

export const getAllCompaniesApi = async () => {
  const { data } = await API.get("/users/companies/all");
  return data;
};

export const getCompanyByIdApi = async (companyId) => {
  const { data } = await API.get(`/users/companies/${companyId}`);
  return data;
};
