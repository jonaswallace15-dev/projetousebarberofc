'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Instagram, ExternalLink, Check, ChevronRight, Loader2 } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
  breakStart?: string;
  breakEnd?: string;
}

const defaultWorkingHours: Record<string, DaySchedule> = {
  'Segunda': { open: '09:00', close: '18:00', closed: false },
  'Terça': { open: '09:00', close: '18:00', closed: false },
  'Quarta': { open: '09:00', close: '18:00', closed: false },
  'Quinta': { open: '09:00', close: '18:00', closed: false },
  'Sexta': { open: '09:00', close: '18:00', closed: false },
  'Sábado': { open: '09:00', close: '16:00', closed: false },
  'Domingo': { open: '09:00', close: '12:00', closed: true },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [autoSlug, setAutoSlug] = useState(true);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState({
    name: '',
    slug: '',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    instagram: '',
    logoUrl: '',
    bannerUrl: '',
    addressCep: '',
    addressStreet: '',
    addressNeighborhood: '',
    addressNumber: '',
    addressCity: '',
    addressState: '',
    workingHours: defaultWorkingHours as Record<string, DaySchedule>,
  });

  useEffect(() => {
    if (!user) return;
    supabaseService.getBusinessConfig().then((data: any) => {
      if (data) {
        if (data.slug) setAutoSlug(false);
        setConfig(prev => ({
          ...prev,
          name: data.name || '',
          slug: data.slug || '',
          phone: data.phone || '',
          ownerName: data.owner_name || '',
          ownerEmail: data.owner_email || '',
          instagram: data.instagram || '',
          logoUrl: data.logo_url || '',
          bannerUrl: data.banner_url || '',
          addressCep: data.address_cep || '',
          addressStreet: data.address_street || '',
          addressNeighborhood: data.address_neighborhood || '',
          addressNumber: data.address_number || '',
          addressCity: data.address_city || '',
          addressState: data.address_state || '',
          workingHours: data.working_hours || defaultWorkingHours,
        }));
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const toSlug = (str: string) =>
    str.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

  const checkSlug = useCallback((slug: string) => {
    if (!slug) { setSlugStatus('idle'); return; }
    setSlugStatus('checking');
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/config/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSlugStatus(data.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
  }, []);

  const handleNameChange = (name: string) => {
    setConfig(c => {
      const next = { ...c, name };
      if (autoSlug) {
        const generated = toSlug(name);
        next.slug = generated;
        checkSlug(generated);
      }
      return next;
    });
  };

  const handleSlugChange = (raw: string) => {
    setAutoSlug(false);
    const slug = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    setConfig(c => ({ ...c, slug }));
    checkSlug(slug);
  };

  const bookingLink = `usebarber.site/book/${config.slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${bookingLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setConfig(prev => ({ ...prev, addressCep: cleanCep }));
    if (cleanCep.length === 8) {
      setIsFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setConfig(prev => ({
            ...prev,
            addressStreet: data.logradouro || '',
            addressNeighborhood: data.bairro || '',
            addressCity: data.localidade || '',
            addressState: data.uf || '',
          }));
        }
      } finally { setIsFetchingCep(false); }
    }
  };

  const handleFileToBase64 = (file: File, maxW: number, maxH: number, onResult: (b64: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        onResult(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (slugStatus === 'taken') {
      toast('O slug escolhido já está em uso. Altere o nome ou edite o slug.', 'error');
      return;
    }
    setSaving(true);
    try {
      const cleanSlug = config.slug
        .toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');

      await supabaseService.upsertBusinessConfig({
        name: config.name,
        slug: cleanSlug,
        phone: config.phone,
        owner_name: config.ownerName,
        owner_email: config.ownerEmail,
        instagram: config.instagram,
        logo_url: config.logoUrl,
        banner_url: config.bannerUrl,
        address_cep: config.addressCep,
        address_street: config.addressStreet,
        address_neighborhood: config.addressNeighborhood,
        address_number: config.addressNumber,
        address_city: config.addressCity,
        address_state: config.addressState,
        working_hours: config.workingHours,
      });
      setConfig(prev => ({ ...prev, slug: cleanSlug }));
      toast('Configurações salvas com sucesso!', 'success');
    } catch (err: any) {
      if (err.message?.includes('Unique') || err.message?.includes('slug')) {
        toast('Este slug já está em uso. Escolha outro nome ou edite o slug.', 'error');
        setSlugStatus('taken');
      } else {
        toast('Erro ao salvar: ' + err.message, 'error');
      }
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
              Ajustes<span className="text-brand-accent">.</span>
            </h1>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center w-11 h-11 rounded-2xl text-brand-accent transition-all active:scale-90 hover:bg-brand-accent/10 shrink-0"
              style={{ border: '1px solid var(--card-border)', background: 'var(--input-bg)' }}
              title="Copiar link público"
            >
              {copied ? <Check size={18} className="text-brand-success" /> : <ExternalLink size={18} />}
            </button>
          </div>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            Personalize a experiência tecnológica da sua barbearia.
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.4)] hover:bg-brand-accent/90 transition-all whitespace-nowrap disabled:opacity-50"
        >
          {saving ? 'GRAVANDO...' : 'APLICAR ALTERAÇÕES'}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row gap-10 items-start">
        {/* Nav */}
        <nav className="lg:w-72 w-full space-y-2 lg:sticky lg:top-10">
          {[
            { id: 'general', label: 'Barbearia', icon: 'solar:shop-2-bold-duotone' },
            { id: 'hours', label: 'Expediente', icon: 'solar:clock-circle-bold-duotone' },
            { id: 'notifications', label: 'Alertas', icon: 'solar:bell-bing-bold-duotone' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className={`w-full group flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all relative overflow-hidden ${activeSubTab === item.id ? 'bg-brand-accent text-white shadow-[0_15px_30px_rgba(0,112,255,0.2)]' : 'text-brand-muted hover:text-brand-accent'}`}
              style={activeSubTab !== item.id ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}
            >
              <iconify-icon icon={item.icon} class={`text-2xl ${activeSubTab === item.id ? 'text-white' : 'text-brand-accent'}`} />
              <span className="text-[11px] font-display font-black uppercase tracking-[0.2em]">{item.label}</span>
              {activeSubTab === item.id && <div className="ml-auto w-1 h-1 bg-white rounded-full animate-pulse" />}
            </button>
          ))}

        </nav>

        <div className="flex-1 w-full space-y-10">
          {activeSubTab === 'general' && (
            <div className="space-y-10">
              {/* Identity */}
              <div className="flashlight-card p-10 rounded-[3.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />
                <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-8 flex items-center gap-3">
                  <iconify-icon icon="solar:user-circle-bold-duotone" class="text-3xl text-brand-accent" />
                  Identidade Visual
                </h3>

                <div className="flex flex-col md:flex-row items-center gap-10">
                  {/* Logo */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-48 h-48 rounded-[3rem] border-2 border-dashed flex items-center justify-center group cursor-pointer hover:border-brand-accent/50 transition-all"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}
                  >
                    {config.logoUrl
                      ? <img src={config.logoUrl} className="w-full h-full object-cover rounded-[2.8rem] group-hover:opacity-40 transition-opacity" alt="Logo" />
                      : <iconify-icon icon="solar:camera-add-bold-duotone" class="text-5xl text-white/20 group-hover:text-brand-accent transition-colors" />}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-display font-black text-white uppercase tracking-widest bg-brand-accent px-4 py-2 rounded-full">Logo</span>
                    </div>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileToBase64(f, 400, 400, b64 => setConfig(c => ({ ...c, logoUrl: b64 }))); }} />
                  </div>

                  {/* Banner */}
                  <div
                    onClick={() => bannerInputRef.current?.click()}
                    className="relative flex-1 h-48 rounded-[3rem] border-2 border-dashed flex items-center justify-center group cursor-pointer hover:border-brand-accent/50 transition-all overflow-hidden"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}
                  >
                    {config.bannerUrl
                      ? <img src={config.bannerUrl} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" alt="Banner" />
                      : <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                          <iconify-icon icon="solar:gallery-upload-bold-duotone" class="text-5xl group-hover:text-brand-accent transition-colors" />
                          <span className="text-[10px] uppercase font-black tracking-widest">Banner da Página</span>
                        </div>}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-[10px] font-display font-black text-white uppercase tracking-widest bg-brand-deep/80 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">Alterar Banner</span>
                    </div>
                    <input type="file" ref={bannerInputRef} accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileToBase64(f, 1200, 400, b64 => setConfig(c => ({ ...c, bannerUrl: b64 }))); }} />
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">Nome do Estabelecimento</label>
                    <input type="text" value={config.name} onChange={e => handleNameChange(e.target.value)}
                      className="w-full rounded-2xl py-5 px-6 text-brand-main text-xl font-display font-black outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-2">
                      <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em]">Endereço Digital (Slug)</label>
                      {slugStatus === 'checking' && <span className="flex items-center gap-1 text-[9px] font-mono text-brand-muted"><Loader2 size={10} className="animate-spin" /> verificando...</span>}
                      {slugStatus === 'available' && <span className="text-[9px] font-mono text-brand-success font-black">✓ disponível</span>}
                      {slugStatus === 'taken' && <span className="text-[9px] font-mono text-rose-400 font-black">✗ já em uso</span>}
                    </div>
                    <div className="flex items-center rounded-2xl overflow-hidden" style={{ background: 'var(--input-bg)', border: `1px solid ${slugStatus === 'taken' ? 'rgba(248,113,113,0.5)' : slugStatus === 'available' ? 'rgba(16,185,129,0.4)' : 'var(--input-border)'}` }}>
                      <span className="px-6 py-5 text-brand-muted font-mono text-xs tracking-tight" style={{ borderRight: '1px solid var(--input-border)' }}>book/</span>
                      <input type="text" value={config.slug} onChange={e => handleSlugChange(e.target.value)}
                        className="flex-1 bg-transparent px-6 py-5 text-brand-accent font-mono font-black text-sm outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner */}
              <div className="flashlight-card p-10 rounded-[3.5rem]">
                <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-8 flex items-center gap-3">
                  <iconify-icon icon="solar:shield-user-bold-duotone" class="text-3xl text-brand-accent" />
                  Proprietário & Contatos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { label: 'Nome Administrativo', key: 'ownerName', type: 'text' },
                    { label: 'Email Corporativo', key: 'ownerEmail', type: 'email' },
                    { label: 'WhatsApp Principal', key: 'phone', type: 'text' },
                  ].map(f => (
                    <div key={f.key} className="space-y-3">
                      <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">{f.label}</label>
                      <input type={f.type} value={(config as any)[f.key] || ''} onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                        className="w-full rounded-2xl py-4 px-6 text-brand-main font-medium outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                    </div>
                  ))}
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">Instagram</label>
                    <div className="relative">
                      <Instagram size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input type="text" value={config.instagram || ''} onChange={e => setConfig(c => ({ ...c, instagram: e.target.value }))}
                        placeholder="@seuusuario"
                        className="w-full rounded-2xl py-4 pl-14 pr-6 text-brand-main font-medium outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="flashlight-card p-10 rounded-[3.5rem]">
                <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-8 flex items-center gap-3">
                  <iconify-icon icon="solar:point-on-map-bold-duotone" class="text-3xl text-brand-accent" />
                  Localização Física
                </h3>
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 md:col-span-4 space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em]">CEP</label>
                      {isFetchingCep && <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />}
                    </div>
                    <input type="text" value={config.addressCep || ''} onChange={e => handleCepChange(e.target.value)}
                      className="w-full rounded-2xl py-4 px-6 text-brand-accent font-mono font-black outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="col-span-12 md:col-span-8 space-y-3">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">Rua</label>
                    <input type="text" value={config.addressStreet || ''} readOnly
                      className="w-full rounded-2xl py-4 px-6 text-brand-main font-medium outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="col-span-12 md:col-span-5 space-y-3">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">Bairro</label>
                    <input type="text" value={config.addressNeighborhood || ''} readOnly
                      className="w-full rounded-2xl py-4 px-6 text-brand-muted font-medium cursor-not-allowed" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="col-span-6 md:col-span-3 space-y-3">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">Número</label>
                    <input type="text" value={config.addressNumber || ''} onChange={e => setConfig(c => ({ ...c, addressNumber: e.target.value }))}
                      className="w-full rounded-2xl py-4 px-6 text-brand-main font-bold outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="col-span-6 md:col-span-4 space-y-3">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] ml-2">Cidade/UF</label>
                    <input type="text" value={config.addressCity && config.addressState ? `${config.addressCity} - ${config.addressState}` : ''} readOnly
                      className="w-full rounded-2xl py-4 px-6 text-brand-muted font-mono text-xs cursor-not-allowed" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'hours' && (
            <div className="flashlight-card p-10 rounded-[3.5rem]">
              <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-8 flex items-center gap-3">
                <iconify-icon icon="solar:calendar-date-bold-duotone" class="text-3xl text-brand-accent" />
                Jornada Semanal
              </h3>
              <div className="space-y-4">
                {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => {
                  const schedule = config.workingHours?.[day];
                  if (!schedule) return null;
                  return (
                    <div key={day} className={`p-8 rounded-[2.5rem] border transition-all ${schedule.closed ? 'opacity-50' : 'hover:border-brand-accent/30'}`} style={{ background: schedule.closed ? 'transparent' : 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                          <button
                            type="button"
                            onClick={() => {
                              setConfig(c => ({
                                ...c,
                                workingHours: { ...c.workingHours, [day]: { ...c.workingHours[day], closed: !c.workingHours[day].closed } }
                              }));
                            }}
                            className={`w-16 h-8 rounded-full flex items-center px-1.5 transition-all duration-500 ${schedule.closed ? '' : 'bg-brand-accent shadow-[0_0_20px_rgba(0,112,255,0.4)]'}`}
                            style={{ background: schedule.closed ? 'var(--card-border)' : undefined }}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 ${schedule.closed ? 'translate-x-0' : 'translate-x-8'}`} />
                          </button>
                          <div>
                            <h4 className={`text-xl font-display font-black uppercase tracking-tight ${schedule.closed ? 'text-brand-muted' : 'text-brand-main'}`}>{day}</h4>
                            <p className="text-[10px] font-mono text-brand-muted uppercase font-bold">{schedule.closed ? 'Fechado' : 'Aberto'}</p>
                          </div>
                        </div>
                        {!schedule.closed && (
                          <div className="flex flex-col gap-4 w-full md:w-auto">
                            {/* Abertura / Fechamento */}
                            <div className="flex gap-6 flex-wrap">
                              {[
                                { label: 'Abertura', key: 'open', color: 'brand-accent' },
                                { label: 'Fechamento', key: 'close', color: 'rose-500' },
                              ].map(f => (
                                <div key={f.key} className="space-y-2">
                                  <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black">{f.label}</p>
                                  <input type="time" value={(schedule as any)[f.key] || ''}
                                    onChange={e => setConfig(c => ({ ...c, workingHours: { ...c.workingHours, [day]: { ...c.workingHours[day], [f.key]: e.target.value } } }))}
                                    className={`rounded-2xl px-5 py-3 font-mono font-black outline-none text-sm text-${f.color}`}
                                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }} />
                                </div>
                              ))}
                            </div>
                            {/* Pausa / Almoço */}
                            <div className="flex items-center gap-4 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setConfig(c => ({
                                  ...c,
                                  workingHours: {
                                    ...c.workingHours,
                                    [day]: {
                                      ...c.workingHours[day],
                                      breakStart: c.workingHours[day].breakStart ? undefined : '12:00',
                                      breakEnd: c.workingHours[day].breakEnd ? undefined : '13:00',
                                    }
                                  }
                                }))}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all ${schedule.breakStart ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-brand-muted border border-white/10 hover:border-amber-500/30 hover:text-amber-400'}`}
                                style={{ background: schedule.breakStart ? undefined : 'var(--input-bg)' }}
                              >
                                <iconify-icon icon="solar:cup-hot-bold-duotone" class="text-base" />
                                {schedule.breakStart ? 'Pausa ativa' : 'Adicionar pausa'}
                              </button>
                              {schedule.breakStart && (
                                <div className="flex gap-4 flex-wrap">
                                  {[
                                    { label: 'Início pausa', key: 'breakStart' },
                                    { label: 'Fim pausa', key: 'breakEnd' },
                                  ].map(f => (
                                    <div key={f.key} className="space-y-2">
                                      <p className="text-[10px] font-mono text-amber-500/70 uppercase tracking-widest font-black">{f.label}</p>
                                      <input type="time" value={(schedule as any)[f.key] || ''}
                                        onChange={e => setConfig(c => ({ ...c, workingHours: { ...c.workingHours, [day]: { ...c.workingHours[day], [f.key]: e.target.value } } }))}
                                        className="rounded-2xl px-5 py-3 font-mono font-black outline-none text-sm text-amber-400"
                                        style={{ background: 'var(--input-bg)', border: '1px solid rgba(245,158,11,0.3)' }} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSubTab === 'notifications' && (
            <div className="space-y-10">
              <div className="flashlight-card p-10 rounded-[3.5rem] relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand-accent/5 rounded-full blur-[100px]" />
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                    <iconify-icon icon="solar:bell-bing-bold-duotone" class="text-6xl" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-2">Web Push System</h3>
                    <p className="text-brand-muted font-medium text-lg leading-relaxed max-w-xl">
                      Receba alertas em tempo real diretamente no seu dispositivo.
                    </p>
                  </div>
                </div>

                <div className="mt-12 p-8 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-brand-success shadow-[0_0_15px_#10B981] animate-pulse" />
                    <div>
                      <p className="text-brand-main font-display font-black uppercase tracking-tight">Status do Engine</p>
                      <p className="text-[10px] font-mono text-brand-muted uppercase font-bold tracking-widest">Protocolo VAPID Ativo</p>
                    </div>
                  </div>
                  <button className="bg-brand-accent hover:bg-brand-accent/80 text-white font-display font-black uppercase tracking-widest text-[11px] px-10 py-5 rounded-2xl shadow-[0_15px_40px_rgba(0,112,255,0.3)] transition-all active:scale-95">
                    Ativar no Dispositivo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { icon: 'solar:smartphone-2-bold-duotone', title: 'Mobile Experience', desc: 'Instale nosso PWA para receber notificações nativas no seu smartphone.', badge: 'Add to Home Screen', badgeColor: 'brand-accent' },
                  { icon: 'solar:share-circle-bold-duotone', title: 'Central de Reservas', desc: 'Seus clientes recebem confirmação imediata via WhatsApp.', badge: 'WhatsApp Engine v2.0', badgeColor: 'brand-success' },
                ].map(card => (
                  <div key={card.title} className="flashlight-card p-10 rounded-[3.5rem]">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-brand-accent mb-6" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                      <iconify-icon icon={card.icon} class="text-2xl" />
                    </div>
                    <h4 className="text-xl font-display font-black text-brand-main uppercase tracking-tight mb-4">{card.title}</h4>
                    <p className="text-brand-muted text-sm leading-relaxed mb-6 font-medium">{card.desc}</p>
                    <div className={`flex items-center gap-2 px-4 py-2 bg-${card.badgeColor}/5 border border-${card.badgeColor}/10 rounded-full w-max`}>
                      <span className={`text-[9px] font-mono text-${card.badgeColor} uppercase font-black`}>{card.badge}</span>
                      <Check size={10} className={`text-${card.badgeColor}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
