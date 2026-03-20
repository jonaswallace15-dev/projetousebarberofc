'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, trend, icon }) => {
  return (
    <div className="flashlight-card p-4 sm:p-6 lg:p-8 rounded-3xl sm:rounded-[2rem] lg:rounded-[2.5rem] flex flex-col justify-between group h-full">
      <div className="flex flex-col 2xl:flex-row justify-between items-start gap-4 mb-6">
        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-brand-accent/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-brand-accent border border-brand-accent/20 shadow-[0_0_20px_rgba(0,112,255,0.1)] group-hover:scale-110 transition-transform duration-500">
          <span className="scale-100 sm:scale-125">{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold border transition-colors whitespace-nowrap ${trend >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}% cresc.
          </div>
        )}
      </div>

      <div className="space-y-1 mt-2">
        <p className="text-brand-muted text-[9px] sm:text-[10px] font-mono uppercase tracking-widest sm:tracking-[0.2em] font-bold truncate">
          {title}
        </p>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-black text-brand-main tracking-tight leading-none truncate">
          {value}
        </h3>
      </div>

      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-all duration-700 pointer-events-none" />
    </div>
  );
};
