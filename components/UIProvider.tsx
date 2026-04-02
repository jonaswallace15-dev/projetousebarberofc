'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface UIContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UIContext = createContext<UIContextValue | null>(null);

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}

// ─── Toast icons & colours ───────────────────────────────────────────────────

const toastConfig: Record<ToastType, { icon: React.ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircle2 size={18} />, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  error:   { icon: <XCircle size={18} />,      color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  warning: { icon: <AlertTriangle size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  info:    { icon: <Info size={18} />,          color: '#0066FF', bg: 'rgba(0,102,255,0.12)' },
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = String(++idRef.current);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const resolveConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast Stack ──────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        style={{ maxWidth: 380 }}
      >
        {toasts.map(t => {
          const cfg = toastConfig[t.type];
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl pointer-events-auto"
              style={{
                background: 'rgba(13,13,13,0.95)',
                border: `1px solid ${cfg.color}33`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}22`,
                animation: 'slideInUp 0.25s ease',
              }}
            >
              <span style={{ color: cfg.color, marginTop: 1, flexShrink: 0 }}>{cfg.icon}</span>
              <p className="text-sm font-medium leading-snug" style={{ color: '#E5E5E5' }}>{t.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                className="ml-auto flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity"
                style={{ color: '#E5E5E5', marginTop: 1 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Confirm Dialog ───────────────────────────────────────────────── */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) resolveConfirm(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background: '#0D0D0D',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              animation: 'scaleIn 0.2s ease',
            }}
          >
            {confirmState.danger && (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <AlertTriangle size={22} color="#ef4444" />
              </div>
            )}
            {!confirmState.danger && (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.25)' }}>
                <Info size={22} color="#0066FF" />
              </div>
            )}
            {confirmState.title && (
              <h3 className="text-lg font-display font-black text-brand-main uppercase tracking-tight leading-none">
                {confirmState.title}
              </h3>
            )}
            <p className="text-sm leading-relaxed" style={{ color: '#A3A3A3' }}>{confirmState.message}</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => resolveConfirm(false)}
                className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#E5E5E5' }}
              >
                {confirmState.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{
                  background: confirmState.danger ? 'rgba(239,68,68,0.15)' : '#0066FF',
                  border: confirmState.danger ? '1px solid rgba(239,68,68,0.3)' : 'none',
                  color: confirmState.danger ? '#ef4444' : '#fff',
                }}
              >
                {confirmState.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.93); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </UIContext.Provider>
  );
}
