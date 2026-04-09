'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Check, Link2, Zap, X as XIcon, ArrowRight, Loader2, Star, Wallet } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import { isValidEmail, isValidCPF, maskCPF } from '@/lib/validators';
import type { SubscriptionPlan } from '@/types';

const emptyPlan: Partial<SubscriptionPlan> = {
  name: '',
  price: 0,
  benefits: [],
  activeUsers: 0,
};

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<SubscriptionPlan>>({ ...emptyPlan });
  const [benefitsInput, setBenefitsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Client subscriptions
  const [clientSubs, setClientSubs] = useState<any[]>([]);

  // Charge modal
  const [chargeModal, setChargeModal] = useState<SubscriptionPlan | null>(null);
  const [chargeForm, setChargeForm] = useState({ name: '', phone: '', email: '', taxId: '' });
  const [charging, setCharging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPlanLink = (plan: SubscriptionPlan) =>
    typeof window !== 'undefined' ? `${window.location.origin}/plano/${plan.id}` : `/plano/${plan.id}`;

  const handleCopyLink = (plan: SubscriptionPlan) => {
    navigator.clipboard.writeText(getPlanLink(plan));
    setCopiedId(plan.id);
    setTimeout(() => setCopiedId(null), 2000);
  };


  const handleCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeModal) return;
    if (chargeForm.email && !isValidEmail(chargeForm.email)) {
      toast('E-mail inválido. Verifique o formato.', 'error');
      return;
    }
    if (chargeForm.taxId && !isValidCPF(chargeForm.taxId)) {
      toast('CPF inválido. Verifique os dígitos.', 'error');
      return;
    }
    setCharging(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-asaas-checkout',
          planId: chargeModal.id,
          clientName: chargeForm.name,
          clientPhone: chargeForm.phone,
          clientEmail: chargeForm.email,
          clientCpf: chargeForm.taxId,
          billingType: 'CREDIT_CARD',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao gerar cobrança');
      window.open(data.url, '_blank');
      setChargeModal(null);
      setChargeForm({ name: '', phone: '', email: '', taxId: '' });
    } catch (err: any) {
      toast(err.message || 'Erro ao gerar cobrança', 'error');
    } finally {
      setCharging(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    supabaseService.getPlans()
      .then(p => setPlans(Array.isArray(p) ? p : []))
      .catch(() => setPlans([]));
    supabaseService.getClientSubscriptions()
      .then(cs => setClientSubs(Array.isArray(cs) ? cs : []))
      .catch(() => setClientSubs([]))
      .finally(() => setLoading(false));
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
    if (!await confirm({ message: 'Excluir plano?', danger: true, confirmLabel: 'Excluir' })) return;
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
          { label: 'Planos Ativos', value: plans.length, icon: <Star size={24} />, color: 'text-brand-accent' },
          { label: 'Assinantes', value: clientSubs.length, icon: <Users size={24} />, color: 'text-brand-success' },
          { label: 'Receita Mensal', value: `R$ ${clientSubs.reduce((sum, s) => sum + (Number(s.planPrice) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <Wallet size={24} />, color: 'text-brand-success' },
        ].map((stat, i) => (
          <div key={i} className="flashlight-card p-8 rounded-[2.5rem] flex items-center gap-6">
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center ${stat.color}`} style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              {stat.icon}
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
          <Star size={24} className="text-brand-accent" />
          Planos de Fidelidade
        </h2>

        {plans.length === 0 ? (
          <div className="flashlight-card p-16 rounded-[3.5rem] text-center">
            <Star size={56} className="text-brand-muted/20 mx-auto mb-6" />
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
                    <Star size={22} />
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

                <div className="pt-6 border-t space-y-4" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center gap-3">
                    <Users size={14} className="text-brand-accent" />
                    <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">{plan.activeUsers || 0} assinante{(plan.activeUsers || 0) !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCopyLink(plan)}
                      title="Copiar link"
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all text-[9px] font-mono font-black uppercase tracking-widest ${copiedId === plan.id ? 'bg-brand-success/15 text-brand-success border border-brand-success/30' : 'text-brand-muted hover:text-brand-accent'}`}
                      style={copiedId !== plan.id ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}
                    >
                      <Link2 size={15} />
                      {copiedId === plan.id ? 'Copiado!' : 'Copiar'}
                    </button>

                    <button
                      onClick={() => { setChargeModal(plan); setChargeForm({ name: '', phone: '', email: '', taxId: '' }); }}
                      title="Gerar cobrança"
                      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-brand-muted hover:text-brand-accent transition-all text-[9px] font-mono font-black uppercase tracking-widest"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <Zap size={15} />
                      Cobrar
                    </button>
                  </div>
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
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
          <Users size={24} className="text-brand-accent" />
          Assinantes Ativos
        </h2>

        {clientSubs.length === 0 ? (
          <div className="flashlight-card p-14 rounded-[3rem] text-center">
            <Users size={40} className="text-brand-muted/20 mx-auto mb-4" />
            <p className="text-brand-muted text-sm font-mono uppercase tracking-widest">Nenhum assinante ainda</p>
            <p className="text-brand-muted/50 text-xs font-mono mt-2">Compartilhe o link dos seus planos para começar</p>
          </div>
        ) : (
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[9px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-5 text-left">Cliente</th>
                    <th className="px-8 py-5 text-left">Contato</th>
                    <th className="px-8 py-5 text-left">Plano</th>
                    <th className="px-8 py-5 text-left">Valor</th>
                    <th className="px-8 py-5 text-left">Data</th>
                    <th className="px-8 py-5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {clientSubs.map((sub) => (
                    <tr key={sub.id} className="hover:bg-brand-accent/[0.02] transition-colors group">
                      {/* Cliente */}
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-display font-black text-brand-accent">
                              {(sub.clientName || 'C').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="font-display font-black text-brand-main uppercase text-sm tracking-tight leading-none">{sub.clientName || '—'}</p>
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-mono text-brand-muted">{sub.clientPhone || '—'}</p>
                        {sub.clientEmail && <p className="text-[10px] font-mono text-brand-muted/50 mt-0.5">{sub.clientEmail}</p>}
                      </td>

                      {/* Plano */}
                      <td className="px-8 py-5">
                        <span className="text-[9px] font-mono font-black text-brand-accent px-3 py-1.5 rounded-full uppercase tracking-widest" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                          {sub.planName || '—'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="px-8 py-5">
                        <p className="text-sm font-mono font-black text-brand-success">
                          R$ {Number(sub.planPrice || 0).toFixed(2).replace('.', ',')}
                          <span className="text-brand-muted font-normal text-[10px] ml-1">/mês</span>
                        </p>
                      </td>

                      {/* Data */}
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-mono text-brand-muted">
                          {sub.subscribedAt
                            ? new Date(sub.subscribedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                            : '—'}
                        </p>
                      </td>

                      {/* Cancelar */}
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={async () => {
                            if (!await confirm({ message: `Cancelar assinatura de ${sub.clientName}?`, danger: true, confirmLabel: 'Cancelar assinatura' })) return;
                            await fetch('/api/payments/checkout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'cancel-subscription',
                                asaasSubscriptionId: sub.asaasSubscriptionId || (sub as any).data?.asaasSubscriptionId || null,
                                clientSubscriptionId: sub.id,
                              }),
                            });
                            setClientSubs(prev => prev.filter(s => s.id !== sub.id));
                            setPlans(prev => prev.map(p => p.id === sub.planId ? { ...p, activeUsers: Math.max(0, (p.activeUsers || 0) - 1) } : p));
                          }}
                          className="text-[9px] font-mono font-black text-rose-500/50 hover:text-rose-400 uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          style={{ background: 'var(--input-bg)', border: '1px solid transparent' }}
                          title="Cancelar assinatura"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Charge modal */}
      {chargeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>

            {/* Header */}
            <div className="px-8 pt-8 pb-6 flex items-start justify-between border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-2">
                  <Zap size={10} className="text-brand-accent" />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-brand-accent font-black">Gerar Cobrança</span>
                </div>
                <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
                  {chargeModal.name}<span className="text-brand-accent">.</span>
                </h2>
                <p className="text-brand-muted text-sm font-mono mt-1">R$ {chargeModal.price}/mês · Recorrência mensal</p>
              </div>
              <button onClick={() => setChargeModal(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main hover:rotate-90 transition-all"
                style={{ background: 'var(--input-bg)' }}>
                <XIcon size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCharge} className="px-8 py-6 space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome do cliente</label>
                <input required type="text" placeholder="João Silva" value={chargeForm.name}
                  onChange={e => setChargeForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-2xl px-4 py-3 text-brand-main font-medium outline-none text-sm transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">WhatsApp / Tel</label>
                <input required type="tel" placeholder="(11) 99999-9999" value={chargeForm.phone}
                  onChange={e => setChargeForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-2xl px-4 py-3 text-brand-main font-medium outline-none text-sm transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">E-mail</label>
                <input type="email" placeholder="joao@email.com" value={chargeForm.email}
                  onChange={e => setChargeForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-2xl px-4 py-3 text-brand-main font-medium outline-none text-sm transition-all"
                  style={{ background: 'var(--input-bg)', border: `1px solid ${chargeForm.email && !isValidEmail(chargeForm.email) ? '#ef4444' : 'var(--input-border)'}` }} />
                {chargeForm.email && !isValidEmail(chargeForm.email) && <p className="text-[10px] text-red-400 font-mono">E-mail inválido</p>}
              </div>
              {/* CPF */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">CPF do cliente</label>
                <input required type="text" placeholder="000.000.000-00" value={chargeForm.taxId}
                  onChange={e => setChargeForm(p => ({ ...p, taxId: maskCPF(e.target.value) }))}
                  className="w-full rounded-2xl px-4 py-3 text-brand-main font-medium outline-none text-sm transition-all"
                  style={{ background: 'var(--input-bg)', border: `1px solid ${chargeForm.taxId && !isValidCPF(chargeForm.taxId) ? '#ef4444' : 'var(--input-border)'}` }} />
                {chargeForm.taxId && !isValidCPF(chargeForm.taxId) && <p className="text-[10px] text-red-400 font-mono">CPF inválido</p>}
              </div>


              <button type="submit" disabled={charging}
                className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(0,112,255,0.3)] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-3 mt-2">
                {charging
                  ? <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                  : <><Zap size={15} /> Abrir Checkout <ArrowRight size={15} /></>}
              </button>
            </form>
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
                <input required type="number" min="0" step="0.01" value={form.price === 0 ? '' : form.price} placeholder="0" onChange={e => setForm(f => ({ ...f, price: e.target.value === '' ? 0 : Number(e.target.value) }))}
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
