'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Star, ChevronRight } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import type { Barber } from '@/types';

type DaySchedule = { active: boolean; start: string; end: string };
type BarberSchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

const defaultSchedule: BarberSchedule = {
  monday:    { active: true,  start: '08:00', end: '18:00' },
  tuesday:   { active: true,  start: '08:00', end: '18:00' },
  wednesday: { active: true,  start: '08:00', end: '18:00' },
  thursday:  { active: true,  start: '08:00', end: '18:00' },
  friday:    { active: true,  start: '08:00', end: '18:00' },
  saturday:  { active: true,  start: '08:00', end: '14:00' },
  sunday:    { active: false, start: '08:00', end: '18:00' },
};

const DAYS: { key: keyof BarberSchedule; label: string }[] = [
  { key: 'monday',    label: 'Segunda'  },
  { key: 'tuesday',   label: 'Terça'    },
  { key: 'wednesday', label: 'Quarta'   },
  { key: 'thursday',  label: 'Quinta'   },
  { key: 'friday',    label: 'Sexta'    },
  { key: 'saturday',  label: 'Sábado'   },
  { key: 'sunday',    label: 'Domingo'  },
];

const emptyBarber: Partial<Barber> = {
  name: '',
  role: 'Barbeiro',
  commission: 50,
  commissionType: 'percentage',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=barber',
};

