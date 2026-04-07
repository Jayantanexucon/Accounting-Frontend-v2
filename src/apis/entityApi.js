import { API } from "./api";

export const getEntitiesApi = async () => {
  try {
    const { data } = await API.get("/masterData/entity");
    // // console.log("ENTITY", data);
    return data;
  } catch (error) {
    throw error;
  }
};

export const getCompaniesApi = async () => {
  try {
    const { data } = await API.get("/users/companies/all");
    return data;
  } catch (error) {
    throw error;
  }
};

export const getEntityTreeApi = async () => {
  try {
    const { data } = await API.get("/masterData/entity/tree");
    return data;
  } catch (error) {
    throw error;
  }
};

export const createEntityApi = async (payload) => {
  try {
    const { data } = await API.post("/masterData/entity", payload);
    return data;
  } catch (error) {
    throw error;
  }
};

export const updateEntityApi = async (id, payload) => {
  try {
    const { data } = await API.put(`/masterData/entity/${id}`, payload);
    return data;
  } catch (error) {
    throw error;
  }
};
