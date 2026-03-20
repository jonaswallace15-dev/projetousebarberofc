'use client';

import React, { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import type { Wallet, WalletTransaction } from '@/types';

export default function WalletsPage() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Wallets are fetched from the walletService endpoint
    Promise.all([
      fetch('/api/wallets').then(r => r.json()).catch(() => []),
      fetch('/api/wallets/transactions').then(r => r.json()).catch(() => []),
    ]).then(([w, t]) => {
      setWallets(Array.isArray(w) ? w : []);
      setTransactions(Array.isArray(t) ? t : []);
    }).finally(() => setLoading(false));
  }, [user]);

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const getWalletLabel = (type: string) => {
    const labels: Record<string, string> = { system: 'Sistema', barbershop: 'Barbearia', barber: 'Barbeiro' };
    return labels[type] || type;
  };

  const getWalletIcon = (type: string) => {
    const icons: Record<string, string> = {
      system: 'solar:server-bold-duotone',
      barbershop: 'solar:shop-2-bold-duotone',
      barber: 'solar:user-bold-duotone',
    };
    return icons[type] || 'solar:wallet-bold-duotone';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-4">
          <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse shadow-[0_0_10px_#0070FF]" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Wallet System Active</span>
        </div>
        <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
          Carteiras<span className="text-brand-accent">.</span>
        </h1>
        <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
          Gestão financeira distribuída e comissões em tempo real.
        </p>
      </header>

      {/* Total balance */}
      <div className="flashlight-card p-10 rounded-[3.5rem] relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
        <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-3">Saldo Total Consolidado</p>
        <div className="text-6xl font-display font-black text-brand-accent tracking-tighter">
          <span className="text-2xl mr-2 opacity-50">R$</span>
          {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div className="mt-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
          <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">{wallets.length} carteira{wallets.length !== 1 ? 's' : ''} ativa{wallets.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Wallet cards */}
      {wallets.length === 0 ? (
        <div className="flashlight-card p-16 rounded-[3.5rem] text-center">
          <iconify-icon icon="solar:wallet-bold-duotone" class="text-7xl text-brand-muted/20 mb-6" />
          <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-4">Nenhuma carteira encontrada</h3>
          <p className="text-brand-muted text-sm leading-relaxed">As carteiras são criadas automaticamente com os primeiros agendamentos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wallets.map(wallet => (
            <div key={wallet.id} className="flashlight-card p-8 rounded-[3rem] relative overflow-hidden group hover:border-brand-accent/30 transition-all">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-[1.5rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <iconify-icon icon={getWalletIcon(wallet.type)} class="text-2xl" />
                </div>
                <span className="text-[9px] font-mono font-black text-brand-muted uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  {getWalletLabel(wallet.type)}
                </span>
              </div>
              <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-2">Saldo Disponível</p>
              <div className="text-4xl font-display font-black text-brand-success tracking-tighter">
                <span className="text-lg mr-1 opacity-50">R$</span>
                {(wallet.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      {transactions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
            <iconify-icon icon="solar:history-bold-duotone" class="text-3xl text-brand-accent" />
            Movimentações
          </h2>
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-6 text-left">Descrição</th>
                    <th className="px-8 py-6 text-left hidden md:table-cell">Categoria</th>
                    <th className="px-8 py-6 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-brand-accent/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-display font-black text-brand-main uppercase text-sm tracking-tight group-hover:text-brand-accent transition-colors">{t.description}</p>
                        {t.created_at && <p className="text-[9px] font-mono text-brand-muted mt-1">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>}
                      </td>
                      <td className="px-8 py-6 hidden md:table-cell">
                        <span className="text-[9px] font-mono font-black text-brand-muted px-3 py-1.5 rounded-full uppercase tracking-widest" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>{t.category}</span>
                      </td>
                      <td className={`px-8 py-6 text-right font-mono font-black ${t.type === 'credit' ? 'text-brand-success' : 'text-rose-500'}`}>
                        {t.type === 'credit' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
