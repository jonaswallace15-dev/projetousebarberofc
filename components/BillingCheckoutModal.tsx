'use client';

import React, { useState } from 'react';
import { Check, Loader2, ArrowRight, CreditCard, Lock, Clock, ShieldAlert, X } from 'lucide-react';
import { useUI } from '@/components/UIProvider';
import { maskCardNumber, maskCardExpiry } from '@/lib/validators';
import { PLATFORM_PLANS, type PlatformPlanId } from '@/lib/platformPlans';

const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)' };

interface BillingCheckoutModalProps {
  /** true = bloqueio real (trial acabou/pagamento falhou) — sem botão de fechar. */
  forced: boolean;
  /** true = quem está vendo não pode pagar (ex: Barbeiro) — só mostra aviso, sem formulário. */
  readOnlyNotice?: boolean;
  daysLeft?: number | null;
  initialPlan?: PlatformPlanId;
  onClose?: () => void;
  onSuccess: () => void;
}

export function BillingCheckoutModal({ forced, readOnlyNotice, daysLeft, initialPlan, onClose, onSuccess }: BillingCheckoutModalProps) {
  const { toast } = useUI();
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlatformPlanId>(initialPlan || 'pro');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ cpf: '', cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const [expMonth, expYear] = form.cardExpiry.split('/');
    if (!form.cpf || form.cpf.replace(/\D/g, '').length !== 11) {
      toast('CPF inválido. Verifique o número.', 'error');
      return;
    }
    if (form.cardNumber.replace(/\s/g, '').length < 13 || !expMonth || !expYear || form.cardCvv.length < 3) {
      toast('Dados do cartão inválidos. Verifique os campos.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-platform-subscription',
          plan: selectedPlan,
          billingCycle: cycle,
          clientCpf: form.cpf,
          card: {
            number: form.cardNumber.replace(/\s/g, ''),
            holderName: form.cardHolder,
            expMonth, expYear,
            cvv: form.cardCvv,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao processar assinatura');
      toast('Assinatura ativada!', 'success');
      onSuccess();
    } catch (err: any) {
      toast(err.message || 'Erro ao processar. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(3,3,3,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (!forced && e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="w-full max-w-2xl my-8 rounded-[2.5rem] p-8 md:p-10 relative"
        style={{ background: 'var(--brand-deep)', border: '1px solid var(--card-border)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}
      >
        {!forced && onClose && (
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)' }}>
            <X size={18} />
          </button>
        )}

        {readOnlyNotice ? (
          <div className="flex flex-col items-center text-center py-8">
            <ShieldAlert size={48} className="text-amber-400 mb-6" />
            <h2 className="text-2xl font-display font-black uppercase tracking-tighter mb-3 text-brand-main">Acesso suspenso</h2>
            <p className="text-brand-muted font-mono text-sm max-w-sm leading-relaxed">
              A assinatura desta barbearia com o UseBarber está pendente. Fale com o proprietário da barbearia pra regularizar o pagamento.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              {forced ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
                  <ShieldAlert size={13} className="text-rose-400" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-black">Seu teste grátis acabou</span>
                </div>
              ) : daysLeft != null ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/20 mb-4">
                  <Clock size={13} className="text-brand-accent" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-black">
                    {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'} de teste grátis
                  </span>
                </div>
              ) : null}
              <h1 className="text-3xl font-display font-black uppercase tracking-tighter leading-none mb-2 text-brand-main">
                Escolha seu plano<span className="text-brand-accent">.</span>
              </h1>
              <p className="text-brand-muted font-mono text-xs">
                {forced ? 'Assine pra continuar usando o painel do UseBarber.' : 'Assine agora ou continue aproveitando seu teste grátis.'}
              </p>
            </div>

            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 p-1.5 rounded-full" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <button type="button" onClick={() => setCycle('monthly')} className={`px-5 py-2 rounded-full text-[10px] font-mono font-black uppercase tracking-widest transition-all ${cycle === 'monthly' ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}>Mensal</button>
                <button type="button" onClick={() => setCycle('yearly')} className={`px-5 py-2 rounded-full text-[10px] font-mono font-black uppercase tracking-widest transition-all ${cycle === 'yearly' ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}>Anual</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
              {Object.values(PLATFORM_PLANS).map((plan) => {
                const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
                const active = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className="text-left rounded-2xl p-4 transition-all"
                    style={{
                      background: active ? 'rgba(0,112,255,0.08)' : 'var(--input-bg)',
                      border: active ? '1px solid var(--brand-accent)' : '1px solid var(--card-border)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-display font-black uppercase tracking-tight text-brand-main">{plan.name}</h3>
                      {active && <div className="w-4 h-4 rounded-full bg-brand-accent flex items-center justify-center shrink-0"><Check size={10} className="text-white" strokeWidth={3} /></div>}
                    </div>
                    <div className="text-xl font-display font-black tracking-tighter text-brand-main">
                      <span className="text-[10px] text-brand-muted mr-0.5">R$</span>{price}
                      <span className="text-[10px] text-brand-muted ml-0.5">/{cycle === 'yearly' ? 'ano' : 'mês'}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">CPF do responsável</label>
                  <input required type="text" placeholder="000.000.000-00" value={form.cpf}
                    onChange={e => setForm(prev => ({ ...prev, cpf: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-brand-main font-medium outline-none text-sm" style={inputStyle} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">Número do cartão</label>
                  <input required type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" value={form.cardNumber}
                    onChange={e => setForm(prev => ({ ...prev, cardNumber: maskCardNumber(e.target.value) }))}
                    className="w-full rounded-xl px-4 py-3 text-brand-main font-medium outline-none text-sm" style={inputStyle} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">Nome impresso no cartão</label>
                  <input required type="text" placeholder="JOAO SILVA" value={form.cardHolder}
                    onChange={e => setForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
                    className="w-full rounded-xl px-4 py-3 text-brand-main font-medium outline-none text-sm" style={inputStyle} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">Validade</label>
                  <input required type="text" inputMode="numeric" placeholder="MM/AA" value={form.cardExpiry}
                    onChange={e => setForm(prev => ({ ...prev, cardExpiry: maskCardExpiry(e.target.value) }))}
                    className="w-full rounded-xl px-4 py-3 text-brand-main font-medium outline-none text-sm" style={inputStyle} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">CVV</label>
                  <input required type="text" inputMode="numeric" maxLength={4} placeholder="123" value={form.cardCvv}
                    onChange={e => setForm(prev => ({ ...prev, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className="w-full rounded-xl px-4 py-3 text-brand-main font-medium outline-none text-sm" style={inputStyle} />
                </div>
              </div>
              <p className="flex items-center gap-2 text-[9px] font-mono text-brand-muted/70 pt-1">
                <Lock size={11} /> Pagamento processado com segurança e criptografia de ponta a ponta
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,112,255,0.4)] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-3 mt-2"
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Processando...</>
                  : <><CreditCard size={15} /> Assinar plano {PLATFORM_PLANS[selectedPlan].name} <ArrowRight size={15} /></>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
