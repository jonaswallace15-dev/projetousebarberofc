'use client';

import React, { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { Scissors, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, CheckCircle2, User, Smartphone } from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useRouter, useSearchParams } from 'next/navigation';

type AuthMode = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<AuthMode>(searchParams.get('cadastro') ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [barbershopName, setBarbershopName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Proprietário' | 'Barbeiro'>('Proprietário');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetForm = () => {
    setEmail(''); setPassword(''); setName(''); setBarbershopName(''); setPhone('');
    setRole('Proprietário'); setError(''); setSuccess('');
  };

  const switchMode = (newMode: AuthMode) => { resetForm(); setMode(newMode); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('E-mail ou senha incorretos. Verifique seus dados.');
      } else {
        const session = await getSession();
        const role = (session?.user as any)?.role;
        router.push(role === 'Super Admin' ? '/admin' : '/dashboard');
        // Barbeiros e Proprietários vão para /dashboard — o layout filtra o conteúdo por role
        router.refresh();
      }
    } catch {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); setLoading(false); return; }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, barbershopName, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('already registered')) {
          setError('Este e-mail já está cadastrado. Faça login.');
        } else {
          setError(data.error || 'Erro ao criar conta.');
        }
        return;
      }
      setSuccess('Conta criada! Faça login para acessar.');
      resetForm();
      setMode('login');
    } catch {
      setError('Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Com NextAuth + credenciais, o reset de senha precisa ser implementado manualmente.
    // Por enquanto, informamos o usuário.
    setSuccess('Entre em contato com o administrador para redefinir sua senha.');
    setLoading(false);
  };

  const submitHandler = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgotPassword;

  return (
    <div className="w-full min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: 'var(--brand-deep)', color: 'var(--text-main)' }}>
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-black to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.3),transparent_60%)]" />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(37,99,235,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-800/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
              <Scissors size={20} className="text-white" />
            </div>
            <span className="text-white font-display font-black text-xl tracking-tight">Usebarber</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Software #1 para barbearias</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-display font-black text-white leading-[1.1] tracking-tight">
              Gerencie sua<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">barbearia</span><br />
              com precisão.
            </h1>
            <p className="text-zinc-400 mt-4 text-base leading-relaxed max-w-sm">
              Agendamentos, clientes, financeiro e equipe em um único painel. Profissional e completo.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[{ value: '2.4k+', label: 'Barbearias' }, { value: '98%', label: 'Satisfação' }, { value: '0 bugs', label: 'Produção estável' }].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-zinc-500 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {['Agendamento online 24/7', 'Controle financeiro em tempo real', 'Gestão de equipe e comissões', 'Dashboard inteligente com IA'].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={12} className="text-blue-400" />
                </div>
                <span className="text-zinc-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-zinc-600 text-xs">© 2026 Usebarber. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
              <Scissors size={20} className="text-white" />
            </div>
            <span className="text-white font-display font-black text-xl tracking-tight">Usebarber</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-black text-white tracking-tight">
              {mode === 'login' ? 'Entrar na conta' : mode === 'register' ? 'Criar conta' : 'Recuperar senha'}
            </h2>
            <p className="text-zinc-500 mt-2 text-sm">
              {mode === 'login' ? 'Acesse seu painel de gestão.' : mode === 'register' ? 'Crie sua conta gratuitamente.' : 'Entre em contato com o administrador.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm leading-relaxed">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-emerald-400 text-sm leading-relaxed">{success}</p>
            </div>
          )}

          <form onSubmit={submitHandler} className="space-y-4">
            {mode === 'register' && (
              <>

                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome completo" className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm" />
                </div>
                {role === 'Proprietário' && (
                  <div className="relative">
                    <Scissors size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                    <input type="text" value={barbershopName} onChange={(e) => setBarbershopName(e.target.value)} required placeholder="Nome da sua Barbearia" className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm" />
                  </div>
                )}
                <div className="relative">
                  <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="Seu WhatsApp" className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm" />
                </div>
              </>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm" />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'} className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-zinc-600 outline-none transition-all text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <div className="w-full mt-2">
              <ShimmerButton type="submit" disabled={loading} background="#2563eb" shimmerColor="#ffffff" className="w-full text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-600/30 text-xs border-blue-500">
                {loading ? 'PROCESSANDO...' : (mode === 'login' ? 'ENTRAR NO PAINEL' : mode === 'register' ? 'CRIAR MINHA CONTA' : 'ENVIAR LINK DE RECUPERAÇÃO')}
              </ShimmerButton>
            </div>
          </form>

          <div className="mt-8 text-center">
            {mode === 'login' ? (
              <p className="text-zinc-500 text-sm">Não tem conta?{' '}<button onClick={() => switchMode('register')} className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Criar conta grátis</button></p>
            ) : mode === 'register' ? (
              <p className="text-zinc-500 text-sm">Já tem uma conta?{' '}<button onClick={() => switchMode('login')} className="text-blue-400 font-bold hover:text-blue-300 transition-colors">Fazer login</button></p>
            ) : (
              <button onClick={() => switchMode('login')} className="text-blue-400 font-bold hover:text-blue-300 transition-colors text-sm flex items-center gap-2 mx-auto">← Voltar ao login</button>
            )}
          </div>

          {mode !== 'forgot' && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">ou</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="w-full flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-white rounded-2xl py-4 text-sm font-bold transition-all hover:bg-zinc-800"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </button>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-zinc-900">
            <p className="text-zinc-700 text-xs text-center">
              Ao continuar, você concorda com nossos <span className="text-zinc-500">Termos de Uso</span> e <span className="text-zinc-500">Política de Privacidade</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
