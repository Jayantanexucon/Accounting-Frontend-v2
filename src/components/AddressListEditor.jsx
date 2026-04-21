import React, { useMemo, useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import {
  ADDRESS_TYPE_OPTIONS,
  buildStateOptions,
  createEmptyAddress,
  findCountryOption,
} from "../utils/masterLocationUtils";

export default function AddressListEditor({
  addresses,
  onChange,
  countries,
  states,
  onCreateCountry,
  onCreateState,
  inputCls,
  labelCls,
  sectionTitle = "Addresses",
}) {
  const [countryDrafts, setCountryDrafts] = useState({});
  const [stateDrafts, setStateDrafts] = useState({});
  const [savingCountryIndex, setSavingCountryIndex] = useState(null);
  const [savingStateIndex, setSavingStateIndex] = useState(null);

  const countryOptions = useMemo(
    () => [...countries, { value: "__add_new__", label: "+ Add Country" }],
    [countries]
  );

  const updateAddress = (index, nextAddress) => {
    const nextAddresses = addresses.map((address, currentIndex) =>
      currentIndex === index ? nextAddress : address
    );
    onChange(nextAddresses.map((address, currentIndex) => ({
      ...address,
      type: currentIndex === 0 ? "DEFAULT" : address.type,
      isDefault: currentIndex === 0,
      isShipTo: currentIndex === 0 ? false : address.type === "SHIP_TO",
    })));
  };

  const addAddress = () => {
    onChange([...addresses, createEmptyAddress("SHIP_TO")]);
  };

  const removeAddress = (index) => {
    const nextAddresses = addresses.filter((_, currentIndex) => currentIndex !== index);
    onChange(
      nextAddresses.length > 0
        ? nextAddresses.map((address, currentIndex) => ({
            ...address,
            type: currentIndex === 0 ? "DEFAULT" : address.type,
            isDefault: currentIndex === 0,
            isShipTo: currentIndex === 0 ? false : address.type === "SHIP_TO",
          }))
        : [createEmptyAddress("DEFAULT")]
    );
  };

  const handleCountrySelect = (index, value) => {
    if (value === "__add_new__") {
      setCountryDrafts((prev) => ({
        ...prev,
        [index]: {
          countryName: "",
          countryCode: "",
          dialCode: "",
          currency: {
            currencyName: "",
            currencyCode: "",
            currencySymbol: "",
          },
          taxConfig: {
            taxSystem: "OTHER",
            isGSTApplicable: false,
          },
        },
      }));
      return;
    }

    const country = countries.find((item) => item.value === value);
    // Extract currency and dialCode from embedded country
    const countryCurrency = country?.currency || {
      currencyName: country?.currencyName || "",
      currencyCode: country?.currencyCode || "",
      currencySymbol: country?.currencySymbol || "",
    };
    const updatedAddress = {
      ...addresses[index],
      country: country?.countryName || "",
      countryId: country?.value || "",
      state: "",
      stateId: "",
      stateCode: "",
      gstStateCode: "",
      // Store currency and dialCode info with the address
      currency: countryCurrency.currencyCode || "",
      currencyName: countryCurrency.currencyName || "",
      currencySymbol: countryCurrency.currencySymbol || "",
      dialCode: country?.dialCode || "",
    };
    updateAddress(index, updatedAddress);
    // Pass the selected country back to parent for dialCode update
    onChange(addresses.map((addr, i) => i === index ? updatedAddress : addr), country);
    setCountryDrafts((prev) => ({ ...prev, [index]: null }));
  };

  const handleStateSelect = (index, value) => {
    if (value === "__add_new__") {
      setStateDrafts((prev) => ({
        ...prev,
        [index]: { stateName: "", stateCode: "", gstStateCode: "" },
      }));
      return;
    }

    const stateOption = buildStateOptions(states, countries, addresses[index]).find(
      (item) => item.value === value || item.stateName === value
    );

    updateAddress(index, {
      ...addresses[index],
      state: stateOption?.stateName || value,
      stateId: stateOption?.value || "",
      stateCode: stateOption?.stateCode || "",
      gstStateCode: stateOption?.gstStateCode || "",
    });
    setStateDrafts((prev) => ({ ...prev, [index]: null }));
  };

  const saveCountry = async (index) => {
    const draft = countryDrafts[index];
    if (!draft?.countryName || !draft?.countryCode) return;
    setSavingCountryIndex(index);
    try {
      const country = await onCreateCountry(draft);
      // Extract currency from the created country (embedded in country.currency)
      const countryCurrency = country.currency || {};
      updateAddress(index, {
        ...addresses[index],
        country: country.countryName,
        countryId: country._id,
        currency: countryCurrency.currencyCode || "",
        currencyName: countryCurrency.currencyName || "",
        currencySymbol: countryCurrency.currencySymbol || "",
      });
      setCountryDrafts((prev) => ({ ...prev, [index]: null }));
    } finally {
      setSavingCountryIndex(null);
    }
  };

  const saveState = async (index) => {
    const draft = stateDrafts[index];
    const selectedCountry = findCountryOption(countries, addresses[index]);
    if (!draft?.stateName || !draft?.stateCode || !selectedCountry?.value) return;
    setSavingStateIndex(index);
    try {
      const state = await onCreateState({
        ...draft,
        country: selectedCountry.value,
      });
      updateAddress(index, {
        ...addresses[index],
        state: state.stateName,
        stateId: state._id,
        stateCode: state.stateCode || "",
        gstStateCode: state.gstStateCode || "",
      });
      setStateDrafts((prev) => ({ ...prev, [index]: null }));
    } finally {
      setSavingStateIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-extrabold text-slate-800">{sectionTitle}</h3>
        </div>
        <button
          type="button"
          onClick={addAddress}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Address
        </button>
      </div>

      {addresses.map((address, index) => {
        const stateOptions = [
          ...buildStateOptions(states, countries, address),
          { value: "__add_new__", label: "+ Add State" },
        ];

        return (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {index === 0 ? "Default Address" : `Address ${index + 1}`}
                </p>
                <p className="text-[10px] text-slate-400">
                  {index === 0 ? "Primary registered address" : "Additional shipping or branch address"}
                </p>
              </div>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeAddress(index)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Address Type</label>
                <select
                  value={index === 0 ? "DEFAULT" : address.type}
                  onChange={(e) =>
                    updateAddress(index, { ...address, type: e.target.value, isShipTo: e.target.value === "SHIP_TO" })
                  }
                  className={inputCls}
                  disabled={index === 0}
                >
                  {ADDRESS_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Label</label>
                <input
                  type="text"
                  value={address.label || ""}
                  onChange={(e) => updateAddress(index, { ...address, label: e.target.value })}
                  className={inputCls}
                  placeholder="Head office, warehouse, branch..."
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Address Line 1</label>
                <input
                  type="text"
                  value={address.line1 || ""}
                  onChange={(e) => updateAddress(index, { ...address, line1: e.target.value })}
                  className={inputCls}
                  placeholder="Address line 1"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Address Line 2</label>
                <input
                  type="text"
                  value={address.line2 || ""}
                  onChange={(e) => updateAddress(index, { ...address, line2: e.target.value })}
                  className={inputCls}
                  placeholder="Address line 2"
                />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <select
                  value={findCountryOption(countries, address)?.value || ""}
                  onChange={(e) => handleCountrySelect(index, e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select country</option>
                  {countryOptions.map((option) => (
                    <option key={`${option.value}-${option.label}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>State</label>
                <select
                  value={address.stateId || address.state || ""}
                  onChange={(e) => handleStateSelect(index, e.target.value)}
                  className={inputCls}
                  disabled={!address.country}
                >
                  <option value="">Select state</option>
                  {stateOptions.map((option) => (
                    <option key={`${option.value || option.stateName}-${option.label}`} value={option.value || option.stateName}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input
                  type="text"
                  value={address.city || ""}
                  onChange={(e) => updateAddress(index, { ...address, city: e.target.value })}
                  className={inputCls}
                  placeholder="City"
                />
              </div>
              <div>
                <label className={labelCls}>PIN / ZIP</label>
                <input
                  type="text"
                  value={address.pinCode || ""}
                  onChange={(e) => updateAddress(index, { ...address, pinCode: e.target.value })}
                  className={inputCls}
                  placeholder="Postal code"
                />
              </div>
              <div>
                <label className={labelCls}>State Code</label>
                <input
                  type="text"
                  value={address.stateCode || ""}
                  onChange={(e) => updateAddress(index, { ...address, stateCode: e.target.value })}
                  className={inputCls}
                  placeholder="State code"
                />
              </div>
              <div>
                <label className={labelCls}>GST State Code</label>
                <input
                  type="text"
                  value={address.gstStateCode || ""}
                  onChange={(e) => updateAddress(index, { ...address, gstStateCode: e.target.value })}
                  className={inputCls}
                  placeholder="GST state code"
                />
              </div>
            </div>

            {countryDrafts[index] && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>New Country</label>
                  <input
                    type="text"
                    value={countryDrafts[index].countryName}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { ...prev[index], countryName: e.target.value },
                      }))
                    }
                    className={inputCls}
                    placeholder="Country name"
                  />
                </div>
                <div>
                  <label className={labelCls}>Country Code</label>
                  <input
                    type="text"
                    value={countryDrafts[index].countryCode}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { ...prev[index], countryCode: e.target.value.toUpperCase() },
                      }))
                    }
                    className={inputCls}
                    placeholder="IN"
                  />
                </div>
                <div>
                  <label className={labelCls}>Tax System</label>
                  <select
                    value={countryDrafts[index].taxConfig?.taxSystem || "OTHER"}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { 
                          ...prev[index], 
                          taxConfig: { 
                            ...prev[index].taxConfig, 
                            taxSystem: e.target.value,
                            isGSTApplicable: e.target.value === "GST",
                          } 
                        },
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="GST">GST</option>
                    <option value="VAT">VAT</option>
                    <option value="SALES_TAX">Sales Tax</option>
                    <option value="CORPORATE_TAX">Corporate Tax</option>
                    <option value="NONE">None</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Dial Code</label>
                  <input
                    type="text"
                    value={countryDrafts[index].dialCode || ""}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { ...prev[index], dialCode: e.target.value },
                      }))
                    }
                    className={inputCls}
                    placeholder="+91"
                  />
                </div>
                <div>
                  <label className={labelCls}>Currency Symbol</label>
                  <input
                    type="text"
                    value={countryDrafts[index].currency?.currencySymbol || ""}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { 
                          ...prev[index], 
                          currency: { 
                            ...prev[index].currency, 
                            currencySymbol: e.target.value 
                          } 
                        },
                      }))
                    }
                    className={inputCls}
                    placeholder="₹"
                  />
                </div>
                <div>
                  <label className={labelCls}>Currency Code</label>
                  <input
                    type="text"
                    value={countryDrafts[index].currency?.currencyCode || ""}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { 
                          ...prev[index], 
                          currency: { 
                            ...prev[index].currency, 
                            currencyCode: e.target.value.toUpperCase() 
                          } 
                        },
                      }))
                    }
                    className={inputCls}
                    placeholder="INR"
                  />
                </div>
                <div>
                  <label className={labelCls}>Currency Name</label>
                  <input
                    type="text"
                    value={countryDrafts[index].currency?.currencyName || ""}
                    onChange={(e) =>
                      setCountryDrafts((prev) => ({
                        ...prev,
                        [index]: { 
                          ...prev[index], 
                          currency: { 
                            ...prev[index].currency, 
                            currencyName: e.target.value 
                          } 
                        },
                      }))
                    }
                    className={inputCls}
                    placeholder="Indian Rupee"
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-3">
                  <button
                    type="button"
                    onClick={() => saveCountry(index)}
                    disabled={savingCountryIndex === index}
                    className="px-3 py-2 text-xs font-bold text-white rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingCountryIndex === index ? "Saving..." : "Save Country"}
                  </button>
                </div>
              </div>
            )}

            {stateDrafts[index] && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>New State</label>
                  <input
                    type="text"
                    value={stateDrafts[index].stateName}
                    onChange={(e) =>
                      setStateDrafts((prev) => ({
                        ...prev,
                        [index]: { ...prev[index], stateName: e.target.value },
                      }))
                    }
                    className={inputCls}
                    placeholder="State name"
                  />
                </div>
                <div>
                  <label className={labelCls}>State Code</label>
                  <input
                    type="text"
                    value={stateDrafts[index].stateCode}
                    onChange={(e) =>
                      setStateDrafts((prev) => ({
                        ...prev,
                        [index]: { ...prev[index], stateCode: e.target.value.toUpperCase() },
                      }))
                    }
                    className={inputCls}
                    placeholder="MH"
                  />
                </div>
                <div>
                  <label className={labelCls}>GST State Code</label>
                  <input
                    type="text"
                    value={stateDrafts[index].gstStateCode}
                    onChange={(e) =>
                      setStateDrafts((prev) => ({
                        ...prev,
                        [index]: { ...prev[index], gstStateCode: e.target.value.toUpperCase() },
                      }))
                    }
                    className={inputCls}
                    placeholder="27"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => saveState(index)}
                    disabled={savingStateIndex === index}
                    className="px-3 py-2 text-xs font-bold text-white rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {savingStateIndex === index ? "Saving..." : "Save State"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
