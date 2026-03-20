'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Star, ChevronRight, CheckCircle2, MapPin, Instagram, Smartphone } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { abacatePayService } from '@/services/abacatePayService';
import type { Service, Barber, Appointment, Product } from '@/types';

interface PageProps {
  params: { slug: string };
}

export default function BookingPage({ params }: PageProps) {
  const { slug } = params;

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
  const [paymentBilling, setPaymentBilling] = useState<{ id: string; url: string; status: string } | null>(null);
  const pendingAppointmentRef = useRef<(Partial<Appointment> & { user_id?: string }) | null>(null);

  const [bookingData, setBookingData] = useState({
    serviceId: '',
    barberId: '',
    productId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
  });

  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const load = async () => {
      try {
        const uid = await supabaseService.getUserIdBySlug(slug);
        if (!uid) { setNotFound(true); return; }
        setUserId(uid);

        const [config, svcs, brbs, prods, appts] = await Promise.all([
          fetch(`/api/config/slug?slug=${encodeURIComponent(slug)}`).then(r => r.json()),
          supabaseService.getServices(),
          supabaseService.getBarbers(uid),
          supabaseService.getProducts(uid),
          supabaseService.getAppointments(uid),
        ]);

        setBusinessInfo(config);
        setServices(Array.isArray(svcs) ? svcs.filter((s: Service) => s.active !== false) : []);
        setBarbers(Array.isArray(brbs) ? brbs : []);
        setProducts(Array.isArray(prods) ? prods.filter((p: Product) => p.active !== false && p.stock > 0) : []);
        setAppointments(Array.isArray(appts) ? appts : []);
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

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = bookingData.date === todayStr;
    const now = new Date();

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
      if (schedule.breakStart && schedule.breakEnd) {
        const [bSH, bSM] = schedule.breakStart.split(':').map(Number);
        const [bEH, bEM] = schedule.breakEnd.split(':').map(Number);
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
    setIsSubmitting(true);
    try {
      const service = services.find(s => s.id === bookingData.serviceId);
      const barber = barbers.find(b => b.id === bookingData.barberId);

      // 1. Salvar agendamento como Pendente para ter o ID antes de criar a cobrança
      const saved = await supabaseService.upsertAppointment({
        user_id: userId,
        clientName: bookingData.clientName,
        clientId: '',
        barberId: bookingData.barberId,
        barberName: barber?.name || '',
        serviceId: bookingData.serviceId,
        serviceName: service?.name || '',
        time: bookingData.time,
        date: bookingData.date,
        status: 'Pendente',
        price: Number(service?.price || 0),
      });

      // Armazena dados completos para confirmar no polling (caso webhook não chegue a tempo)
      pendingAppointmentRef.current = { ...saved, status: 'Confirmado' };

      // 2. Criar cobrança usando o ID do agendamento como externalId
      const billing = await abacatePayService.createBilling({
        name: bookingData.clientName,
        email: bookingData.clientEmail || `${bookingData.clientPhone.replace(/\D/g, '')}@semmail.com`,
        phone: bookingData.clientPhone.replace(/\D/g, ''),
        value: Number(service?.price || 0),
        description: service?.name || 'Serviço de barbearia',
        externalId: saved.id,
      });

      setPaymentBilling(billing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar cobrança. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!paymentBilling) return;
    const interval = setInterval(async () => {
      try {
        const { status } = await abacatePayService.checkStatus(paymentBilling.id);
        if (status === 'PAID') {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050505' }}>
        <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: '#050505', color: 'white' }}>
        <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-8xl text-brand-accent/20 mb-8" />
        <h1 className="text-4xl font-display font-black uppercase tracking-tighter mb-4">Barbearia não encontrada</h1>
        <p className="text-white/40 font-mono text-sm">O endereço <span className="text-brand-accent">/{slug}</span> não existe na plataforma.</p>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen text-white font-sans overflow-x-hidden" style={{ background: '#050505' }}>
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
            <div className="w-full h-full bg-gradient-to-br from-brand-accent/20 to-black border-b border-white/5 flex items-center justify-center">
              <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-8xl text-brand-accent/10 animate-pulse" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>

        <div className="max-w-xl mx-auto px-6 relative flex flex-col items-center -mt-16 pb-8">
          <div className="w-32 h-32 rounded-full border-4 border-black shadow-2xl overflow-hidden flex items-center justify-center" style={{ background: '#050505' }}>
            {businessInfo?.logo_url || businessInfo?.logoUrl ? (
              <img src={businessInfo.logo_url || businessInfo.logoUrl} className="w-full h-full rounded-full object-cover" alt="Logo" />
            ) : (
              <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center">
                <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-5xl text-brand-accent" />
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-3xl font-display font-black tracking-tighter uppercase leading-none text-white drop-shadow-lg">
              {businessInfo?.name || 'Barbearia'}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-2 h-2 bg-brand-success rounded-full animate-pulse shadow-[0_0_10px_#10B981]" />
              <span className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em]">Booking System Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 pb-32 relative z-10">
        {!complete && !paymentBilling && (
          <div className="flex gap-3 mb-12">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex-1 space-y-2">
                <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= s ? 'bg-brand-accent shadow-[0_0_12px_rgba(0,112,255,0.5)]' : 'bg-white/5 border border-white/5'}`} />
                <span className={`text-[8px] font-mono font-black uppercase tracking-widest block text-center ${step >= s ? 'text-brand-accent' : 'text-white/20'}`}>Step 0{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Services */}
        {!complete && step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-white leading-tight">
                Qual será a <br /><span className="text-brand-accent italic">experiência</span> hoje?
              </h2>
            </div>
            <div className="grid gap-4">
              {services.length === 0 ? (
                <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/10 text-white/40 text-xs uppercase font-black tracking-widest">
                  Nenhum serviço disponível no momento.
                </div>
              ) : services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setBookingData(d => ({ ...d, serviceId: s.id })); setStep(2); }}
                  className="flashlight-card group flex items-center justify-between p-6 rounded-[2.5rem] border border-white/5 hover:border-brand-accent/50 transition-all duration-500 text-left relative overflow-hidden"
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {s.image
                        ? <img src={s.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={s.name} loading="lazy" />
                        : <iconify-icon icon="solar:scissors-bold-duotone" class="text-2xl text-white/20 group-hover:text-brand-accent transition-colors" />}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase tracking-tight text-white group-hover:text-brand-accent transition-colors">{s.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
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
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-white leading-tight">
                Algo a <br /><span className="text-brand-success italic">mais?</span>
              </h2>
              <button onClick={() => setStep(1)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <iconify-icon icon="solar:arrow-left-bold-duotone" class="text-2xl" />
              </button>
            </div>
            <div className="grid gap-4">
              <button
                onClick={() => { setBookingData(d => ({ ...d, productId: '' })); setStep(3); }}
                className="flashlight-card flex items-center justify-between p-8 rounded-[2.5rem] border-2 border-dashed border-white/10 hover:border-brand-accent/30 transition-all text-left group"
              >
                <div className="font-display font-black text-lg text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Apenas o serviço</div>
                <ChevronRight size={20} className="text-white/20 group-hover:text-brand-accent transition-all" />
              </button>
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setBookingData(d => ({ ...d, productId: p.id })); setStep(3); }}
                  className="flashlight-card group flex items-center justify-between p-6 rounded-[2.5rem] border border-white/5 hover:border-brand-success/50 transition-all text-left relative overflow-hidden"
                >
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      {p.image
                        ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} loading="lazy" />
                        : <iconify-icon icon="solar:bag-bold-duotone" class="text-2xl text-white/20" />}
                    </div>
                    <div>
                      <h3 className="font-display font-black text-xl uppercase tracking-tight text-white group-hover:text-brand-success transition-colors">{p.name}</h3>
                      <p className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest mt-1.5 flex items-center gap-2">
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
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-white leading-tight">
                Escolha seu <br /><span className="text-brand-accent italic">mestre.</span>
              </h2>
              <button onClick={() => setStep(2)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <iconify-icon icon="solar:arrow-left-bold-duotone" class="text-2xl" />
              </button>
            </div>
            <div className="grid gap-5">
              {barbers.length === 0 ? (
                <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/10 text-white/40 text-xs uppercase font-black tracking-widest">
                  Nenhum barbeiro disponível.
                </div>
              ) : barbers.filter(b => !b.services || b.services.length === 0 || b.services.includes(bookingData.serviceId)).map(b => (
                <button
                  key={b.id}
                  onClick={() => { setBookingData(d => ({ ...d, barberId: b.id })); setStep(4); }}
                  className="flashlight-card group flex items-center gap-6 p-6 rounded-[2.5rem] border border-white/5 hover:border-brand-accent/50 transition-all text-left relative overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={b.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.name}`}
                      className="w-20 h-20 rounded-[1.8rem] object-cover shadow-2xl border-2 border-white/10 group-hover:border-brand-accent/30 transition-all"
                      alt={b.name} loading="lazy"
                    />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-brand-accent border-4 border-black rounded-xl flex items-center justify-center text-white shadow-xl">
                      <Star size={12} fill="white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-black text-2xl uppercase tracking-tighter text-white group-hover:text-brand-accent transition-colors">{b.name}</h3>
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1">{b.role}</p>
                  </div>
                  <ChevronRight size={22} className="text-white/20 group-hover:text-brand-accent transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Date, Time & Client info */}
        {!complete && step === 4 && !paymentBilling && (
          <form onSubmit={handleFinish} className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-display font-black uppercase tracking-tight text-white leading-tight">
                Configurar <br /><span className="text-brand-accent italic">agenda.</span>
              </h2>
              <button type="button" onClick={() => setStep(3)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <iconify-icon icon="solar:arrow-left-bold-duotone" class="text-2xl" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.3em] px-2">Data</label>
              <div className="relative group">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent" size={20} />
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingData.date}
                  onChange={e => setBookingData(d => ({ ...d, date: e.target.value, time: '' }))}
                  className="w-full rounded-[2rem] pl-16 pr-8 py-5 text-white outline-none font-mono font-black transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.3em] px-2">Horários ({shortName})</label>
              {isClosed ? (
                <div className="p-12 text-center bg-white/[0.02] rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center gap-4">
                  <iconify-icon icon="solar:lock-bold-duotone" class="text-5xl text-rose-500/30" />
                  <div>
                    <p className="text-white font-display font-black uppercase text-xl">Fechado nesta data</p>
                    <p className="text-white/40 text-sm mt-1">Selecione outra data.</p>
                  </div>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {availableSlots.map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setBookingData(d => ({ ...d, time: t }))}
                      className={`relative overflow-hidden py-4 rounded-2xl font-mono font-black text-sm transition-all border ${bookingData.time === t ? 'bg-brand-accent border-brand-accent text-white shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'bg-white/[0.03] border-white/5 text-white/40 hover:border-brand-accent/30 hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/10 text-white/40 text-xs uppercase font-black tracking-widest">
                  {bookingData.serviceId && bookingData.barberId ? 'Nenhum horário disponível.' : 'Selecione serviço e barbeiro primeiro.'}
                </div>
              )}
            </div>

            <div className="space-y-6 pt-10 border-t border-white/5">
              <h3 className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.3em] px-2">Seus Dados</h3>
              <div className="space-y-4">
                {[
                  { icon: 'solar:user-circle-bold-duotone', placeholder: 'Nome Completo', key: 'clientName', type: 'text', required: true },
                  { icon: 'solar:smartphone-bold-duotone', placeholder: 'WhatsApp', key: 'clientPhone', type: 'tel', required: true },
                  { icon: 'solar:letter-bold-duotone', placeholder: 'E-mail (opcional)', key: 'clientEmail', type: 'email', required: false },
                ].map(f => (
                  <div key={f.key} className="relative group">
                    <iconify-icon icon={f.icon} class="absolute left-6 top-1/2 -translate-y-1/2 text-brand-accent text-xl" />
                    <input
                      required={f.required}
                      type={f.type}
                      placeholder={f.placeholder}
                      value={(bookingData as any)[f.key]}
                      onChange={e => setBookingData(d => ({ ...d, [f.key]: e.target.value }))}
                      className="w-full rounded-[2rem] pl-16 pr-8 py-5 text-white outline-none font-medium transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={!bookingData.time || !bookingData.serviceId || !bookingData.barberId || isSubmitting}
                className="w-full rounded-[2.5rem] py-6 bg-brand-accent text-white font-display font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,112,255,0.25)] disabled:opacity-50 disabled:grayscale transition-all hover:-translate-y-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
              <h2 className="text-4xl font-display font-black text-white uppercase tracking-tight leading-tight">
                Pague para <br /><span className="text-brand-accent italic">confirmar.</span>
              </h2>
              <p className="text-white/40 text-base leading-relaxed max-w-xs mx-auto">
                Conclua o pagamento via PIX para garantir seu agendamento.
              </p>
            </div>

            <div className="flashlight-card w-full bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 space-y-6 text-left">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.3em]">Serviço</span>
                <span className="font-display font-black text-white uppercase tracking-tight">
                  {services.find(s => s.id === bookingData.serviceId)?.name}
                </span>
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.3em]">Data</span>
                <span className="font-mono font-black text-white">
                  {bookingData.date.split('-').reverse().join('/')} às {bookingData.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.3em]">Valor</span>
                <span className="font-mono font-black text-brand-accent text-2xl">
                  R$ {services.find(s => s.id === bookingData.serviceId)?.price}
                </span>
              </div>
            </div>

            <a
              href={paymentBilling.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-[2.5rem] py-6 bg-brand-accent text-white font-display font-black text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,112,255,0.3)] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all"
            >
              <iconify-icon icon="solar:card-bold-duotone" class="text-2xl" />
              ABRIR PÁGINA DE PAGAMENTO
            </a>

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 text-white/30 text-xs font-mono uppercase tracking-widest">
                <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                Aguardando confirmação do pagamento…
              </div>
              <button
                onClick={async () => {
                  try {
                    const { status } = await abacatePayService.checkStatus(paymentBilling.id);
                    if (status === 'PAID') {
                      if (pendingAppointmentRef.current) {
                        await supabaseService.upsertAppointment({ ...pendingAppointmentRef.current, status: 'Confirmado' });
                      }
                      setPaymentBilling(null);
                      setComplete(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      alert('Pagamento ainda não confirmado. Aguarde alguns segundos e tente novamente.');
                    }
                  } catch {
                    alert('Erro ao verificar pagamento.');
                  }
                }}
                className="text-white/30 text-[11px] font-mono uppercase tracking-widest hover:text-white/60 transition-colors underline underline-offset-4"
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
              <div className="w-24 h-24 bg-brand-success rounded-[2rem] text-white flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-black border-4 border-brand-success rounded-full flex items-center justify-center shadow-xl">
                <Star size={16} fill="#10B981" className="text-brand-success" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-tight">
                Agendamento <br /><span className="text-brand-success italic">Confirmado!</span>
              </h2>
              <p className="text-white/40 font-medium text-lg leading-relaxed max-w-sm">
                Sua reserva foi registrada com sucesso!
              </p>
            </div>

            <div className="flashlight-card w-full bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-success to-transparent opacity-50" />

              <div className="flex flex-col items-center gap-2 pb-6 border-b border-white/5">
                <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.4em]">Resumo</span>
                <h3 className="text-2xl font-display font-black text-brand-accent uppercase tracking-tight">
                  {services.find(s => s.id === bookingData.serviceId)?.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-y-10 gap-x-6 py-4">
                {[
                  { label: 'Data', value: bookingData.date.split('-').reverse().join('/') },
                  { label: 'Horário', value: `${bookingData.time}H` },
                  { label: 'Barbeiro', value: barbers.find(b => b.id === bookingData.barberId)?.name || '-' },
                  { label: 'Valor', value: `R$ ${services.find(s => s.id === bookingData.serviceId)?.price}`, className: 'text-brand-success' },
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5 flex flex-col items-center">
                    <span className="text-[9px] font-mono font-black text-white/40 uppercase tracking-[0.3em]">{item.label}</span>
                    <p className={`font-mono font-black text-white text-lg ${(item as any).className || ''}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-white/20 font-mono font-black uppercase tracking-[0.2em] leading-relaxed">
              Você já pode fechar esta página.
            </p>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t border-white/5 p-8 md:hidden flex items-center justify-center gap-10" style={{ background: 'rgba(5,5,5,0.8)' }}>
        <MapPin size={22} className="text-white/20 hover:text-brand-accent transition-colors" />
        <Instagram size={22} className="text-white/20 hover:text-brand-accent transition-colors" />
        <Smartphone size={22} className="text-white/20 hover:text-brand-accent transition-colors" />
      </footer>
    </div>
  );
}
