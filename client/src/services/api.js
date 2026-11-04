const BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Batches
  getBatches: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.sku && params.sku !== 'All') query.append('sku', params.sku);
    if (params.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params.search) query.append('search', params.search);
    
    const res = await fetch(`${BASE_URL}/batches?${query.toString()}`);
    return handleResponse(res);
  },

  getBatchById: async (id) => {
    const res = await fetch(`${BASE_URL}/batches/${id}`);
    return handleResponse(res);
  },

  createBatch: async (data) => {
    const res = await fetch(`${BASE_URL}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  updateBatch: async (id, data) => {
    const res = await fetch(`${BASE_URL}/batches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  deleteBatch: async (id) => {
    const res = await fetch(`${BASE_URL}/batches/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  updateDisposition: async (id, data) => {
    const res = await fetch(`${BASE_URL}/batches/${id}/disposition`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Inspections
  getInspections: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.batchId) query.append('batchId', params.batchId);
    if (params.result && params.result !== 'All') query.append('result', params.result);
    if (params.inspector && params.inspector !== 'All') query.append('inspector', params.inspector);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const res = await fetch(`${BASE_URL}/inspections?${query.toString()}`);
    return handleResponse(res);
  },

  getInspectionById: async (id) => {
    const res = await fetch(`${BASE_URL}/inspections/${id}`);
    return handleResponse(res);
  },

  createInspection: async (data) => {
    const res = await fetch(`${BASE_URL}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  signOffInspection: async (id, data) => {
    const res = await fetch(`${BASE_URL}/inspections/${id}/sign-off`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // Analytics
  getDashboardStats: async () => {
    const res = await fetch(`${BASE_URL}/analytics/dashboard`);
    return handleResponse(res);
  },

  compareBatches: async (batchIds) => {
    const res = await fetch(`${BASE_URL}/analytics/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchIds })
    });
    return handleResponse(res);
  },

  // Reports
  getQualityReport: async (batchId) => {
    const res = await fetch(`${BASE_URL}/reports/${batchId}`);
    return handleResponse(res);
  }
};

