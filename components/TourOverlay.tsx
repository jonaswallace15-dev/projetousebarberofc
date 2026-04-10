'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { TOUR_STEPS, TOUR_STORAGE_KEY, TOUR_DONE_KEY } from '@/lib/tourSteps';

interface Rect { top: number; left: number; width: number; height: number; }

const PAD = 10;

export function TourOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [arrowSide, setArrowSide] = useState<'top' | 'bottom'>('top');
  const rafRef = useRef<number>();

  const step = TOUR_STEPS[stepIndex];
  const total = TOUR_STEPS.length;

  // Check if tour should be active on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(TOUR_DONE_KEY)) return;
    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
    const idx = saved !== null ? parseInt(saved) : 0;
    setStepIndex(isNaN(idx) ? 0 : Math.min(idx, TOUR_STEPS.length - 1));
    setActive(true);
  }, []);

  // Reset rect when page changes so we recompute
  useEffect(() => {
    setRect(null);
    setTooltipPos(null);
  }, [pathname]);

  // Only auto-navigate on explicit Next/Prev, NOT on page changes
  // This prevents the tour from hijacking navigation on unrelated pages

  const isOnPage = active && step && pathname === step.page;

  // Find element and compute positions — only when on correct page
  const computePositions = useCallback(() => {
    if (!isOnPage || !step) return;

    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const r = el.getBoundingClientRect();
    const elRect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setRect(elRect);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const TOOLTIP_W = Math.min(320, vw - 32);
    const TOOLTIP_H = 190;

    let top = 0;
    let left = Math.max(16, Math.min(r.left + r.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
    let side: 'top' | 'bottom' = 'top';

    if (r.bottom + TOOLTIP_H + 24 < vh) {
      // tooltip below element, arrow points up
      top = r.bottom + 14;
      side = 'top';
    } else {
      // tooltip above element, arrow points down
      top = r.top - TOOLTIP_H - 14;
      side = 'bottom';
    }

    top = Math.max(16, Math.min(top, vh - TOOLTIP_H - 16));
    setTooltipPos({ top, left });
    setArrowSide(side);
  }, [isOnPage, step]);

  // Continuously recompute while on correct page
  useEffect(() => {
    if (!isOnPage) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const loop = () => {
      computePositions();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isOnPage, computePositions]);

  const goNext = () => {
    const next = stepIndex + 1;
    if (next >= total) { finish(); return; }
    localStorage.setItem(TOUR_STORAGE_KEY, String(next));
    setStepIndex(next);
    setRect(null);
    setTooltipPos(null);
    // Navigate to next step's page
    const nextStep = TOUR_STEPS[next];
    if (nextStep && pathname !== nextStep.page) {
      router.push(nextStep.page);
    }
  };

  const goPrev = () => {
    const prev = Math.max(0, stepIndex - 1);
    localStorage.setItem(TOUR_STORAGE_KEY, String(prev));
    setStepIndex(prev);
    setRect(null);
    setTooltipPos(null);
    const prevStep = TOUR_STEPS[prev];
    if (prevStep && pathname !== prevStep.page) {
      router.push(prevStep.page);
    }
  };

  const finish = () => {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setActive(false);
    setRect(null);
    setTooltipPos(null);
  };

  // Don't render anything if not on the correct page — tour is silent
  if (!isOnPage) return null;

  const makeClip = (r: Rect) => {
    const T = Math.max(0, r.top - PAD);
    const L = Math.max(0, r.left - PAD);
    const B = r.top + r.height + PAD;
    const R = r.left + r.width + PAD;
    return `polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px ${T}px, ${L}px ${T}px, ${L}px ${B}px, ${R}px ${B}px, ${R}px ${T}px, 0px ${T}px)`;
  };

  const tooltipWidth = typeof window !== 'undefined' ? Math.min(320, window.innerWidth - 32) : 320;

  return (
    <>
      {/* Dark overlay with spotlight hole */}
      <div
        className="fixed inset-0 z-[9990] pointer-events-none transition-all duration-300"
        style={{
          background: 'rgba(0,0,0,0.72)',
          clipPath: rect ? makeClip(rect) : undefined,
        }}
      />

      {/* Pulse ring around element */}
      {rect && (
        <div
          className="fixed z-[9991] pointer-events-none rounded-2xl"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            animation: 'tour-pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          className="fixed z-[9995] pointer-events-auto flex flex-col"
          style={{ top: tooltipPos.top, left: tooltipPos.left, width: tooltipWidth }}
        >
          {/* Arrow pointing UP (tooltip is below element) */}
          {arrowSide === 'top' && (
            <div
              className="self-start ml-8 mb-[-1px]"
              style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '10px solid rgba(255,255,255,0.1)' }}
            />
          )}

          <div
            className="rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === stepIndex ? 18 : 6,
                      height: 6,
                      background: i < stepIndex ? '#22c55e' : i === stepIndex ? 'var(--brand-accent)' : 'var(--card-border)',
                    }}
                  />
                ))}
              </div>
              <button onClick={finish} className="w-6 h-6 rounded-lg flex items-center justify-center text-brand-muted hover:text-rose-400 transition-all" title="Fechar tour">
                <X size={13} />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
              <p className="text-[9px] font-mono uppercase tracking-widest text-brand-accent font-bold mb-1">
                Passo {stepIndex + 1} de {total}
              </p>
              <h3 className="font-display font-black text-brand-main uppercase tracking-tight text-sm mb-2">
                {step.title}
              </h3>
              <p className="text-brand-muted text-xs leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 flex items-center justify-between gap-3">
              <button onClick={finish} className="text-[9px] font-mono text-brand-muted hover:text-brand-main transition-all uppercase tracking-widest">
                Pular tour
              </button>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <button
                    onClick={goPrev}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}
                <button
                  onClick={goNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-display font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-90"
                  style={{ background: 'var(--brand-accent)', boxShadow: '0 0 16px rgba(0,112,255,0.4)' }}
                >
                  {stepIndex === total - 1 ? (
                    <><CheckCircle2 size={13} /> Concluir</>
                  ) : (
                    <>Próximo <ChevronRight size={13} /></>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Arrow pointing DOWN (tooltip is above element) */}
          {arrowSide === 'bottom' && (
            <div
              className="self-start ml-8 mt-[-1px]"
              style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid rgba(255,255,255,0.1)' }}
            />
          )}
        </div>
      )}

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(0,112,255,0.8), 0 0 0 6px rgba(0,112,255,0.3); }
          50% { box-shadow: 0 0 0 3px rgba(0,112,255,1), 0 0 0 14px rgba(0,112,255,0.12); }
        }
      `}</style>
    </>
  );
}
