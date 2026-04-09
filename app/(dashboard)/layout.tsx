'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Bell, Sun, Moon } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';

interface InnerProps {
  children: React.ReactNode;
  user: { id: string; email?: string | null };
  userRole: string;
  signOut: () => Promise<void>;
}

function DashboardInner({ children, user, userRole, signOut }: InnerProps) {
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: 'var(--brand-deep)', color: 'var(--text-main)' }}>
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />

      <main className="flex-1 min-h-screen transition-all duration-500 lg:ml-64">
        {/* Top Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-10 h-20"
          style={{ background: 'var(--header-bg)', borderBottom: '1px solid var(--card-border)', backdropFilter: 'blur(20px)' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-main transition-all"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-3">
            <button className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <Bell size={18} />
            </button>
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="relative flex-shrink-0 transition-all duration-500"
              style={{ width: '52px', height: '28px' }}
            >
              {/* Track */}
              <span
                className="absolute inset-0 rounded-full transition-all duration-500"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, #1e293b, #0f172a)'
                    : 'linear-gradient(135deg, #3b82f6, #0066FF)',
                  border: theme === 'dark'
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,102,255,0.4)',
                  boxShadow: theme === 'light'
                    ? '0 0 16px rgba(0,102,255,0.35), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : 'inset 0 2px 4px rgba(0,0,0,0.4)',
                }}
              />
              {/* Stars (dark mode) */}
              {theme === 'dark' && (
                <>
                  <span className="absolute rounded-full bg-white/30" style={{ width: 2, height: 2, top: 7, left: 10 }} />
                  <span className="absolute rounded-full bg-white/20" style={{ width: 1.5, height: 1.5, top: 14, left: 15 }} />
                  <span className="absolute rounded-full bg-white/25" style={{ width: 2, height: 2, top: 10, left: 20 }} />
                </>
              )}
              {/* Thumb */}
              <span
                className="absolute top-0.5 flex items-center justify-center rounded-full transition-all duration-500"
                style={{
                  width: '23px',
                  height: '23px',
                  left: theme === 'dark' ? '2px' : 'calc(100% - 25px)',
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, #e2e8f0, #cbd5e1)'
                    : 'linear-gradient(135deg, #fff, #f0f6ff)',
                  boxShadow: theme === 'dark'
                    ? '0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                    : '0 2px 8px rgba(0,102,255,0.4), 0 0 0 1px rgba(255,255,255,0.8)',
                }}
              >
                {theme === 'dark'
                  ? <Moon size={11} style={{ color: '#475569' }} />
                  : <Sun size={12} style={{ color: '#0066FF' }} />}
              </span>
            </button>
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <div className="w-8 h-8 rounded-lg bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center text-brand-accent font-display font-black text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-display font-black text-brand-main uppercase tracking-tight leading-none">{userRole}</p>
                <p className="text-[9px] font-mono text-brand-muted tracking-widest truncate max-w-[140px]">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-rose-500 transition-all"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-10">
          {children}
        </div>
      </main>
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
