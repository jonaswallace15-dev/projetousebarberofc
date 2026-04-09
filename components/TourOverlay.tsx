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
  const [arrowSide, setArrowSide] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const rafRef = useRef<number>();

  const step = TOUR_STEPS[stepIndex];
  const total = TOUR_STEPS.length;

  // Check if tour should be active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(TOUR_DONE_KEY)) return;
    const saved = localStorage.getItem(TOUR_STORAGE_KEY);
    const idx = saved !== null ? parseInt(saved) : 0;
    setStepIndex(isNaN(idx) ? 0 : Math.min(idx, TOUR_STEPS.length - 1));
    setActive(true);
  }, []);

  // Navigate to correct page when step changes
  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.page) {
      router.push(step.page);
    }
  }, [stepIndex, active]);

  // Find element and compute positions
  const computePositions = useCallback(() => {
    if (!active || !step) return;
    if (pathname !== step.page) return;

    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) return;

    // Scroll element into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const r = el.getBoundingClientRect();
    const elRect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setRect(elRect);

    // Decide tooltip position
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const TOOLTIP_W = Math.min(320, vw - 32);
    const TOOLTIP_H = 180;
    const pos = step.position;

    let top = 0;
    let left = 0;
    let side: typeof arrowSide = pos;

    if (pos === 'bottom' || r.bottom + TOOLTIP_H + PAD * 2 < vh) {
      top = r.bottom + PAD + 12;
      left = Math.max(16, Math.min(r.left + r.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
      side = 'top'; // arrow points up (tooltip is below element)
    } else {
      top = r.top - TOOLTIP_H - PAD - 12;
      left = Math.max(16, Math.min(r.left + r.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16));
      side = 'bottom';
    }

    // Clamp vertically
    top = Math.max(16, Math.min(top, vh - TOOLTIP_H - 16));

    setTooltipPos({ top, left });
    setArrowSide(side);
  }, [active, step, pathname]);

  // Recompute on every render tick while active
  useEffect(() => {
    if (!active) return;
    const observe = () => {
      computePositions();
      rafRef.current = requestAnimationFrame(observe);
    };
    rafRef.current = requestAnimationFrame(observe);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, computePositions]);

  const goNext = () => {
    const next = stepIndex + 1;
    if (next >= total) {
      finish();
    } else {
      localStorage.setItem(TOUR_STORAGE_KEY, String(next));
      setStepIndex(next);
      setRect(null);
      setTooltipPos(null);
    }
  };

  const goPrev = () => {
    const prev = Math.max(0, stepIndex - 1);
    localStorage.setItem(TOUR_STORAGE_KEY, String(prev));
    setStepIndex(prev);
    setRect(null);
    setTooltipPos(null);
  };

  const finish = () => {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setActive(false);
    setRect(null);
  };

  const skip = () => finish();

  if (!active || !step) return null;

  // Spotlight clip-path: full screen with a hole
  const makeClip = (r: Rect) => {
    const { top, left, width, height } = r;
    const T = Math.max(0, top - PAD);
    const L = Math.max(0, left - PAD);
    const B = top + height + PAD;
    const R = left + width + PAD;
    // Polygon: outer → inner hole (clockwise outer, counter-clockwise hole)
    return `polygon(
      0px 0px,
      100% 0px,
      100% 100%,
      0px 100%,
      0px ${T}px,
      ${L}px ${T}px,
      ${L}px ${B}px,
      ${R}px ${B}px,
      ${R}px ${T}px,
      0px ${T}px
    )`;
  };

  const isOnPage = pathname === step.page;

  return (
    <>
      {/* Dark overlay with spotlight hole */}
      {rect && isOnPage ? (
        <div
          className="fixed inset-0 z-[9990] pointer-events-none transition-all duration-300"
          style={{
            background: 'rgba(0,0,0,0.72)',
            clipPath: makeClip(rect),
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[9990] pointer-events-none bg-black/72" />
      )}

      {/* Pulse ring around element */}
      {rect && isOnPage && step.pulse && (
        <div
          className="fixed z-[9991] pointer-events-none rounded-2xl"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 3px rgba(0,112,255,0.8), 0 0 0 6px rgba(0,112,255,0.3)',
            animation: 'tour-pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && isOnPage && (
        <div
          className="fixed z-[9995] pointer-events-auto"
          style={{ top: tooltipPos.top, left: tooltipPos.left, width: Math.min(320, window.innerWidth - 32) }}
        >
          {/* Arrow */}
          {arrowSide === 'top' && (
            <div className="ml-6 mb-[-1px] w-0 h-0" style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '10px solid var(--card-border)' }} />
          )}
          {arrowSide === 'bottom' && (
            <div className="ml-6 mt-[-1px] w-0 h-0 order-last" style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid var(--card-border)' }} />
          )}

          <div
            className="rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2">
                {/* Step dots */}
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === stepIndex ? 20 : 6,
                      height: 6,
                      background: i < stepIndex ? '#22c55e' : i === stepIndex ? 'var(--brand-accent)' : 'var(--card-border)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={skip}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-brand-muted hover:text-rose-400 transition-all"
                title="Fechar tour"
              >
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
              <button
                onClick={skip}
                className="text-[9px] font-mono text-brand-muted hover:text-brand-main transition-all uppercase tracking-widest"
              >
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

          {arrowSide === 'bottom' && (
            <div className="ml-6 w-0 h-0" style={{ borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '10px solid var(--card-border)' }} />
          )}
        </div>
      )}

      {/* Loading state — navigating to page */}
      {!isOnPage && (
        <div className="fixed inset-0 z-[9996] flex items-center justify-center pointer-events-none">
          <div
            className="px-6 py-4 rounded-2xl flex items-center gap-3"
            style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="w-5 h-5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-brand-muted uppercase tracking-widest">Navegando...</p>
          </div>
        </div>
      )}

      {/* Pulse keyframe */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(0,112,255,0.8), 0 0 0 6px rgba(0,112,255,0.3); }
          50% { box-shadow: 0 0 0 3px rgba(0,112,255,1), 0 0 0 12px rgba(0,112,255,0.15); }
        }
      `}</style>
    </>
  );
}
