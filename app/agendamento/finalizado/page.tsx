'use client';

import { CheckCircle2 } from 'lucide-react';

export default function AgendamentoFinalizadoPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center p-8"
      style={{ background: '#050505', color: 'white' }}
    >
      <div className="relative mb-10">
        <div className="w-28 h-28 bg-brand-success rounded-[2rem] text-white flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.4)] animate-bounce">
          <CheckCircle2 size={56} />
        </div>
      </div>

      <h1 className="text-5xl font-display font-black uppercase tracking-tighter leading-tight mb-4">
        Pagamento <br />
        <span className="text-brand-success italic">Confirmado!</span>
      </h1>

      <p className="text-white/40 text-base max-w-xs leading-relaxed mb-10">
        Seu agendamento foi registrado com sucesso. Até logo!
      </p>

      <p className="text-[11px] text-white/20 font-mono font-black uppercase tracking-[0.2em]">
        Você já pode fechar esta página.
      </p>
    </div>
  );
}
