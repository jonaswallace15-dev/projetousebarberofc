import React from 'react';
import { LayoutDashboard, Calendar, Users, Scissors, DollarSign, Repeat, Settings, Store, Wallet } from 'lucide-react';

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'appointments', label: 'Agendamentos', href: '/appointments', icon: <Calendar size={20} /> },
  { id: 'clients', label: 'Clientes', href: '/clients', icon: <Users size={20} /> },
  { id: 'services', label: 'Serviços', href: '/services', icon: <Scissors size={20} /> },
  { id: 'team', label: 'Equipe', href: '/team', icon: <Users size={20} /> },
  { id: 'finance', label: 'Financeiro', href: '/finance', icon: <DollarSign size={20} /> },
  { id: 'wallets', label: 'Carteiras', href: '/wallets', icon: <DollarSign size={20} /> },
  { id: 'subscriptions', label: 'Assinaturas', href: '/subscriptions', icon: <Repeat size={20} /> },
  { id: 'settings', label: 'Configurações', href: '/settings', icon: <Settings size={20} /> },
];

export const ADMIN_MENU_ITEMS = [
  { id: 'admin_overview', label: 'Estatísticas Globais', href: '/admin', icon: <LayoutDashboard size={20} /> },
  { id: 'admin_users', label: 'Gestão de Usuários', href: '/admin?tab=users', icon: <Users size={20} /> },
  { id: 'admin_shops', label: 'Barbearias (Lojas)', href: '/admin?tab=shops', icon: <Store size={20} /> },
  { id: 'admin_barbers', label: 'Barbeiros Globais', href: '/admin?tab=barbers', icon: <Scissors size={20} /> },
  { id: 'admin_payments', label: 'Faturamento Total', href: '/admin?tab=payments', icon: <DollarSign size={20} /> },
  { id: 'admin_subscriptions', label: 'Assinaturas PRO', href: '/admin?tab=subscriptions', icon: <Repeat size={20} /> },
  { id: 'admin_withdrawals', label: 'Controle de Saques', href: '/admin?tab=withdrawals', icon: <Wallet size={20} /> },
];
