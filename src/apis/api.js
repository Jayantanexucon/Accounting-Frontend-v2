import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let getAccessTokenSilently = null;
let handleAuthFailure = null;

export const registerAuthHandlers = ({
  getAccessToken,
  onAuthFailure,
} = {}) => {
  getAccessTokenSilently = getAccessToken || null;
  handleAuthFailure = onAuthFailure || null;
};

API.interceptors.request.use(async (config) => {
  if (getAccessTokenSilently) {
    try {
      const accessToken = await getAccessTokenSilently();
      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
        localStorage.setItem("token", accessToken);
      }
    } catch (error) {
      if (handleAuthFailure) {
        await handleAuthFailure(error);
      }
      return Promise.reject(error);
    }
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";

    const isBlocked =
      status === 500 && message === "Your account has been blocked by administrator";

    if (
      status === 401 &&
      !originalRequest?._retry &&
      getAccessTokenSilently
    ) {
      try {
        originalRequest._retry = true;
        const accessToken = await getAccessTokenSilently(true);

        if (accessToken) {
          setAuthToken(accessToken);
          localStorage.setItem("token", accessToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        if (handleAuthFailure) {
          await handleAuthFailure(refreshError);
        }
        return Promise.reject(refreshError);
      }
    }

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
