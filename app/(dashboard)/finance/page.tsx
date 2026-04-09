'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import type { FinanceTransaction } from '@/types';

const emptyTransaction: Partial<FinanceTransaction> = {
  type: 'Entrada',
  category: 'Serviço',
  description: '',
  amount: 0,
  method: 'Pix',
  date: new Date().toISOString().split('T')[0],
};

export default function FinancePage() {
  const { user, userRole } = useAuth();
  const { confirm } = useUI();
  const isBarbeiro = userRole === 'Barbeiro';
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<FinanceTransaction>>({ ...emptyTransaction });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabaseService.getTransactions()
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, [user]);

  const totals = useMemo(() => {
    const entradas = transactions.filter(t => t.type === 'Entrada').reduce((acc, curr) => acc + curr.amount, 0);
    const saidas = transactions.filter(t => t.type === 'Saída').reduce((acc, curr) => acc + curr.amount, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [transactions]);

  const methodData = useMemo(() => {
    const entries = transactions.filter(t => t.type === 'Entrada');
    const total = entries.reduce((acc, curr) => acc + curr.amount, 0);
    const getMethodTotal = (method: string) => entries.filter(t => t.method === method).reduce((acc, curr) => acc + curr.amount, 0);
    return {
      Pix: total > 0 ? (getMethodTotal('Pix') / total) * 100 : 0,
      'Cartão': total > 0 ? (getMethodTotal('Cartão') / total) * 100 : 0,
      'Dinheiro': total > 0 ? (getMethodTotal('Dinheiro') / total) * 100 : 0,
    };
  }, [transactions]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await supabaseService.upsertTransaction(form);
      setTransactions(prev => [saved, ...prev]);
      setModalOpen(false);
      setForm({ ...emptyTransaction });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Excluir transação?', danger: true, confirmLabel: 'Excluir' })) return;
    await supabaseService.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            {isBarbeiro ? 'Ganhos' : 'Financeiro'}<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            {isBarbeiro ? 'Acompanhe seu desempenho financeiro e comissões.' : 'Controle total sobre o ecossistema de capital do seu negócio.'}
          </p>
        </div>

        {!isBarbeiro && (
          <button
            onClick={() => { setForm({ ...emptyTransaction }); setModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-6 py-3.5 md:px-10 md:py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.4)] hover:bg-brand-accent/90 transition-all w-full md:w-auto"
          >
            <span className="text-base leading-none">+</span>
            NOVO LANÇAMENTO
          </button>
        )}
      </header>

      {/* Stats */}
      {isBarbeiro ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          {[
            { label: 'Total Comissões', val: totals.entradas, color: 'text-brand-success', icon: 'solar:card-recive-bold-duotone' },
            { label: 'Atendimentos', val: transactions.length, color: 'text-brand-accent', icon: 'solar:scissors-bold-duotone', isCont: true },
          ].map((stat, i) => (
            <div key={i} className="flashlight-card p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem]">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center ${stat.color}`} style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  <iconify-icon icon={stat.icon} class="text-2xl sm:text-3xl" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-[0.2em] text-brand-muted text-right">{stat.label}</span>
              </div>
              <h3 className={`text-2xl sm:text-4xl font-mono font-black ${stat.color} truncate`}>
                {(stat as any).isCont ? stat.val : <><span className="text-sm sm:text-lg mr-1 tracking-tighter opacity-50">R$</span>{(stat.val as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</>}
              </h3>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          {[
            { label: 'Total Entradas', val: totals.entradas, color: 'text-brand-success', icon: 'solar:card-recive-bold-duotone' },
            { label: 'Total Saídas', val: totals.saidas, color: 'text-rose-500', icon: 'solar:course-down-bold-duotone' },
            { label: 'Resultado Real', val: totals.saldo, color: 'text-brand-accent', icon: 'solar:wallet-2-bold-duotone', wide: true },
          ].map((stat, i) => (
            <div key={i} className={`flashlight-card p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] relative overflow-hidden ${(stat as any).wide ? 'col-span-2' : 'col-span-1'}`}>
              <div className={`flex items-center justify-between mb-4 sm:mb-6 ${(stat as any).wide ? 'flex-row' : 'flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0'}`}>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center ${stat.color}`} style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  <iconify-icon icon={stat.icon} class="text-2xl sm:text-3xl" />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-brand-muted ${(stat as any).wide ? 'text-right' : 'text-left sm:text-right'}`}>
                  {stat.label}
                </span>
              </div>
              <h3 className={`text-2xl sm:text-4xl font-mono font-black ${stat.color} truncate`}>
                <span className="text-sm sm:text-lg mr-1 tracking-tighter opacity-50">R$</span>
                {stat.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Transaction history */}
        <div className={`${isBarbeiro ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
          <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
            <iconify-icon icon="solar:history-bold-duotone" class="text-3xl text-brand-accent" />
            Histórico de Fluxo
          </h2>

          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-6 text-left">Natureza</th>
                    <th className="px-8 py-6 text-left hidden md:table-cell">Via</th>
                    <th className="px-8 py-6 text-right">Valor</th>
                    {!isBarbeiro && <th className="px-8 py-6 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-16 text-center text-brand-muted text-sm font-mono">Nenhuma transação registrada.</td>
                    </tr>
                  ) : transactions.map(t => (
                    <tr key={t.id} className="hover:bg-brand-accent/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'Entrada' ? 'bg-brand-success/10 text-brand-success' : 'bg-rose-500/10 text-rose-500'}`}>
                            {t.type === 'Entrada' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>
                          <div>
                            <p className="font-display font-black text-brand-main uppercase text-sm tracking-tight group-hover:text-brand-accent transition-colors">{t.description}</p>
                            <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest mt-1">{t.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 hidden md:table-cell">
                        <span className="text-[9px] font-mono font-black text-brand-muted px-3 py-1.5 rounded-full uppercase tracking-widest" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>{t.method}</span>
                      </td>
                      <td className={`px-8 py-6 text-right font-mono font-black ${t.type === 'Entrada' ? 'text-brand-success' : 'text-rose-500'}`}>
                        R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      {!isBarbeiro && (
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => handleDelete(t.id)} className="w-9 h-9 rounded-lg bg-rose-500/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center mx-auto mr-0">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Channels — só para proprietário */}
        {!isBarbeiro && <div className="lg:col-span-4 space-y-6">
          <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
            <iconify-icon icon="solar:pie-chart-2-bold-duotone" class="text-3xl text-brand-accent" />
            Canais
          </h2>

          <div className="flashlight-card p-10 rounded-[3.5rem] space-y-10">
            {(['Pix', 'Cartão', 'Dinheiro'] as const).map((m, idx) => {
              const colors = ['bg-brand-success', 'bg-sky-500', 'bg-brand-accent'];
              const percentage = methodData[m];
              return (
                <div key={m} className="space-y-4 group">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${colors[idx]}`} />
                      <span className="text-[10px] font-mono font-black text-brand-main uppercase tracking-widest">{m}</span>
                    </div>
                    <span className="text-xl font-mono font-black text-brand-accent">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden shadow-inner" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                    <div className={`h-full ${colors[idx]} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flashlight-card p-8 rounded-[2.5rem] bg-brand-accent/5 border border-brand-accent/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <p className="text-[9px] font-mono text-brand-accent uppercase tracking-widest font-black mb-4">Relatório Inteligente</p>
            <h4 className="text-brand-main font-display font-black uppercase text-lg leading-tight mb-4">Dashboard Financeiro</h4>
            <p className="text-brand-muted text-xs font-medium leading-relaxed">
              {totals.entradas > 0
                ? `Saldo positivo de R$ ${totals.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no período.`
                : 'Registre suas transações para visualizar insights.'}
            </p>
          </div>
        </div>}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-[2.5rem] p-8 space-y-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">Nova Transação</h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Tipo</label>
                <div className="flex gap-3">
                  {(['Entrada', 'Saída'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-3 rounded-2xl text-sm font-display font-black uppercase tracking-wide transition-all ${form.type === t ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}
                      style={form.type !== t ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Descrição</label>
                <input required value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Valor (R$)</label>
                  <input required type="number" min="0" step="0.01" value={form.amount === 0 ? '' : form.amount} placeholder="0" onChange={e => setForm(f => ({ ...f, amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
                    className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Data</label>
                  <input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Método</label>
                <select value={form.method || 'Pix'} onChange={e => setForm(f => ({ ...f, method: e.target.value as any }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                  <option>Pix</option>
                  <option>Cartão</option>
                  <option>Dinheiro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Categoria</label>
                <input value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Serviço, Produto, Despesa..."
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Registrar Transação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
