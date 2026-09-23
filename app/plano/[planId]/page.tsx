'use client';

import React, { useState, useEffect } from 'react';
import { Check, Crown, Loader2, ArrowRight, CheckCircle2, CreditCard, Lock } from 'lucide-react';
import { useUI } from '@/components/UIProvider';
import { isValidEmail, maskCardNumber, maskCardExpiry } from '@/lib/validators';
// NOTA: tokenização client-side (lib/pagarmeClient.ts) pausada temporariamente —
// ver comentário em lib/pagarme.ts sobre o bug de token na conta Pagar.me/Stone.
// O cartão vai direto pro nosso backend, que repassa na hora pro Pagar.me.

interface PageProps {
  params: { planId: string };
}

const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)' };

export default function PlanCheckoutPage({ params }: PageProps) {
  const { planId } = params;
  const { toast } = useUI();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', cpf: '', billingDay: '',
    cardNumber: '', cardHolder: '', cardExpiry: '', cardCvv: '',
  });

  useEffect(() => {
    if (!planId || planId === 'null') { setNotFound(true); setLoading(false); return; }
    fetch(`/api/plans/public?planId=${planId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setPlan(data);
        const theme: 'dark' | 'light' = data?.theme === 'light' ? 'light' : 'dark';
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // Pré-preenche quando a barbearia gera o link a partir do painel ("Cobrar")
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const nome = urlParams.get('nome');
      const telefone = urlParams.get('telefone');
      const email = urlParams.get('email');
      const cpf = urlParams.get('cpf');
      // Nota: não pré-preenche "dia de vencimento" a partir do link (?dia=) —
      // o campo fica em branco por padrão, é opcional e o cliente decide.
      if (nome || telefone || email || cpf) {
        setForm(prev => ({
          ...prev,
          name: nome || prev.name,
          phone: telefone || prev.phone,
          email: email || prev.email,
          cpf: cpf || prev.cpf,
        }));
      }
    }

    // Restaura dark ao sair da página (mesmo padrão do /book/[slug])
    return () => {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add('dark');
    };
  }, [planId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(form.email)) {
      toast('E-mail inválido. Verifique o formato.', 'error');
      return;
    }
    if (!form.cpf || form.cpf.replace(/\D/g, '').length !== 11) {
      toast('CPF inválido. Verifique o número.', 'error');
      return;
    }
    const [expMonth, expYear] = form.cardExpiry.split('/');
    if (form.cardNumber.replace(/\D/g, '').length < 13 || !expMonth || !expYear || form.cardCvv.length < 3) {
      toast('Dados do cartão inválidos. Verifique os campos.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-pagarme-card-subscription',
          planId: plan.id,
          clientName: form.name,
          clientEmail: form.email,
          clientPhone: form.phone,
          clientCpf: form.cpf,
          card: {
            number: form.cardNumber.replace(/\s/g, ''),
            holderName: form.cardHolder,
            expMonth,
            expYear,
            cvv: form.cardCvv,
          },
          billingDay: form.billingDay ? Number(form.billingDay) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao processar assinatura');
      setSuccess(true);
    } catch (err: any) {
      toast(err.message || 'Erro ao processar. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--brand-deep)' }}>
        <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: 'var(--brand-deep)', color: 'var(--text-main)' }}>
        <Crown size={64} className="text-brand-muted/20 mb-6" />
        <h1 className="text-3xl font-display font-black uppercase tracking-tighter mb-3">Plano não encontrado</h1>
        <p className="text-brand-muted font-mono text-sm">Este link de assinatura não existe ou foi removido.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: 'var(--brand-deep)', color: 'var(--text-main)' }}>
        <div className="w-28 h-28 rounded-full bg-brand-success/10 border border-brand-success/20 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
          <CheckCircle2 size={52} className="text-brand-success" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 mb-5">
          <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-brand-success font-black">Assinatura Confirmada</span>
        </div>
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-3 leading-none">
          Assinatura ativada<span className="text-brand-accent">.</span>
        </h1>
        <p className="text-brand-muted font-mono text-sm max-w-xs leading-relaxed mt-4">
          Sua assinatura em <span className="text-brand-main font-black">{plan?.barbershopName}</span> está ativa. A cobrança se repete automaticamente todo mês no seu cartão.
        </p>
        <p className="text-brand-muted/60 font-mono text-[10px] mt-8 uppercase tracking-widest">Pode fechar esta página</p>
      </div>
    );
  }

  const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];

  const selectedDay = Number(form.billingDay) || null;
  const today = new Date();
  const billingDayAlreadyPassed = !!selectedDay && selectedDay < today.getDate();
  const nextBillingLabel = billingDayAlreadyPassed
    ? (() => {
        const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return `${selectedDay} de ${monthNames[next.getMonth()]}`;
      })()
    : '';

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--brand-deep)', color: 'var(--text-main)' }}>
      <div className="max-w-md mx-auto px-6 py-16">
        {/* Barbershop header */}
        <div className="flex flex-col items-center text-center mb-10">
          {plan.barbershopLogo ? (
            <img src={plan.barbershopLogo} alt={plan.barbershopName} className="w-16 h-16 rounded-full object-cover border [border-color:var(--card-border)] mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <Crown size={26} className="text-brand-accent" />
            </div>
          )}
          <p className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.3em]">{plan.barbershopName}</p>
        </div>

        {/* Plan card */}
        <div className="rounded-[2rem] p-8 mb-8" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 mb-4">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-brand-accent font-black">Plano de Assinatura</span>
          </div>
          <h1 className="text-3xl font-display font-black uppercase tracking-tighter leading-none mb-2 text-brand-main">
            {plan.name}<span className="text-brand-accent">.</span>
          </h1>
          <div className="text-5xl font-display font-black tracking-tighter mt-4 mb-6 text-brand-main">
            <span className="text-lg text-brand-muted mr-1">R$</span>{plan.price}
            <span className="text-sm text-brand-muted ml-1">/mês</span>
          </div>
          {benefits.length > 0 && (
            <ul className="space-y-3">
              {benefits.map((b: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-sm text-brand-muted">
                  <div className="w-5 h-5 rounded-lg bg-brand-success/15 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-brand-success" strokeWidth={3} />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-[11px] font-mono font-black text-brand-muted uppercase tracking-widest mb-4">Seus dados</h2>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome completo</label>
            <input required type="text" placeholder="João Silva" value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">CPF</label>
            <input required type="text" placeholder="000.000.000-00" value={form.cpf}
              onChange={e => setForm(prev => ({ ...prev, cpf: e.target.value }))}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">WhatsApp / Tel</label>
            <input type="tel" placeholder="(11) 99999-9999" value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">E-mail</label>
            <input required type="email" placeholder="joao@email.com" value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={{ ...inputStyle, border: `1px solid ${form.email && !isValidEmail(form.email) ? '#ef4444' : 'var(--input-border)'}` }} />
            {form.email && !isValidEmail(form.email) && <p className="text-[10px] text-red-400 font-mono">E-mail inválido</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Dia de vencimento (opcional)</label>
            <input type="number" min={1} max={28} placeholder="Ex: 10" value={form.billingDay}
              onChange={e => {
                const raw = e.target.value;
                const num = Number(raw);
                if (raw === '' || (num >= 1 && num <= 28)) setForm(prev => ({ ...prev, billingDay: raw }));
              }}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={inputStyle} />
            <p className="text-[10px] font-mono text-brand-muted/70">Dia do mês (1–28) em que a cobrança será renovada. Se deixar em branco, renova todo mês na data de hoje.</p>
            {billingDayAlreadyPassed && (
              <p className="text-[10px] font-mono text-amber-400 leading-relaxed pt-1">
                O dia {form.billingDay} já passou esse mês — a assinatura ativa agora, mas a primeira cobrança só acontece em {nextBillingLabel}.
              </p>
            )}
          </div>

          <h2 className="text-[11px] font-mono font-black text-brand-muted uppercase tracking-widest pt-4 mb-4">Cartão de crédito</h2>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Número do cartão</label>
            <input required type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" value={form.cardNumber}
              onChange={e => setForm(prev => ({ ...prev, cardNumber: maskCardNumber(e.target.value) }))}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={inputStyle} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome impresso no cartão</label>
            <input required type="text" placeholder="JOAO SILVA" value={form.cardHolder}
              onChange={e => setForm(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
              className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
              style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Validade</label>
              <input required type="text" inputMode="numeric" placeholder="MM/AA" value={form.cardExpiry}
                onChange={e => setForm(prev => ({ ...prev, cardExpiry: maskCardExpiry(e.target.value) }))}
                className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
                style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">CVV</label>
              <input required type="text" inputMode="numeric" maxLength={4} placeholder="123" value={form.cardCvv}
                onChange={e => setForm(prev => ({ ...prev, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none text-sm"
                style={inputStyle} />
            </div>
          </div>
          <p className="flex items-center gap-2 text-[10px] font-mono text-brand-muted/70 pt-1">
            <Lock size={12} /> Pagamento processado com segurança pelo Pagar.me (Stone)
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-5 rounded-2xl bg-brand-accent text-white font-display font-black text-[13px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,112,255,0.4)] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-3 mt-2"
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> Processando...</>
              : <><CreditCard size={17} /> Assinar com cartão <ArrowRight size={17} /></>}
          </button>

          <p className="text-center text-[9px] font-mono text-brand-muted/60 uppercase tracking-widest pt-2">
            Pagamento seguro via cartão · Recorrência mensal
          </p>
        </form>
      </div>
    </div>
  );
}
