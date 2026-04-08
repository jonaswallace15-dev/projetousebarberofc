'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Scissors, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<{ barberName: string; barberId: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/invite?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else { setInvite({ barberName: data.barberName, barberId: data.barberId }); }
      })
      .catch(() => setError('Erro ao validar convite.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('E-mail obrigatório.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    if (password.length < 6) { setError('Senha deve ter mínimo 6 caracteres.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || 'Erro ao criar conta.'); return; }

      setSuccess(true);

      // Loga automaticamente
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      router.push('/dashboard');
    } catch {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--brand-deep)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-10">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
            <Scissors size={20} className="text-white" />
          </div>
          <span className="text-white font-display font-black text-xl tracking-tight">Usebarber</span>
        </div>

        <div className="flashlight-card rounded-[3rem] overflow-hidden p-10" style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && !invite && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                <AlertCircle size={28} className="text-rose-400" />
              </div>
              <h2 className="text-2xl font-display font-black text-brand-main uppercase">Convite Inválido</h2>
              <p className="text-brand-muted text-sm">{error}</p>
            </div>
          )}

          {!loading && invite && !success && (
            <>
              <div className="mb-8">
                <span className="text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest mb-3 block">Convite de Equipe</span>
                <h2 className="text-3xl font-display font-black text-brand-main uppercase tracking-tight">
                  Olá, {invite.barberName}<span className="text-brand-accent">.</span>
                </h2>
                <p className="text-brand-muted mt-2 text-sm">Informe seu e-mail e crie uma senha para acessar o painel.</p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 12H8m8 0a8 8 0 11-16 0 8 8 0 0116 0zm0 0h2a2 2 0 012 2v1a2 2 0 01-2 2h-2" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="Seu e-mail de acesso"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm"
                  />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Crie uma senha (mín. 6 caracteres)"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Confirme a senha"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.3)] hover:opacity-90 transition-all disabled:opacity-40 mt-2"
                >
                  {submitting ? 'Criando conta...' : 'Criar conta e entrar'}
                </button>
              </form>
            </>
          )}

          {success && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-brand-success/10 border border-brand-success/20 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} className="text-brand-success" />
              </div>
              <h2 className="text-2xl font-display font-black text-brand-main uppercase">Conta criada!</h2>
              <p className="text-brand-muted text-sm">Redirecionando para o painel...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
