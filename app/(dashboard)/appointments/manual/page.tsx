'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ArrowLeft, CheckCircle2, Copy, QrCode, Banknote, Crown, Loader2 } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import { supabaseService } from '@/services/supabaseService';
import { maskCPF } from '@/lib/validators';
import type { Appointment, Service, Barber } from '@/types';

const emptyForm = {
  id: '', name: '', phone: '', cpf: '', date: new Date().toISOString().split('T')[0],
  time: '', serviceId: '', barberId: ''
};

export default function ManualAppointmentPage() {
  return (
    <React.Suspense>
      <ManualAppointmentContent />
    </React.Suspense>
  );
}

function ManualAppointmentContent() {
  const { user } = useAuth();
  const { toast } = useUI();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const prefillDate = searchParams.get('date');

  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [businessConfig, setBusinessConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, date: prefillDate || emptyForm.date });

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pix'>('cash');
  const [pixData, setPixData] = useState<{ brCode: string | null; pixQrCode: string | null; appointmentId: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixPaid, setPixPaid] = useState(false);

  const [isSubscriber, setIsSubscriber] = useState(false);
  const [subscriberPlan, setSubscriberPlan] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const subscriptionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSubscription = async (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11 || !user?.id) { setIsSubscriber(false); setSubscriberPlan(null); return; }
    setCheckingSubscription(true);
    try {
      const res = await fetch(`/api/public/check-subscription?userId=${user.id}&cpf=${cleaned}`);
      const data = await res.json();
      setIsSubscriber(data.isSubscriber);
      setSubscriberPlan(data.planName || null);
    } catch {
      setIsSubscriber(false);
      setSubscriberPlan(null);
    } finally {
      setCheckingSubscription(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabaseService.getServices().catch(() => []),
      supabaseService.getBarbers().catch(() => []),
      supabaseService.getAppointments().catch(() => []),
      supabaseService.getBusinessConfig().catch(() => null),
    ]).then(([svcs, barbers, appts, config]) => {
      setServices(svcs || []);
      setTeam(barbers || []);
      setAppointments(appts || []);
      setBusinessConfig(config);

      if (editId) {
        const existing = (appts || []).find((a: Appointment) => a.id === editId);
        if (existing) {
          setForm({ id: existing.id, name: existing.clientName, phone: '', cpf: '', date: existing.date, time: existing.time, serviceId: existing.serviceId, barberId: existing.barberId });
        }
      } else {
        setForm(f => ({ ...f, serviceId: svcs?.[0]?.id || '', barberId: barbers?.[0]?.id || '' }));
      }
    }).finally(() => setLoading(false));
  }, [user, editId]);

  // Polling de status do PIX
  useEffect(() => {
    if (!pixData) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/payments/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', billingId: pixData.appointmentId }),
        });
        const { status } = await res.json();
        if (['PAID', 'RECEIVED', 'CONFIRMED', 'COMPLETED', 'APPROVED'].includes(status)) {
          clearInterval(interval);
          setPixPaid(true);
          setTimeout(() => router.push('/appointments'), 2500);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [pixData, router]);

  // Mesma lógica de horários disponíveis do link público (/book/[slug]) — respeita
  // expediente do barbeiro, pausa/almoço, colisão com outros agendamentos e horário
  // já passado (se for hoje).
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const shortDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const longDaysMap: Record<string, string> = { Dom: 'Domingo', Seg: 'Segunda', Ter: 'Terça', Qua: 'Quarta', Qui: 'Quinta', Sex: 'Sexta', Sáb: 'Sábado' };
    const shortName = shortDays[date.getDay()];
    const dayKey = dayKeys[date.getDay()];
    return { longName: longDaysMap[shortName], dayKey };
  };

  const currentSchedule = useMemo(() => {
    if (!form.date || !form.barberId) return null;
    const { longName, dayKey } = getDayName(form.date);
    const barber = team.find(b => b.id === form.barberId);
    return (barber?.schedule as any)?.[dayKey] || businessConfig?.working_hours?.[longName] || businessConfig?.workingHours?.[longName] || null;
  }, [form.date, form.barberId, team, businessConfig]);

  const isDayClosed = !!form.barberId && (!currentSchedule || currentSchedule.active === false || currentSchedule.closed);

  const availableSlots = useMemo(() => {
    if (!form.date || !form.barberId || !currentSchedule || isDayClosed) return [];
    const openTime = currentSchedule.start || currentSchedule.open;
    const closeTime = currentSchedule.end || currentSchedule.close;
    if (!openTime || !closeTime) return [];

    const [startH, startM] = openTime.split(':').map(Number);
    const [endH, endM] = closeTime.split(':').map(Number);
    const duration = services.find(s => s.id === form.serviceId)?.duration || 30;

    const now = new Date();
    const todayStr = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const isToday = form.date === todayStr;

    let current = new Date(form.date + 'T00:00:00');
    current.setHours(startH, startM, 0, 0);
    const end = new Date(form.date + 'T00:00:00');
    end.setHours(endH, endM, 0, 0);

    const slots: string[] = [];
    while (current < end) {
      const timeStr = current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
      const currentStart = current.getTime();
      const currentEnd = currentStart + duration * 60000;
      const fitsInSchedule = currentEnd <= end.getTime();

      let isInBreak = false;
      if (currentSchedule.breakStart && currentSchedule.breakEnd) {
        const [bSH, bSM] = currentSchedule.breakStart.split(':').map(Number);
        const [bEH, bEM] = currentSchedule.breakEnd.split(':').map(Number);
        const bStart = new Date(form.date + 'T00:00:00'); bStart.setHours(bSH, bSM, 0, 0);
        const bEnd = new Date(form.date + 'T00:00:00'); bEnd.setHours(bEH, bEM, 0, 0);
        isInBreak = currentStart < bEnd.getTime() && bStart.getTime() < currentEnd;
      }
      if (!isInBreak && currentSchedule.hasPause && currentSchedule.pauseStart && currentSchedule.pauseEnd) {
        const [bSH, bSM] = (currentSchedule.pauseStart as string).split(':').map(Number);
        const [bEH, bEM] = (currentSchedule.pauseEnd as string).split(':').map(Number);
        const bStart = new Date(form.date + 'T00:00:00'); bStart.setHours(bSH, bSM, 0, 0);
        const bEnd = new Date(form.date + 'T00:00:00'); bEnd.setHours(bEH, bEM, 0, 0);
        isInBreak = currentStart < bEnd.getTime() && bStart.getTime() < currentEnd;
      }

      const hasOverlap = appointments.some(app => {
        if (app.id === form.id) return false; // não colide com o próprio agendamento em edição
        if (app.barberId !== form.barberId || app.date !== form.date || app.status === 'Cancelado') return false;
        const [appH, appM] = app.time.split(':').map(Number);
        const appStart = new Date(form.date + 'T00:00:00'); appStart.setHours(appH, appM, 0, 0);
        const appSvc = services.find(s => s.id === app.serviceId);
        const es = appStart.getTime();
        const ee = es + (appSvc?.duration || 30) * 60000;
        return currentStart < ee && es < currentEnd;
      });

      if (fitsInSchedule && !isInBreak && !hasOverlap) {
        if (!isToday || current > now) slots.push(timeStr);
      }
      current = new Date(current.getTime() + duration * 60000);
    }

    // Garante que o horário atual do agendamento em edição não suma da lista
    if (form.id && form.time && !slots.includes(form.time)) slots.unshift(form.time);
    return slots;
  }, [form.date, form.barberId, form.serviceId, form.id, form.time, currentSchedule, isDayClosed, appointments, services]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !form.id;
    const usePix = isNew && !isSubscriber && paymentMethod === 'pix';

    if (usePix && form.cpf.replace(/\D/g, '').length !== 11) {
      toast('CPF obrigatório para pagamento via PIX (11 dígitos)', 'error');
      return;
    }

    setSaving(true);
    try {
      const barber = team.find(b => b.id === form.barberId);
      const service = services.find(s => s.id === form.serviceId);
      const payload: any = {
        ...(form.id ? { id: form.id } : {}),
        clientId: '', clientName: form.name, barberId: form.barberId,
        barberName: barber?.name || '?', serviceId: form.serviceId,
        serviceName: service?.name || '?', date: form.date, time: form.time,
        status: usePix ? 'Pendente' : 'Confirmado',
        price: service?.price || 0,
        clientPhone: form.phone,
        clientCpf: form.cpf,
      };
      const saved = await supabaseService.upsertAppointment(payload);

      if (!usePix) {
        router.push('/appointments');
        return;
      }

      // Gera cobrança PIX
      const pixRes = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          serviceId: form.serviceId,
          userId: user?.id,
          taxId: form.cpf.replace(/\D/g, ''),
          name: form.name,
          phone: form.phone,
          appointmentId: saved.id,
        }),
      });
      const pixResult = await pixRes.json();
      if (!pixRes.ok || pixResult.error) {
        toast(pixResult.error || 'Erro ao gerar PIX', 'error');
        router.push('/appointments');
        return;
      }

      setPixData({ brCode: pixResult.brCode, pixQrCode: pixResult.pixQrCode, appointmentId: saved.id });
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar agendamento', 'error');
    } finally {
      setSaving(false);
    }
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
        <Link href="/appointments" className="text-brand-muted hover:text-brand-accent transition-colors">Agendamentos</Link>
        <ChevronRight size={12} className="text-brand-muted" />
        <span className="text-brand-accent font-black">{form.id ? 'Editar Agendamento' : 'Agendamento Manual'}</span>
      </div>

      <header className="flex items-center gap-5">
        <Link href="/appointments" className="w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-4xl sm:text-5xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
          {pixPaid ? 'Pago' : pixData ? 'Aguardando PIX' : (form.id ? 'Editar' : 'Novo')} Agendamento<span className="text-brand-accent">.</span>
        </h1>
      </header>

      <div className="flashlight-card rounded-[3rem] p-8 lg:p-10">
        {/* Tela de sucesso PIX pago */}
        {pixPaid && (
          <div className="flex flex-col items-center gap-4 text-center py-10">
            <div className="w-20 h-20 rounded-full bg-brand-success/10 border border-brand-success/20 flex items-center justify-center">
              <CheckCircle2 size={36} className="text-brand-success" />
            </div>
            <p className="text-brand-muted text-sm">Pagamento confirmado! Agendamento ativado. Redirecionando...</p>
          </div>
        )}

        {/* Tela de QR Code PIX */}
        {pixData && !pixPaid && (
          <div className="flex flex-col items-center gap-6 text-center py-4">
            <p className="text-brand-muted text-sm leading-relaxed">Apresente o QR Code ao cliente para concluir o pagamento.</p>

            {pixData.pixQrCode && (
              <div className="p-5 bg-white rounded-[2rem]">
                <img
                  src={pixData.pixQrCode.startsWith('http') || pixData.pixQrCode.startsWith('data:') ? pixData.pixQrCode : `data:image/png;base64,${pixData.pixQrCode}`}
                  alt="QR Code PIX"
                  className="w-52 h-52 object-contain"
                />
              </div>
            )}

            {pixData.brCode && (
              <button
                onClick={() => { navigator.clipboard.writeText(pixData.brCode!); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); }}
                className="w-full py-4 rounded-2xl font-mono font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}
              >
                {pixCopied ? <><CheckCircle2 size={16} className="text-brand-success" /> Código copiado!</> : <><Copy size={16} className="text-brand-accent" /> Copiar código PIX</>}
              </button>
            )}

            <div className="flex items-center gap-2 text-brand-muted text-[11px] font-mono">
              <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
              Aguardando pagamento...
            </div>
          </div>
        )}

        {/* Formulário normal */}
        {!pixData && !pixPaid && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Cliente</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome completo" className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">WhatsApp</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(00) 00000-0000" className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
              </div>
            </div>

            {/* CPF — identifica se o cliente é assinante ativo (não paga de novo pelo serviço) */}
            {!form.id && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">CPF do Cliente</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={e => {
                    const masked = maskCPF(e.target.value);
                    setForm({...form, cpf: masked});
                    if (subscriptionDebounceRef.current) clearTimeout(subscriptionDebounceRef.current);
                    subscriptionDebounceRef.current = setTimeout(() => checkSubscription(masked), 500);
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
                />
                {checkingSubscription && (
                  <p className="flex items-center gap-2 text-[10px] font-mono text-brand-muted"><Loader2 size={12} className="animate-spin" /> Verificando assinatura...</p>
                )}
                {!checkingSubscription && isSubscriber && (
                  <p className="flex items-center gap-2 text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest">
                    <Crown size={13} /> Cliente assinante{subscriberPlan ? ` — ${subscriberPlan}` : ''} · agendamento confirmado sem cobrança
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Serviço</label>
              <select value={form.serviceId} onChange={e => setForm({...form, serviceId: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Barbeiro</label>
              <select value={form.barberId} onChange={e => setForm({...form, barberId: e.target.value, time: ''})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}>
                {team.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Data</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value, time: ''})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all font-bold" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Horário</label>
                {isDayClosed ? (
                  <p className="text-[11px] font-mono text-rose-400 py-3">Barbeiro fechado nessa data. Escolha outra data.</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-[11px] font-mono text-brand-muted py-3">Nenhum horário disponível para essa data/barbeiro.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {availableSlots.map(t => (
                      <button key={t} type="button" onClick={() => setForm({...form, time: t})}
                        className="py-3 rounded-xl font-mono font-bold text-sm transition-all"
                        style={form.time === t
                          ? { background: 'var(--brand-accent)', color: '#fff' }
                          : { background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-main)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Forma de pagamento — apenas em novos agendamentos de clientes não assinantes */}
            {!form.id && !isSubscriber && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className="rounded-2xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95"
                    style={{
                      background: paymentMethod === 'cash' ? 'rgba(34,197,94,0.08)' : 'var(--input-bg)',
                      border: `1px solid ${paymentMethod === 'cash' ? '#22c55e' : 'var(--card-border)'}`,
                      color: paymentMethod === 'cash' ? '#22c55e' : 'var(--text-muted)',
                    }}
                  >
                    <Banknote size={20} />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.15em]">Dinheiro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className="rounded-2xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95"
                    style={{
                      background: paymentMethod === 'pix' ? 'rgba(0,112,255,0.08)' : 'var(--input-bg)',
                      border: `1px solid ${paymentMethod === 'pix' ? 'var(--brand-accent)' : 'var(--card-border)'}`,
                      color: paymentMethod === 'pix' ? 'var(--brand-accent)' : 'var(--text-muted)',
                    }}
                  >
                    <QrCode size={20} />
                    <span className="text-[10px] font-mono font-black uppercase tracking-[0.15em]">PIX</span>
                  </button>
                </div>
              </div>
            )}

            {/* CPF — obrigatório apenas quando PIX é selecionado */}
            {!form.id && paymentMethod === 'pix' && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">CPF do Cliente</label>
                <input
                  type="text"
                  value={form.cpf}
                  onChange={e => setForm({...form, cpf: e.target.value})}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all"
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href="/appointments" className="flex-1 py-4 rounded-2xl font-mono font-black text-[11px] uppercase tracking-widest flex items-center justify-center transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
                Cancelar
              </Link>
              <ShimmerButton type="submit" disabled={saving || !form.time || isDayClosed} className="flex-[2] py-4 text-[11px] font-mono uppercase tracking-widest flex items-center justify-center gap-3">
                {saving ? 'SALVANDO...' : !form.id && paymentMethod === 'pix' ? <><QrCode size={16} /> GERAR PIX</> : <><CheckCircle2 size={16} /> CONFIRMAR AGENDAMENTO</>}
              </ShimmerButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
