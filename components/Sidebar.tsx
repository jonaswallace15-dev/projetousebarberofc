'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MENU_ITEMS, ADMIN_MENU_ITEMS } from '@/constants';

// IDs que já aparecem no bottom nav do mobile
const BOTTOM_NAV_IDS = ['dashboard', 'appointments', 'finance'];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  hideBottomNavItems?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userRole, hideBottomNavItems, collapsed, onToggleCollapse }) => {
  const pathname = usePathname();
  const menuList = userRole === 'Super Admin' ? ADMIN_MENU_ITEMS : MENU_ITEMS;

  const filteredMenuItems = menuList.filter(item => {
    if (userRole === 'Barbeiro') {
      return ['dashboard', 'appointments', 'finance'].includes(item.id);
    }
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    if (href === '/admin') return pathname.startsWith('/admin');
    return pathname === href || pathname.startsWith(href + '?');
  };

  return (
    <aside
      className={`fixed inset-y-0 right-0 lg:right-auto lg:left-0 z-50 transition-all duration-500 lg:translate-x-0 ${collapsed ? 'lg:w-[72px]' : 'w-64'} ${isOpen ? 'w-64 translate-x-0' : 'translate-x-full lg:-translate-x-full lg:translate-x-0'}`}
      style={{
        background: 'var(--sidebar-bg)',
        borderLeft: '1px solid var(--card-border)',
        borderRight: '1px solid var(--card-border)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex flex-col h-full relative">
        {/* Botão recolher — só desktop */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-[72px] z-10 w-6 h-6 rounded-full items-center justify-center transition-all hover:scale-110"
          style={{ background: 'var(--brand-accent)', color: '#fff', boxShadow: '0 0 12px rgba(0,112,255,0.5)' }}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* LOGO */}
        <div className={`p-4 flex items-center gap-3 group cursor-pointer overflow-hidden ${collapsed ? 'lg:justify-center lg:px-0' : ''}`} style={{ minHeight: '72px' }}>
          <div className="w-10 h-10 flex-shrink-0 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,255,0.4)] group-hover:rotate-12 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M6 3h12M6 8h12M6 13l5.5 5.5M6 13l-4 6h14l-4-6"/>
            </svg>
          </div>
          <div className={`flex flex-col transition-all duration-300 overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="font-display font-black text-xl tracking-tighter text-brand-main uppercase leading-none whitespace-nowrap">
              USE<span className="text-brand-accent">BARBER</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-muted">Pro Suite</span>
          </div>
        </div>

        <nav className={`flex-1 py-4 space-y-1 overflow-hidden ${collapsed ? 'lg:px-2' : 'px-4'}`}>
          {filteredMenuItems.map((item) => {
            const active = isActive(item.href);
            const hiddenOnMobile = hideBottomNavItems && BOTTOM_NAV_IDS.includes(item.id);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                className={`w-full items-center gap-3 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
                  ${collapsed ? 'lg:justify-center lg:px-0' : 'px-4'}
                  ${hiddenOnMobile ? 'hidden lg:flex' : 'flex'}
                  ${active
                    ? 'bg-brand-accent/10 border border-brand-accent/20 text-brand-main'
                    : 'text-brand-muted hover:text-brand-main hover:bg-brand-accent/5 border border-transparent'}`}
              >
                {active && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-accent rounded-full shadow-[0_0_15px_#0070FF]" />
                )}
                <span className={`text-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${active ? 'text-brand-accent' : 'opacity-40 group-hover:opacity-100'}`}>
                  {item.icon}
                </span>
                <span className={`font-display tracking-wide text-sm font-bold uppercase transition-all duration-300 whitespace-nowrap overflow-hidden
                  ${collapsed ? 'lg:hidden' : ''}
                  ${active ? 'translate-x-1' : 'group-hover:translate-x-1 opacity-60 group-hover:opacity-100'}`}>
                  {item.label}
                </span>
                {active && !collapsed && (
                  <span className="ml-auto text-brand-accent text-xs animate-pulse">›</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM - PREMIUM PLAN */}
        <div className={`mt-auto transition-all duration-300 ${collapsed ? 'lg:p-2' : 'p-6'}`}>
          {collapsed ? (
            <div className="hidden lg:flex justify-center py-3">
              <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent text-xs font-black" title="Elite Member">
                ★
              </div>
            </div>
          ) : (
            <div className="flashlight-card p-6 rounded-3xl relative group overflow-hidden" style={{ border: '1px solid var(--card-border)', background: 'var(--nav-item-hover)' }}>
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-accent/10 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-all duration-500" />
              <p className="text-[9px] font-mono text-brand-accent uppercase tracking-widest font-bold mb-2">Master Tier</p>
              <p className="text-sm font-display font-black text-brand-main uppercase tracking-tight">Assinatura Ativa</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-brand-muted uppercase">
                  <span>Sincronização</span>
                  <span>100%</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
                  <div className="h-full bg-brand-accent w-full shadow-[0_0_10px_#0070FF]" />
                </div>
              </div>
              <button className="mt-5 w-full btn-beam py-2 px-1 rounded-xl group/btn">
                <div className="btn-beam-content py-2 px-4 rounded-[calc(0.75rem-1px)] text-[10px] font-display font-black uppercase text-brand-accent group-hover/btn:text-white transition-colors flex items-center justify-center gap-2">
                  ★ Elite Member
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
