import { API } from "./api";

export const getReconciliationOverviewApi = async (companyId, params = {}) => {
  const { data } = await API.get(`/accounting/bank-reconciliation/overview/${companyId}`, {
    params,
  });
  return data;
};

export const getMonthlyReconciliationReportApi = async (companyId, params = {}) => {
  const { data } = await API.get(`/accounting/bank-reconciliation/report/monthly/${companyId}`, {
    params,
  });
  return data;
};

export const uploadBankStatementApi = async (payload) => {
  const { data } = await API.post("/accounting/bank-reconciliation/bank/import", payload);
  return data;
};

export const autoMatchBankTransactionsApi = async (companyId, bankLedgerId) => {
  const { data } = await API.post(`/accounting/bank-reconciliation/reconcile/auto/${companyId}`, null, {
    params: bankLedgerId ? { bankLedgerId } : {},
  });
  return data;
};

export const manualMatchApi = async (payload) => {
  const { data } = await API.post("/accounting/bank-reconciliation/reconcile/manual", payload);
  return data;
};

export const unmatchApi = async (payload) => {
  const { data } = await API.post("/accounting/bank-reconciliation/reconcile/unlink", payload);
  return data;
};

export const createPaymentFromBankTransactionApi = async (payload) => {
  const { data } = await API.post("/accounting/bank-reconciliation/reconcile/create-payment", payload);
  return data;
};

export const getBankReconciliationStatementApi = async (companyId) => {
  const { data } = await API.get(`/accounting/bank-reconciliation/brs/${companyId}`);
  return data;
};

export const getClientReconciliationsApi = async (companyId) => {
  const overview = await getReconciliationOverviewApi(companyId);
  const payload = overview?.data || {};

  const reconciliations = (payload.payments || []).map((payment) => ({
    ledgerId: payment._id,
    clientName: payment.reference || payment.invoiceId?.invoiceNo || "—",
    ledgerCode: payment.invoiceId?.invoiceNo || payment.invoiceId,
    ledgerBalance: payment.grossAmount || payment.amountPaid || 0,
    pendingInvoiceAmount: payment.grossAmount || payment.amountPaid || 0,
    discrepancy: payment.reconciliationStatus === "MATCHED" ? 0 : payment.grossAmount || payment.amountPaid || 0,
    status: payment.reconciliationStatus === "MATCHED" ? "reconciled" : "unreconciled",
  }));

  return {
    data: {
      data: {
        reconciliations,
        summary: {
          totalClients: reconciliations.length,
          reconciled: reconciliations.filter((row) => row.status === "reconciled").length,
          unreconciled: reconciliations.filter((row) => row.status !== "reconciled").length,
        },
      },
    },
  };
};

export const fixReconciliationDiscrepancyApi = async (companyId) =>
  autoMatchBankTransactionsApi(companyId);
