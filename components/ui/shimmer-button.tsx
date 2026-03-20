'use client';

import React, { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = 'var(--brand-accent)',
      shimmerSize = '0.05em',
      shimmerDuration = '3s',
      borderRadius = '100px',
      background = 'var(--text-main)',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        style={
          {
            '--spread': '90deg',
            '--shimmer-color': shimmerColor,
            '--radius': borderRadius,
            '--speed': shimmerDuration,
            '--cut': shimmerSize,
            '--bg': background,
          } as CSSProperties
        }
        className={cn(
          'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-[var(--brand-deep)] [background:var(--bg)] [border-radius:var(--radius)]',
          'transform-gpu transition-all duration-300 ease-in-out active:translate-y-px',
          className,
        )}
        ref={ref}
        {...props}
      >
        <div className={cn('-z-30 blur-[2px]', 'absolute inset-0 overflow-visible [container-type:size]')}>
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>

        <span className="relative z-10 font-bold">{children}</span>

        <div
          className={cn(
            'insert-0 absolute size-full',
            'rounded-[var(--radius)] px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_rgba(255,255,255,0.1)]',
            'transform-gpu transition-all duration-300 ease-in-out',
            'group-hover:shadow-[inset_0_-6px_10px_rgba(255,255,255,0.2)]',
            'group-active:shadow-[inset_0_-10px_10px_rgba(255,255,255,0.2)]',
          )}
        />

        <div className={cn('absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]')} />
      </button>
    );
  },
);

ShimmerButton.displayName = 'ShimmerButton';

export { ShimmerButton };
