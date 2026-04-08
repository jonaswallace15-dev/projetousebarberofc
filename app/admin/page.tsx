'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from 'next-auth/react';

const NAV = [
  { id: 'dashboard',   label: 'Visão Geral',       icon: 'solar:chart-2-bold-duotone' },
  { id: 'shops',       label: 'Barbearias',         icon: 'solar:shop-2-bold-duotone' },
  { id: 'finance',     label: 'Financeiro',         icon: 'solar:dollar-minimalistic-bold-duotone' },
  { id: 'analytics',   label: 'Analytics',          icon: 'solar:graph-bold-duotone' },
  { id: 'plans',       label: 'Planos',             icon: 'solar:star-bold-duotone' },
  { id: 'alerts',      label: 'Alertas',            icon: 'solar:bell-bing-bold-duotone' },
  { id: 'withdrawals', label: 'Saques',             icon: 'solar:transfer-horizontal-bold-duotone' },
  { id: 'support',     label: 'Suporte',            icon: 'solar:headphones-bold-duotone' },
];

function calcHealth(shop: any) {
  let score = 0;
  if ((shop.recentAppointments || 0) > 0) score += 30;
  if ((shop.recentAppointments || 0) >= 5) score += 10;
  if ((shop.barbersCount || 0) > 0) score += 20;
  if ((shop.revenue || 0) > 0) score += 30;
  if (shop.slug) score += 10;
  return Math.min(score, 100);
}

