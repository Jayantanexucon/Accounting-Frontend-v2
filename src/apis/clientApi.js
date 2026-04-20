import { API } from "./api";

export const addClientApi = async (clientData) => {
  const companyId = clientData?.companyId;
  if (!companyId) {
    throw new Error("companyId is required to create a client");
  }

  const { data } = await API.post(`/masterData/client/create/${companyId}`, clientData);
  return data;
};

export const getClientsApi = async (signal) => {
  // Always fetch all clients (global master data) - no companyId filter
  const { data } = await API.get(`/masterData/client`, { signal });
  return data;
};

export const getClientByIdApi = async (clientId, signal) => {
  const { data } = await API.get(`/masterData/client/${clientId}`, { signal });
  return data;
};

export const updateClientApi = async (clientId, clientData) => {
  const { data } = await API.put(`/masterData/client/${clientId}`, clientData);
  return data;
};

export const deleteClientApi = async (clientId) => {
  const { data } = await API.delete(`/masterData/client/${clientId}`);
  return data;
};

export const pendingApprovalClientApi = async (signal) => {
  // Always fetch all pending clients (global master data) - no companyId filter
  const { data } = await API.get(`/masterData/client/pending`, { signal });
  return data;
};

export const statusUpdateClientApi = async (clientId, versionNo, status) => {
  const { data } = await API.put(
    `/masterData/client/status/${clientId}?versionNo=${versionNo}&status=${status}`
  );
  return data;
};

export const getClientsPaginatedApi = async (params, signal) => {
  const { data } = await API.get(`/masterData/client/paginated`, {
    params,
    signal,
  });
  return data;
};
