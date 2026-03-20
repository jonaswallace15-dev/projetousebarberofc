'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Bell } from 'lucide-react';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