export default function TeamPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Barber>>({ ...emptyBarber });
  const [saving, setSaving] = useState(false);

  const [scheduleModal, setScheduleModal] = useState<Barber | null>(null);
  const [schedule, setSchedule] = useState<BarberSchedule>(defaultSchedule);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabaseService.getBarbers()
      .then(setTeam)
      .finally(() => setLoading(false));
  }, [user]);

  const openModal = (barber?: Barber) => {
    setForm(barber ? { ...barber } : { ...emptyBarber });
    setModalOpen(true);
  };

  const openScheduleModal = (barber: Barber) => {
    setScheduleModal(barber);
    setSchedule((barber.schedule as BarberSchedule) ?? defaultSchedule);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await supabaseService.upsertBarber(form);
      setTeam(prev => form.id ? prev.map(b => b.id === saved.id ? saved : b) : [...prev, saved]);
      setModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleModal) return;
    setSavingSchedule(true);
    try {
      const saved = await supabaseService.upsertBarber({ ...scheduleModal, schedule });
      setTeam(prev => prev.map(b => b.id === saved.id ? saved : b));
      setScheduleModal(null);
    } finally { setSavingSchedule(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir barbeiro?')) return;
    await supabaseService.deleteBarber(id);
    setTeam(prev => prev.filter(b => b.id !== id));
  };

  const updateDay = (key: keyof BarberSchedule, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const activeDaysCount = (barber: Barber) => {
    const s = barber.schedule as BarberSchedule | undefined;
    if (!s) return null;
    const count = DAYS.filter(d => s[d.key]?.active).length;
    return count;
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
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Team Performance Active</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            Equipe<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            Gestão de talentos e métricas de produtividade em tempo real.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.4)] hover:bg-brand-accent/90 transition-all whitespace-nowrap w-full md:w-auto justify-center"
        >
          <Plus size={16} />
          NOVO PROFISSIONAL
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {team.map(barber => {
          const days = activeDaysCount(barber);
          return (
            <div
              key={barber.id}
              className="flashlight-card group rounded-[3.5rem] overflow-hidden flex flex-col hover:border-brand-accent/30 transition-all duration-500"
              style={{ border: '1px solid var(--card-border)' }}
            >
              <div className="p-10 flex-1 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl -mr-16 -mt-16" />

                <div className="flex justify-between items-start mb-8">
                  <div className="relative">
                    <div
                      className="w-28 h-28 rounded-[2.5rem] overflow-hidden group-hover:border-brand-accent/50 transition-all shadow-2xl cursor-pointer"
                      style={{ border: '2px solid var(--card-border)', background: 'var(--input-bg)' }}
                    >
                      <img
                        src={barber.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.name}`}
                        className="w-full h-full object-cover"
                        alt={barber.name}
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-accent border-4 border-brand-deep rounded-2xl flex items-center justify-center text-white shadow-xl">
                      <Star size={14} fill="white" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openModal(barber)}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <iconify-icon icon="solar:pen-new-square-bold-duotone" class="text-xl" />
                    </button>
                    <button
                      onClick={() => openScheduleModal(barber)}
                      title="Escala"
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <iconify-icon icon="solar:calendar-bold-duotone" class="text-xl" />
                    </button>
                    <button
                      onClick={() => handleDelete(barber.id)}
                      className="w-11 h-11 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-3xl font-display font-black text-brand-main uppercase tracking-tighter group-hover:text-brand-accent transition-colors duration-500">{barber.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="w-1.5 h-1.5 bg-brand-accent rounded-full" />
                      <span className="text-[10px] font-mono text-brand-muted uppercase font-black tracking-widest">{barber.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <div className="p-5 rounded-[2rem] text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <p className="text-[8px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Comissão</p>
                      <p className="text-xl font-mono font-black text-brand-main">
                        {barber.commissionType === 'fixed' ? `R$ ${barber.commission}` : `${barber.commission}%`}
                      </p>
                    </div>
                    <div className="p-5 rounded-[2rem] text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <p className="text-[8px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Escala</p>
                      <p className="text-xl font-mono font-black text-brand-success">
                        {days !== null ? `${days}d/sem` : 'N/D'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between mt-auto" style={{ background: 'var(--input-bg)', borderTop: '1px solid var(--card-border)' }}>
                <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Membro da equipe</span>
                <button
                  onClick={() => openModal(barber)}
                  className="w-11 h-11 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent hover:bg-brand-accent transition-all group/btn"
                >
                  <ChevronRight size={18} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add card */}
        <div
          onClick={() => openModal()}
          className="flashlight-card rounded-[3.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-10 cursor-pointer hover:border-brand-accent/30 transition-all group min-h-[450px]"
          style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}
        >
          <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-brand-accent mb-8 group-hover:scale-110 group-hover:bg-brand-accent/10 transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            <Plus size={40} strokeWidth={1.5} />
          </div>
          <h4 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-4">Adicionar<br />Mestre</h4>
          <p className="text-brand-muted text-sm font-medium leading-relaxed max-w-[200px]">Amplie sua força operacional com novos talentos de elite.</p>
        </div>
      </div>

      {/* Modal — Editar barbeiro */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-[2.5rem] p-8 space-y-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">
                {form.id ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome</label>
                <input required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Cargo</label>
                <input value={form.role || ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Tipo de Comissão</label>
                <div className="flex gap-3">
                  {([['percentage', 'Porcentagem'], ['fixed', 'Fixo']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setForm(f => ({ ...f, commissionType: val }))}
                      className={`flex-1 py-3 rounded-2xl text-sm font-display font-black uppercase tracking-wide transition-all ${form.commissionType === val ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}
                      style={form.commissionType !== val ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">
                  Comissão ({form.commissionType === 'fixed' ? 'R$' : '%'})
                </label>
                <input required type="number" min="0" value={form.commission || 0} onChange={e => setForm(f => ({ ...f, commission: Number(e.target.value) }))}
                  className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar Profissional'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Escala */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-[2.5rem] p-8 space-y-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest mb-1">Escala semanal</p>
                <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">
                  {scheduleModal.name}
                </h2>
              </div>
              <button
                onClick={() => setScheduleModal(null)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >✕</button>
            </div>

            {/* Dias */}
            <div className="space-y-3">
              {DAYS.map(({ key, label }) => {
                const day = schedule[key];
                return (
                  <div
                    key={key}
                    className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                    style={{
                      background: day.active ? 'var(--input-bg)' : 'transparent',
                      border: `1px solid ${day.active ? 'var(--card-border)' : 'var(--input-border)'}`,
                      opacity: day.active ? 1 : 0.5,
                    }}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => updateDay(key, 'active', !day.active)}
                      className="relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300"
                      style={{ background: day.active ? '#0070FF' : 'var(--card-border)' }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                        style={{ transform: day.active ? 'translateX(24px)' : 'translateX(0)' }}
                      />
                    </button>

                    {/* Label */}
                    <span className="text-sm font-mono font-black text-brand-main uppercase tracking-widest w-20 flex-shrink-0">
                      {label}
                    </span>

                    {/* Horários ou tag Folga */}
                    {day.active ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={day.start}
                          onChange={e => updateDay(key, 'start', e.target.value)}
                          className="flex-1 rounded-xl px-3 py-2 text-sm font-mono text-brand-main outline-none min-w-0"
                          style={{ background: 'var(--brand-deep)', border: '1px solid var(--input-border)' }}
                        />
                        <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest flex-shrink-0">até</span>
                        <input
                          type="time"
                          value={day.end}
                          onChange={e => updateDay(key, 'end', e.target.value)}
                          className="flex-1 rounded-xl px-3 py-2 text-sm font-mono text-brand-main outline-none min-w-0"
                          style={{ background: 'var(--brand-deep)', border: '1px solid var(--input-border)' }}
                        />
                      </div>
                    ) : (
                      <span className="flex-1 text-[10px] font-mono text-brand-muted uppercase tracking-widest">Folga</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botão salvar */}
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule}
              className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all disabled:opacity-50"
            >
              {savingSchedule ? 'Salvando...' : 'Salvar Escala'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
