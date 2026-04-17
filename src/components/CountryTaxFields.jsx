import React from "react";
import { mapTaxDetailsToValues, valuesToTaxDetails } from "../utils/masterLocationUtils";

export default function CountryTaxFields({
  countryName,
  taxTypes = [],
  taxDetails = [],
  onChange,
  inputCls,
  labelCls,
}) {
  const values = mapTaxDetailsToValues(taxDetails);

  if (!countryName) return null;

  if (!taxTypes.length) {
    const genericTax = taxDetails[0] || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Tax Type</label>
          <input
            type="text"
            value={genericTax.taxType || ""}
            onChange={(e) =>
              onChange([
                {
                  taxType: e.target.value,
                  label: e.target.value,
                  taxNumber: genericTax.taxNumber || "",
                },
              ])
            }
            className={inputCls}
            placeholder="Tax type"
          />
        </div>
        <div>
          <label className={labelCls}>Tax Number</label>
          <input
            type="text"
            value={genericTax.taxNumber || ""}
            onChange={(e) =>
              onChange([
                {
                  taxType: genericTax.taxType || "Tax ID",
                  label: genericTax.taxType || "Tax ID",
                  taxNumber: e.target.value,
                },
              ])
            }
            className={inputCls}
            placeholder="Tax number"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {taxTypes.map((taxType) => (
        <div key={taxType}>
          <label className={labelCls}>{taxType}</label>
          <input
            type="text"
            value={values[taxType] || ""}
            onChange={(e) =>
              onChange(
                valuesToTaxDetails({
                  ...values,
                  [taxType]: e.target.value,
                })
              )
            }
            className={inputCls}
            placeholder={`Enter ${taxType}`}
          />
        </div>
      ))}
    </div>
  );
}
