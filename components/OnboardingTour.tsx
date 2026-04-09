'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, ChevronLeft, CheckCircle2, Settings, Scissors, Users, Calendar, ExternalLink, Sparkles } from 'lucide-react';

interface TourStep {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  description: string;
  action: string;
  href: string;
  tip: string;
  checkKey: 'hasConfig' | 'hasServices' | 'hasBarbers' | 'done';
}

const STEPS: TourStep[] = [
  {
    id: 'config',
    icon: <Settings size={22} />,
    emoji: '⚙️',
    title: 'Configurações da Barbearia',
    description: 'Preencha o nome do estabelecimento, escolha seu link público (ex: usebarber.site/minha-barbearia), adicione logo, banner e cadastre sua chave PIX para receber pagamentos.',
    action: 'Ir para Configurações',
    href: '/settings',
    tip: '💡 O link público é o que seus clientes vão usar para agendar. Escolha um nome simples e fácil de lembrar.',
    checkKey: 'hasConfig',
  },
  {
    id: 'services',
    icon: <Scissors size={22} />,
    emoji: '✂️',
    title: 'Cadastre seus Serviços',
    description: 'Adicione os serviços que sua barbearia oferece — corte, barba, sobrancelha etc. Defina o preço e a duração de cada um para o sistema calcular os horários automaticamente.',
    action: 'Ir para Serviços',
    href: '/services',
    tip: '💡 Adicione pelo menos 1 serviço antes de testar o agendamento. A duração define o espaçamento entre horários.',
    checkKey: 'hasServices',
  },
  {
    id: 'team',
    icon: <Users size={22} />,
    emoji: '💈',
    title: 'Cadastre sua Equipe',
    description: 'Adicione os barbeiros que trabalham no estabelecimento. Configure os horários de atendimento de cada profissional — dias da semana, entrada, saída e intervalo.',
    action: 'Ir para Equipe',
    href: '/team',
    tip: '💡 Cada barbeiro pode ter um horário diferente. Sem barbeiro cadastrado, o link público não vai mostrar horários.',
    checkKey: 'hasBarbers',
  },
  {
    id: 'test',
    icon: <Calendar size={22} />,
    emoji: '🚀',
    title: 'Teste o Agendamento!',
    description: 'Tudo configurado! Abra seu link público e faça um agendamento de teste para garantir que tudo está funcionando. Compartilhe o link com seus clientes e comece a receber agendamentos.',
    action: 'Ver Agendamentos',
    href: '/appointments',
    tip: '💡 Vá em Configurações para copiar seu link público e compartilhar no WhatsApp, Instagram e Google.',
    checkKey: 'done',
  },
];

interface ChecklistState {
  hasConfig: boolean;
  hasServices: boolean;
  hasBarbers: boolean;
}

interface Props {
  userId: string;
}

