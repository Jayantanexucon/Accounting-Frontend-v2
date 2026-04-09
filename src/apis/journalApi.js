import { API } from "./api";

const normalizeVoucherType = (value = "") => {
  const normalized = value.toString().trim().toUpperCase();

  switch (normalized) {
    case "JOURNAL":
    case "JOURNAL ENTRY":
      return "JOURNAL";
    case "RECEIPT":
      return "RECEIPT";
    case "PAYMENT":
      return "PAYMENT";
    case "CONTRA":
      return "CONTRA";
    case "SALES":
      return "SALES";
    case "PURCHASE":
      return "PURCHASE";
    default:
      return normalized;
  }
};

const normalizeJournalPayload = (payload = {}, companyId) => ({
  ...payload,
  companyId: payload.companyId || companyId,
  voucherType: normalizeVoucherType(payload.voucherType),
  lines: (payload.lines || []).map((line, index) => ({
    ...line,
    debitAmount: Number(line.debitAmount ?? line.debit ?? 0),
    creditAmount: Number(line.creditAmount ?? line.credit ?? 0),
    lineNumber: line.lineNumber ?? index + 1,
  })),
});

const matchesSearch = (journal, query) => {
  const value = query.toLowerCase();
  return [
    journal.number,
    journal.sourceType,
    journal.referenceNumber,
    journal.externalDocNo,
    journal.partyName,
    journal.narration,
    journal.voucherType,
  ]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(value));
};

const applyJournalFilters = (journals = [], params = {}) => {
  let filtered = [...journals];

  if (params.search) {
    filtered = filtered.filter((journal) => matchesSearch(journal, params.search));
  }

  if (params.voucherType) {
    const voucherType = normalizeVoucherType(params.voucherType);
    filtered = filtered.filter((journal) => journal.voucherType === voucherType);
  }

  if (params.sourceType) {
    filtered = filtered.filter(
      (journal) => journal.sourceType?.toLowerCase() === params.sourceType.toLowerCase()
    );
  }

  if (params.status) {
    filtered = filtered.filter(
      (journal) => journal.status?.toLowerCase() === params.status.toLowerCase()
    );
  }

  if (params.approvalStatus) {
    filtered = filtered.filter(
      (journal) =>
        journal.approvalStatus?.toLowerCase() === params.approvalStatus.toLowerCase()
    );
  }

  if (params.startDate || params.dateFrom) {
    const fromDate = new Date(params.startDate || params.dateFrom);
    filtered = filtered.filter((journal) => new Date(journal.date) >= fromDate);
  }

  if (params.endDate || params.dateTo) {
    const toDate = new Date(params.endDate || params.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((journal) => new Date(journal.date) <= toDate);
  }

  return filtered;
};

export const addJournalApi = async (form, companyId) => {
  const { data } = await API.post(`/accounting/journal`, normalizeJournalPayload(form, companyId));
  return data;
};

export const allJournalApi = async (companyId, params = {}, signal) => {
  const { data } = await API.get(`/accounting/journal`, {
    params: {
      companyId,
      status: params.status,
      approvalStatus: params.approvalStatus,
      startDate: params.startDate || params.dateFrom,
      endDate: params.endDate || params.dateTo,
    },
    signal,
  });

  const filtered = applyJournalFilters(data.data || [], params);
  const page = Number.parseInt(params.page, 10) || 1;
  const limit = Number.parseInt(params.limit, 10) || filtered.length || 1;
  const startIndex = (page - 1) * limit;
  const pagedData = filtered.slice(startIndex, startIndex + limit);

  return {
    ...data,
    data: pagedData,
    pagination: {
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      currentPage: page,
      limit,
    },
  };
};

export const getJournalByIdApi = async (_companyId, journalId) => {
  const { data } = await API.get(`/accounting/journal/${journalId}`);
  return data;
};

export const deleteJournalApi = async (_companyId, journalId) => {
  const { data } = await API.delete(`/accounting/journal/${journalId}`);
  return data;
};

export const updateJournalApi = async (companyId, journalId, payload) => {
  const { data } = await API.put(
    `/accounting/journal/${journalId}`,
    normalizeJournalPayload(payload, companyId)
  );
  return data;
};

export const getJournalStatsApi = async (companyId, params = {}, signal) => {
  const response = await allJournalApi(companyId, { ...params, page: 1, limit: 5000 }, signal);
  const journals = response.data || [];
  return {
    data: {
      journalCount: journals.length,
      totalAmount: journals.reduce(
        (sum, journal) => sum + Number(journal.totalDebit || journal.totalCredit || 0),
        0
      ),
    },
  };
};

export const getJournalApprovalRequestsApi = async (companyId) => {
  const { data } = await API.get(`/accounting/journal/approval-requests`, {
    params: { companyId },
  });
  return data;
};

export const requestJournalEditApprovalApi = async (companyId, journalId, payload = {}) => {
  const { data } = await API.post(`/accounting/journal/${journalId}/request-edit`, {
    ...normalizeJournalPayload(payload, companyId),
    companyId,
  });
  return data;
};

export const requestJournalDeleteApprovalApi = async (companyId, journalId) => {
  const { data } = await API.post(`/accounting/journal/${journalId}/request-delete`, {
    companyId,
  });
  return data;
};

export const updateJournalApprovalRequestApi = async (companyId, requestId, status) => {
  const { data } = await API.put(`/accounting/journal/approval-requests/${requestId}`, {
    companyId,
    status,
  });
  return data;
};

export const uploadJournalExcelApi = async (companyId, formData) => {
  const { data } = await API.post(`/accounting/journal-excel/${companyId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const confirmJournalExcelApi = async (companyId, payload) => {
  const { data } = await API.post(`/accounting/journal-excel/${companyId}/confirm`, payload);
  return data;
};
