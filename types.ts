export type AppointmentStatus = 'Pendente' | 'Confirmado' | 'Em andamento' | 'Finalizado' | 'Cancelado';
export type UserRole = 'Proprietário' | 'Barbeiro' | 'Super Admin';
export type PaymentMethod = 'Dinheiro' | 'Pix' | 'Cartão';
export type ClientTag = 'VIP' | 'Recorrente' | 'Novo';

export interface Client {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  email?: string;
  instagram?: string;
  birthDate?: string;
  cpf_cnpj?: string;
  address?: string;
  lastVisit: string;
  totalSpent: number;
  frequency: number;
  tag: ClientTag;
  notes?: string;
}

export interface Service {
  id: string;
  user_id?: string;
  name: string;
  price: number;
  duration: number; // minutes
  active?: boolean;
  image?: string;
}

export interface Barber {
  id: string;
  user_id?: string;
  name: string;
  role: string;
  commission: number;
  commissionType: 'percentage' | 'fixed';
  avatar: string;
  services?: string[];
  schedule?: any;
}

export interface Appointment {
  id: string;
  user_id?: string;
  clientId: string;
  clientName: string;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  time: string;
  date: string;
  status: AppointmentStatus;
  price: number;
}

export interface FinanceTransaction {
  id: string;
  user_id?: string;
  type: 'Entrada' | 'Saída';
  category: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  description: string;
  appointment_id?: string;
}

export interface SubscriptionPlan {
  id: string;
  user_id?: string;
  name: string;
  price: number;
  benefits: string[];
  activeUsers: number;
  billingDay?: number;
}

export interface Product {
  id: string;
  user_id?: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  active?: boolean;
}

export interface Wallet {
  id: string;
  user_id: string;
  barber_id?: string;
  type: 'system' | 'barbershop' | 'barber' | 'subscription';
  balance: number;
  lastCreditAt?: string | null;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  type: 'credit' | 'debit';
  method?: PaymentMethod;
  description: string;
  category: 'Service' | 'Product' | 'Subscription' | 'Commission' | 'Owner_Share';
  related_id?: string;
  created_at?: string;
}
