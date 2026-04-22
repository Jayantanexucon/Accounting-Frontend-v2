import countryRules from "./countryRules";

export const ADDRESS_TYPE_OPTIONS = [
  { value: "DEFAULT", label: "Default Address" },
  { value: "SHIP_TO", label: "Ship To" },
  { value: "BILL_TO", label: "Bill To" },
  { value: "BRANCH", label: "Branch" },
  { value: "OTHER", label: "Other" },
];

export const createEmptyAddress = (type = "SHIP_TO") => ({
  type,
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  pinCode: "",
  stateCode: "",
  gstStateCode: "",
  countryId: "",
  stateId: "",
  isDefault: type === "DEFAULT",
  isShipTo: type === "SHIP_TO",
});

export const ensureAddressArray = (addresses = [], fallback = {}) => {
  const sourceAddresses = [];

  if (fallback.defaultAddress) {
    sourceAddresses.push(fallback.defaultAddress);
  }

  if (Array.isArray(fallback.additionalAddresses) && fallback.additionalAddresses.length > 0) {
    sourceAddresses.push(...fallback.additionalAddresses);
  } else if (Array.isArray(addresses) && addresses.length > 0) {
    sourceAddresses.push(...addresses);
  }

  if (sourceAddresses.length > 0) {
    return sourceAddresses.map((address, index) => ({
      ...createEmptyAddress(index === 0 ? "DEFAULT" : "SHIP_TO"),
      ...address,
      type: index === 0 ? "DEFAULT" : address.type || "SHIP_TO",
      isDefault: index === 0,
      isShipTo: index === 0 ? false : (address.isShipTo ?? address.type === "SHIP_TO"),
    }));
  }

  return [
    {
      ...createEmptyAddress("DEFAULT"),
      line1: fallback.line1 || fallback.clientAddress || fallback.registeredAddress || "",
      city: fallback.city || fallback.clientCity || "",
      state: fallback.state || fallback.clientState || "",
      country: fallback.country || fallback.clientCountry || "India",
      pinCode: fallback.pinCode || "",
      stateCode: fallback.stateCode || "",
      gstStateCode: fallback.gstStateCode || "",
    },
  ];
};

export const buildCountryOptions = (countries = []) =>
  [...countries]
    .sort((a, b) => (a.countryName || "").localeCompare(b.countryName || ""))
    .map((country) => ({
      value: country._id,
      label: country.countryName,
      countryName: country.countryName,
      countryCode: country.countryCode,
      // Currency is now embedded in country
      currency: country.currency || null,
      currencyName: country.currency?.currencyName || "",
      currencyCode: country.currency?.currencyCode || "",
      currencySymbol: country.currency?.currencySymbol || "",
      // Tax config (new structure)
      taxConfig: country.taxConfig || null,
      taxSystem: country.taxConfig?.taxSystem || "NONE",
      isGSTApplicable: country.taxConfig?.isGSTApplicable || false,
      isRCMApplicable: country.taxConfig?.isRCMApplicable || false,
      isExportZeroRated: country.taxConfig?.isExportZeroRated || false,
      // Legacy fields (for backward compatibility)
      taxTypes: country.taxTypes || [],
      countryType: country.countryType || "OTHER",
      postalCodeLabel: country.postalCodeLabel || "Postal Code",
    }));

export const findCountryOption = (countries = [], address = {}) =>
  countries.find(
    (country) =>
      country.value === address.countryId ||
      country.countryName === address.country
  );

export const buildStateOptions = (states = [], countries = [], address = {}) => {
  const selectedCountry = findCountryOption(countries, address);
  const masterStates = states
    .filter((state) => {
      const stateCountryId = typeof state.country === "object" ? state.country?._id : state.country;
      return selectedCountry
        ? stateCountryId === selectedCountry.value
        : state.country?.countryName === address.country;
    })
    .map((state) => ({
      value: state._id,
      label: state.stateName,
      stateName: state.stateName,
      stateCode: state.stateCode || "",
      gstStateCode: state.gstStateCode || "",
    }));

  const fallbackStates = (countryRules[address.country]?.states || []).map((state) => ({
    value: "",
    label: state.name,
    stateName: state.name,
    stateCode: state.code || "",
    gstStateCode: state.gstStateCode || "",
  }));

  const unique = new Map();
  [...masterStates, ...fallbackStates].forEach((state) => {
    if (!state.stateName) return;
    unique.set(state.stateName, state);
  });

  return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
};

export const getTaxTypesForCountry = (countries = [], countryName = "") => {
  const country = countries.find((item) => item.countryName === countryName);
  if (country?.taxTypes?.length) return country.taxTypes;
  if (countryRules[countryName]?.taxFields?.length) return countryRules[countryName].taxFields;
  return [];
};

export const mapTaxDetailsToValues = (taxDetails = []) =>
  taxDetails.reduce((acc, item) => {
    if (item?.taxType) {
      acc[item.taxType] = item.taxNumber || "";
    }
    return acc;
  }, {});

export const valuesToTaxDetails = (taxValues = {}) =>
  Object.entries(taxValues)
    .filter(([, value]) => String(value || "").trim())
    .map(([taxType, taxNumber]) => ({
      taxType,
      label: taxType,
      taxNumber: String(taxNumber).trim().toUpperCase(),
    }));

export const formatAddressText = (address = {}) =>
  [address.line1, address.line2, address.city, address.state, address.country, address.pinCode]
    .filter(Boolean)
    .join(", ");
