'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Star, ChevronRight, CheckCircle2, MapPin, Instagram, Smartphone } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useUI } from '@/components/UIProvider';
import { isValidEmail, isValidCPF, maskCPF } from '@/lib/validators';
import type { Service, Barber, Appointment, Product } from '@/types';

interface PageProps {
  params: { slug: string };
}

export default function BookingPage({ params }: PageProps) {
  const { slug } = params;
  const { toast } = useUI();

  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [step, setStep] = useState(1);
  const [complete, setComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentBilling, setPaymentBilling] = useState<{ id: string; url: string; status: string; pixQrCode?: string | null; brCode?: string | null } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const pendingAppointmentRef = useRef<(Partial<Appointment> & { user_id?: string }) | null>(null);

  const [bookingData, setBookingData] = useState({
    serviceId: '',
    barberId: '',
    productId: '',
    date: (() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); })(),
    time: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientCpf: '',
  });

  const [userId, setUserId] = useState<string | undefined>();

  // Restaura dark ao sair da página de booking
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add('dark');
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const uid = await supabaseService.getUserIdBySlug(slug);
        if (!uid) { setNotFound(true); setLoading(false); return; }
        setUserId(uid);

        const config = await fetch(`/api/config/slug?slug=${encodeURIComponent(slug)}`).then(r => r.json());
        setBusinessInfo(config);
        const ownerTheme: 'dark' | 'light' = config?.theme === 'light' ? 'light' : 'dark';
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(ownerTheme);

        fetch(`/api/services?user_id=${uid}`).then(r => r.json())
          .then(svcs => setServices(Array.isArray(svcs) ? svcs.filter((s: Service) => s.active !== false) : []))
          .catch(() => setServices([]));

        supabaseService.getBarbers(uid)
          .then(brbs => setBarbers(Array.isArray(brbs) ? brbs : []))
          .catch(() => setBarbers([]));

        supabaseService.getProducts(uid)
          .then(prods => setProducts(Array.isArray(prods) ? prods.filter((p: Product) => p.active !== false && p.stock > 0) : []))
          .catch(() => setProducts([]));

        supabaseService.getAppointments(uid)
          .then(appts => setAppointments(Array.isArray(appts) ? appts : []))
          .catch(() => setAppointments([]));

      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const shortDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const longDaysMap: Record<string, string> = { Dom: 'Domingo', Seg: 'Segunda', Ter: 'Terça', Qua: 'Quarta', Qui: 'Quinta', Sex: 'Sexta', Sáb: 'Sábado' };
    const shortName = shortDays[date.getDay()];
    const dayKey = dayKeys[date.getDay()];
    return { shortName, longName: longDaysMap[shortName], dayKey };
  };

  const generateTimeSlots = () => {
    const { shortName, longName, dayKey } = getDayName(bookingData.date);
    const selectedBarber = barbers.find(b => b.id === bookingData.barberId);
    const schedule = selectedBarber?.schedule?.[dayKey] || businessInfo?.working_hours?.[longName] || businessInfo?.workingHours?.[longName];

    if (!schedule || schedule.active === false || schedule.closed) return [];

    const openTime = schedule.start || schedule.open;
    const closeTime = schedule.end || schedule.close;
    if (!openTime || !closeTime) return [];

    const [startH, startM] = openTime.split(':').map(Number);
    const [endH, endM] = closeTime.split(':').map(Number);

    const selectedService = services.find(s => s.id === bookingData.serviceId);
    const duration = selectedService?.duration || 30;

    const now = new Date();
    const todayStr = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const isToday = bookingData.date === todayStr;

    let current = new Date(bookingData.date + 'T00:00:00');
    current.setHours(startH, startM, 0, 0);
    const end = new Date(bookingData.date + 'T00:00:00');
    end.setHours(endH, endM, 0, 0);

    const slots: string[] = [];
    while (current < end) {
      const timeStr = current.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
      const currentStart = current.getTime();
      const currentEnd = currentStart + duration * 60000;
      const fitsInSchedule = currentEnd <= end.getTime();

      let isInBreak = false;
      // legacy field names
      if (schedule.breakStart && schedule.breakEnd) {
        const [bSH, bSM] = schedule.breakStart.split(':').map(Number);
        const [bEH, bEM] = schedule.breakEnd.split(':').map(Number);
        const bStart = new Date(bookingData.date + 'T00:00:00'); bStart.setHours(bSH, bSM, 0, 0);
        const bEnd = new Date(bookingData.date + 'T00:00:00'); bEnd.setHours(bEH, bEM, 0, 0);
        isInBreak = currentStart < bEnd.getTime() && bStart.getTime() < currentEnd;
      }
      // new field names (hasPause / pauseStart / pauseEnd)
      if (!isInBreak && schedule.hasPause && schedule.pauseStart && schedule.pauseEnd) {
        const [bSH, bSM] = (schedule.pauseStart as string).split(':').map(Number);
        const [bEH, bEM] = (schedule.pauseEnd as string).split(':').map(Number);
        const bStart = new Date(bookingData.date + 'T00:00:00'); bStart.setHours(bSH, bSM, 0, 0);
        const bEnd = new Date(bookingData.date + 'T00:00:00'); bEnd.setHours(bEH, bEM, 0, 0);
        isInBreak = currentStart < bEnd.getTime() && bStart.getTime() < currentEnd;
      }

      const hasOverlap = appointments.some(app => {
        if (app.barberId !== bookingData.barberId || app.date !== bookingData.date || app.status === 'Cancelado') return false;
        const [appH, appM] = app.time.split(':').map(Number);
        const appStart = new Date(bookingData.date + 'T00:00:00'); appStart.setHours(appH, appM, 0, 0);
        const appSvc = services.find(s => s.id === app.serviceId);
        const es = appStart.getTime();
        const ee = es + (appSvc?.duration || 30) * 60000;
        return currentStart < ee && es < currentEnd;
      });

      if (fitsInSchedule && !isInBreak && !hasOverlap) {
        if (!isToday || current > now) slots.push(timeStr);
      }
      current = new Date(current.getTime() + 30 * 60000);
    }
    return slots;
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingData.clientName || !bookingData.clientPhone) return;
    if (bookingData.clientEmail && !isValidEmail(bookingData.clientEmail)) {
      toast('E-mail inválido. Verifique o formato.', 'error');
      return;
    }
    if (!isValidCPF(bookingData.clientCpf)) {
      toast('CPF inválido. Verifique os dígitos.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const service = services.find(s => s.id === bookingData.serviceId);
      const barber = barbers.find(b => b.id === bookingData.barberId);
      const product = products.find(p => p.id === bookingData.productId);

      // Cria o agendamento como Pendente antes de gerar o PIX
      const pendingAppt = await supabaseService.upsertAppointment({
        user_id: userId,
        clientName: bookingData.clientName,
        clientPhone: bookingData.clientPhone,
        clientEmail: bookingData.clientEmail,
        clientId: '',
        barberId: bookingData.barberId,
        barberName: barber?.name || '',
        serviceId: bookingData.serviceId,
        serviceName: service?.name || '',
        productId: product?.id || null,
        productName: product?.name || null,
        time: bookingData.time,
        date: bookingData.date,
        status: 'Pendente',
      } as any);

      pendingAppointmentRef.current = { ...pendingAppt, user_id: userId };

      // Cria a cobrança PIX via Asaas
      const billingRes = await fetch('/api/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: bookingData.clientName,
          email: bookingData.clientEmail || `${bookingData.clientPhone.replace(/\D/g, '')}@semmail.com`,
          phone: bookingData.clientPhone.replace(/\D/g, ''),
          serviceId: bookingData.serviceId,
          userId: userId || '',
          productId: bookingData.productId || undefined,
          taxId: bookingData.clientCpf.replace(/\D/g, ''),
          appointmentId: pendingAppt.id,
        }),
      });
      const billing = await billingRes.json();
      if (billing.error) throw new Error(billing.error);

      setPaymentBilling(billing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      toast(err.message || 'Erro ao gerar cobrança. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!paymentBilling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/payments/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', billingId: paymentBilling.id }),
        });
        const { status } = await res.json();
        const isPaid = ['PAID', 'RECEIVED', 'CONFIRMED', 'COMPLETED', 'APPROVED'].includes(status);
        if (isPaid) {
          clearInterval(interval);
          // Confirma o agendamento caso o webhook não tenha chegado ainda
          if (pendingAppointmentRef.current) {
            await supabaseService.upsertAppointment({ ...pendingAppointmentRef.current, status: 'Confirmado' });
          }
          setPaymentBilling(null);
          setComplete(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [paymentBilling]);

  const availableSlots = bookingData.serviceId && bookingData.barberId ? generateTimeSlots() : [];
  const { shortName, longName, dayKey } = getDayName(bookingData.date);
  const selectedBarber = barbers.find(b => b.id === bookingData.barberId);
  const currentSchedule = selectedBarber?.schedule?.[dayKey] || businessInfo?.working_hours?.[longName] || businessInfo?.workingHours?.[longName];
  const isClosed = !currentSchedule || currentSchedule.active === false || currentSchedule.closed;

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
        <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-8xl text-brand-accent/20 mb-8" />
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-4">Barbearia não encontrada</h1>
        <p className="text-brand-muted font-mono text-sm">O endereço <span className="text-brand-accent">/{slug}</span> não existe na plataforma.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: 'var(--brand-deep)', color: 'var(--text-main)' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[150px] -mr-96 -mt-96 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-success/5 rounded-full blur-[120px] -ml-64 -mb-64" />
      </div>

      {/* Header */}
      <header className="relative w-full">
        <div className="w-full h-48 md:h-64 relative overflow-hidden">
          {businessInfo?.banner_url || businessInfo?.bannerUrl ? (
            <img src={businessInfo.banner_url || businessInfo.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-accent/20 to-black border-b [border-color:var(--card-border)] flex items-center justify-center">
              <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-8xl text-brand-accent/10 animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="max-w-xl mx-auto px-6 relative flex flex-col items-center -mt-16 pb-8">
          <div className="w-32 h-32 rounded-full border-4 shadow-2xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--brand-deep)', borderColor: 'var(--brand-deep)' }}>
            {businessInfo?.logo_url || businessInfo?.logoUrl ? (
              <img src={businessInfo.logo_url || businessInfo.logoUrl} className="w-full h-full rounded-full object-cover" alt="Logo" />
            ) : (
              <div className="w-full h-full rounded-full [background:var(--input-bg)] flex items-center justify-center">
                <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-5xl text-brand-accent" />
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-3xl font-display font-black tracking-tighter uppercase leading-none text-brand-main drop-shadow-lg">
              {businessInfo?.name || 'Barbearia'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-2 h-2 bg-brand-success rounded-full animate-pulse shadow-[0_0_10px_#10B981]" />
              <span className="text-[11px] text-brand-muted font-black uppercase tracking-[0.2em]">Booking System Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 pb-32 relative z-10">
        {!complete && !paymentBilling && (
          <div className="flex gap-3 mb-12">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 space-y-2">
                <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= s ? 'bg-brand-accent shadow-[0_0_12px_rgba(0,112,255,0.5)]' : '[background:var(--input-bg)] border [border-color:var(--card-border)]'}`} />
                <span className={`text-[8px] font-mono font-black uppercase tracking-widest block text-center ${step >= s ? 'text-brand-accent' : 'text-brand-muted'}`}>Step 0{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Services */}
        {!complete && step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-brand-main leading-tight">
                Qual será a <br /><span className="text-brand-accent italic">experiência</span> hoje?
              </h2>
            </div>
            <div className="grid gap-4">
              {services.length === 0 ? (
                <div className="p-10 text-center [background:var(--input-bg)] rounded-3xl border [border-color:var(--card-border)] text-brand-muted text-xs uppercase font-black tracking-widest">
                  Nenhum serviço disponível no momento.
                </div>
              ) : services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setBookingData(d => ({ ...d, serviceId: s.id })); setStep(2); }}
                  className="flashlight-card group flex items-center justify-between p-6 rounded-[2.5rem] border [border-color:var(--card-border)] hover:border-brand-accent/50 transition-all duration-500 text-left relative overflow-hidden"
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                      {s.image
                        ? <img src={s.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={s.name} loading="lazy" />
                        : <iconify-icon icon="solar:scissors-bold-duotone" class="text-2xl text-brand-muted group-hover:text-brand-accent transition-colors" />}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase tracking-tight text-brand-main group-hover:text-brand-accent transition-colors">{s.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={12} className="text-brand-accent" /> {s.duration} MIN
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-black text-brand-accent group-hover:scale-110 transition-transform origin-right relative z-10">
                    <span className="text-xs mr-0.5 opacity-50">R$</span>{s.price}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Products (optional) */}
        {!complete && step === 2 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-brand-main leading-tight">
                Algo a <br /><span className="text-brand-success italic">mais?</span>
              </h2>
              <button onClick={() => setStep(1)} className="w-12 h-12 rounded-2xl [background:var(--input-bg)] border [border-color:var(--card-border)] flex items-center justify-center text-brand-muted hover:text-brand-main transition-all">
                <iconify-icon icon="solar:arrow-left-bold-duotone" class="text-2xl" />
              </button>
            </div>
            <div className="grid gap-4">
              <button
                onClick={() => { setBookingData(d => ({ ...d, productId: '' })); setStep(3); }}
                className="flashlight-card flex items-center justify-between p-8 rounded-[2.5rem] border-2 border-dashed [border-color:var(--card-border)] hover:border-brand-accent/30 transition-all text-left group"
              >
                <div className="font-display font-black text-lg text-brand-muted uppercase tracking-widest group-hover:text-brand-main transition-colors">Apenas o serviço</div>
                <ChevronRight size={20} className="text-brand-muted group-hover:text-brand-accent transition-all" />
              </button>
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setBookingData(d => ({ ...d, productId: p.id })); setStep(3); }}
                  className="flashlight-card group flex items-center justify-between p-6 rounded-[2.5rem] border [border-color:var(--card-border)] hover:border-brand-success/50 transition-all text-left relative overflow-hidden"
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden [background:var(--input-bg)] border [border-color:var(--card-border)] flex items-center justify-center shrink-0">
                      {p.image
                        ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} loading="lazy" />
                        : <iconify-icon icon="solar:bag-bold-duotone" class="text-2xl text-brand-muted" />}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase tracking-tight text-brand-main group-hover:text-brand-success transition-colors">{p.name}</h3>
                      <p className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-brand-success rounded-full" /> Em estoque
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-mono font-black text-brand-success group-hover:scale-110 transition-transform origin-right">
                    <span className="text-xs mr-0.5 opacity-50">R$</span>{p.price}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Barbers */}
        {!complete && step === 3 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-brand-main leading-tight">
                Escolha seu <br /><span className="text-brand-accent italic">mestre.</span>
              </h2>
              <button onClick={() => setStep(2)} className="w-12 h-12 rounded-2xl [background:var(--input-bg)] border [border-color:var(--card-border)] flex items-center justify-center text-brand-muted hover:text-brand-main transition-all">
                <iconify-icon icon="solar:arrow-left-bold-duotone" class="text-2xl" />
              </button>
            </div>
            <div className="grid gap-5">
              {barbers.length === 0 ? (
                <div className="p-10 text-center [background:var(--input-bg)] rounded-3xl border [border-color:var(--card-border)] text-brand-muted text-xs uppercase font-black tracking-widest">
                  Nenhum barbeiro disponível.
                </div>
              ) : barbers.filter(b =>
                // null/undefined = legacy barber, show for all services
                // empty array = no services configured, hide from all
                // populated array = only show if selected service is included
                b.services == null || b.services.includes(bookingData.serviceId)
              ).map(b => (
                <button
                  key={b.id}
                  onClick={() => { setBookingData(d => ({ ...d, barberId: b.id })); setStep(4); }}
                  className="flashlight-card group flex items-center gap-6 p-6 rounded-[2.5rem] border [border-color:var(--card-border)] hover:border-brand-accent/50 transition-all text-left relative overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={b.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`}
                      className="w-20 h-20 rounded-[1.8rem] object-cover shadow-2xl border-2 [border-color:var(--card-border)] group-hover:border-brand-accent/30 transition-all"
                      alt={b.name} loading="lazy"
                    />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-accent border-4 border-black rounded-xl flex items-center justify-center text-brand-main shadow-xl">
                      <Star size={12} fill="white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-brand-main group-hover:text-brand-accent transition-colors">{b.name}</h3>
                  </div>
                  <ChevronRight size={22} className="text-brand-muted group-hover:text-brand-accent transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Date, Time & Client info */}
        {!complete && step === 4 && !paymentBilling && (
          <form onSubmit={handleFinish} className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-brand-main leading-tight">
                Configurar <br /><span className="text-brand-accent italic">agenda.</span>
              </h2>
              <button type="button" onClick={() => setStep(3)} className="w-12 h-12 rounded-2xl [background:var(--input-bg)] border [border-color:var(--card-border)] flex items-center justify-center text-brand-muted hover:text-brand-main transition-all">
                <iconify-icon icon="solar:arrow-left-bold-duotone" class="text-2xl" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em] px-2">Data</label>
              <div className="relative group">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent" size={20} />
                <input
                  type="date"
                  min={(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); })()}
                  value={bookingData.date}
                  onChange={e => setBookingData(d => ({ ...d, date: e.target.value, time: '' }))}
                  className="w-full rounded-[2rem] pl-16 pr-8 py-5 text-brand-main outline-none font-mono font-black transition-all"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em] px-2">Horários ({shortName})</label>
              {isClosed ? (
                <div className="p-12 text-center [background:var(--input-bg)] rounded-[3rem] border-2 border-dashed [border-color:var(--card-border)] flex flex-col items-center gap-4">
                  <iconify-icon icon="solar:lock-bold-duotone" class="text-5xl text-rose-500/30" />
                  <div>
                    <p className="text-brand-main font-display font-black uppercase text-xl">Fechado nesta data</p>
                    <p className="text-brand-muted text-sm mt-1">Selecione outra data.</p>
                  </div>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableSlots.map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setBookingData(d => ({ ...d, time: t }))}
                      className={`relative overflow-hidden py-4 rounded-2xl font-mono font-black text-sm transition-all border ${bookingData.time === t ? 'bg-brand-accent border-brand-accent text-brand-main shadow-[0_0_20px_rgba(0,112,255,0.4)]' : '[background:var(--input-bg)] [border-color:var(--card-border)] text-brand-muted hover:border-brand-accent/30 hover:text-brand-main'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center [background:var(--input-bg)] rounded-3xl border [border-color:var(--card-border)] text-brand-muted text-xs uppercase font-black tracking-widest">
                  {bookingData.serviceId && bookingData.barberId ? 'Nenhum horário disponível.' : 'Selecione serviço e barbeiro primeiro.'}
                </div>
              )}
            </div>

            <div className="space-y-6 pt-10 border-t [border-color:var(--card-border)]">
              <h3 className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em] px-2">Seus Dados</h3>
              <div className="space-y-4">
                {[
                  { icon: 'solar:user-circle-bold-duotone', placeholder: 'Nome Completo', key: 'clientName', type: 'text', required: true },
                  { icon: 'solar:smartphone-bold-duotone', placeholder: 'WhatsApp', key: 'clientPhone', type: 'tel', required: true },
                ].map(f => (
                  <div key={f.key} className="relative group">
                    <iconify-icon icon={f.icon} class="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent text-xl" />
                    <input
                      required={f.required}
                      type={f.type}
                      placeholder={f.placeholder}
                      value={(bookingData as any)[f.key]}
                      onChange={e => setBookingData(d => ({ ...d, [f.key]: e.target.value }))}
                      className="w-full rounded-[2rem] pl-16 pr-8 py-5 text-brand-main outline-none font-medium transition-all"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                    />
                  </div>
                ))}
                {/* CPF com máscara e validação */}
                <div className="space-y-1">
                  <div className="relative group">
                    <iconify-icon icon="solar:card-bold-duotone" class="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent text-xl" />
                    <input
                      required
                      type="text"
                      placeholder="CPF (000.000.000-00)"
                      value={bookingData.clientCpf}
                      onChange={e => setBookingData(d => ({ ...d, clientCpf: maskCPF(e.target.value) }))}
                      className="w-full rounded-[2rem] pl-16 pr-8 py-5 text-brand-main outline-none font-medium transition-all"
                      style={{ background: 'var(--input-bg)', border: `1px solid ${bookingData.clientCpf && !isValidCPF(bookingData.clientCpf) ? '#ef4444' : 'var(--input-border)'}` }}
                    />
                  </div>
                  {bookingData.clientCpf && !isValidCPF(bookingData.clientCpf) && (
                    <p className="text-[10px] text-red-400 font-mono pl-4">CPF inválido</p>
                  )}
                </div>
                {/* E-mail com validação */}
                <div className="space-y-1">
                  <div className="relative group">
                    <iconify-icon icon="solar:letter-bold-duotone" class="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent text-xl" />
                    <input
                      type="email"
                      placeholder="E-mail (opcional)"
                      value={bookingData.clientEmail}
                      onChange={e => setBookingData(d => ({ ...d, clientEmail: e.target.value }))}
                      className="w-full rounded-[2rem] pl-16 pr-8 py-5 text-brand-main outline-none font-medium transition-all"
                      style={{ background: 'var(--input-bg)', border: `1px solid ${bookingData.clientEmail && !isValidEmail(bookingData.clientEmail) ? '#ef4444' : 'var(--input-border)'}` }}
                    />
                  </div>
                  {bookingData.clientEmail && !isValidEmail(bookingData.clientEmail) && (
                    <p className="text-[10px] text-red-400 font-mono pl-4">E-mail inválido</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!bookingData.time || !bookingData.serviceId || !bookingData.barberId || isSubmitting}
                className="w-full rounded-[2.5rem] py-6 bg-brand-accent text-brand-main font-display font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,112,255,0.25)] disabled:opacity-50 disabled:grayscale transition-all hover:-translate-y-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-5 h-5 border-2 [border-color:var(--card-border)] border-t-white rounded-full animate-spin" />
                    PROCESSANDO...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4">
                    CONFIRMAR AGENDAMENTO
                    <iconify-icon icon="solar:check-read-bold-duotone" class="text-2xl" />
                  </div>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Payment Step */}
        {paymentBilling && !complete && (
          <div className="space-y-10 flex flex-col items-center text-center pt-8">
            <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(0,112,255,0.2)]" style={{ background: 'rgba(0,112,255,0.08)', border: '1px solid rgba(0,112,255,0.2)' }}>
              <iconify-icon icon="solar:qr-code-bold-duotone" class="text-5xl text-brand-accent" />
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl font-display font-black text-brand-main uppercase tracking-tight leading-tight">
                Pague para <br /><span className="text-brand-accent italic">confirmar.</span>
              </h2>
              <p className="text-brand-muted text-base leading-relaxed max-w-xs mx-auto">
                Conclua o pagamento via PIX para garantir seu agendamento.
              </p>
            </div>

            <div className="flashlight-card w-full [background:var(--input-bg)] border [border-color:var(--card-border)] rounded-[3rem] p-8 space-y-6 text-left">
              <div className="flex items-center justify-between pb-4 border-b [border-color:var(--card-border)]">
                <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em]">Serviço</span>
                <span className="font-display font-black text-brand-main uppercase tracking-tight">
                  {services.find(s => s.id === bookingData.serviceId)?.name}
                </span>
              </div>
              {bookingData.productId && products.find(p => p.id === bookingData.productId) && (
                <div className="flex items-center justify-between pb-4 border-b [border-color:var(--card-border)]">
                  <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em]">Produto</span>
                  <span className="font-display font-black text-brand-main uppercase tracking-tight">
                    {products.find(p => p.id === bookingData.productId)?.name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pb-4 border-b [border-color:var(--card-border)]">
                <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em]">Data</span>
                <span className="font-mono font-black text-brand-main">
                  {bookingData.date.split('-').reverse().join('/')} às {bookingData.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.3em]">Total</span>
                <span className="font-mono font-black text-brand-accent text-2xl">
                  R$ {((services.find(s => s.id === bookingData.serviceId)?.price || 0) + (products.find(p => p.id === bookingData.productId)?.price || 0)).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* QR Code PIX inline */}
            {paymentBilling.pixQrCode && (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="p-4 bg-white rounded-[2rem]">
                  <img
                    src={paymentBilling.pixQrCode.startsWith('data:') ? paymentBilling.pixQrCode : `data:image/png;base64,${paymentBilling.pixQrCode}`}
                    alt="QR Code PIX"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                {paymentBilling.brCode && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentBilling.brCode!);
                      setPixCopied(true);
                      setTimeout(() => setPixCopied(false), 2000);
                    }}
                    className="w-full rounded-[2rem] py-5 flex items-center justify-center gap-3 font-mono font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                  >
                    {pixCopied ? (
                      <><span className="text-brand-success">✓</span> Código copiado!</>
                    ) : (
                      <><iconify-icon icon="solar:copy-bold-duotone" class="text-lg text-brand-accent" /> Copiar código PIX</>
                    )}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-brand-muted text-xs font-mono uppercase tracking-widest">
                <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                Aguardando confirmação do pagamento…
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/payments/pix', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'status', billingId: paymentBilling.id }),
                    });
                    const { status } = await res.json();
                    const isPaid = ['PAID', 'RECEIVED', 'CONFIRMED', 'COMPLETED', 'APPROVED'].includes(status);
                    if (isPaid) {
                      if (pendingAppointmentRef.current) {
                        await supabaseService.upsertAppointment({ ...pendingAppointmentRef.current, status: 'Confirmado' });
                      }
                      setPaymentBilling(null);
                      setComplete(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      toast(`Pagamento ainda não confirmado (status: ${status}). Aguarde alguns segundos e tente novamente.`, 'warning');
                    }
                  } catch {
                    toast('Erro ao verificar pagamento.', 'error');
                  }
                }}
                className="text-brand-muted text-[11px] font-mono uppercase tracking-widest hover:text-brand-main transition-colors underline underline-offset-4"
              >
                Já paguei — verificar agora
              </button>


            </div>
          </div>
        )}

        {/* Success */}
        {complete && (
          <div className="space-y-10 flex flex-col items-center text-center pt-8">
            <div className="relative">
              <div className="w-24 h-24 bg-brand-success rounded-[2rem] text-brand-main flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-black border-4 border-brand-success rounded-full flex items-center justify-center shadow-xl">
                <Star size={16} fill="#10B981" className="text-brand-success" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-display font-black text-brand-main uppercase tracking-tight leading-tight">
                Agendamento <br /><span className="text-brand-success italic">Confirmado!</span>
              </h2>
              <p className="text-brand-muted font-medium text-lg leading-relaxed max-w-sm">
                Sua reserva foi registrada com sucesso!
              </p>
            </div>

            <div className="flashlight-card w-full [background:var(--input-bg)] border [border-color:var(--card-border)] rounded-[3.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-success to-transparent opacity-50" />

              {(() => {
                const svc = services.find(s => s.id === bookingData.serviceId);
                const prod = bookingData.productId ? products.find(p => p.id === bookingData.productId) : null;
                const total = (svc?.price || 0) + (prod?.price || 0);
                return (
                  <>
                    <div className="flex flex-col items-center gap-2 pb-6 border-b [border-color:var(--card-border)]">
                      <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-[0.4em]">Resumo</span>
                      <h3 className="text-2xl font-display font-black text-brand-accent uppercase tracking-tight">
                        {svc?.name}
                      </h3>
                      {prod && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-brand-muted text-sm">+</span>
                          <span className="text-base font-display font-black text-brand-main uppercase tracking-tight">{prod.name}</span>
                          <span className="text-[10px] font-mono text-brand-muted">R$ {prod.price}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-10 gap-x-6 py-4">
                      {[
                        { label: 'Data', value: bookingData.date.split('-').reverse().join('/') },
                        { label: 'Horário', value: `${bookingData.time}H` },
                        { label: 'Barbeiro', value: barbers.find(b => b.id === bookingData.barberId)?.name || '-' },
                        { label: 'Total', value: `R$ ${total.toFixed(2).replace('.', ',')}`, className: 'text-brand-success' },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1.5 flex flex-col items-center">
                          <span className="text-[9px] font-mono font-black text-brand-muted uppercase tracking-[0.3em]">{item.label}</span>
                          <p className={`font-mono font-black text-brand-main text-lg ${(item as any).className || ''}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            <p className="text-[10px] text-brand-muted font-mono font-black uppercase tracking-[0.2em] leading-relaxed">
              Você já pode fechar esta página.
            </p>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t [border-color:var(--card-border)] p-8 md:hidden flex items-center justify-center gap-10" style={{ background: 'rgba(5,5,5,0.8)' }}>
        <MapPin size={22} className="text-brand-muted hover:text-brand-accent transition-colors" />
        <Instagram size={22} className="text-brand-muted hover:text-brand-accent transition-colors" />
        <Smartphone size={22} className="text-brand-muted hover:text-brand-accent transition-colors" />
      </footer>
    </div>
  );
}
