function getParsedLocalStorage(key) {
  const value = localStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (err) {
    console.error(`Invalid JSON in localStorage for key: ${key}`, value);
    localStorage.removeItem(key); // 🔥 important
    return null;
  }
}
export default getParsedLocalStorage;