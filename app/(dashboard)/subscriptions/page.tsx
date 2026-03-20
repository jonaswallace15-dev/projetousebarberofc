'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Check } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import type { SubscriptionPlan } from '@/types';

const emptyPlan: Partial<SubscriptionPlan> = {
  name: '',
  price: 0,
  benefits: [],
  activeUsers: 0,
};

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<SubscriptionPlan>>({ ...emptyPlan });
  const [benefitsInput, setBenefitsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Client subscriptions
  const [clientSubs, setClientSubs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabaseService.getPlans(),
      supabaseService.getClientSubscriptions(),
    ]).then(([p, cs]) => {
      setPlans(p);
      setClientSubs(Array.isArray(cs) ? cs : []);
    }).finally(() => setLoading(false));
  }, [user]);

  const openModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setForm({ ...plan });
      setBenefitsInput(plan.benefits?.join('\n') || '');
    } else {
      setForm({ ...emptyPlan });
      setBenefitsInput('');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const benefits = benefitsInput.split('\n').map(b => b.trim()).filter(Boolean);
      const saved = await supabaseService.upsertPlan({ ...form, benefits });
      setPlans(prev => form.id ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved]);
      setModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir plano?')) return;
    await supabaseService.deletePlan(id);
    setPlans(prev => prev.filter(p => p.id !== id));
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-4">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse shadow-[0_0_10px_#0070FF]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Subscription Engine Active</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            Assinaturas<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            Gerencie planos de fidelidade e recorrência dos seus clientes.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.4)] hover:bg-brand-accent/90 transition-all whitespace-nowrap w-full md:w-auto justify-center"
        >
          <Plus size={16} />
          NOVO PLANO
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Planos Ativos', value: plans.length, icon: 'solar:medal-ribbons-star-bold-duotone', color: 'text-brand-accent' },
          { label: 'Assinantes', value: clientSubs.length, icon: 'solar:users-group-two-rounded-bold-duotone', color: 'text-brand-success' },
          { label: 'Receita Mensal', value: `R$ ${clientSubs.reduce((sum, s) => sum + (Number(s.price) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'solar:wallet-money-bold-duotone', color: 'text-brand-success' },
        ].map((stat, i) => (
          <div key={i} className="flashlight-card p-8 rounded-[2.5rem] flex items-center gap-6">
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${stat.color}`} style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <iconify-icon icon={stat.icon} class="text-3xl" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black">{stat.label}</p>
              <p className={`text-3xl font-display font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plans grid */}
      <div>
        <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-6 flex items-center gap-3 px-2">
          <iconify-icon icon="solar:medal-ribbons-star-bold-duotone" class="text-3xl text-brand-accent" />
          Planos de Fidelidade
        </h2>

        {plans.length === 0 ? (
          <div className="flashlight-card p-16 rounded-[3.5rem] text-center">
            <iconify-icon icon="solar:medal-ribbons-star-bold-duotone" class="text-7xl text-brand-muted/20 mb-6" />
            <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-4">Nenhum plano criado</h3>
            <p className="text-brand-muted text-sm leading-relaxed mb-8">Crie planos de fidelidade para fidelizar seus clientes.</p>
            <button onClick={() => openModal()} className="px-8 py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all">
              Criar Primeiro Plano
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map(plan => (
              <div key={plan.id} className="flashlight-card p-8 rounded-[3rem] group hover:border-brand-accent/30 transition-all relative overflow-hidden flex flex-col">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-[1.5rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                    <iconify-icon icon="solar:medal-ribbons-star-bold-duotone" class="text-2xl" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal(plan)} className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="w-10 h-10 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/60 hover:text-rose-500 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-2 group-hover:text-brand-accent transition-colors">{plan.name}</h3>
                <div className="text-4xl font-display font-black text-brand-success tracking-tighter mb-6">
                  <span className="text-lg mr-1 opacity-50">R$</span>{plan.price}<span className="text-sm opacity-40 ml-1">/mês</span>
                </div>

                {plan.benefits?.length > 0 && (
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-brand-muted">
                        <Check size={14} className="text-brand-success shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-6 border-t flex items-center gap-3" style={{ borderColor: 'var(--card-border)' }}>
                  <Users size={14} className="text-brand-accent" />
                  <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">{plan.activeUsers || 0} assinante{(plan.activeUsers || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}

            <button onClick={() => openModal()} className="flashlight-card rounded-[3rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-12 group hover:border-brand-accent/50 transition-all min-h-[300px]" style={{ borderColor: 'var(--card-border)' }}>
              <div className="w-20 h-20 rounded-[1.8rem] flex items-center justify-center text-brand-muted group-hover:bg-brand-accent group-hover:text-white transition-all group-hover:scale-110" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <Plus size={32} />
              </div>
              <div className="mt-6">
                <h3 className="text-xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors uppercase tracking-tight">Novo Plano</h3>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Client subscriptions */}
      {clientSubs.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
            <iconify-icon icon="solar:users-group-two-rounded-bold-duotone" class="text-3xl text-brand-accent" />
            Assinantes Ativos
          </h2>
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-6 text-left">Cliente</th>
                    <th className="px-8 py-6 text-left">Plano</th>
                    <th className="px-8 py-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {clientSubs.map((sub, i) => (
                    <tr key={sub.id || i} className="hover:bg-brand-accent/[0.02] transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-display font-black text-brand-main uppercase text-sm tracking-tight">{sub.client_name || sub.clientName || 'Cliente'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[9px] font-mono font-black text-brand-muted px-3 py-1.5 rounded-full uppercase tracking-widest" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                          {sub.plan_name || sub.planName || '-'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
                          <span className="text-[10px] font-mono text-brand-success uppercase tracking-widest font-black">{sub.status || 'Ativo'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-[2.5rem] p-8 space-y-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">
                {form.id ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome do Plano</label>
                <input required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Preço Mensal (R$)</label>
                <input required type="number" min="0" step="0.01" value={form.price || 0} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Benefícios (um por linha)</label>
                <textarea rows={5} value={benefitsInput} onChange={e => setBenefitsInput(e.target.value)}
                  placeholder="Desconto de 10% em serviços&#10;Prioridade de agendamento&#10;..."
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none resize-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar Plano'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
