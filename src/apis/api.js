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

  // 🔍 DEBUG: Log cookies being sent with each request
  if (config.url?.includes("fetchMe") || config.url?.includes("auth")) {
    const acCmpCookie = document.cookie.split('; ').find(row => row.startsWith('AC_CMP='));
    console.log(`📡 [${config.method?.toUpperCase()}] ${config.url}`, {
      withCredentials: config.withCredentials,
      AC_CMP_cookie: acCmpCookie ? `${acCmpCookie.split('=')[0]}=${acCmpCookie.split('=')[1]}` : "NOT FOUND",
      hasBearerToken: !!config.headers?.Authorization,
    });
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
      // Preserve company selection before clearing
      const selectedCompany = localStorage.getItem("selectedCompany");
      localStorage.clear();
      if (selectedCompany && !isBlocked) {
        // Only restore if not blocked
        localStorage.setItem("selectedCompany", selectedCompany);
      }
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
