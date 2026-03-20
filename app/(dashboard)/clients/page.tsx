'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Edit3, MessageCircle, Star, X } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/components/AuthProvider';
import { supabaseService } from '@/services/supabaseService';
import type { Client } from '@/types';

const emptyForm = { id: '', name: '', phone: '', email: '', instagram: '', birthDate: '', address: '', notes: '' };

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabaseService.getClients().then(data => { setClients(data || []); setLoading(false); });
  }, [user]);

  const filteredClients = useMemo(() => clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  ), [clients, searchTerm]);

  const openNew = () => { setForm({ ...emptyForm }); setModalOpen(true); };
  const openEdit = (c: Client) => {
    setForm({ id: c.id, name: c.name, phone: c.phone, email: c.email || '', instagram: c.instagram || '', birthDate: c.birthDate || '', address: c.address || '', notes: (c as any).notes || '' });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      const saved = await supabaseService.upsertClient(payload);
      setClients(prev => form.id ? prev.map(c => c.id === form.id ? { ...c, ...saved } : c) : [{ ...saved, lastVisit: '-', totalSpent: 0, frequency: 0, tag: 'Novo' as const }, ...prev]);
      setModalOpen(false);
    } catch (err: any) { alert(err.message || 'Erro ao salvar cliente'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja deletar este cliente permanentemente?')) return;
    await supabaseService.deleteClient(id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-4">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Client Directory Active</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            Clientes<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            Gestão inteligente de relacionamentos e histórico de consumo.
          </p>
        </div>
        <ShimmerButton onClick={openNew} className="w-full md:w-auto text-[10px] tracking-widest px-8 whitespace-nowrap">
          NOVO CLIENTE
        </ShimmerButton>
      </header>

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-6 flex items-center text-brand-muted group-focus-within:text-brand-accent transition-colors">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Busca avançada por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl py-4 lg:py-6 pl-14 lg:pl-16 pr-8 text-brand-main placeholder:text-brand-muted outline-none focus:border-brand-accent/50 transition-all"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 animate-pulse rounded-[3.5rem]" style={{ background: 'var(--input-bg)' }} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, idx) => (
              <div key={client.id} className="flashlight-card p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3.5rem] group flex flex-col justify-between hover:border-brand-accent/30 transition-all relative overflow-hidden h-full shadow-2xl">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-all duration-700 pointer-events-none" />
                <div className="flex items-start justify-between mb-8 gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl lg:rounded-[1.5rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-display font-black text-xl lg:text-2xl group-hover:scale-110 transition-transform duration-500 shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors mb-1 break-words leading-tight">{client.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-full tracking-widest border ${client.tag === 'VIP' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' : client.tag === 'Recorrente' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : 'text-brand-muted/40 border-white/5'}`}>
                          {client.tag || 'Novo'}
                        </span>
                        {client.tag === 'VIP' && <Star size={10} className="text-brand-accent fill-brand-accent animate-pulse" />}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => openEdit(client)} className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all bg-white/5 border border-white/5 shrink-0">
                    <Edit3 size={16} />
                  </button>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <p className="text-[8px] font-mono text-brand-muted uppercase tracking-widest mb-1 font-bold">WhatsApp</p>
                      <p className="text-[12px] font-mono text-brand-main font-bold truncate">{client.phone}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <p className="text-[8px] font-mono text-brand-muted uppercase tracking-widest mb-1 font-bold">Investido</p>
                      <p className="text-[12px] font-display text-brand-success font-black tracking-tight">R$ {client.totalSpent || 0}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank')}
                      className="flex-1 bg-brand-accent/10 hover:bg-brand-accent border border-brand-accent/20 text-brand-accent hover:text-white py-3.5 rounded-2xl font-display font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <MessageCircle size={14} /> Contato
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="w-12 h-12 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/30 text-zinc-600 hover:text-rose-500 flex items-center justify-center rounded-2xl transition-all active:scale-95">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredClients.length === 0 && (
              <div className="col-span-full flashlight-card py-24 flex flex-col items-center justify-center text-center rounded-[4rem] px-8">
                <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">Nenhum Registro</h3>
                <p className="text-brand-muted mt-2 font-mono uppercase text-[10px] tracking-[0.2em]">Não encontramos resultados para sua busca atual.</p>
                <ShimmerButton onClick={openNew} className="mt-10 px-10 py-4 text-[10px] tracking-[0.3em] whitespace-nowrap">
                  CADASTRAR CLIENTE
                </ShimmerButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="flashlight-card w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden" style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>
            <div className="px-10 pt-10 pb-6 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest mb-3 block">System Override</span>
                <h2 className="text-3xl font-display font-black text-brand-main italic uppercase">{form.id ? 'Editar' : 'Novo'} Cliente<span className="text-brand-accent">.</span></h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all hover:rotate-90" style={{ background: 'var(--input-bg)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-10 pb-10 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Nome</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Instagram</label>
                  <input value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} placeholder="@usuario" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">Data de Nascimento</label>
                <input type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} className="w-full border rounded-2xl px-5 py-4 outline-none focus:border-brand-accent transition-all" style={{ background: 'var(--input-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)' }} />
              </div>
              <ShimmerButton type="submit" disabled={saving} className="w-full py-4 text-[11px] font-mono uppercase tracking-widest">
                {saving ? 'SALVANDO...' : 'SALVAR CLIENTE'}
              </ShimmerButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
