'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import type { Wallet } from '@/types';

interface WithdrawalRecord {
  id: string;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
}

export default function WalletsPage() {
  const { user } = useAuth();
  const { toast } = useUI();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState<{ wallet: Wallet } | null>(null);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', pixKey: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  const loadData = () => {
    if (!user) return;
    Promise.all([
      fetch('/api/wallets').then(r => r.json()).catch(() => []),
      fetch('/api/wallets/withdraw').then(r => r.json()).catch(() => []),
    ]).then(([w, wd]) => {
      setWallets(Array.isArray(w) ? w : []);
      setWithdrawals(Array.isArray(wd) ? wd : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user]);

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const getWalletLabel = (type: string) => {
    const labels: Record<string, string> = { system: 'Sistema', barbershop: 'Agendamentos', barber: 'Barbeiro', subscription: 'Assinaturas' };
    return labels[type] || type;
  };

  const getWalletIcon = (type: string) => {
    const icons: Record<string, string> = {
      system: 'solar:server-bold-duotone',
      barbershop: 'solar:shop-2-bold-duotone',
      barber: 'solar:user-bold-duotone',
      subscription: 'solar:crown-bold-duotone',
    };
    return icons[type] || 'solar:wallet-bold-duotone';
  };


  const handleWithdraw = async () => {
    if (!withdrawModal) return;
    const amount = parseFloat(withdrawForm.amount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    if (!withdrawForm.pixKey.trim()) return;
    setWithdrawing(true);
    try {
      const res = await fetch('/api/wallets/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          pixKey: withdrawForm.pixKey.trim(),
          walletType: withdrawModal.wallet.type,
        }),
      });
      const data = await res.json();
      if (data.error) { toast(data.error, 'error'); return; }
      setWithdrawModal(null);
      setWithdrawForm({ amount: '', pixKey: '' });
      toast('Saque solicitado com sucesso!', 'success');
      loadData();
    } catch { toast('Erro ao solicitar saque.', 'error'); }
    finally { setWithdrawing(false); }
  };

  const statusColor = (s: string) => s === 'Aprovado' ? 'text-brand-success' : s === 'Rejeitado' ? 'text-rose-500' : 'text-amber-400';

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
        <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
          Carteiras<span className="text-brand-accent">.</span>
        </h1>
        <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
          Gestão financeira distribuída e comissões em tempo real.
        </p>
      </header>

      {/* Total balance */}
      <div className="flashlight-card px-8 py-6 rounded-[2rem] relative overflow-hidden flex items-center justify-between">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Saldo Total Consolidado</p>
          <div className="text-4xl font-display font-black text-brand-accent tracking-tighter">
            <span className="text-base mr-1 opacity-50">R$</span>
            {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
          <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">{wallets.length} ativa{wallets.length !== 1 ? 's' : ''}</span>
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
        <div className="grid grid-cols-2 gap-4">
          {wallets.map(wallet => (
            <div key={wallet.id} className="flashlight-card p-5 rounded-[2rem] relative overflow-hidden flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[1rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <iconify-icon icon={getWalletIcon(wallet.type)} class="text-lg" />
                </div>
                <span className="text-[9px] font-mono font-black text-brand-muted uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  {getWalletLabel(wallet.type)}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Saldo Disponível</p>
                <div className="text-2xl font-display font-black text-brand-success tracking-tighter">
                  <span className="text-sm mr-0.5 opacity-50">R$</span>
                  {(wallet.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {wallet.type === 'subscription' && (() => {
                const availableDate = wallet.lastCreditAt
                  ? new Date(new Date(wallet.lastCreditAt).getTime() + 32 * 24 * 60 * 60 * 1000)
                  : null;
                const now = new Date();
                const isAvailable = availableDate ? availableDate <= now : false;
                return (
                  <div className={`px-3 py-2 rounded-xl flex items-center gap-2 ${isAvailable ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                    <iconify-icon icon={isAvailable ? 'solar:check-circle-bold-duotone' : 'solar:clock-circle-bold-duotone'} class={`text-sm flex-shrink-0 ${isAvailable ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <p className={`text-[9px] font-mono font-black uppercase tracking-widest ${isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isAvailable ? 'Disponível' : availableDate ? availableDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Aguardando'}
                    </p>
                  </div>
                );
              })()}
              <button
                onClick={() => { setWithdrawModal({ wallet }); setWithdrawForm({ amount: '', pixKey: '' }); }}
                className="w-full py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all hover:border-brand-accent/40 hover:text-brand-accent active:scale-95 mt-auto"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                Solicitar Saque
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Saques */}
      {withdrawals.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
            <iconify-icon icon="solar:transfer-horizontal-bold-duotone" class="text-3xl text-brand-accent" />
            Saques
          </h2>
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-6 text-left">Chave PIX</th>
                    <th className="px-8 py-6 text-left hidden md:table-cell">Data</th>
                    <th className="px-8 py-6 text-left">Status</th>
                    <th className="px-8 py-6 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-brand-accent/[0.02] transition-colors">
                      <td className="px-8 py-6 font-mono text-sm text-brand-main">{w.pixKey}</td>
                      <td className="px-8 py-6 hidden md:table-cell text-[11px] font-mono text-brand-muted">{new Date(w.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-6">
                        <span className={`text-[9px] font-mono font-black uppercase tracking-widest ${statusColor(w.status)}`}>{w.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right font-mono font-black text-rose-400">
                        - R$ {w.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Saque */}
      {withdrawModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="flashlight-card w-full max-w-md rounded-[3rem] overflow-hidden" style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>
            <div className="px-10 pt-10 pb-6 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest mb-3 block">Saque PIX</span>
                <h2 className="text-3xl font-display font-black text-brand-main uppercase">Solicitar<span className="text-brand-accent">.</span></h2>
              </div>
              <button onClick={() => setWithdrawModal(null)} className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all hover:rotate-90" style={{ background: 'var(--input-bg)' }}>✕</button>
            </div>

            <div className="px-10 pb-10 space-y-6">
              <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Saldo disponível</span>
                <span className="font-display font-black text-brand-success text-xl">R$ {(withdrawModal.wallet.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-1">Valor do saque (R$)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={withdrawModal.wallet.balance}
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-2xl py-4 px-6 text-brand-accent font-mono font-black text-xl outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-1">Chave PIX</label>
                <input
                  type="text"
                  value={withdrawForm.pixKey}
                  onChange={e => setWithdrawForm(f => ({ ...f, pixKey: e.target.value }))}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  className="w-full rounded-2xl py-4 px-6 text-brand-main font-medium outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawForm.amount || !withdrawForm.pixKey}
                className="w-full py-5 rounded-2xl bg-brand-accent text-white font-display font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.3)] hover:opacity-90 transition-all disabled:opacity-40"
              >
                {withdrawing ? 'Processando...' : 'Confirmar Saque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
