export const SCHEDULE_III_GROUP_OPTIONS = {
  Asset: {
    scheduleMainHead: "Assets",
    balanceType: "Debit",
    groups: {
      "Non-Current Assets": [
        "Property, Plant and Equipment",
        "Intangible Assets",
        "Capital Work-in-Progress",
        "Non-Current Investments",
        "Deferred Tax Assets (Net)",
        "Long-Term Loans and Advances",
        "Other Non-Current Assets",
      ],
      "Current Assets": [
        "Current Investments",
        "Inventories",
        "Trade Receivables",
        "Cash and Cash Equivalents",
        "Short-Term Loans and Advances",
        "Other Assets",
        "Other Current Assets",
      ],
    },
  },
  Liability: {
    scheduleMainHead: "Equity and Liabilities",
    balanceType: "Credit",
    groups: {
      "Non-Current Liabilities": [
        "Long-Term Borrowings",
        "Deferred Tax Liabilities (Net)",
        "Other Long-Term Liabilities",
        "Long-Term Provisions",
      ],
      "Current Liabilities": [
        "Short-Term Borrowings",
        "Trade Payables",
        "Other Liabilities",
        "Other Current Liabilities",
        "Short-Term Provisions",
      ],
    },
  },
  Equity: {
    scheduleMainHead: "Equity and Liabilities",
    balanceType: "Credit",
    groups: {
      "Shareholders' Funds": [
        "Share Capital",
        "Reserves and Surplus",
        "Money Received Against Share Warrants",
      ],
      "Share Application Money Pending Allotment": [
        "Share Application Money Pending Allotment",
      ],
    },
  },
  Income: {
    scheduleMainHead: "P&L",
    balanceType: "Credit",
    groups: {
      Revenue: [
        "Revenue from Operations",
        "Other Income",
      ],
    },
  },
  Expense: {
    scheduleMainHead: "P&L",
    balanceType: "Debit",
    groups: {
      Expenses: [
        "Cost of Materials Consumed",
        "Purchase of Stock-in-Trade",
        "Changes in Inventories",
        "Employee Benefits Expense",
        "Finance Costs",
        "Depreciation and Amortization Expense",
        "Other Expenses",
      ],
    },
  },
};

export const getScheduleGroupsForNature = (nature) =>
  nature ? Object.keys(SCHEDULE_III_GROUP_OPTIONS[nature]?.groups || {}) : [];

export const getScheduleLineItems = (nature, scheduleGroup) =>
  nature && scheduleGroup
    ? SCHEDULE_III_GROUP_OPTIONS[nature]?.groups?.[scheduleGroup] || []
    : [];

export const getDefaultScheduleMappingForGroupName = (groupName = "", nature = "") => {
  const normalized = groupName.toLowerCase();
  const defaults = [
    { regex: /\b(sundry debtors|trade receivable|debtors|accounts receivable)\b/i, lineItem: "Trade Receivables" },
    { regex: /\b(cash|bank|cash at bank|cash in hand|petty cash)\b/i, lineItem: "Cash and Cash Equivalents" },
    { regex: /\b(sundry creditors|trade payable|creditors|accounts payable)\b/i, lineItem: "Trade Payables" },
    { regex: /\b(stock|inventory|inventories)\b/i, lineItem: "Inventories" },
    { regex: /\b(capital|share capital)\b/i, lineItem: "Share Capital" },
    { regex: /\b(reserve|surplus|retained)\b/i, lineItem: "Reserves and Surplus" },
    { regex: /\b(sales|revenue)\b/i, lineItem: "Revenue from Operations" },
    { regex: /\b(finance|interest|bank charges?)\b/i, lineItem: "Finance Costs" },
    { regex: /\b(depreciation|amorti)\b/i, lineItem: "Depreciation and Amortization Expense" },
    { regex: /\b(salary|wages?|staff|employee)\b/i, lineItem: "Employee Benefits Expense" },
    { regex: /\b(purchase)\b/i, lineItem: "Purchase of Stock-in-Trade" },
  ];

  const match = defaults.find((entry) => entry.regex.test(normalized));
  const config = SCHEDULE_III_GROUP_OPTIONS[nature];
  if (!match || !config) return null;

  const groupEntry = Object.entries(config.groups).find(([, lineItems]) => lineItems.includes(match.lineItem));
  if (!groupEntry) return null;

  return {
    scheduleMainHead: config.scheduleMainHead,
    scheduleGroup: groupEntry[0],
    scheduleLineItem: match.lineItem,
    balanceType: config.balanceType,
  };
};
