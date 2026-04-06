import { API } from "./api";

export const addClientApi = async (clientData) => {
  const { data } = await API.post(`/client/create`, clientData);
  return data;
};

export const getClientsApi = async (companyId, signal) => {
  const { data } = await API.get(`/client`, {
    params: { companyId },
    signal,
  });
  return data;
};

export const getClientByIdApi = async (clientId, signal) => {
  const { data } = await API.get(`/client/${clientId}`, { signal });
  return data;
};

export const updateClientApi = async (clientId, clientData) => {
  const { data } = await API.put(`/client/${clientId}`, clientData);
  return data;
};

export const deleteClientApi = async (clientId) => {
  const { data } = await API.delete(`/client/${clientId}`);
  return data;
};

export const pendingApprovalClientApi = async (companyId, signal) => {
  const { data } = await API.get(`/client/pending/${companyId}`, { signal });
  return data;
};

export const statusUpdateClientApi = async (clientId, versionNo, status) => {
  const { data } = await API.put(
    `/client/status/${clientId}?versionNo=${versionNo}&status=${status}`
  );
  return data;
};

export const getClientsPaginatedApi = async (params, signal) => {
  const { data } = await API.get(`/client/paginated`, {
    params,
    signal,
  });
  return data;
};
