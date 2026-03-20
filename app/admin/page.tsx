'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface ShopStats {
  id: string;
  name: string;
  slug: string;
  email: string;
  clients: number;
  appointments: number;
  revenue: number;
  createdAt: string;
}

export default function AdminPage() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const [shops, setShops] = useState<ShopStats[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shops');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && userRole !== 'Super Admin') {
      router.push('/dashboard');
      return;
    }
    if (userRole === 'Super Admin') {
      fetch('/api/admin/shops').then(r => r.json())
        .then(data => setShops(Array.isArray(data) ? data : []))
        .catch(() => setShops([]))
        .finally(() => setDataLoading(false));
    }
  }, [userRole, loading, router]);

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (userRole !== 'Super Admin') return null;

  const filteredShops = shops.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = shops.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalClients = shops.reduce((sum, s) => sum + (s.clients || 0), 0);
  const totalAppointments = shops.reduce((sum, s) => sum + (s.appointments || 0), 0);

  return (
    <div className="space-y-10 pb-20">
      <header>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/5 mb-4">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-500 font-bold">Super Admin Panel</span>
        </div>
        <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
          Admin<span className="text-rose-500">.</span>
        </h1>
        <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
          Controle global de todas as barbearias na plataforma.
        </p>
      </header>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Barbearias', value: shops.length, icon: 'solar:shop-2-bold-duotone', color: 'text-brand-accent' },
          { label: 'Total Clientes', value: totalClients, icon: 'solar:users-group-two-rounded-bold-duotone', color: 'text-brand-success' },
          { label: 'Agendamentos', value: totalAppointments, icon: 'solar:calendar-bold-duotone', color: 'text-brand-accent' },
          { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: 'solar:wallet-money-bold-duotone', color: 'text-brand-success' },
        ].map((stat, i) => (
          <div key={i} className="flashlight-card p-6 sm:p-8 rounded-[2.5rem] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.color} shrink-0`} style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <iconify-icon icon={stat.icon} class="text-2xl" />
            </div>
            <div>
              <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest font-black">{stat.label}</p>
              <p className={`text-2xl font-display font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="p-1.5 rounded-2xl flex w-fit backdrop-blur-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
        {[
          { id: 'shops', label: 'Barbearias', icon: 'solar:shop-2-bold-duotone' },
          { id: 'users', label: 'Usuários', icon: 'solar:users-group-two-rounded-bold-duotone' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-[11px] font-mono uppercase tracking-[0.2em] font-bold rounded-xl transition-all ${activeTab === tab.id ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'text-brand-muted hover:text-white'}`}
          >
            <iconify-icon icon={tab.icon} class="text-base" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <iconify-icon icon="solar:magnifer-bold-duotone" class="absolute left-5 top-1/2 -translate-y-1/2 text-brand-muted text-xl" />
        <input
          type="text"
          placeholder="Buscar barbearia ou email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-2xl pl-14 pr-6 py-4 text-brand-main font-medium outline-none transition-all"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
        />
      </div>

      {/* Shops table */}
      {activeTab === 'shops' && (
        <div className="flashlight-card rounded-[3rem] overflow-hidden">
          {filteredShops.length === 0 ? (
            <div className="p-16 text-center">
              <iconify-icon icon="solar:shop-2-bold-duotone" class="text-7xl text-brand-muted/20 mb-6" />
              <p className="text-brand-muted text-sm font-mono uppercase tracking-widest">
                {searchTerm ? 'Nenhuma barbearia encontrada.' : 'Nenhuma barbearia cadastrada ainda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-6 text-left">Barbearia</th>
                    <th className="px-8 py-6 text-left hidden md:table-cell">Email</th>
                    <th className="px-8 py-6 text-center hidden lg:table-cell">Clientes</th>
                    <th className="px-8 py-6 text-center hidden lg:table-cell">Agendamentos</th>
                    <th className="px-8 py-6 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {filteredShops.map((shop, i) => (
                    <tr key={shop.id || i} className="hover:bg-brand-accent/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-display font-black text-sm">
                            {shop.name?.charAt(0).toUpperCase() || 'B'}
                          </div>
                          <div>
                            <p className="font-display font-black text-brand-main uppercase text-sm tracking-tight group-hover:text-brand-accent transition-colors">{shop.name || 'Barbearia'}</p>
                            {shop.slug && <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest mt-0.5">/{shop.slug}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 hidden md:table-cell">
                        <span className="text-xs font-mono text-brand-muted">{shop.email || '-'}</span>
                      </td>
                      <td className="px-8 py-6 text-center hidden lg:table-cell">
                        <span className="text-sm font-mono font-black text-brand-main">{shop.clients || 0}</span>
                      </td>
                      <td className="px-8 py-6 text-center hidden lg:table-cell">
                        <span className="text-sm font-mono font-black text-brand-main">{shop.appointments || 0}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-sm font-mono font-black text-brand-success">
                          R$ {(shop.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="flashlight-card p-16 rounded-[3rem] text-center">
          <iconify-icon icon="solar:users-group-two-rounded-bold-duotone" class="text-7xl text-brand-muted/20 mb-6" />
          <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-4">Gestão de Usuários</h3>
          <p className="text-brand-muted text-sm leading-relaxed">Módulo de gestão de usuários em desenvolvimento.</p>
        </div>
      )}
    </div>
  );
}
