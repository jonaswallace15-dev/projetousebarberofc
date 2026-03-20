import { apiFetch } from './api';

export interface AsaasPaymentResponse {
  id: string;
  invoiceUrl: string;
  pixQrCode: string;
  pixCopyPaste: string;
  status: string;
}

export const asaasService = {
  async createPixPayment(data: {
    name: string;
    phone: string;
    value: number;
    description: string;
  }): Promise<AsaasPaymentResponse> {
    return apiFetch('/api/payments/asaas', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...data }),
    });
  },

  async checkPaymentStatus(paymentId: string): Promise<{ status: string }> {
    return apiFetch('/api/payments/asaas', {
      method: 'POST',
      body: JSON.stringify({ action: 'status', paymentId }),
    });
  },
};
