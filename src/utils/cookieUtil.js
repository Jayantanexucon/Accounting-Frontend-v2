import Cookies from "js-cookie";

export const setCookie = (key, value, options = {}) => {
  // Determine if we should use secure cookies
  // Priority: 1) Explicit VITE_COOKIE_SECURE env var, 2) HTTPS protocol, 3) Dev mode
  const isSecure = 
    import.meta.env.VITE_COOKIE_SECURE === "true" || 
    import.meta.env.VITE_COOKIE_SECURE === true ||
    (typeof window !== "undefined" && window.location.protocol === "https:");
  
  const defaultOptions = {
    expires: 30, // 30 days
    secure: isSecure,
    // sameSite: Lax allows cookies in cross-site requests (needed for reload to work)
    // Strict requires same-site only (very restrictive)
    sameSite: "Lax",
    path: "/", // Ensure cookie is available on all paths
  };
  
  Cookies.set(key, value, { ...defaultOptions, ...options });
  console.log(`🍪 Cookie set: ${key}=${value}`, {
    secure: isSecure,
    sameSite: "Lax",
    path: "/",
    expires: 30,
  });
};

export const getCookie = (key) => {
  return Cookies.get(key) || null;
};

export const removeCookie = (key) => {
  Cookies.remove(key);
};

export const getAllCookies = () => {
  return Cookies.get();
};
