'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Users, Calendar, Scissors, Sparkles, Clock, CheckCircle2, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/components/AuthProvider';
import { supabaseService } from '@/services/supabaseService';
import { getBusinessInsights } from '@/services/gemini';
import { useRouter } from 'next/navigation';
import type { Appointment, FinanceTransaction } from '@/types';

export default function DashboardPage() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const isBarbeiro = userRole === 'Barbeiro';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [appts, cls, txs] = await Promise.all([
          supabaseService.getAppointments(),
          supabaseService.getClients(),
          supabaseService.getTransactions(),
        ]);
        setAppointments(appts || []);
        setClients(cls || []);
        setTransactions(txs || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const res = await getBusinessInsights({ appointments: appointments.length });
      setInsights(res);
      setLoadingInsights(false);
    };
    if (appointments.length >= 0) fetchInsights();
  }, [appointments.length]);

  const totalRevenue = transactions.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + (t.amount || 0), 0);

  const revenueTrend = useMemo(() => {
    const now = new Date();
    const sum = (arr: FinanceTransaction[]) =>
      arr.filter(t => t.type === 'Entrada').reduce((s, t) => s + (t.amount || 0), 0);
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const prevMonth = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === pm.getMonth() && d.getFullYear() === pm.getFullYear();
    });
    const curr = sum(thisMonth);
    const prev = sum(prevMonth);
    if (!prev) return 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }, [transactions]);

  const conversionRate = useMemo(() => {
    if (!appointments.length) return 0;
    const converted = appointments.filter(a =>
      a.status === 'Finalizado' || a.status === 'Confirmado' || a.status === 'Em andamento' || a.status === 'Pago'
    ).length;
    return Math.round((converted / appointments.length) * 100);
  }, [appointments]);

  const conversionTrend = useMemo(() => {
    if (!appointments.length) return 0;
    const now = new Date();
    const isConverted = (a: Appointment) =>
      a.status === 'Finalizado' || a.status === 'Confirmado' || a.status === 'Em andamento' || a.status === 'Pago';
    const rate = (arr: Appointment[]) =>
      arr.length ? (arr.filter(isConverted).length / arr.length) * 100 : 0;

    const thisMonth = appointments.filter(a => {
      const d = new Date(a.date + 'T00:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const prevMonth = appointments.filter(a => {
      const d = new Date(a.date + 'T00:00:00');
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === pm.getMonth() && d.getFullYear() === pm.getFullYear();
    });

    const curr = rate(thisMonth);
    const prev = rate(prevMonth);
    if (!prev) return 0;
    return Math.round((curr - prev) * 10) / 10;
  }, [appointments]);

  const chartData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const data = days.map(name => ({ name, faturamento: 0 }));
    if (!transactions.length) return data;
    const now = new Date();
    const monday = new Date(now);
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    transactions.forEach(t => {
      if (t.type !== 'Entrada') return;
      const dateParts = t.date.split('-');
      if (dateParts.length !== 3) return;
      const [y, m, d] = dateParts.map(Number);
      const tDate = new Date(y, m - 1, d);
      if (tDate >= monday && tDate <= sunday) {
        let dayIdx = tDate.getDay();
        dayIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        if (dayIdx >= 0 && dayIdx < 7) data[dayIdx].faturamento += t.amount || 0;
      }
    });
    return data;
  }, [transactions]);

  const todayAppointments = appointments
    .filter(a => a.date === new Date().toISOString().split('T')[0])
    .sort((a, b) => a.time.localeCompare(b.time));

  if (loading) {
    return (
      <div className="space-y-10 pb-20 animate-pulse">
        <div className="h-32 bg-brand-surface/30 rounded-[3rem]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-brand-surface/30 rounded-[2rem]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            Dashboard<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg max-w-xl leading-relaxed">
            {isBarbeiro ? 'Acompanhe seu desempenho e próximos atendimentos de elite.' : 'Análise em tempo real e controle total da sua operação premium.'}
          </p>
        </div>
        {!isBarbeiro && (
          <div className="hidden lg:flex items-center gap-8 pb-2">
            <div className="flex flex-col items-end">
              <span className="text-3xl font-display font-black text-brand-main">R$ {totalRevenue.toLocaleString('pt-BR')}</span>
              <span className="text-[9px] font-mono uppercase text-brand-muted tracking-[0.2em]">Fluxo de Caixa</span>
            </div>
            <div className="h-10 w-px bg-brand-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-3xl font-display font-black text-brand-accent">{appointments.length}</span>
              <span className="text-[9px] font-mono uppercase text-brand-muted tracking-[0.2em]">Total Ciclos</span>
            </div>
          </div>
        )}
      </header>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard delay={100} title={isBarbeiro ? "Comissão Acum." : "Receita"} value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend={revenueTrend} icon={<DollarSign size={20} />} />
        <StatCard delay={200} title={isBarbeiro ? "Atendimentos" : "Clientes"} value={isBarbeiro ? appointments.length : clients.length} icon={isBarbeiro ? <Scissors size={20} /> : <Users size={20} />} />
        <StatCard delay={300} title="Hoje" value={todayAppointments.length} icon={<Activity size={20} />} />
        <StatCard delay={400} title="Conversão" value={`${conversionRate}%`} trend={conversionTrend} icon={<TrendingUp size={20} />} />
      </div>

      {/* ELITE AGENDA */}
      <div className="flashlight-card rounded-[2rem] lg:rounded-[4rem] overflow-hidden shadow-2xl">
        <div className="p-6 md:p-8 lg:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--input-bg)' }}>
          <div>
            <h2 className="text-3xl font-display font-black text-brand-main uppercase tracking-tight italic">Elite Agenda<span className="text-brand-accent">.</span></h2>
            <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest mt-1">Today's Protocol Selection</p>
          </div>
          <button onClick={() => router.push('/appointments')} className="px-6 py-3 rounded-2xl text-[11px] font-mono uppercase tracking-widest text-brand-accent transition-all hover:scale-105 active:scale-95" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            Expand View
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'var(--input-bg)' }}>
                <th className="px-4 sm:px-12 py-4 sm:py-6 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand-muted">Sequence</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand-muted">Client Profile</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand-muted hidden sm:table-cell">Elite Service</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand-muted">Status Logic</th>
                <th className="px-4 sm:px-12 py-4 sm:py-6 text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-brand-muted text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {todayAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-12 py-12 sm:py-20 text-center">
                    <p className="text-brand-muted font-mono uppercase tracking-widest text-[10px] sm:text-base leading-relaxed">Nenhum agendamento ativo para este ciclo.</p>
                  </td>
                </tr>
              ) : (
                todayAppointments.slice(0, 6).map((app) => (
                  <tr key={app.id} className="group hover:bg-brand-accent/[0.02] transition-colors">
                    <td className="px-4 sm:px-12 py-4 sm:py-8 font-display text-xl sm:text-2xl font-black text-brand-accent">{app.time}</td>
                    <td className="px-4 sm:px-8 py-4 sm:py-8">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden sm:flex w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/20 items-center justify-center text-brand-accent font-bold shrink-0">
                          {app.clientName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm sm:text-lg font-display font-bold text-brand-main group-hover:text-brand-accent transition-colors truncate">{app.clientName}</p>
                          <p className="text-[8px] sm:text-[10px] font-mono text-brand-muted uppercase tracking-widest italic sm:hidden truncate">{app.serviceName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-8 hidden sm:table-cell">
                      <span className="text-xs sm:text-sm font-medium text-brand-muted truncate">{app.serviceName}</span>
                    </td>
                    <td className="px-4 sm:px-8 py-4 sm:py-8">
                      <span className={`inline-block px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-[8px] sm:text-[9px] font-mono font-black uppercase border ${app.status === 'Confirmado' ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' : app.status === 'Finalizado' ? 'bg-brand-success/10 text-brand-success border-brand-success/20' : app.status === 'Em andamento' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'text-brand-muted border-white/10'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-12 py-4 sm:py-8 text-right">
                      <button onClick={() => router.push('/appointments')} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full inline-flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all ml-auto shrink-0" style={{ border: '1px solid var(--card-border)' }}>
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isBarbeiro && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CHART */}
        <div className="lg:col-span-2 flashlight-card p-6 md:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] group">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-2xl font-display font-bold text-brand-main mb-1">Performance Semanal</h3>
              <p className="text-brand-muted text-[10px] font-mono uppercase tracking-widest">Revenue Velocity • Q1 2026</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <span className="w-2 h-2 bg-brand-accent rounded-full shadow-[0_0_10px_#0066FF]"></span>
              <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Live Flow</span>
            </div>
          </div>
          <div className="h-[350px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0070FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0070FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} dy={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} />
                <Tooltip
                  cursor={{ stroke: 'rgba(0, 112, 255, 0.2)', strokeWidth: 2 }}
                  contentStyle={{ backgroundColor: '#0A0A0A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '16px' }}
                  itemStyle={{ color: '#0070FF', fontWeight: 900 }}
                  labelStyle={{ color: '#666', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}
                />
                <Area type="monotone" dataKey="faturamento" stroke="#0070FF" strokeWidth={4} fill="url(#colorRevenue)" animationDuration={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI INSIGHTS */}
        <div className="flashlight-card p-6 md:p-8 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] flex flex-col group">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent group-hover:rotate-12 transition-transform duration-500">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-brand-main">AI Engine</h3>
              <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Intelligent Insights</p>
            </div>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {loadingInsights ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-3xl" style={{ background: 'var(--card-border)' }} />)}
              </div>
            ) : (
              insights.map((insight, idx) => (
                <div key={idx} className="p-6 rounded-[2rem] hover:border-brand-accent/30 transition-all cursor-default" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  <p className="text-sm text-brand-muted leading-relaxed">"{insight}"</p>
                </div>
              ))
            )}
          </div>
          <ShimmerButton onClick={() => router.push('/finance')} className="w-full mt-8 py-4 text-[11px] font-mono uppercase tracking-[0.2em] shadow-[0_15px_35px_rgba(0,112,255,0.2)]">
            Full Analytics →
          </ShimmerButton>
        </div>
      </div>}
    </div>
  );
}
