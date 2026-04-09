export const formatCurrency = (
  amount,
  format = "en-IN",
  currency = "INR",
  minFrac = 0
) =>
  new Intl.NumberFormat(format, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: minFrac,
  }).format(Math.abs(amount));

export const toCamelCase = (str) => {
  if (str == null) return "";

  return String(str)
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, "");
};

export const formatCamelCase = (key) =>
  key == null
    ? ""
    : String(key)
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