export function OnboardingTour({ userId }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistState>({ hasConfig: false, hasServices: false, hasBarbers: false });
  const [loading, setLoading] = useState(true);

  const storageKey = `tour_dismissed_${userId}`;

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(storageKey)) return;
    checkSetup();
  }, [userId]);

  const checkSetup = async () => {
    try {
      const [configRes, servicesRes, barbersRes] = await Promise.all([
        fetch(`/api/config`).catch(() => null),
        fetch(`/api/services`).catch(() => null),
        fetch(`/api/barbers`).catch(() => null),
      ]);

      const config = configRes?.ok ? await configRes.json() : null;
      const services = servicesRes?.ok ? await servicesRes.json() : [];
      const barbers = barbersRes?.ok ? await barbersRes.json() : [];

      const hasConfig = !!(config?.data?.name || config?.name);
      const hasServices = Array.isArray(services) && services.length > 0;
      const hasBarbers = Array.isArray(barbers) && barbers.length > 0;

      setChecklist({ hasConfig, hasServices, hasBarbers });

      // Só mostra se ainda falta alguma coisa
      if (!hasConfig || !hasServices || !hasBarbers) {
        // Define o passo inicial como o primeiro incompleto
        if (!hasConfig) setCurrentStep(0);
        else if (!hasServices) setCurrentStep(1);
        else if (!hasBarbers) setCurrentStep(2);
        setVisible(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  const completedCount = [checklist.hasConfig, checklist.hasServices, checklist.hasBarbers].filter(Boolean).length;
  const totalSteps = 3;
  const progress = Math.round((completedCount / totalSteps) * 100);
  const allDone = completedCount === totalSteps;

  const step = allDone ? STEPS[3] : STEPS[currentStep];
  const isStepDone = (s: TourStep) => {
    if (s.checkKey === 'done') return allDone;
    return checklist[s.checkKey];
  };

  if (loading || !visible) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all hover:scale-105"
        style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="w-8 h-8 rounded-xl bg-brand-accent flex items-center justify-center text-white">
          <Sparkles size={15} />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Tour de Configuração</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: 'var(--card-border)' }}>
              <div className="h-full bg-brand-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[9px] font-mono text-brand-muted">{completedCount}/{totalSteps}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm">
      <div
        className="rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center text-white shadow-[0_0_15px_rgba(0,112,255,0.4)]">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Guia de Configuração</p>
              <p className="text-xs font-display font-black text-brand-main uppercase tracking-tight">
                {allDone ? 'Barbearia pronta! 🎉' : `${completedCount} de ${totalSteps} etapas concluídas`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-main transition-all"
              style={{ background: 'var(--input-bg)' }}
              title="Minimizar"
            >
              <span className="text-base leading-none mb-0.5">−</span>
            </button>
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-rose-400 transition-all"
              style={{ background: 'var(--input-bg)' }}
              title="Fechar tour"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 mb-1">
            {STEPS.slice(0, 3).map((s, i) => (
              <div
                key={s.id}
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--card-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ background: isStepDone(s) ? '#22c55e' : (i === currentStep && !allDone ? 'var(--brand-accent)' : 'transparent'), width: isStepDone(s) ? '100%' : (i === currentStep && !allDone ? '60%' : '0%') }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Step indicators */}
        <div className="px-5 pt-3 flex items-center gap-2">
          {STEPS.slice(0, 3).map((s, i) => (
            <button
              key={s.id}
              onClick={() => !allDone && setCurrentStep(i)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all"
              style={{
                background: isStepDone(s) ? 'rgba(34,197,94,0.1)' : (i === currentStep && !allDone ? 'var(--brand-accent)' + '20' : 'var(--input-bg)'),
                border: `1px solid ${isStepDone(s) ? 'rgba(34,197,94,0.3)' : (i === currentStep && !allDone ? 'rgba(0,112,255,0.3)' : 'var(--card-border)')}`,
              }}
            >
              {isStepDone(s)
                ? <CheckCircle2 size={12} className="text-green-400" />
                : <span className="text-[10px] font-mono font-bold" style={{ color: i === currentStep && !allDone ? 'var(--brand-accent)' : 'var(--text-muted)' }}>{i + 1}</span>
              }
              <span className="text-[9px] font-mono uppercase tracking-wider hidden sm:block" style={{ color: isStepDone(s) ? '#22c55e' : (i === currentStep && !allDone ? 'var(--brand-accent)' : 'var(--text-muted)') }}>
                {s.id === 'config' ? 'Config' : s.id === 'services' ? 'Serviços' : 'Equipe'}
              </span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="px-5 py-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl mt-0.5">{step.emoji}</span>
            <div>
              <h3 className="font-display font-black text-brand-main uppercase tracking-tight text-sm">{step.title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed mt-1">{step.description}</p>
            </div>
          </div>

          {/* Tip */}
          <div className="px-3 py-2.5 rounded-2xl mb-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            <p className="text-[10px] font-mono text-brand-muted leading-relaxed">{step.tip}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!allDone && currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(c => c - 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all flex-shrink-0"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                <ChevronLeft size={16} />
              </button>
            )}

            <button
              onClick={() => router.push(step.href)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-display font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90"
              style={{ background: allDone ? '#22c55e' : 'var(--brand-accent)', boxShadow: allDone ? '0 0 20px rgba(34,197,94,0.4)' : '0 0 20px rgba(0,112,255,0.4)' }}
            >
              <ExternalLink size={13} />
              {step.action}
            </button>

            {!allDone && currentStep < 2 && (
              <button
                onClick={() => setCurrentStep(c => c + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all flex-shrink-0"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                <ChevronRight size={16} />
              </button>
            )}

            {allDone && (
              <button
                onClick={dismiss}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all flex-shrink-0"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                title="Fechar"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <button onClick={dismiss} className="text-[9px] font-mono text-brand-muted hover:text-brand-main transition-all uppercase tracking-widest">
            Não mostrar novamente
          </button>
          {!allDone && (
            <span className="text-[9px] font-mono text-brand-muted">
              Etapa {currentStep + 1} de 3
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
