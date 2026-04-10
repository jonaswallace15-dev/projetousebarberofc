'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Star, ChevronRight, Upload, X as XIcon, Image as ImageIcon, Edit2, Check, Scissors, Crown } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import type { Barber, Service } from '@/types';

type DaySchedule = {
  active: boolean;
  start: string;
  end: string;
  hasPause: boolean;
  pauseStart: string;
  pauseEnd: string;
};
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
  monday:    { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  tuesday:   { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  wednesday: { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  thursday:  { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  friday:    { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  saturday:  { active: true,  start: '08:00', end: '14:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  sunday:    { active: false, start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
};

const DAYS: { key: keyof BarberSchedule; short: string }[] = [
  { key: 'monday',    short: 'SEG' },
  { key: 'tuesday',  short: 'TER' },
  { key: 'wednesday',short: 'QUA' },
  { key: 'thursday', short: 'QUI' },
  { key: 'friday',   short: 'SEX' },
  { key: 'saturday', short: 'SÁB' },
  { key: 'sunday',   short: 'DOM' },
];

const emptyBarber: Partial<Barber> = {
  name: '',
  role: 'Barbeiro',
  commission: 50,
  commissionType: 'percentage',
  avatar: '',
  services: [],
};

/* ─── Modal ─── */
function BarberModal({
  form, setForm, schedule, setSchedule,
  saving, onClose, onSave, onDelete,
}: {
  form: Partial<Barber>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Barber>>>;
  schedule: BarberSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<BarberSchedule>>;
  saving: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = !!form.id;
  const isOwner = form.role === 'Dono / Master';
  const [tab, setTab] = useState<'dados' | 'escala' | 'servicos'>('dados');
  const [allServices, setAllServices] = useState<Service[]>([]);

  useEffect(() => {
    supabaseService.getServices().then(setAllServices).catch(() => {});
  }, []);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, avatar: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const toggleService = (id: string) => {
    setForm(f => {
      const cur = f.services ?? [];
      return { ...f, services: cur.includes(id) ? cur.filter(s => s !== id) : [...cur, id] };
    });
  };

  const updateDay = (key: keyof BarberSchedule, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const inputCls = "w-full rounded-2xl px-4 py-3 text-brand-main font-medium outline-none transition-all text-sm";
  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)' };

  const TABS = [
    { key: 'dados',    label: 'Dados' },
    { key: 'escala',   label: 'Escala' },
    { key: 'servicos', label: 'Serviços' },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.8)] flex flex-col"
        style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-0 flex-shrink-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-2">
                <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-brand-accent font-bold">
                  {isEditing ? 'Editar' : 'Novo'} Profissional
                </span>
              </div>
              <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
                {isEditing ? (form.name || 'Barbeiro') : 'Novo Profissional'}
                <span className="text-brand-accent">.</span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main hover:rotate-90 transition-all"
              style={{ background: 'var(--input-bg)' }}
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mx-1">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 rounded-t-2xl text-[11px] font-mono font-black uppercase tracking-widest transition-all border-b-2 ${
                  tab === t.key
                    ? 'text-brand-accent border-brand-accent'
                    : 'text-brand-muted border-transparent hover:text-brand-main'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="h-px -mx-8" style={{ background: 'var(--card-border)' }} />
        </div>

        {/* ── Body ── */}
        <form onSubmit={onSave} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">

            {/* ═══ TAB: DADOS ═══ */}
            {tab === 'dados' && (
              <>
                {/* Foto */}
                <div>
                  {form.avatar ? (
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden group mb-5">
                      <img src={form.avatar} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => fileRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-brand-accent text-white text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Upload size={11} /> Trocar
                        </button>
                        <button type="button" onClick={() => { setForm(f => ({ ...f, avatar: '' })); if (fileRef.current) fileRef.current.value = ''; }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-1.5">
                          <XIcon size={11} /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full h-28 rounded-2xl border-2 border-dashed flex items-center justify-center gap-4 text-brand-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all group mb-5"
                      style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:bg-brand-accent/10 transition-all" style={{ background: 'var(--card-border)' }}>
                        <ImageIcon size={18} />
                      </div>
                      <div>
                        <p className="text-[11px] font-mono font-black uppercase tracking-widest text-left">Adicionar Foto</p>
                        <p className="text-[9px] font-mono text-brand-muted/60 mt-0.5">JPG, PNG ou WEBP</p>
                      </div>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </div>

                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome completo</label>
                  <input required placeholder="Ex: João Silva"
                    value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls} style={inputStyle} />
                </div>

                {/* Cargo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Cargo</label>
                  {isOwner ? (
                    <div className="w-full rounded-2xl px-4 py-3 flex items-center justify-between"
                      style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <div className="flex items-center gap-2">
                        <Crown size={14} className="text-amber-400" />
                        <span className="text-amber-400 font-black text-sm font-mono uppercase tracking-widest">Dono / Master</span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-400/60 uppercase tracking-widest px-2 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                        fixo
                      </span>
                    </div>
                  ) : (
                    <div className="p-1 rounded-2xl flex" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      {(['Barbeiro'] as const).map(r => (
                        <div key={r} className="flex-1 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest text-center bg-brand-accent text-white">
                          {r}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comissão */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Tipo de Comissão</label>
                  <div className="p-1 rounded-2xl flex" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                    {([['percentage', '% Porcentagem'], ['fixed', 'R$ Fixo']] as const).map(([val, lbl]) => (
                      <button key={val} type="button" onClick={() => setForm(f => ({ ...f, commissionType: val }))}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all ${
                          form.commissionType === val
                            ? 'bg-brand-accent text-white shadow-[0_0_15px_rgba(0,112,255,0.3)]'
                            : 'text-brand-muted hover:text-white'
                        }`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">
                    Valor ({form.commissionType === 'fixed' ? 'R$' : '%'})
                  </label>
                  <input required type="number" min="0" max={form.commissionType === 'percentage' ? 100 : undefined}
                    step={form.commissionType === 'fixed' ? '0.01' : '1'}
                    value={form.commission === 0 ? '' : form.commission}
                    placeholder="0"
                    onChange={e => setForm(f => ({ ...f, commission: e.target.value === '' ? 0 : Number(e.target.value) }))}
                    className={`${inputCls} font-mono font-black text-brand-accent`}
                    style={inputStyle} />
                </div>
              </>
            )}

            {/* ═══ TAB: ESCALA ═══ */}
            {tab === 'escala' && (
              <div className="space-y-2">
                {DAYS.map(({ key, short }) => {
                  const day = schedule[key];
                  return (
                    <div key={key}
                      className="rounded-2xl overflow-hidden transition-all"
                      style={{
                        border: `1px solid ${day.active ? 'var(--card-border)' : 'transparent'}`,
                        background: day.active ? 'var(--input-bg)' : 'transparent',
                        opacity: day.active ? 1 : 0.45,
                      }}>
                      {/* Main row */}
                      <div className="flex items-center gap-3 p-3">
                        <button type="button"
                          onClick={() => updateDay(key, 'active', !day.active)}
                          className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-300"
                          style={{ background: day.active ? '#0070FF' : 'var(--card-border)' }}>
                          <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                            style={{ transform: day.active ? 'translateX(20px)' : 'translateX(0)' }} />
                        </button>

                        <span className="text-[10px] font-mono font-black text-brand-main uppercase tracking-widest w-8 flex-shrink-0">{short}</span>

                        {day.active ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <input type="time" value={day.start}
                              onChange={e => updateDay(key, 'start', e.target.value)}
                              className="flex-1 rounded-xl px-2 py-1.5 text-xs font-mono text-brand-main outline-none min-w-0"
                              style={{ background: 'var(--header-bg)', border: '1px solid var(--input-border)' }} />
                            <span className="text-[9px] font-mono text-brand-muted flex-shrink-0">–</span>
                            <input type="time" value={day.end}
                              onChange={e => updateDay(key, 'end', e.target.value)}
                              className="flex-1 rounded-xl px-2 py-1.5 text-xs font-mono text-brand-main outline-none min-w-0"
                              style={{ background: 'var(--header-bg)', border: '1px solid var(--input-border)' }} />
                            <button type="button"
                              onClick={() => updateDay(key, 'hasPause', !day.hasPause)}
                              title="Pausa / almoço"
                              className={`flex-shrink-0 px-2 py-1.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest transition-all ${
                                day.hasPause
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'text-brand-muted'
                              }`}
                              style={!day.hasPause ? { background: 'var(--header-bg)', border: '1px solid var(--input-border)' } : {}}>
                              ☕
                            </button>
                          </div>
                        ) : (
                          <span className="flex-1 text-[10px] font-mono text-brand-muted uppercase tracking-widest">Folga</span>
                        )}
                      </div>

                      {/* Pause sub-row */}
                      {day.active && day.hasPause && (
                        <div className="flex items-center gap-2 px-3 pb-3">
                          <span className="w-10 flex-shrink-0" />
                          <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest flex-shrink-0 w-8">☕</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            <input type="time" value={day.pauseStart}
                              onChange={e => updateDay(key, 'pauseStart', e.target.value)}
                              className="flex-1 rounded-xl px-2 py-1.5 text-xs font-mono text-amber-400 outline-none min-w-0"
                              style={{ background: 'var(--header-bg)', border: '1px solid rgba(245,158,11,0.25)' }} />
                            <span className="text-[9px] font-mono text-brand-muted flex-shrink-0">–</span>
                            <input type="time" value={day.pauseEnd}
                              onChange={e => updateDay(key, 'pauseEnd', e.target.value)}
                              className="flex-1 rounded-xl px-2 py-1.5 text-xs font-mono text-amber-400 outline-none min-w-0"
                              style={{ background: 'var(--header-bg)', border: '1px solid rgba(245,158,11,0.25)' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══ TAB: SERVIÇOS ═══ */}
            {tab === 'servicos' && (
              <div className="space-y-2">
                {allServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <ImageIcon size={22} className="text-brand-muted" />
                    </div>
                    <p className="text-[11px] font-mono font-black text-brand-muted uppercase tracking-widest">Nenhum serviço cadastrado</p>
                    <p className="text-[10px] font-mono text-brand-muted/50 mt-1">Crie serviços na aba Serviços primeiro</p>
                  </div>
                ) : (
                  allServices.map(service => {
                    const selected = (form.services ?? []).includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
                          selected
                            ? 'border border-brand-accent/40 bg-brand-accent/5'
                            : 'border border-transparent hover:border-brand-accent/20'
                        }`}
                        style={!selected ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}
                      >
                        {/* Thumb */}
                        <div className="w-12 h-12 rounded-2xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ background: 'var(--card-border)', border: '1px solid var(--input-border)' }}>
                          {service.image
                            ? <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                            : <Scissors size={18} className="text-brand-accent" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-black text-brand-main uppercase tracking-tight truncate">{service.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] font-mono text-brand-accent font-black">R$ {service.price}</span>
                            <span className="text-[10px] font-mono text-brand-muted">{service.duration} min</span>
                          </div>
                        </div>

                        {/* Check */}
                        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center transition-all ${
                          selected ? 'bg-brand-accent' : ''
                        }`}
                          style={!selected ? { background: 'var(--card-border)', border: '1px solid var(--input-border)' } : {}}>
                          {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-8 pb-7 pt-4 flex-shrink-0 border-t space-y-3" style={{ borderColor: 'var(--card-border)' }}>
            <button type="submit" disabled={saving}
              className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(0,112,255,0.3)] hover:opacity-90 transition-all disabled:opacity-40">
              {saving ? 'Salvando...' : 'Salvar Profissional'}
            </button>
            {isEditing && !isOwner && (
              <button type="button"
                onClick={() => { onDelete(form.id!); onClose(); }}
                className="w-full py-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15 transition-all font-mono font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                <Trash2 size={13} /> Excluir Profissional
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const { confirm, toast } = useUI();
  const [team, setTeam] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Barber>>({ ...emptyBarber });
  const [schedule, setSchedule] = useState<BarberSchedule>(defaultSchedule);
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const handleInvite = async (barberId: string) => {
    setInvitingId(barberId);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId }),
      });
      const data = await res.json();
      if (data.error) { toast(data.error, 'error'); return; }
      setInviteLink(data.url);
      navigator.clipboard.writeText(data.url).catch(() => {});
      toast('Link de convite copiado!', 'success');
    } catch {
      toast('Erro ao gerar convite.', 'error');
    } finally {
      setInvitingId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const barbers = await supabaseService.getBarbers();
      if (barbers.length === 0) {
        // Cria automaticamente o card do proprietário
        const owner = await supabaseService.upsertBarber({
          name: user.name || user.email?.split('@')[0] || 'Proprietário',
          role: 'Dono / Master',
          commission: 100,
          commissionType: 'percentage',
          avatar: '',
          services: [],
          schedule: defaultSchedule,
        } as any);
        setTeam([owner]);
      } else {
        setTeam(barbers);
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const openModal = (barber?: Barber) => {
    if (barber) {
      setForm({ ...barber });
    } else {
      const isFirst = team.length === 0;
      setForm({ ...emptyBarber, role: isFirst ? 'Dono / Master' : 'Barbeiro', commission: isFirst ? 100 : 50 });
    }
    setSchedule(barber?.schedule ? (barber.schedule as BarberSchedule) : { ...defaultSchedule });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await supabaseService.upsertBarber({ ...form, schedule });
      setTeam(prev => form.id ? prev.map(b => b.id === saved.id ? saved : b) : [...prev, saved]);
      setModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ message: 'Excluir profissional? Esta ação não pode ser desfeita.', danger: true, confirmLabel: 'Excluir' })) return;
    await supabaseService.deleteBarber(id);
    setTeam(prev => prev.filter(b => b.id !== id));
  };

  const activeDaysCount = (barber: Barber) => {
    const s = barber.schedule as BarberSchedule | undefined;
    if (!s) return null;
    return DAYS.filter(d => s[d.key]?.active).length;
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
            Equipe<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            Gestão de talentos e métricas de produtividade em tempo real.
          </p>
        </div>

        <button
          data-tour="team-add"
          onClick={() => openModal()}
          className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.4)] hover:bg-brand-accent/90 transition-all whitespace-nowrap w-full md:w-auto justify-center"
        >
          <Plus size={16} />
          NOVO PROFISSIONAL
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...team].sort((a, b) => (a.role === 'Dono / Master' ? -1 : b.role === 'Dono / Master' ? 1 : 0)).map(barber => {
          const isOwnerCard = barber.role === 'Dono / Master';
          const days = activeDaysCount(barber);
          const s = barber.schedule as BarberSchedule | undefined;
          const hasPauses = s ? DAYS.some(d => s[d.key]?.active && (s[d.key] as DaySchedule).hasPause) : false;
          const serviceCount = barber.services?.length ?? 0;

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
                      className="w-28 h-28 rounded-[2.5rem] overflow-hidden group-hover:border-brand-accent/50 transition-all shadow-2xl"
                      style={{ border: '2px solid var(--card-border)', background: 'var(--input-bg)' }}
                    >
                      <img
                        src={barber.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${barber.name}`}
                        className="w-full h-full object-cover"
                        alt={barber.name}
                      />
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-10 h-10 border-4 border-brand-deep rounded-2xl flex items-center justify-center text-white shadow-xl ${isOwnerCard ? 'bg-amber-500' : 'bg-brand-accent'}`}>
                      {isOwnerCard ? <Crown size={14} fill="white" /> : <Star size={14} fill="white" />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => openModal(barber)}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    {!isOwnerCard && (
                      <button
                        onClick={() => handleDelete(barber.id)}
                        className="w-11 h-11 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-3xl font-display font-black text-brand-main uppercase tracking-tighter group-hover:text-brand-accent transition-colors duration-500">{barber.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOwnerCard ? 'bg-amber-400' : 'bg-brand-accent'}`} />
                      <span className={`text-[10px] font-mono uppercase font-black tracking-widest ${isOwnerCard ? 'text-amber-400' : 'text-brand-muted'}`}>{barber.role}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-[2rem] text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <p className="text-[7px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Comissão</p>
                      <p className="text-base font-mono font-black text-brand-accent">
                        {barber.commissionType === 'fixed' ? `R$${barber.commission}` : `${barber.commission}%`}
                      </p>
                    </div>
                    <div className="p-4 rounded-[2rem] text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <p className="text-[7px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Escala</p>
                      <p className="text-base font-mono font-black text-brand-success">
                        {days !== null ? `${days}d` : 'N/D'}
                      </p>
                    </div>
                    <div className="p-4 rounded-[2rem] text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <p className="text-[7px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Serviços</p>
                      <p className="text-base font-mono font-black text-brand-main">{serviceCount}</p>
                    </div>
                  </div>

                  {hasPauses && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <span className="text-sm">☕</span>
                      <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-black">Com pausas configuradas</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 flex items-center justify-between mt-auto gap-2" style={{ background: 'var(--input-bg)', borderTop: '1px solid var(--card-border)' }}>
                {!isOwnerCard ? (
                  <button
                    onClick={() => handleInvite(barber.id)}
                    disabled={invitingId === barber.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/10 transition-all disabled:opacity-50"
                    style={{ background: 'var(--input-bg)' }}
                  >
                    {invitingId === barber.id ? '...' : '🔗 Convidar'}
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Proprietário</span>
                )}
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
        <button
          onClick={() => openModal()}
          className="flashlight-card rounded-[2rem] lg:rounded-[3.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-6 lg:p-12 hover:border-brand-accent/50 transition-all group min-h-[200px] lg:min-h-[450px]"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="w-14 h-14 lg:w-24 lg:h-24 rounded-xl lg:rounded-[2rem] flex items-center justify-center text-brand-muted group-hover:bg-brand-accent group-hover:text-white transition-all group-hover:scale-110 group-hover:rotate-12" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            <Plus size={24} className="lg:hidden" />
            <Plus size={40} className="hidden lg:block" />
          </div>
          <div className="mt-4 lg:mt-8">
            <h3 className="text-sm lg:text-2xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors uppercase tracking-tight">Novo Profissional</h3>
            <p className="text-brand-muted mt-1 lg:mt-3 text-[10px] lg:text-xs font-mono uppercase tracking-widest max-w-[160px] lg:max-w-[200px]">Amplie sua força operacional com novos talentos.</p>
          </div>
        </button>
      </div>

      {modalOpen && (
        <BarberModal
          form={form}
          setForm={setForm}
          schedule={schedule}
          setSchedule={setSchedule}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {inviteLink && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="flashlight-card w-full max-w-md rounded-[3rem] overflow-hidden" style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>
            <div className="px-10 pt-10 pb-6 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest mb-3 block">Link de Convite</span>
                <h2 className="text-2xl font-display font-black text-brand-main uppercase">Convidar Barbeiro<span className="text-brand-accent">.</span></h2>
              </div>
              <button onClick={() => setInviteLink(null)} className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)' }}>✕</button>
            </div>
            <div className="px-10 pb-10 space-y-4">
              <p className="text-brand-muted text-xs font-mono">Envie este link para o barbeiro. Ele expira em 7 dias.</p>
              <div className="p-4 rounded-2xl break-all text-[11px] font-mono text-brand-accent" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                {inviteLink}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); toast('Copiado!', 'success'); }}
                  className="flex-1 py-3 rounded-2xl text-[11px] font-mono font-black uppercase tracking-widest bg-brand-accent text-white hover:opacity-90 transition-all"
                >
                  Copiar Link
                </button>
                <button
                  onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent('Você foi convidado para a equipe! Acesse: ' + inviteLink)}`, '_blank'); }}
                  className="flex-1 py-3 rounded-2xl text-[11px] font-mono font-black uppercase tracking-widest text-brand-success border border-brand-success/20 hover:bg-brand-success/10 transition-all"
                  style={{ background: 'var(--input-bg)' }}
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