function healthTag(score: number) {
  if (score >= 70) return { label: 'Saudável', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
  if (score >= 40) return { label: 'Risco',    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  return               { label: 'Crítico',    color: 'text-rose-400',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20' };
}

export default function AdminPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [detailShop, setDetailShop] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && userRole !== 'Super Admin') { router.push('/dashboard'); return; }
    if (userRole === 'Super Admin') {
      Promise.all([
        fetch('/api/admin/stats').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/shops').then(r => r.json()).catch(() => []),
        fetch('/api/admin/barbers').then(r => r.json()).catch(() => []),
        fetch('/api/admin/withdrawals').then(r => r.json()).catch(() => []),
      ]).then(([s, sh, b, w]) => {
        setStats(s);
        setShops(Array.isArray(sh) ? sh : []);
        setBarbers(Array.isArray(b) ? b : []);
        setWithdrawals(Array.isArray(w) ? w : []);
      }).finally(() => setDataLoading(false));
    }
  }, [userRole, loading, router]);

  const handleWithdrawal = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    try {
      await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const statusMap: Record<string, string> = { approve: 'Aprovado', reject: 'Rejeitado' };
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: statusMap[action] } : w));
    } finally { setProcessing(null); }
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080808]">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (userRole !== 'Super Admin') return null;

  const totalRevenue = shops.reduce((s, sh) => s + (sh.revenue || 0), 0);
  const filtered = (arr: any[]) => arr.filter(x => JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));

  const healthCounts = { saudavel: 0, risco: 0, critico: 0 };
  shops.forEach(s => {
    const score = calcHealth(s);
    if (score >= 70) healthCounts.saudavel++;
    else if (score >= 40) healthCounts.risco++;
    else healthCounts.critico++;
  });

  const pendingW = withdrawals.filter(w => w.status === 'Pendente');
  const pendingTotal = pendingW.reduce((s, w) => s + (w.amount || 0), 0);
  const criticalShops = shops.filter(s => calcHealth(s) < 40);
  const inactiveShops = shops.filter(s => (s.recentAppointments || 0) === 0);
  const alertCount = criticalShops.length + inactiveShops.length;

  return (
    <div className="flex min-h-screen bg-[#080808]">

      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 border-r border-white/5 flex flex-col sticky top-0 h-screen overflow-y-auto" style={{ background: '#0a0a0a' }}>
        <div className="p-7 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <iconify-icon icon="solar:shield-bold-duotone" class="text-lg text-rose-500" />
            </div>
            <div>
              <p className="text-[11px] font-mono font-black text-rose-500 uppercase tracking-widest leading-none">UseBarber</p>
              <p className="text-[9px] font-mono text-brand-muted uppercase tracking-[0.15em] mt-0.5">Admin Suite</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSearch(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border ${
                tab === item.id
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'text-brand-muted hover:text-brand-main hover:bg-white/[0.03] border-transparent'
              }`}
            >
              <iconify-icon icon={item.icon} class="text-base shrink-0" />
              <span className="text-[11px] font-mono font-black uppercase tracking-wider flex-1">{item.label}</span>
              {item.id === 'alerts' && alertCount > 0 && (
                <span className="text-[9px] font-mono font-black bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
              {item.id === 'withdrawals' && pendingW.length > 0 && (
                <span className="text-[9px] font-mono font-black bg-amber-500 text-black rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {pendingW.length > 9 ? '9+' : pendingW.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-[10px] font-black shrink-0">SA</div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-brand-main font-black">Super Admin</p>
              <p className="text-[9px] font-mono text-brand-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border border-transparent text-brand-muted hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20"
          >
            <iconify-icon icon="solar:logout-2-bold-duotone" class="text-base shrink-0" />
            <span className="text-[11px] font-mono font-black uppercase tracking-wider">Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-10 overflow-y-auto min-h-screen space-y-8">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/5 mb-3">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold">Super Admin</span>
            </div>
            <h1 className="text-4xl font-display font-black text-brand-main uppercase tracking-tighter">
              {NAV.find(n => n.id === tab)?.label}<span className="text-rose-500">.</span>
            </h1>
          </div>
          {!['dashboard', 'plans', 'support'].includes(tab) && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="rounded-2xl px-5 py-3 text-sm font-mono text-brand-main outline-none w-64"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
            />
          )}
        </div>

        {/* ────────────── DASHBOARD ────────────── */}
        {tab === 'dashboard' && (
          <div className="space-y-8">

            {/* KPI row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Barbearias',    value: shops.length,  sub: `+${stats?.newSignups7d ?? 0} esta semana`,       icon: 'solar:shop-2-bold-duotone',                   color: 'text-brand-accent' },
                { label: 'MRR',           value: `R$ ${(stats?.mrr ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Receita este mês', icon: 'solar:dollar-minimalistic-bold-duotone', color: 'text-green-400' },
                { label: 'Agendamentos',  value: (stats?.totalAppointments ?? 0).toLocaleString('pt-BR'), sub: 'Total na plataforma', icon: 'solar:calendar-bold-duotone', color: 'text-purple-400' },
                { label: 'Ticket Médio',  value: `R$ ${(stats?.ticketMedio ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'Por agendamento', icon: 'solar:tag-price-bold-duotone', color: 'text-rose-400' },
              ].map((k, i) => (
                <div key={i} className="flashlight-card p-7 rounded-[2.5rem] relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <iconify-icon icon={k.icon} class={`text-xl ${k.color}`} />
                    </div>
                  </div>
                  <p className={`text-3xl font-display font-black tracking-tighter ${k.color}`}>{k.value}</p>
                  <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest mt-1.5">{k.label}</p>
                  <p className="text-[10px] font-mono text-brand-muted/50 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* KPI row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Novos (7d)',    value: stats?.newSignups7d ?? 0,   icon: 'solar:user-plus-bold-duotone',                        color: 'text-cyan-400' },
                { label: 'Novos (30d)',   value: stats?.newSignups30d ?? 0,  icon: 'solar:users-group-two-rounded-bold-duotone',           color: 'text-blue-400' },
                { label: 'Barbeiros',     value: stats?.totalBarbers ?? 0,   icon: 'solar:scissors-bold-duotone',                         color: 'text-orange-400' },
                { label: 'Clientes',      value: stats?.totalClients ?? 0,   icon: 'solar:user-id-bold-duotone',                          color: 'text-pink-400' },
              ].map((k, i) => (
                <div key={i} className="flashlight-card p-6 rounded-[2rem] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <iconify-icon icon={k.icon} class={`text-xl ${k.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-display font-black tracking-tighter ${k.color}`}>{Number(k.value).toLocaleString('pt-BR')}</p>
                    <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">{k.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Health + Top shops */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health score distribution */}
              <div className="flashlight-card p-8 rounded-[2.5rem] space-y-5">
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black">Score de Saúde</p>
                {[
                  { label: 'Saudável', count: healthCounts.saudavel, bar: 'bg-green-500/50', text: 'text-green-400' },
                  { label: 'Em Risco', count: healthCounts.risco,    bar: 'bg-amber-500/50', text: 'text-amber-400' },
                  { label: 'Crítico',  count: healthCounts.critico,  bar: 'bg-rose-500/50',  text: 'text-rose-400' },
                ].map(h => (
                  <div key={h.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className={`text-[10px] font-mono font-black uppercase ${h.text}`}>{h.label}</span>
                      <span className="text-[10px] font-mono text-brand-muted">{h.count} / {shops.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full ${h.bar} rounded-full`} style={{ width: `${shops.length > 0 ? (h.count / shops.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-[9px] font-mono text-brand-muted/50 pt-2 border-t border-white/5">
                  Baseado em atividade, barbeiros e receita
                </p>
              </div>

              {/* Top 5 shops */}
              <div className="flashlight-card p-8 rounded-[2.5rem] col-span-2">
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-6">Top Barbearias por Receita</p>
                <div className="space-y-4">
                  {[...shops].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-brand-muted w-4 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs font-display font-black text-brand-main uppercase truncate">{s.name || s.slug || 'Barbearia'}</span>
                          <span className="text-xs font-mono text-rose-400 shrink-0 ml-2">R$ {(s.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-rose-500/40 rounded-full" style={{ width: `${totalRevenue > 0 ? ((s.revenue || 0) / totalRevenue) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {shops.length === 0 && <p className="text-brand-muted text-sm font-mono text-center py-4">Nenhuma barbearia ainda.</p>}
                </div>
              </div>
            </div>

            {/* Alert previews */}
            {(criticalShops.length > 0 || pendingW.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {criticalShops.length > 0 && (
                  <div className="flashlight-card p-7 rounded-[2.5rem] border border-rose-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <iconify-icon icon="solar:danger-bold-duotone" class="text-xl text-rose-400" />
                      <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-black">Barbearias Críticas</p>
                    </div>
                    <p className="text-4xl font-display font-black text-rose-400 tracking-tighter">{criticalShops.length}</p>
                    <p className="text-[10px] font-mono text-brand-muted mt-1">precisam de atenção imediata</p>
                    <button onClick={() => setTab('alerts')} className="mt-4 text-[9px] font-mono text-rose-400 uppercase tracking-widest hover:underline">Ver alertas →</button>
                  </div>
                )}
                {pendingW.length > 0 && (
                  <div className="flashlight-card p-7 rounded-[2.5rem] border border-amber-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <iconify-icon icon="solar:transfer-horizontal-bold-duotone" class="text-xl text-amber-400" />
                      <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black">Saques Pendentes</p>
                    </div>
                    <p className="text-4xl font-display font-black text-amber-400 tracking-tighter">{pendingW.length}</p>
                    <p className="text-[10px] font-mono text-brand-muted mt-1">R$ {pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aguardando</p>
                    <button onClick={() => setTab('withdrawals')} className="mt-4 text-[9px] font-mono text-amber-400 uppercase tracking-widest hover:underline">Processar →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ────────────── BARBEARIAS ────────────── */}
        {tab === 'shops' && (
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-6 py-5 text-left">Saúde</th>
                    <th className="px-6 py-5 text-left">Barbearia</th>
                    <th className="px-6 py-5 text-left hidden lg:table-cell">Dono</th>
                    <th className="px-6 py-5 text-center hidden md:table-cell">Barbeiros</th>
                    <th className="px-6 py-5 text-center hidden md:table-cell">Apmt 30d</th>
                    <th className="px-6 py-5 text-right hidden lg:table-cell">Receita</th>
                    <th className="px-6 py-5 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {filtered(shops).map(s => {
                    const score = calcHealth(s);
                    const h = healthTag(score);
                    return (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-5">
                          <span className={`text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded-full border ${h.bg} ${h.color} ${h.border}`}>
                            {score}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-display font-black text-brand-main text-sm uppercase">{s.name || s.slug || 'Barbearia'}</p>
                          <p className="text-[9px] font-mono text-brand-muted">/{s.slug}</p>
                        </td>
                        <td className="px-6 py-5 hidden lg:table-cell text-xs font-mono text-brand-muted">{s.user?.email || s.email || '-'}</td>
                        <td className="px-6 py-5 text-center text-sm font-mono font-black text-brand-main hidden md:table-cell">{s.barbersCount || 0}</td>
                        <td className="px-6 py-5 text-center hidden md:table-cell">
                          <span className={`text-sm font-mono font-black ${(s.recentAppointments || 0) > 0 ? 'text-brand-success' : 'text-rose-400'}`}>
                            {s.recentAppointments || 0}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right hidden lg:table-cell text-sm font-mono font-black text-brand-success">
                          R$ {(s.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            onClick={() => setDetailShop(s)}
                            className="px-3 py-1.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest bg-white/5 text-brand-muted border border-white/10 hover:text-brand-main hover:border-white/20 transition-all"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered(shops).length === 0 && <div className="p-12 text-center text-brand-muted font-mono text-sm">Nenhuma barbearia encontrada.</div>}
            </div>
          </div>
        )}

        {/* ────────────── FINANCEIRO ────────────── */}
        {tab === 'finance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'MRR',              value: `R$ ${(stats?.mrr ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,          sub: 'Receita mensal recorrente',  color: 'text-green-400' },
                { label: 'Receita Total',    value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,                sub: 'Desde o início',           color: 'text-brand-accent' },
                { label: 'Média / Loja',     value: `R$ ${shops.length > 0 ? (totalRevenue / shops.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}`, sub: 'Ticket médio por barbearia', color: 'text-purple-400' },
                { label: 'Saques Pendentes', value: `R$ ${pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,               sub: `${pendingW.length} solicitações`, color: 'text-amber-400' },
              ].map((k, i) => (
                <div key={i} className="flashlight-card p-7 rounded-[2.5rem]">
                  <p className={`text-3xl font-display font-black tracking-tighter ${k.color}`}>{k.value}</p>
                  <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest mt-2">{k.label}</p>
                  <p className="text-[10px] font-mono text-brand-muted/50 mt-0.5">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="flashlight-card rounded-[3rem] overflow-hidden">
              <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black">Faturamento por Barbearia</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                      <th className="px-8 py-5 text-left">Barbearia</th>
                      <th className="px-8 py-5 text-center">Agendamentos</th>
                      <th className="px-8 py-5 text-right">Receita</th>
                      <th className="px-8 py-5 text-right hidden md:table-cell">% do Total</th>
                      <th className="px-8 py-5 text-center hidden lg:table-cell">Saúde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                    {filtered([...shops].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))).map(s => {
                      const score = calcHealth(s);
                      const h = healthTag(score);
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-display font-black text-brand-main text-sm uppercase">{s.name || s.slug || 'Barbearia'}</p>
                            <p className="text-[9px] font-mono text-brand-muted">{s.user?.email || s.email || '-'}</p>
                          </td>
                          <td className="px-8 py-5 text-center text-sm font-mono text-brand-main">{s.appointments || 0}</td>
                          <td className="px-8 py-5 text-right text-sm font-mono font-black text-brand-success">R$ {(s.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-8 py-5 text-right hidden md:table-cell text-sm font-mono text-rose-400">{totalRevenue > 0 ? (((s.revenue || 0) / totalRevenue) * 100).toFixed(1) : 0}%</td>
                          <td className="px-8 py-5 text-center hidden lg:table-cell">
                            <span className={`text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded-full border ${h.bg} ${h.color} ${h.border}`}>{score}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered(shops).length === 0 && <div className="p-12 text-center text-brand-muted font-mono text-sm">Nenhum dado.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ────────────── ANALYTICS ────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments total bar */}
              <div className="flashlight-card p-8 rounded-[2.5rem]">
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-6">Agendamentos Totais por Loja</p>
                <div className="space-y-3">
                  {[...shops].sort((a, b) => (b.appointments || 0) - (a.appointments || 0)).slice(0, 8).map(s => {
                    const max = Math.max(...shops.map(sh => sh.appointments || 0), 1);
                    const pct = ((s.appointments || 0) / max) * 100;
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-[9px] font-mono text-brand-muted w-20 truncate shrink-0">{s.name || s.slug}</span>
                        <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden flex items-center">
                          <div
                            className="h-full bg-brand-accent/35 rounded-lg flex items-center pl-2 transition-all"
                            style={{ width: `${pct}%`, minWidth: pct > 0 ? '1.5rem' : '0' }}
                          >
                            {(s.appointments || 0) > 0 && <span className="text-[9px] font-mono font-black text-brand-accent">{s.appointments}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {shops.length === 0 && <p className="text-brand-muted text-sm font-mono text-center py-4">Sem dados.</p>}
                </div>
              </div>

              {/* Recent activity bar (30d) */}
              <div className="flashlight-card p-8 rounded-[2.5rem]">
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-6">Atividade Recente — 30 dias</p>
                <div className="space-y-3">
                  {[...shops].sort((a, b) => (b.recentAppointments || 0) - (a.recentAppointments || 0)).slice(0, 8).map(s => {
                    const max = Math.max(...shops.map(sh => sh.recentAppointments || 0), 1);
                    const pct = ((s.recentAppointments || 0) / max) * 100;
                    const score = calcHealth(s);
                    const barColor = score >= 70 ? 'rgba(34,197,94,0.3)' : score >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)';
                    const textColor = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400';
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-[9px] font-mono text-brand-muted w-20 truncate shrink-0">{s.name || s.slug}</span>
                        <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden flex items-center">
                          <div
                            className="h-full rounded-lg flex items-center pl-2 transition-all"
                            style={{ width: `${pct}%`, minWidth: pct > 0 ? '1.5rem' : '0', background: barColor }}
                          >
                            {(s.recentAppointments || 0) > 0 && <span className={`text-[9px] font-mono font-black ${textColor}`}>{s.recentAppointments}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {shops.length === 0 && <p className="text-brand-muted text-sm font-mono text-center py-4">Sem dados.</p>}
                </div>
              </div>
            </div>

            {/* Barbers table */}
            <div className="flashlight-card rounded-[3rem] overflow-hidden">
              <div className="px-8 py-6 border-b" style={{ borderColor: 'var(--card-border)' }}>
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black">Barbeiros Cadastrados — {barbers.length} total</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                      <th className="px-8 py-5 text-left">Barbeiro</th>
                      <th className="px-8 py-5 text-left hidden md:table-cell">Barbearia</th>
                      <th className="px-8 py-5 text-center">Comissão</th>
                      <th className="px-8 py-5 text-center">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                    {filtered(barbers).slice(0, 30).map(b => (
                      <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-black text-sm shrink-0">{b.name?.charAt(0) || 'B'}</div>
                            <span className="font-display font-black text-brand-main text-sm uppercase">{b.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 hidden md:table-cell text-xs font-mono text-brand-muted">{b.user?.email || '-'}</td>
                        <td className="px-8 py-5 text-center text-sm font-mono font-black text-brand-accent">
                          {b.commissionType === 'percentage' ? `${b.commission}%` : `R$ ${b.commission}`}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded-full bg-white/5 text-brand-muted border border-white/10">
                            {b.commissionType === 'percentage' ? 'Percentual' : 'Fixo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered(barbers).length === 0 && <div className="p-12 text-center text-brand-muted font-mono text-sm">Nenhum barbeiro.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ────────────── PLANOS ────────────── */}
        {tab === 'plans' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Starter', price: 'Grátis', accent: 'text-brand-muted', border: 'border-white/10',
                  features: ['1 Barbeiro', 'Agendamentos ilimitados', 'Link de agendamento', 'Gestão básica de clientes'],
                  active: shops.length, highlight: false,
                },
                {
                  name: 'Pro', price: 'R$ 97/mês', accent: 'text-brand-accent', border: 'border-brand-accent/30',
                  features: ['Barbeiros ilimitados', 'Pagamentos PIX integrado', 'Carteira digital', 'Analytics avançado', 'Notificações push'],
                  active: 0, highlight: true,
                },
                {
                  name: 'Enterprise', price: 'Sob consulta', accent: 'text-rose-400', border: 'border-rose-500/30',
                  features: ['Tudo do Pro', 'SLA dedicado 99.9%', 'Onboarding personalizado', 'API access completo', 'White-label'],
                  active: 0, highlight: false,
                },
              ].map(plan => (
                <div key={plan.name} className={`flashlight-card p-8 rounded-[2.5rem] border ${plan.border} ${plan.highlight ? 'shadow-[0_0_40px_rgba(0,112,255,0.08)]' : ''}`}>
                  {plan.highlight && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 mb-4">
                      <span className="text-[9px] font-mono font-black text-brand-accent uppercase tracking-widest">Recomendado</span>
                    </div>
                  )}
                  <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest mb-1">{plan.name}</p>
                  <p className={`text-3xl font-display font-black tracking-tighter ${plan.accent} mb-6`}>{plan.price}</p>
                  <div className="space-y-2.5 mb-6">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-center gap-2">
                        <iconify-icon icon="solar:check-circle-bold-duotone" class={`text-sm ${plan.accent}`} />
                        <span className="text-xs font-mono text-brand-muted">{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[9px] font-mono text-brand-muted">{plan.active} ativa{plan.active !== 1 ? 's' : ''}</p>
                    <span className={`text-[9px] font-mono font-black uppercase px-2 py-1 rounded-full border ${plan.border} ${plan.accent}`}>
                      {plan.active > 0 ? `${plan.active}` : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flashlight-card p-8 rounded-[2.5rem] border border-amber-500/20">
              <div className="flex items-start gap-4">
                <iconify-icon icon="solar:info-circle-bold-duotone" class="text-2xl text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-black text-brand-main uppercase mb-2">Módulo de Assinaturas em Desenvolvimento</p>
                  <p className="text-xs font-mono text-brand-muted leading-relaxed">
                    Cobrança recorrente automática, gestão de trials, downgrade/upgrade de plano e notificações de inadimplência estão sendo desenvolvidos. Atualmente todos os usuários têm acesso completo.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: 'Estratégia de Limitação', desc: 'Limite barbeiros no Starter para forçar upgrade ao Pro quando a barbearia cresce.', icon: 'solar:lock-bold-duotone', color: 'text-brand-accent' },
                { label: 'Trial Inteligente', desc: '14 dias de Pro grátis no cadastro. Converte melhor que freemium puro.', icon: 'solar:clock-circle-bold-duotone', color: 'text-purple-400' },
                { label: 'Score de Retenção', desc: 'Barbearias com score < 40 recebem alerta de cancelamento — agir antes do churn.', icon: 'solar:heart-pulse-bold-duotone', color: 'text-rose-400' },
              ].map(tip => (
                <div key={tip.label} className="flashlight-card p-7 rounded-[2.5rem]">
                  <iconify-icon icon={tip.icon} class={`text-2xl ${tip.color} mb-4`} />
                  <p className={`text-sm font-display font-black uppercase ${tip.color} mb-2`}>{tip.label}</p>
                  <p className="text-xs font-mono text-brand-muted leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────────────── ALERTAS ────────────── */}
        {tab === 'alerts' && (
          <div className="space-y-6">
            {/* Critical */}
            <div className="flashlight-card rounded-[3rem] overflow-hidden">
              <div className="px-8 py-6 border-b flex items-center gap-3" style={{ borderColor: 'var(--card-border)' }}>
                <iconify-icon icon="solar:danger-bold-duotone" class="text-xl text-rose-400" />
                <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-black">Score Crítico — Risco de Churn ({criticalShops.length})</p>
              </div>
              {criticalShops.length === 0 ? (
                <div className="p-12 text-center">
                  <iconify-icon icon="solar:check-circle-bold-duotone" class="text-5xl text-brand-success/30 mb-4" />
                  <p className="text-brand-muted font-mono text-sm">Nenhuma barbearia em estado crítico.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                        <th className="px-8 py-5 text-left">Barbearia</th>
                        <th className="px-8 py-5 text-center">Score</th>
                        <th className="px-8 py-5 text-center">Apmt 30d</th>
                        <th className="px-8 py-5 text-center">Barbeiros</th>
                        <th className="px-8 py-5 text-right">Receita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                      {criticalShops.map(s => (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-display font-black text-brand-main text-sm uppercase">{s.name || s.slug}</p>
                            <p className="text-[9px] font-mono text-brand-muted">{s.user?.email || s.email}</p>
                          </td>
                          <td className="px-8 py-5 text-center text-sm font-mono font-black text-rose-400">{calcHealth(s)}</td>
                          <td className="px-8 py-5 text-center text-sm font-mono text-rose-400">{s.recentAppointments || 0}</td>
                          <td className="px-8 py-5 text-center text-sm font-mono text-brand-muted">{s.barbersCount || 0}</td>
                          <td className="px-8 py-5 text-right text-sm font-mono text-brand-muted">R$ {(s.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Inactive */}
            <div className="flashlight-card rounded-[3rem] overflow-hidden">
              <div className="px-8 py-6 border-b flex items-center gap-3" style={{ borderColor: 'var(--card-border)' }}>
                <iconify-icon icon="solar:sleeping-bold-duotone" class="text-xl text-amber-400" />
                <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black">Sem Atividade em 30 dias ({inactiveShops.length})</p>
              </div>
              {inactiveShops.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-brand-muted font-mono text-sm">Todas as barbearias têm atividade recente.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {inactiveShops.map(s => (
                    <div key={s.id} className="px-8 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div>
                        <p className="font-display font-black text-brand-main text-sm uppercase">{s.name || s.slug}</p>
                        <p className="text-[9px] font-mono text-brand-muted">{s.user?.email || s.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-amber-400">{s.appointments || 0} total</p>
                        <p className="text-[9px] font-mono text-brand-muted">0 no período</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending withdrawals */}
            {pendingW.length > 0 && (
              <div className="flashlight-card rounded-[3rem] overflow-hidden border border-amber-500/20">
                <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-3">
                    <iconify-icon icon="solar:transfer-horizontal-bold-duotone" class="text-xl text-amber-400" />
                    <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black">Saques Aguardando ({pendingW.length})</p>
                  </div>
                  <button onClick={() => setTab('withdrawals')} className="text-[9px] font-mono text-amber-400 uppercase tracking-widest hover:underline">Processar →</button>
                </div>
                <div className="px-8 py-7">
                  <p className="text-4xl font-display font-black text-amber-400 tracking-tighter">R$ {pendingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-[10px] font-mono text-brand-muted mt-1">valor total aguardando processamento</p>
                </div>
              </div>
            )}

            {alertCount === 0 && pendingW.length === 0 && (
              <div className="flashlight-card p-16 rounded-[3rem] text-center">
                <iconify-icon icon="solar:check-circle-bold-duotone" class="text-7xl text-brand-success/30 mb-6" />
                <p className="text-2xl font-display font-black text-brand-main uppercase mb-2">Tudo em ordem.</p>
                <p className="text-brand-muted font-mono text-sm">Nenhum alerta ativo no momento.</p>
              </div>
            )}
          </div>
        )}

        {/* ────────────── SAQUES ────────────── */}
        {tab === 'withdrawals' && (
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-5 text-left">Usuário</th>
                    <th className="px-8 py-5 text-left hidden md:table-cell">Chave PIX</th>
                    <th className="px-8 py-5 text-left hidden md:table-cell">Data</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Valor</th>
                    <th className="px-8 py-5 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {filtered(withdrawals).map(w => (
                    <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-display font-black text-brand-main text-sm uppercase">{w.wallet?.user?.name || '-'}</p>
                        <p className="text-[9px] font-mono text-brand-muted">{w.wallet?.user?.email || '-'}</p>
                      </td>
                      <td className="px-8 py-5 hidden md:table-cell text-xs font-mono text-brand-accent">{w.pixKey || '-'}</td>
                      <td className="px-8 py-5 hidden md:table-cell text-xs font-mono text-brand-muted">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-[9px] font-mono font-black uppercase px-3 py-1 rounded-full border ${
                          w.status === 'Aprovado'  ? 'bg-brand-success/10 text-brand-success border-brand-success/20' :
                          w.status === 'Rejeitado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>{w.status}</span>
                      </td>
                      <td className="px-8 py-5 text-right text-sm font-mono font-black text-rose-400">
                        <p>R$ {(w.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        {w.notes && <p className="text-[9px] font-mono text-brand-muted mt-1">{w.notes}</p>}
                      </td>
                      <td className="px-8 py-5 text-center">
                        {w.status === 'Pendente' ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleWithdrawal(w.id, 'approve')}
                              disabled={processing === w.id}
                              className="px-3 py-1.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest bg-brand-success/10 text-brand-success border border-brand-success/20 hover:bg-brand-success/20 transition-all disabled:opacity-50"
                            >
                              {processing === w.id ? '...' : 'Aprovar'}
                            </button>
                            <button
                              onClick={() => handleWithdrawal(w.id, 'reject')}
                              disabled={processing === w.id}
                              className="px-3 py-1.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50"
                            >
                              Rejeitar
                            </button>
                          </div>
                        ) : <span className="text-[9px] font-mono text-brand-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered(withdrawals).length === 0 && <div className="p-12 text-center text-brand-muted font-mono text-sm">Nenhum saque encontrado.</div>}
            </div>
          </div>
        )}

        {/* ────────────── SUPORTE ────────────── */}
        {tab === 'support' && (
          <div className="space-y-6">
            <div className="flashlight-card p-7 rounded-[2.5rem] border border-blue-500/20">
              <div className="flex items-start gap-4">
                <iconify-icon icon="solar:info-circle-bold-duotone" class="text-xl text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-black text-brand-main uppercase mb-1">Painel de Suporte</p>
                  <p className="text-xs font-mono text-brand-muted">Visualize contas de clientes para diagnóstico e suporte. Use com responsabilidade.</p>
                </div>
              </div>
            </div>
            <div className="flashlight-card rounded-[3rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                      <th className="px-8 py-5 text-left">Barbearia</th>
                      <th className="px-8 py-5 text-left hidden md:table-cell">Email</th>
                      <th className="px-8 py-5 text-center hidden lg:table-cell">Cadastro</th>
                      <th className="px-8 py-5 text-center">Score</th>
                      <th className="px-8 py-5 text-center">Conta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                    {shops.map(s => {
                      const score = calcHealth(s);
                      const h = healthTag(score);
                      return (
                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-display font-black text-brand-main text-sm uppercase">{s.name || s.slug}</p>
                            <p className="text-[9px] font-mono text-brand-muted">/{s.slug}</p>
                          </td>
                          <td className="px-8 py-5 hidden md:table-cell text-xs font-mono text-brand-muted">{s.user?.email || s.email || '-'}</td>
                          <td className="px-8 py-5 text-center hidden lg:table-cell text-xs font-mono text-brand-muted">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded-full border ${h.bg} ${h.color} ${h.border}`}>{score}/100</span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <button
                              onClick={() => setDetailShop(s)}
                              className="px-3 py-1.5 rounded-xl text-[9px] font-mono font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                            >
                              Ver Conta
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {shops.length === 0 && <div className="p-12 text-center text-brand-muted font-mono text-sm">Nenhuma barbearia.</div>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Detail Modal ── */}
      {detailShop && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setDetailShop(null)}
        >
          <div
            className="flashlight-card w-full max-w-lg rounded-[3rem] overflow-hidden"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-10 pt-10 pb-6 flex justify-between items-start border-b" style={{ borderColor: 'var(--card-border)' }}>
              <div>
                <span className="text-[10px] font-mono font-black text-rose-500 uppercase tracking-widest mb-2 block">Detalhes da Conta</span>
                <h2 className="text-2xl font-display font-black text-brand-main uppercase">{detailShop.name || detailShop.slug}<span className="text-rose-500">.</span></h2>
                <p className="text-[10px] font-mono text-brand-muted mt-1">{detailShop.user?.email || detailShop.email}</p>
              </div>
              <button
                onClick={() => setDetailShop(null)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all hover:rotate-90"
                style={{ background: 'var(--input-bg)' }}
              >✕</button>
            </div>
            <div className="px-10 py-8 grid grid-cols-2 gap-3">
              {[
                { label: 'Slug',          value: `/${detailShop.slug}` },
                { label: 'User ID',       value: (detailShop.userId || detailShop.user_id || '-').slice(0, 12) + '…' },
                { label: 'Barbeiros',     value: detailShop.barbersCount || 0 },
                { label: 'Clientes',      value: detailShop.clients || 0 },
                { label: 'Agendamentos',  value: detailShop.appointments || 0 },
                { label: 'Últimos 30d',   value: detailShop.recentAppointments || 0 },
                { label: 'Receita Total', value: `R$ ${(detailShop.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                { label: 'Score de Saúde',value: `${calcHealth(detailShop)}/100` },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-2xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">{item.label}</p>
                  <p className="text-sm font-mono font-black text-brand-main mt-1 truncate">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="px-10 pb-8">
              <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                <p className="text-[9px] font-mono text-amber-400 uppercase tracking-widest mb-1">Link de Agendamento</p>
                <p className="text-xs font-mono text-brand-main">/book/{detailShop.slug}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
