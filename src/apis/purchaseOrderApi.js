import { API } from "./api";

// ==================== CRUD Operations ====================

/**
 * Create a new purchase order
 */
export const createPurchaseOrderApi = async (poData) => {
  const { data } = await API.post("/invoices/purchase-order", poData);
  return data;
};

/**
 * Get all purchase orders with pagination and search
 * @param {string} companyId - Company ID
 * @param {Object} params - Query params (page, limit, search, filters)
 */
export const getPurchaseOrdersApi = async (companyId, params = {}) => {
  const { data } = await API.get(`/invoices/purchase-order`, {  // ✅ Changed from /invoices/purchase-order/company/{companyId}
    params: {
      companyId,  // ✅ Pass companyId as query param
      ...params,
    },
  });
  return data;
};


/**
 * Get a single purchase order by ID
 * @param {string} id - Purchase order ID
 */
export const getPurchaseOrderApi = async (id) => {
  const { data } = await API.get(`/invoices/purchase-order/${id}`);
  return data;
};

/**
 * Update an existing purchase order
 */
export const updatePurchaseOrderApi = async (id, poData) => {
  const { data } = await API.put(`/invoices/purchase-order/${id}`, poData);
  return data;
};

/**
 * Delete a single purchase order
 */
export const deletePurchaseOrderApi = async (id) => {
  const { data } = await API.delete(`/invoices/purchase-order/${id}`);
  return data;
};

/**
 * Delete multiple purchase orders
 */
export const deleteMultiplePurchaseOrdersApi = async (ids) => {
  const { data } = await API.delete("/invoices/purchase-order", {
    data: { ids },
  });
  return data;
};

// ==================== Document Downloads ====================

export const downloadWordPurchaseOrderApi = async (id, config = {}) => {
  const response = await API.get(`/invoices/purchase-order/${id}/download/word`, {
    responseType: "blob",
    ...config,
  });
  return response;
};

export const downloadPdfPurchaseOrderApi = async (id, config = {}) => {
  const response = await API.get(`/invoices/purchase-order/${id}/download/pdf`, {
    responseType: "blob",
    ...config,
  });
  return response;
};

// ==================== Client / Vendor Data ====================

export const getPurchaseOrderClientsApi = async () => {
  const { data } = await API.get("/invoices/purchase-order/clients");
  return data;
};

// ==================== Status Management ====================

export const updatePurchaseOrderStatusApi = async (id, status) => {
  const { data } = await API.patch(`/invoices/purchase-order/${id}/status`, { status });
  return data;
};

// ==================== Search & Lookup ====================

export const searchPoReferencesApi = async (query) => {
  const { data } = await API.get("/invoices/purchase-order/search/number", {
    params: { q: query },
  });
  return data;
};

export const searchPoNumbersApi = async (query, companyId) => {
  const { data } = await API.get(`/invoices/purchase-order/search/number`, {
    params: {
      poNumber: query,  // ✅ Changed from 'q' to 'poNumber' to match backend
      companyId,
    },
  });
  return data;
};

// ==================== Advanced Search ====================

export const advancedSearchPurchaseOrdersApi = async (filters) => {
  const { data } = await API.get(`/invoices/purchase-order`, {  // ✅ Using same endpoint as getAllPurchaseOrders
    params: filters,
  });
  return data;
};

export const getPurchaseOrderFilterOptionsApi = async (companyId) => {
  const { data } = await API.get("/invoices/purchase-order/filter-options", {
    params: { companyId },
  });
  return data;
};

export const getPOProgressApi = async (id, companyId) => {
  const { data } = await API.get(`/invoices/purchase-order/${id}`, {
    params: companyId ? { companyId } : {},
  });
  return data;
};

export const getAllPurchaseOrdersApi = async (companyId, params = {}) => {
  const { data } = await API.get(`/invoices/purchase-order`, {  // ✅ Changed from /invoices/purchase-order/all
    params: {
      companyId,
      limit: 10000,
      ...params,
    },
  });
  return data;
};

// ==================== Resources (Staffing/Headcount) ====================

export const getResourcesApi = async (poId) => {
  const { data } = await API.get(`/invoices/purchase-order/${poId}/resources`);
  return data;
};

export const addResourceApi = async (poId, resourceData) => {
  const { data } = await API.post(`/invoices/purchase-order/${poId}/resources`, resourceData);
  return data;
};

export const updateResourceApi = async (poId, resourceId, resourceData) => {
  const { data } = await API.put(`/invoices/purchase-order/${poId}/resources/${resourceId}`, resourceData);
  return data;
};

// ==================== Attendance (Staffing) ====================

export const submitAttendanceApi = async (poId, attendanceInputs) => {
  const { data } = await API.post(`/invoices/purchase-order/${poId}/attendance`, { attendanceInputs });
  return data;
};

export const getAttendanceRecordsApi = async (poId, params = {}) => {
  const { data } = await API.get(`/invoices/purchase-order/${poId}/attendance`, { params });
  return data;
};

// ==================== Milestones (Project) ====================

export const completeMilestoneApi = async (poId, milestoneId, completionData) => {
  const { data } = await API.post(`/invoices/purchase-order/${poId}/milestones/${milestoneId}/complete`, completionData);
  return data;
};

// ==================== Invoice Preview ====================

export const getInvoicePreviewApi = async (poId, previewParams) => {
  const { data } = await API.post(`/invoices/purchase-order/${poId}/invoice-preview`, previewParams);
  return data;
};
