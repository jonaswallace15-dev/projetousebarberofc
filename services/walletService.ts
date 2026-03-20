import { apiFetch } from './api';
import type { Wallet } from '@/types';

export const walletService = {
  async getBarbershopWallet(): Promise<Wallet> {
    return apiFetch('/api/wallets?type=barbershop');
  },

  async getBarberWallet(barberId: string): Promise<Wallet> {
    return apiFetch(`/api/wallets?type=barber&barber_id=${barberId}`);
  },

  async getSystemWallet(): Promise<Wallet> {
    return apiFetch('/api/wallets?type=system');
  },

  async recordTransaction(transaction: any): Promise<any> {
    return apiFetch('/api/wallets', {
      method: 'POST',
      body: JSON.stringify({ action: 'record', transaction }),
    });
  },

  async distributeServicePayment(appointment: any, barber: any, method?: any): Promise<any> {
    return apiFetch('/api/wallets/distribute', {
      method: 'POST',
      body: JSON.stringify({ appointment, barber, method }),
    });
  },

  async getAllWallets(): Promise<Wallet[]> {
    return apiFetch('/api/wallets');
  },
};
