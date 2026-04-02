import { apiFetch } from './api';

export interface AbacatePayResponse {
  id: string;
  url: string;
  status: string;
  pixQrCode?: string | null;
  brCode?: string | null;
}

export const abacatePayService = {
  async createBilling(data: {
    name: string;
    email: string;
    phone: string;
    value: number;
    description: string;
    externalId: string;
  }): Promise<AbacatePayResponse> {
    return apiFetch('/api/payments/abacatepay', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...data }),
    });
  },

  async checkStatus(billingId: string): Promise<{ status: string }> {
    return apiFetch('/api/payments/abacatepay', {
      method: 'POST',
      body: JSON.stringify({ action: 'status', billingId }),
    });
  },

  async simulatePayment(billingId: string): Promise<any> {
    return apiFetch('/api/payments/abacatepay', {
      method: 'POST',
      body: JSON.stringify({ action: 'simulate', billingId }),
    });
  },
};
