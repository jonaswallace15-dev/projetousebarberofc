'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, Crown, Loader2, ArrowRight, CheckCircle2, Copy, CheckCheck, QrCode } from 'lucide-react';
import { useUI } from '@/components/UIProvider';
import { isValidEmail } from '@/lib/validators';

interface PageProps {
  params: { planId: string };
}

interface PixData {
  lorexpayOrderId: string;
  brCode: string | null;
  qrCodeImage: string | null;
  expiresAt: string | null;
  clientSubscriptionId: string | null;
}

export default function PlanCheckoutPage({ params }: PageProps) {
  const { planId } = params;
  const { toast } = useUI();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', cpf: '' });
  const [billingDay, setBillingDay] = useState<number | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!planId || planId === 'null') { setNotFound(true); setLoading(false); return; }
    fetch(`/api/plans/public?planId=${planId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setPlan)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dia = Number(urlParams.get('dia'));
      if (dia >= 1 && dia <= 28) setBillingDay(dia);
    }
  }, [planId]);

  // Polling para checar se o pagamento foi confirmado
  useEffect(() => {
    if (!pixData?.clientSubscriptionId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/lorexpay/status?clientSubscriptionId=${pixData.clientSubscriptionId}`);
        const { status } = await res.json();
        if (status === 'active') {
          clearInterval(pollRef.current!);
          setPixData(null);
          setSuccess(true);
        }
      } catch { /* silent */ }
    }, 4000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pixData]);

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
    setSubmitting(true);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-lorexpay-checkout',
          planId: plan.id,
          clientName: form.name,
          clientEmail: form.email,
          clientPhone: form.phone,
          clientCpf: form.cpf,
          ...(billingDay ? { billingDay } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao gerar cobrança');
      setPixData(data);
    } catch (err: any) {
      toast(err.message || 'Erro ao processar. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyBrCode = () => {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: '#050505', color: 'white' }}>
        <Crown size={64} className="text-white/10 mb-6" />
        <h1 className="text-3xl font-display font-black uppercase tracking-tighter mb-3">Plano não encontrado</h1>
        <p className="text-white/40 font-mono text-sm">Este link de assinatura não existe ou foi removido.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: '#050505', color: 'white' }}>
        <div className="w-28 h-28 rounded-full bg-brand-success/10 border border-brand-success/20 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
          <CheckCircle2 size={52} className="text-brand-success" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-success/10 border border-brand-success/20 mb-5">
          <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse" />
          <span className="text-[9px] font-mono uppercase tracking-widest text-brand-success font-black">Assinatura Confirmada</span>
        </div>
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-3 leading-none">
          Bem-vindo ao<br /><span className="text-brand-accent">{plan?.name}</span>
        </h1>
        <p className="text-white/50 font-mono text-sm max-w-xs leading-relaxed mt-4">
          Você agora é assinante em <span className="text-white font-black">{plan?.barbershopName}</span>. Aproveite todos os benefícios do seu plano.
        </p>
        <p className="text-white/20 font-mono text-[10px] mt-8 uppercase tracking-widest">Pode fechar esta janela</p>
      </div>
    );
  }

  const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];

  return (
    <div className="min-h-screen text-white font-sans" style={{ background: '#050505' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-success/4 rounded-full blur-[100px] -ml-48 -mb-48" />
      </div>

      <div className="relative max-w-md mx-auto px-6 py-16">
        {/* Barbershop header */}
        <div className="flex flex-col items-center text-center mb-10">
          {plan.barbershopLogo ? (
            <img src={plan.barbershopLogo} alt={plan.barbershopName} className="w-20 h-20 rounded-full object-cover border-2 border-white/10 mb-4 shadow-2xl" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Crown size={32} className="text-brand-accent" />
            </div>
          )}
          <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em]">{plan.barbershopName}</p>
        </div>

        {/* Plan card */}
        <div className="rounded-[2.5rem] p-8 mb-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 mb-4">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-brand-accent font-black">Plano de Assinatura</span>
          </div>
          <h1 className="text-3xl font-display font-black uppercase tracking-tighter leading-none mb-2">
            {plan.name}<span className="text-brand-accent">.</span>
          </h1>
          <div className="text-5xl font-display font-black tracking-tighter mt-4 mb-6">
            <span className="text-lg text-white/30 mr-1">R$</span>{plan.price}
            <span className="text-sm text-white/30 ml-1">/mês</span>
          </div>
          {benefits.length > 0 && (
            <ul className="space-y-3">
              {benefits.map((b: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/70">
                  <div className="w-5 h-5 rounded-lg bg-brand-success/15 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-brand-success" strokeWidth={3} />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* QR Code PIX — exibido após gerar cobrança */}
        {pixData ? (
          <div className="space-y-6">
            <div className="rounded-[2.5rem] p-8 flex flex-col items-center gap-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-success/10 border border-brand-success/20">
                <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-brand-success font-black">Aguardando pagamento</span>
              </div>
              <h2 className="text-xl font-display font-black uppercase tracking-tighter text-center">
                Pague com PIX<span className="text-brand-accent">.</span>
              </h2>
              {pixData.qrCodeImage && (
                <div className="p-4 bg-white rounded-[2rem]">
                  <img
                    src={pixData.qrCodeImage}
                    alt="QR Code PIX"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              )}
              {!pixData.qrCodeImage && (
                <div className="w-56 h-56 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                  <QrCode size={48} className="text-white/20" />
                </div>
              )}
              {pixData.brCode && (
                <button
                  onClick={copyBrCode}
                  className="w-full rounded-[2rem] py-4 flex items-center justify-center gap-3 font-mono font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {copied ? <CheckCheck size={16} className="text-brand-success" /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar código PIX'}
                </button>
              )}
              <p className="text-[11px] font-mono text-white/40 text-center leading-relaxed">
                Escaneie o QR Code ou copie o código acima no seu banco.<br />
                A confirmação é automática após o pagamento.
              </p>
              {pixData.expiresAt && (
                <p className="text-[10px] font-mono text-white/20 text-center">
                  Expira em: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <button
              onClick={() => setPixData(null)}
              className="w-full py-3 rounded-2xl font-mono text-[11px] uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors"
            >
              ← Voltar ao formulário
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-[11px] font-mono font-black text-white/40 uppercase tracking-widest mb-4">Seus dados</h2>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Nome completo</label>
              <input required type="text" placeholder="João Silva" value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-2xl px-5 py-4 text-white font-medium outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">CPF</label>
              <input required type="text" placeholder="000.000.000-00" value={form.cpf}
                onChange={e => setForm(prev => ({ ...prev, cpf: e.target.value }))}
                className="w-full rounded-2xl px-5 py-4 text-white font-medium outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">WhatsApp / Tel</label>
              <input type="tel" placeholder="(11) 99999-9999" value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-2xl px-5 py-4 text-white font-medium outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">E-mail</label>
              <input required type="email" placeholder="joao@email.com" value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-2xl px-5 py-4 text-white font-medium outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${form.email && !isValidEmail(form.email) ? '#ef4444' : 'rgba(255,255,255,0.1)'}` }} />
              {form.email && !isValidEmail(form.email) && <p className="text-[10px] text-red-400 font-mono">E-mail inválido</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-5 rounded-2xl bg-brand-accent text-white font-display font-black text-[13px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,112,255,0.4)] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-3 mt-2"
            >
              {submitting
                ? <><Loader2 size={18} className="animate-spin" /> Gerando PIX...</>
                : <><QrCode size={17} /> Gerar PIX para assinar <ArrowRight size={17} /></>}
            </button>

            <p className="text-center text-[9px] font-mono text-white/20 uppercase tracking-widest pt-2">
              Pagamento seguro via PIX · Recorrência mensal
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
