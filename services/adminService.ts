import { apiFetch } from './api';

export const adminService = {
  async getAllBarberShops(): Promise<any[]> {
    return apiFetch('/api/admin/shops');
  },

  async getAllBarbers(): Promise<any[]> {
    return apiFetch('/api/admin/barbers');
  },

  async getGlobalStats(): Promise<any> {
    return apiFetch('/api/admin/stats');
  },

  async getFinancialSummary(): Promise<any> {
    return apiFetch('/api/admin/summary');
  },

  async getAllWithdrawals(): Promise<any[]> {
    return apiFetch('/api/admin/withdrawals');
  },

  async approveWithdrawal(id: string): Promise<any> {
    return apiFetch('/api/admin/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ id, action: 'approve' }),
    });
  },

  async rejectWithdrawal(id: string, notes: string): Promise<any> {
    return apiFetch('/api/admin/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ id, action: 'reject', notes }),
    });
  },
};
