import { API } from "./api";

export const getCountriesApi = async () => {
  const { data } = await API.get("/masterData/country");
  return data;
};

export const createCountryApi = async (payload) => {
  const { data } = await API.post("/masterData/country/create", payload);
  return data;
};

export const getStatesApi = async () => {
  const { data } = await API.get("/masterData/state");
  return data;
};

export const createStateApi = async (payload) => {
  const { data } = await API.post("/masterData/state/create", payload);
  return data;
};
