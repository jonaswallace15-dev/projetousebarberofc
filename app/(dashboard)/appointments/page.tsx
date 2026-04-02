'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Copy, Smartphone, Trash2, Edit3, XCircle, ChevronLeft, ChevronRight, TrendingUp, X } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import { supabaseService } from '@/services/supabaseService';
import type { Appointment, Service, Barber } from '@/types';

const emptyForm = {
  id: '', name: '', phone: '', date: new Date().toISOString().split('T')[0],
  time: '09:00', serviceId: '', barberId: ''
};

export default function AppointmentsPage() {
  const { user, userRole } = useAuth();
  const { toast, confirm } = useUI();
  const isBarbeiro = userRole === 'Barbeiro';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<Barber[]>([]);
  const [businessConfig, setBusinessConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'Diário' | 'Semanal' | 'Mensal'>('Diário');
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabaseService.getAppointments(),
      supabaseService.getServices(),
      supabaseService.getBarbers(),
      supabaseService.getBusinessConfig(),
    ]).then(([appts, svcs, barbers, config]) => {
      setAppointments(appts || []);
      setServices(svcs || []);
      setTeam(barbers || []);
      setBusinessConfig(config);
      if (svcs?.length) setForm(f => ({ ...f, serviceId: svcs[0].id }));
      if (barbers?.length) setForm(f => ({ ...f, barberId: barbers[0].id }));
      setLoading(false);
    });
  }, [user]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentMonth]);

  const filteredAppointments = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return appointments.filter(app => app.date === `${year}-${month}-${day}`);
  }, [appointments, selectedDate]);

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };
  const isSelected = (date: Date) => date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth() && date.getFullYear() === selectedDate.getFullYear();
  const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const bookingSlug = businessConfig?.slug || 'minha-barbearia';
  const bookingUrl = typeof window !== 'undefined' ? `${window.location.host}/book/${bookingSlug}` : `usebarber.site/book/${bookingSlug}`;

  const handleCopyLink = () => { navigator.clipboard.writeText(bookingUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const openNew = (date?: Date) => {
    const d = date || selectedDate;
    setForm({ ...emptyForm, date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, serviceId: services[0]?.id || '', barberId: team[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (app: Appointment) => {
    setForm({ id: app.id, name: app.clientName, phone: '', date: app.date, time: app.time, serviceId: app.serviceId, barberId: app.barberId });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const barber = team.find(b => b.id === form.barberId);
      const service = services.find(s => s.id === form.serviceId);
      const payload = {
        id: form.id || Math.random().toString(36).substr(2, 9),
        clientId: '', clientName: form.name, barberId: form.barberId,
        barberName: barber?.name || '?', serviceId: form.serviceId,
        serviceName: service?.name || '?', date: form.date, time: form.time,
        status: 'Confirmado' as const, price: service?.price || 0
      };
      const saved = await supabaseService.upsertAppointment(payload);
      setAppointments(prev => form.id ? prev.map(a => a.id === payload.id ? { ...a, ...saved } : a) : [saved, ...prev]);
      setModalOpen(false);
    } catch (err: any) { toast(err.message || 'Erro ao salvar agendamento', 'error'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    await supabaseService.updateAppointmentStatus(id, status);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Deseja cancelar este agendamento permanentemente?', danger: true, confirmLabel: 'Cancelar agendamento' })) return;
    await supabaseService.deleteAppointment(id);
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-4">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse shadow-[0_0_10px_#0070FF]"></span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Timeline Module Active</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            Agenda<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg capitalize leading-relaxed">
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto items-stretch">
          <div className="border border-brand-border p-1.5 rounded-[1.25rem] flex justify-between" style={{ background: 'var(--input-bg)' }}>
            {['Diário', 'Semanal', 'Mensal'].map((v) => (
              <button key={v} onClick={() => setView(v as any)} className={`flex-1 px-4 sm:px-6 py-4 text-[11px] font-mono uppercase tracking-[0.2em] font-bold rounded-xl transition-all ${view === v ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'text-brand-muted hover:text-brand-main'}`}>{v}</button>
            ))}
          </div>
          <ShimmerButton onClick={() => openNew()} className="w-full text-[10px] tracking-[0.2em] whitespace-nowrap px-6 py-4 sm:py-5">
            AGENDAR MANUALMENTE
          </ShimmerButton>
        </div>
      </header>

      {/* Booking Link */}
      {!isBarbeiro && (
        <div className="flashlight-card rounded-[2.5rem] lg:rounded-[3.5rem] p-6 lg:p-12 group overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 mb-4 bg-emerald-500/10 text-emerald-500 text-[10px] font-mono font-black border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                Live Booking Enabled
              </div>
              <h2 className="text-3xl font-display font-black text-brand-main uppercase tracking-tight mb-2">
                Portal do Cliente<span className="text-brand-accent italic">.</span>
              </h2>
              <p className="text-brand-muted leading-relaxed font-medium">
                Seu salão disponível 24/7. Compartilhe o link inteligente para automatizar seus agendamentos.
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full lg:w-fit min-w-[300px]">
              <input readOnly value={bookingUrl} className="w-full rounded-2xl py-5 px-6 text-sm font-mono text-brand-main outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleCopyLink} className="flex items-center justify-center gap-3 font-display font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95 text-brand-main" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                  {copied ? <CheckCircle2 size={18} className="text-brand-success" /> : <Copy size={18} className="text-brand-accent" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <a href={`/book/${bookingSlug}`} target="_blank" className="flex items-center justify-center gap-3 bg-brand-accent hover:opacity-90 text-white font-display font-black text-[11px] uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(0,102,255,0.3)]">
                  Enviar Link
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile date nav */}
      <div className="lg:hidden flex items-center justify-between px-6 mb-8 mt-4">
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-3 text-brand-muted hover:text-brand-main transition-all active:scale-90">
          <ChevronLeft size={28} strokeWidth={2} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-mono font-bold text-brand-accent uppercase tracking-[0.2em] mb-1">{isToday(selectedDate) ? 'Hoje' : selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-display font-black text-brand-main leading-none tracking-tighter">{String(selectedDate.getDate()).padStart(2, '0')}</span>
            <span className="text-sm font-mono font-bold text-brand-muted uppercase tracking-widest">{selectedDate.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}</span>
          </div>
        </div>
        <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-3 text-brand-muted hover:text-brand-main transition-all active:scale-90">
          <ChevronRight size={28} strokeWidth={2} />
        </button>
      </div>

      <div className="flashlight-card rounded-[3.5rem] overflow-hidden border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x" style={{ borderColor: 'var(--card-border)' }}>
        {/* Calendar */}
        <div className={`${view === 'Mensal' ? 'block' : 'hidden lg:block'} lg:col-span-1`}>
          <div className="p-8 lg:p-10 sticky top-32">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-display font-bold text-brand-main capitalize">{monthName}</h3>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-accent transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-accent transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-black text-brand-muted mb-6 uppercase tracking-widest">
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="h-12" />;
                const active = isSelected(date);
                const today = isToday(date);
                return (
                  <button key={date.toISOString()} onClick={() => setSelectedDate(date)} className={`h-12 rounded-2xl flex flex-col items-center justify-center transition-all relative ${active ? 'bg-brand-accent text-white font-bold scale-110 shadow-[0_0_20px_rgba(0,112,255,0.4)] z-10' : 'text-brand-muted hover:text-brand-main'} ${today && !active ? 'text-brand-accent font-black' : ''}`}>
                    <span className="text-sm font-display z-10">{date.getDate()}</span>
                    {today && !active && <div className="absolute bottom-2 w-1 h-1 bg-brand-accent rounded-full animate-ping" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-10 p-6 bg-brand-accent/5 rounded-[2rem] border border-brand-accent/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <TrendingUp size={16} />
                </div>
                <span className="text-[10px] font-mono text-brand-accent uppercase font-black tracking-widest">Capacidade Otimizada</span>
              </div>
              <p className="mt-3 text-[11px] text-brand-muted leading-relaxed font-medium">
                {filteredAppointments.length > 5 ? 'Dia com alto fluxo. Agendamentos sequenciais detectados.' : 'Janelas disponíveis para agendamentos de última hora.'}
              </p>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="lg:col-span-2 p-6 lg:p-8 space-y-4">
          {loading ? (
            <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-28 animate-pulse rounded-[3rem]" style={{ background: 'var(--input-bg)' }} />)}</div>
          ) : filteredAppointments.length > 0 ? (
            filteredAppointments.sort((a, b) => {
              const p: Record<string, number> = { 'Confirmado': 0, 'Em andamento': 1, 'Finalizado': 2, 'Cancelado': 3 };
              return (p[a.status] ?? 99) - (p[b.status] ?? 99) || a.time.localeCompare(b.time);
            }).map((app) => (
              <div key={app.id} className="flashlight-card p-5 lg:p-7 rounded-[2.5rem] lg:rounded-[3rem] group hover:border-brand-accent/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-6 overflow-hidden">
                <div className="flex items-start gap-5 lg:gap-7 flex-1 min-w-0">
                  <div className="flex flex-col items-center justify-center bg-brand-accent/10 border border-brand-accent/20 px-6 py-4 rounded-2xl min-w-[90px] lg:min-w-[110px] shrink-0">
                    <span className="text-[9px] font-mono font-black text-brand-accent/50 uppercase tracking-widest mb-1">Time</span>
                    <span className="text-xl lg:text-2xl font-display font-black text-brand-main leading-none">{app.time}</span>
                  </div>
                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-display font-black text-xl lg:text-2xl text-brand-main group-hover:text-brand-accent transition-colors break-words leading-tight">{app.clientName}</h4>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-mono font-black uppercase border tracking-widest ${app.status === 'Confirmado' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' : app.status === 'Finalizado' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : app.status === 'Em andamento' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-brand-muted border-white/10'}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono text-brand-muted uppercase tracking-widest">
                      <span>{app.serviceName}</span>
                      <span>{app.barberName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:self-center">
                  <button onClick={() => openEdit(app)} className="w-11 h-11 text-brand-muted hover:text-brand-accent rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/5 hover:border-brand-accent/30">
                    <Edit3 size={16} />
                  </button>
                  {app.status !== 'Finalizado' && app.status !== 'Cancelado' && (
                    <>
                      <button onClick={async () => { if (await confirm({ message: 'Finalizar este atendimento?' })) updateStatus(app.id, 'Finalizado'); }} className="w-11 h-11 bg-brand-success/5 hover:bg-brand-success/20 text-brand-success/40 hover:text-brand-success border border-brand-success/10 rounded-xl flex items-center justify-center transition-all">
                        <CheckCircle2 size={16} />
                      </button>
                      <button onClick={async () => { if (await confirm({ message: 'Cancelar este agendamento?', danger: true })) updateStatus(app.id, 'Cancelado'); }} className="w-11 h-11 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500/40 hover:text-rose-500 border border-rose-500/10 rounded-xl flex items-center justify-center transition-all">
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(app.id)} className="w-11 h-11 bg-white/5 hover:bg-zinc-800 text-zinc-600 hover:text-white border border-white/5 rounded-xl flex items-center justify-center transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flashlight-card py-24 flex flex-col items-center justify-center text-center rounded-[4rem] px-8">
              <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">Vazio Estratégico</h3>
              <p className="text-brand-muted mt-2 font-mono uppercase text-[10px] tracking-[0.2em]">Nenhuma operação agendada para este ciclo temporal.</p>
              <ShimmerButton onClick={() => openNew()} className="mt-10 px-10 py-4 text-[11px] font-display font-black uppercase tracking-[0.3em] whitespace-nowrap">
                INICIAR PROTOCOLO
              </ShimmerButton>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="flashlight-card w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden" style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>
            <div className="px-10 pt-10 pb-6 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest mb-3 block">System Override</span>
                <h2 className="text-3xl font-display font-black text-brand-main italic uppercase">{form.id ? 'Editar' : 'Novo'} Agendamento<span className="text-brand-accent">.</span></h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all hover:rotate-90" style={{ background: 'var(--input-bg)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-10 pb-10 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Cliente</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome completo" className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(00) 00000-0000" className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all font-bold" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Horário</label>
                  <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all font-bold" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Serviço</label>
                <select value={form.serviceId} onChange={e => setForm({...form, serviceId: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Barbeiro</label>
                <select value={form.barberId} onChange={e => setForm({...form, barberId: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all appearance-none cursor-pointer" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }}>
                  {team.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <ShimmerButton type="submit" disabled={saving} className="w-full py-4 text-[11px] font-mono uppercase tracking-widest">
                {saving ? 'SALVANDO...' : 'CONFIRMAR AGENDAMENTO'}
              </ShimmerButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
