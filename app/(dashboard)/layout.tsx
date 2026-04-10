'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, LogOut, Bell, Sun, Moon, LayoutDashboard, CalendarDays, DollarSign, Scissors } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';

interface InnerProps {
  children: React.ReactNode;
  user: { id: string; email?: string | null };
  userRole: string;
  signOut: () => Promise<void>;
}

function DashboardInner({ children, user, userRole, signOut }: InnerProps) {
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const bottomNav = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Início' },
    { href: '/appointments', icon: CalendarDays, label: 'Agenda' },
    { href: '/finance', icon: DollarSign, label: 'Financeiro' },
  ];

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: 'var(--brand-deep)', color: 'var(--text-main)' }}>
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} hideBottomNavItems collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />

      <main className={`flex-1 min-h-screen transition-all duration-500 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
        {/* Top Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-10 h-20"
          style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--card-border)', backdropFilter: 'blur(20px)' }}
        >
          {/* Mobile: logo */}
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/30">
              <Scissors size={16} className="text-white" />
            </div>
            <span className="font-display font-black text-brand-main text-lg tracking-tight">Usebarber</span>
          </div>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <Bell size={18} />
            </button>
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="relative flex-shrink-0"
              style={{ width: '56px', height: '30px' }}
            >
              <span
                className="absolute inset-0 rounded-full transition-colors duration-300"
                style={{ background: theme === 'light' ? '#E5E5EA' : '#1C1C1E' }}
              />
              <span
                className="absolute rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  width: '26px', height: '26px', top: '2px',
                  left: theme === 'light' ? '2px' : 'calc(100% - 28px)',
                  background: theme === 'light' ? '#fff' : '#2C2C2E',
                  boxShadow: theme === 'light'
                    ? '0 2px 8px rgba(0,0,0,0.18), 0 0.5px 2px rgba(0,0,0,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.5), 0 0.5px 2px rgba(0,0,0,0.3)',
                }}
              >
                {theme === 'light'
                  ? <Sun size={13} style={{ color: '#FF9F0A' }} />
                  : <Moon size={12} style={{ color: '#E5E5EA' }} />}
              </span>
            </button>
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-display font-black text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-display font-black text-brand-main uppercase tracking-tight leading-none">{userRole}</p>
                <p className="text-[9px] font-mono text-brand-muted tracking-widest truncate max-w-[140px]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="hidden lg:flex w-10 h-10 items-center justify-center rounded-xl text-brand-muted hover:text-rose-500 transition-all"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-10 pb-28 lg:pb-10">
          {children}
        </div>
      </main>

      {/* Bottom Nav — Mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 h-20"
        style={{
          background: 'var(--header-bg)',
          borderTop: '1px solid var(--card-border)',
          backdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {bottomNav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
              style={{ color: active ? 'var(--brand-accent)' : 'var(--text-muted)' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest">{label}</span>
            </Link>
          );
        })}

        {/* More (opens sidebar) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu size={22} strokeWidth={1.8} />
          <span className="text-[10px] font-mono font-black uppercase tracking-widest">Mais</span>
        </button>
      </nav>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--brand-deep)' }}>
        <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-6xl text-brand-accent animate-pulse" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <ThemeProvider userId={user.id}>
      <DashboardInner user={user} userRole={userRole} signOut={signOut}>
        {children}
      </DashboardInner>
    </ThemeProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
