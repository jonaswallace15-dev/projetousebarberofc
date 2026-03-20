// Compatibilidade: redireciona chamadas para as API routes do Next.js
import { apiFetch } from './api';
import type { Client, Service, Barber, Appointment, FinanceTransaction, Product, SubscriptionPlan } from '@/types';

export const supabaseService = {
  // Clientes
  async getClients(): Promise<Client[]> {
    return apiFetch('/api/clients');
  },
  async upsertClient(client: Partial<Client>): Promise<Client> {
    return apiFetch('/api/clients', { method: 'POST', body: JSON.stringify(client) });
  },
  async deleteClient(id: string): Promise<void> {
    return apiFetch('/api/clients', { method: 'DELETE', body: JSON.stringify({ id }) });
  },
  async updateClientCPF(id: string, cpf_cnpj: string): Promise<Client> {
    return apiFetch('/api/clients', { method: 'POST', body: JSON.stringify({ id, cpf_cnpj }) });
  },

  // Serviços
  async getServices(): Promise<Service[]> {
    return apiFetch('/api/services');
  },
  async upsertService(service: Partial<Service>): Promise<Service> {
    return apiFetch('/api/services', { method: 'POST', body: JSON.stringify(service) });
  },
  async deleteService(id: string): Promise<void> {
    return apiFetch('/api/services', { method: 'DELETE', body: JSON.stringify({ id }) });
  },

  // Agendamentos
  async getAppointments(userId?: string): Promise<Appointment[]> {
    const url = userId ? `/api/appointments?user_id=${userId}` : '/api/appointments';
    return apiFetch(url);
  },
  async upsertAppointment(appointment: Partial<Appointment> & { user_id?: string }): Promise<Appointment> {
    return apiFetch('/api/appointments', { method: 'POST', body: JSON.stringify(appointment) });
  },
  async updateAppointmentStatus(id: string, status: Appointment['status']): Promise<void> {
    return apiFetch('/api/appointments/status', { method: 'PATCH', body: JSON.stringify({ id, status }) });
  },
  async deleteAppointment(id: string): Promise<void> {
    return apiFetch('/api/appointments', { method: 'DELETE', body: JSON.stringify({ id }) });
  },

  // Produtos
  async getProducts(userId?: string): Promise<Product[]> {
    const url = userId ? `/api/products?user_id=${userId}` : '/api/products';
    return apiFetch(url);
  },
  async upsertProduct(product: Partial<Product>): Promise<Product> {
    return apiFetch('/api/products', { method: 'POST', body: JSON.stringify(product) });
  },
  async deleteProduct(id: string): Promise<void> {
    return apiFetch('/api/products', { method: 'DELETE', body: JSON.stringify({ id }) });
  },

  // Barbeiros
  async getBarbers(userId?: string): Promise<Barber[]> {
    const url = userId ? `/api/barbers?user_id=${userId}` : '/api/barbers';
    return apiFetch(url);
  },
  async upsertBarber(barber: any): Promise<Barber> {
    return apiFetch('/api/barbers', { method: 'POST', body: JSON.stringify(barber) });
  },
  async deleteBarber(id: string): Promise<void> {
    return apiFetch('/api/barbers', { method: 'DELETE', body: JSON.stringify({ id }) });
  },

  // Finanças
  async getTransactions(): Promise<FinanceTransaction[]> {
    return apiFetch('/api/transactions');
  },
  async upsertTransaction(transaction: Partial<FinanceTransaction>): Promise<FinanceTransaction> {
    return apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify(transaction) });
  },
  async deleteTransaction(id: string): Promise<void> {
    return apiFetch('/api/transactions', { method: 'DELETE', body: JSON.stringify({ id }) });
  },

  // Planos
  async getPlans(): Promise<SubscriptionPlan[]> {
    return apiFetch('/api/plans');
  },
  async upsertPlan(plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    return apiFetch('/api/plans', { method: 'POST', body: JSON.stringify(plan) });
  },
  async deletePlan(id: string): Promise<void> {
    return apiFetch('/api/plans', { method: 'DELETE', body: JSON.stringify({ id }) });
  },

  // Configurações
  async getBusinessConfig(): Promise<any> {
    return apiFetch('/api/config');
  },
  async getUserIdBySlug(slug: string): Promise<string | undefined> {
    const data = await apiFetch(`/api/config/slug?slug=${encodeURIComponent(slug)}`);
    return data?.user_id;
  },
  async upsertBusinessConfig(config: any): Promise<any> {
    return apiFetch('/api/config', { method: 'POST', body: JSON.stringify(config) });
  },

  // Push Notifications
  async savePushSubscription(subscription: any): Promise<any> {
    return apiFetch('/api/push', {
      method: 'POST',
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys?.p256dh || btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey?.('p256dh') || new ArrayBuffer(0))))),
            auth: subscription.keys?.auth || btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey?.('auth') || new ArrayBuffer(0))))),
          },
        },
      }),
    });
  },

  // Asaas Integration (via Next.js API)
  async callAsaasFunction(action: string, data: any): Promise<any> {
    return apiFetch('/api/payments/asaas', {
      method: 'POST',
      body: JSON.stringify({ action: 'edge', edgeAction: action, edgeData: data }),
    });
  },
  async createAsaasCustomer(data: any): Promise<any> {
    return this.callAsaasFunction('create-customer', data);
  },
  async createAsaasSubscription(subscriptionData: any): Promise<any> {
    return this.callAsaasFunction('create-subscription', subscriptionData);
  },
  async syncAsaasSubscription(subscriptionId: string): Promise<any> {
    return this.callAsaasFunction('get-subscription-status', { subscriptionId });
  },
  async cancelAsaasSubscription(subscriptionId: string): Promise<any> {
    return this.callAsaasFunction('cancel-subscription', { subscriptionId });
  },
  async getAsaasBalance(): Promise<any> {
    return this.callAsaasFunction('get-balance', {});
  },

  // Assinaturas de Clientes
  async getClientSubscriptions(): Promise<any[]> {
    return apiFetch('/api/subscriptions');
  },
  async createClientSubscription(subscription: any): Promise<any> {
    return apiFetch('/api/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'create', ...subscription }) });
  },
  async updateClientSubscription(id: string, updates: any): Promise<void> {
    return apiFetch('/api/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'update', id, updates }) });
  },
  async deleteClientSubscription(id: string): Promise<void> {
    return apiFetch('/api/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) });
  },
};
