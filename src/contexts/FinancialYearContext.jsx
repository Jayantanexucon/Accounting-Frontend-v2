import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  getCurrentFinancialYearEnding,
  getFinancialYearInfo,
  getFinancialYearOptions,
} from "../utils/scheduleReportUtil";

const FinancialYearContext = createContext(null);

const getStorageKey = (companyId) => `selectedFinancialYear:${companyId || "global"}`;

export const FinancialYearProvider = ({ children }) => {
  const { user } = useAuth();
  const companyId = user?.company?._id || null;
  const defaultFinancialYearEnding = getCurrentFinancialYearEnding();
  const [selectedFinancialYearEnding, setSelectedFinancialYearEndingState] = useState(defaultFinancialYearEnding);

  useEffect(() => {
    const storedValue = companyId ? window.localStorage.getItem(getStorageKey(companyId)) : null;
    const parsedValue = Number.parseInt(storedValue || "", 10);

    setSelectedFinancialYearEndingState(
      Number.isInteger(parsedValue) ? parsedValue : defaultFinancialYearEnding
    );
  }, [companyId, defaultFinancialYearEnding]);

  const setSelectedFinancialYearEnding = (value) => {
    const parsedValue = Number.parseInt(value, 10);
    if (!Number.isInteger(parsedValue)) return;

    setSelectedFinancialYearEndingState(parsedValue);
    if (companyId) {
      window.localStorage.setItem(getStorageKey(companyId), String(parsedValue));
    }
  };

  const value = useMemo(() => ({
    selectedFinancialYearEnding,
    setSelectedFinancialYearEnding,
    currentFinancialYearEnding: defaultFinancialYearEnding,
    financialYearInfo: getFinancialYearInfo(selectedFinancialYearEnding),
    financialYearOptions: getFinancialYearOptions(),
    selectedFinancialYearLabel: getFinancialYearInfo(selectedFinancialYearEnding).label,
    selectedFinancialYear: `${selectedFinancialYearEnding - 1}-${String(selectedFinancialYearEnding).slice(2)}`,
  }), [defaultFinancialYearEnding, selectedFinancialYearEnding]);

  return (
    <FinancialYearContext.Provider value={value}>
      {children}
    </FinancialYearContext.Provider>
  );
};

export const useFinancialYear = () => {
  const context = useContext(FinancialYearContext);
  if (!context) throw new Error("useFinancialYear must be used within FinancialYearProvider");
  return context;
};
