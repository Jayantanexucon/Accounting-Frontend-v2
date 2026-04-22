import Cookies from "js-cookie";

export const setCookie = (key, value, options = {}) => {
  const defaultOptions = {
    expires: 7,
    secure: import.meta.env.VITE_COOKIE_SECURE === "true",
    // For localhost development, use "Lax" to allow cross-domain requests
    // For production, use "Strict"
    sameSite: import.meta.env.MODE === "production" ? "Strict" : "Lax",
  };
  Cookies.set(key, value, { ...defaultOptions, ...options });
  console.log(`🍪 Cookie set: ${key}=${value}`, defaultOptions);
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
