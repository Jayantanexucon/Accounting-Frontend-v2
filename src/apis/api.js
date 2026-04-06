import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";

    const isBlocked =
      status === 500 && message === "Your account has been blocked by administrator";

    if (status === 401 || isBlocked) {
      localStorage.clear();
      // Fire a global event — React will catch this and logout properly
      window.dispatchEvent(
        new CustomEvent("force-logout", {
          detail: { reason: isBlocked ? "blocked" : "unauthorized" },
        })
      );
    }

    return Promise.reject(error);
  }
);

export const setAuthToken = (accessToken) => {
  const token = accessToken || localStorage.getItem("token");
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common.Authorization;
  }
};
