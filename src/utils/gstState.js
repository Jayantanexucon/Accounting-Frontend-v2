import countryRules from "./countryRules";

const normalizeStateCode = (value = "") => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return normalized.padStart(2, "0");
};

const normalizeStateName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getStateCodeFromStateName = (stateName = "") => {
  const normalizedStateName = normalizeStateName(stateName);
  if (!normalizedStateName) return "";

  const match = (countryRules.India?.states || []).find(
    (state) => normalizeStateName(state.name) === normalizedStateName,
  );

  return normalizeStateCode(match?.gstStateCode || match?.code || "");
};

export const getCompanyGstStateCode = (company = {}) => {
  const gstin =
    company?.taxDetails?.gstin ||
    company?.taxDetails?.gstNumber ||
    company?.gstin ||
    company?.gstNumber ||
    "";

  const gstinStateCode = String(gstin).trim().slice(0, 2);
  if (gstinStateCode) {
    return normalizeStateCode(gstinStateCode);
  }

  return getStateCodeFromStateName(
    company?.registeredAddress?.state || company?.state || "",
  );
};

export const getPlaceOfSupplyCode = ({ shipTo, billTo, deliverTo, client } = {}) =>
  normalizeStateCode(
    shipTo?.stateCode ||
      deliverTo?.stateCode ||
      billTo?.stateCode ||
      client?.stateCode ||
      "",
  );
