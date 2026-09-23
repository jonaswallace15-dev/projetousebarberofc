'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import type { Wallet } from '@/types';

interface WithdrawalRecord {
  id: string;
  amount: number;
  pixKey: string;
  status: string;
  createdAt: string;
}

interface RecipientInfo {
  status: string;
  holderType?: 'individual' | 'company';
  document?: string;
  legalName?: string;
  lastError?: string | null;
  bankAccount?: { bank: string; branchNumber: string; accountNumber: string; accountCheckDigit: string };
}

const emptyRecipientForm = {
  holderType: 'individual' as 'individual' | 'company',
  document: '',
  legalName: '',
  email: '',
  phoneDdd: '',
  phoneNumber: '',
  birthdate: '',
  motherName: '',
  monthlyIncome: '',
  professionalOccupation: '',
  addressCep: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressComplementary: '',
  addressReferencePoint: '',
  bank: '',
  branchNumber: '',
  accountNumber: '',
  accountCheckDigit: '',
  accountType: 'checking' as 'checking' | 'savings',
};

export default function WalletsPage() {
  const { user } = useAuth();
  const { toast } = useUI();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawModal, setWithdrawModal] = useState<{ wallet: Wallet } | null>(null);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '' });
  const [withdrawing, setWithdrawing] = useState(false);

  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [recipientSaving, setRecipientSaving] = useState(false);
  const [recipientForm, setRecipientForm] = useState({ ...emptyRecipientForm });

  const loadData = () => {
    if (!user) return;
    Promise.all([
      fetch('/api/wallets').then(r => r.json()).catch(() => []),
      fetch('/api/wallets/withdraw').then(r => r.json()).catch(() => []),
      fetch('/api/settings/pagarme-recipient').then(r => r.json()).catch(() => ({ recipient: null })),
    ]).then(([w, wd, rec]) => {
      setWallets(Array.isArray(w) ? w : []);
      setWithdrawals(Array.isArray(wd) ? wd : []);
      const r: RecipientInfo | null = rec?.recipient || null;
      setRecipient(r);
      if (r) {
        setRecipientForm(prev => ({
          ...prev,
          holderType: r.holderType || prev.holderType,
          document: r.document || prev.document,
          legalName: r.legalName || prev.legalName,
          bank: r.bankAccount?.bank || prev.bank,
          branchNumber: r.bankAccount?.branchNumber || prev.branchNumber,
          accountNumber: r.bankAccount?.accountNumber || prev.accountNumber,
          accountCheckDigit: r.bankAccount?.accountCheckDigit || prev.accountCheckDigit,
          accountType: (r.bankAccount as any)?.accountType || prev.accountType,
        }));
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [user]);

  const recipientActive = recipient?.status === 'active';

  const handleRecipientCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setRecipientForm(prev => ({ ...prev, addressCep: cleanCep }));
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setRecipientForm(prev => ({
            ...prev,
            addressStreet: data.logradouro || '',
            addressNeighborhood: data.bairro || '',
            addressCity: data.localidade || '',
            addressState: data.uf || '',
          }));
        }
      } catch {}
    }
  };

  const handleSaveRecipient = async () => {
    setRecipientSaving(true);
    try {
      const res = await fetch('/api/settings/pagarme-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holderType: recipientForm.holderType,
          document: recipientForm.document,
          legalName: recipientForm.legalName,
          email: recipientForm.email,
          phoneDdd: recipientForm.phoneDdd,
          phoneNumber: recipientForm.phoneNumber,
          birthdate: recipientForm.birthdate,
          motherName: recipientForm.motherName,
          monthlyIncome: recipientForm.monthlyIncome ? Number(recipientForm.monthlyIncome) : undefined,
          professionalOccupation: recipientForm.professionalOccupation,
          address: {
            street: recipientForm.addressStreet,
            streetNumber: recipientForm.addressNumber,
            neighborhood: recipientForm.addressNeighborhood,
            city: recipientForm.addressCity,
            state: recipientForm.addressState,
            zipCode: recipientForm.addressCep,
            complementary: recipientForm.addressComplementary,
            referencePoint: recipientForm.addressReferencePoint,
          },
          bankAccount: {
            bank: recipientForm.bank,
            branchNumber: recipientForm.branchNumber,
            accountNumber: recipientForm.accountNumber,
            accountCheckDigit: recipientForm.accountCheckDigit,
            accountType: recipientForm.accountType,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast(data.error || 'Erro ao cadastrar recebedor', 'error');
        setRecipient(prev => ({ ...(prev || { status: 'error' }), status: data.recipient?.status || 'error', lastError: data.error }));
        return;
      }
      toast('Cadastro enviado! Assim que a Stone aprovar, você já pode sacar.', 'success');
      setShowRecipientForm(false);
      loadData();
    } catch (err: any) {
      toast(err.message || 'Erro ao cadastrar recebedor', 'error');
    } finally {
      setRecipientSaving(false);
    }
  };

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  const getWalletLabel = (type: string) => {
    const labels: Record<string, string> = { system: 'Sistema', barbershop: 'Agendamentos', barber: 'Barbeiro', subscription: 'Assinaturas' };
    return labels[type] || type;
  };

  const getWalletIcon = (type: string) => {
    const icons: Record<string, string> = {
      system: 'solar:server-bold-duotone',
      barbershop: 'solar:shop-2-bold-duotone',
      barber: 'solar:user-bold-duotone',
      subscription: 'solar:crown-bold-duotone',
    };
    return icons[type] || 'solar:wallet-bold-duotone';
  };


  const handleWithdraw = async () => {
    if (!withdrawModal) return;
    const amount = parseFloat(withdrawForm.amount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    setWithdrawing(true);
    try {
      const res = await fetch('/api/wallets/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          walletType: withdrawModal.wallet.type,
        }),
      });
      const data = await res.json();
      if (data.error) { toast(data.error, 'error'); return; }
      setWithdrawModal(null);
      setWithdrawForm({ amount: '' });
      toast('Saque solicitado com sucesso!', 'success');
      loadData();
    } catch { toast('Erro ao solicitar saque.', 'error'); }
    finally { setWithdrawing(false); }
  };

  const statusColor = (s: string) => s === 'Aprovado' ? 'text-brand-success' : s === 'Rejeitado' ? 'text-rose-500' : 'text-amber-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Sem cadastro bancário ainda: só mostra o formulário — as carteiras (saldo, saques)
  // só aparecem depois que a barbearia preenche esses dados (Fase 3 da migração Pagar.me).
  const mustSetupRecipient = !recipient;

  if (mustSetupRecipient || showRecipientForm) {
    return (
      <div className="space-y-10 pb-20">
        <header className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
              Carteiras<span className="text-brand-accent">.</span>
            </h1>
            <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
              {mustSetupRecipient
                ? 'Cadastre seus dados bancários pra liberar suas carteiras.'
                : 'Atualize seus dados bancários.'}
            </p>
          </div>
          {!mustSetupRecipient && (
            <button onClick={() => setShowRecipientForm(false)} className="px-6 py-3 rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted hover:text-brand-accent transition-all shrink-0" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              ← Voltar pras carteiras
            </button>
          )}
        </header>

        {recipient?.status && (
          <div className={`p-5 rounded-2xl flex items-start gap-3 ${
            recipient.status === 'active' ? 'bg-brand-success/10 border border-brand-success/20' : recipient.status === 'error' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            <iconify-icon icon={recipient.status === 'active' ? 'solar:check-circle-bold-duotone' : recipient.status === 'error' ? 'solar:danger-triangle-bold-duotone' : 'solar:clock-circle-bold-duotone'}
              class={`text-xl shrink-0 mt-0.5 ${recipient.status === 'active' ? 'text-brand-success' : recipient.status === 'error' ? 'text-rose-400' : 'text-amber-400'}`} />
            <div>
              <p className={`text-[11px] font-mono font-black uppercase tracking-widest ${recipient.status === 'active' ? 'text-brand-success' : recipient.status === 'error' ? 'text-rose-400' : 'text-amber-400'}`}>
                {recipient.status === 'active' ? 'Aprovado — pode sacar' : recipient.status === 'error' ? 'Erro no cadastro' : 'Em análise pela Stone'}
              </p>
              {recipient.lastError && <p className="text-[11px] font-mono text-brand-muted mt-1 leading-relaxed">{recipient.lastError}</p>}
            </div>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleSaveRecipient(); }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Identificação */}
          <div className="flashlight-card p-10 rounded-[3.5rem] space-y-8">
            <div>
              <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-3 flex items-center gap-3">
                <iconify-icon icon="solar:card-recive-bold-duotone" class="text-3xl text-brand-accent" />
                Conta bancária
              </h3>
              <p className="text-brand-muted text-sm leading-relaxed">
                Cadastre seus dados pra receber automaticamente sua parte de cada pagamento (PIX e assinaturas) e poder sacar aqui.
              </p>
            </div>

            {/* Tipo de pessoa */}
            <div className="flex gap-3">
              {(['individual', 'company'] as const).map(t => (
                <button key={t} type="button" onClick={() => setRecipientForm(f => ({ ...f, holderType: t }))}
                  className={`flex-1 py-4 rounded-2xl text-[11px] font-mono font-black uppercase tracking-widest transition-all ${recipientForm.holderType === t ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}
                  style={recipientForm.holderType !== t ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}>
                  {t === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">{recipientForm.holderType === 'individual' ? 'CPF' : 'CNPJ'}</label>
                <input required value={recipientForm.document} onChange={e => setRecipientForm(f => ({ ...f, document: e.target.value }))}
                  className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">{recipientForm.holderType === 'individual' ? 'Nome completo' : 'Razão social'}</label>
                <input required value={recipientForm.legalName} onChange={e => setRecipientForm(f => ({ ...f, legalName: e.target.value }))}
                  className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">E-mail</label>
                <input required type="email" value={recipientForm.email} onChange={e => setRecipientForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">DDD</label>
                  <input required value={recipientForm.phoneDdd} onChange={e => setRecipientForm(f => ({ ...f, phoneDdd: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                    className="w-full rounded-2xl py-4 px-4 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Telefone</label>
                  <input required value={recipientForm.phoneNumber} onChange={e => setRecipientForm(f => ({ ...f, phoneNumber: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
              </div>
            </div>

            {recipientForm.holderType === 'individual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Data de nascimento</label>
                  <input required type="date" value={recipientForm.birthdate} onChange={e => setRecipientForm(f => ({ ...f, birthdate: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Nome da mãe</label>
                  <input required value={recipientForm.motherName} onChange={e => setRecipientForm(f => ({ ...f, motherName: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Renda mensal (R$)</label>
                  <input required type="number" min="1" step="0.01" value={recipientForm.monthlyIncome} onChange={e => setRecipientForm(f => ({ ...f, monthlyIncome: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Ocupação (opcional)</label>
                  <input value={recipientForm.professionalOccupation} onChange={e => setRecipientForm(f => ({ ...f, professionalOccupation: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
              </div>
            )}
          </div>

          {/* Endereço + Dados bancários */}
          <div className="space-y-8">
            <div className="flashlight-card p-10 rounded-[3.5rem] space-y-6">
              <h4 className="text-xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3">
                <iconify-icon icon="solar:point-on-map-bold-duotone" class="text-2xl text-brand-accent" />
                Endereço
              </h4>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">CEP</label>
                  <input required value={recipientForm.addressCep} onChange={e => handleRecipientCepChange(e.target.value)}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-12 md:col-span-8 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Rua</label>
                  <input required value={recipientForm.addressStreet} onChange={e => setRecipientForm(f => ({ ...f, addressStreet: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-6 md:col-span-3 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Número</label>
                  <input required value={recipientForm.addressNumber} onChange={e => setRecipientForm(f => ({ ...f, addressNumber: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-6 md:col-span-5 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Bairro</label>
                  <input required value={recipientForm.addressNeighborhood} onChange={e => setRecipientForm(f => ({ ...f, addressNeighborhood: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-12 md:col-span-4 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Cidade</label>
                  <input required value={recipientForm.addressCity} onChange={e => setRecipientForm(f => ({ ...f, addressCity: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-12 md:col-span-2 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">UF</label>
                  <input required maxLength={2} value={recipientForm.addressState} onChange={e => setRecipientForm(f => ({ ...f, addressState: e.target.value.toUpperCase() }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none uppercase" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-12 md:col-span-6 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Complemento</label>
                  <input value={recipientForm.addressComplementary} onChange={e => setRecipientForm(f => ({ ...f, addressComplementary: e.target.value }))}
                    placeholder="Apto, sala, etc."
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-12 md:col-span-6 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Ponto de referência</label>
                  <input value={recipientForm.addressReferencePoint} onChange={e => setRecipientForm(f => ({ ...f, addressReferencePoint: e.target.value }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
              </div>
            </div>

            <div className="flashlight-card p-10 rounded-[3.5rem] space-y-6">
              <h4 className="text-xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3">
                <iconify-icon icon="solar:banknote-2-bold-duotone" class="text-2xl text-brand-accent" />
                Dados bancários
              </h4>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6 md:col-span-3 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Banco (código)</label>
                  <input required value={recipientForm.bank} onChange={e => setRecipientForm(f => ({ ...f, bank: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    placeholder="Ex: 341" className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-6 md:col-span-3 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Agência</label>
                  <input required value={recipientForm.branchNumber} onChange={e => setRecipientForm(f => ({ ...f, branchNumber: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-8 md:col-span-4 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Conta</label>
                  <input required value={recipientForm.accountNumber} onChange={e => setRecipientForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-4 md:col-span-2 space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-2">Dígito</label>
                  <input required value={recipientForm.accountCheckDigit} onChange={e => setRecipientForm(f => ({ ...f, accountCheckDigit: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                    className="w-full rounded-2xl py-4 px-6 outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-main)' }} />
                </div>
                <div className="col-span-12 flex gap-3">
                  {(['checking', 'savings'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setRecipientForm(f => ({ ...f, accountType: t }))}
                      className={`flex-1 py-3 rounded-2xl text-[11px] font-mono font-black uppercase tracking-widest transition-all ${recipientForm.accountType === t ? 'bg-brand-accent text-white' : 'text-brand-muted'}`}
                      style={recipientForm.accountType !== t ? { background: 'var(--input-bg)', border: '1px solid var(--card-border)' } : {}}>
                      {t === 'checking' ? 'Conta corrente' : 'Poupança'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={recipientSaving}
                className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.3)] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recipientSaving ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : (recipient ? 'Atualizar cadastro' : 'Cadastrar recebedor')}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            Carteiras<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            Gestão financeira distribuída e comissões em tempo real.
          </p>
        </div>
        <button onClick={() => setShowRecipientForm(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest text-brand-muted hover:text-brand-accent transition-all shrink-0 whitespace-nowrap" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
          <Pencil size={14} /> Dados bancários
        </button>
      </header>

      {/* Total balance */}
      <div className="flashlight-card px-8 py-6 rounded-[2rem] relative overflow-hidden flex items-center justify-between">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div>
          <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Saldo Total Consolidado</p>
          <div className="text-4xl font-display font-black text-brand-accent tracking-tighter">
            <span className="text-base mr-1 opacity-50">R$</span>
            {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
          <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">{wallets.length} ativa{wallets.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Wallet cards */}
      {wallets.length === 0 ? (
        <div className="flashlight-card p-16 rounded-[3.5rem] text-center">
          <iconify-icon icon="solar:wallet-bold-duotone" class="text-7xl text-brand-muted/20 mb-6" />
          <h3 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight mb-4">Nenhuma carteira encontrada</h3>
          <p className="text-brand-muted text-sm leading-relaxed">As carteiras são criadas automaticamente com os primeiros agendamentos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {wallets.map(wallet => (
            <div key={wallet.id} className="flashlight-card p-5 rounded-[2rem] relative overflow-hidden flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-[1rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <iconify-icon icon={getWalletIcon(wallet.type)} class="text-lg" />
                </div>
                <span className="text-[9px] font-mono font-black text-brand-muted uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  {getWalletLabel(wallet.type)}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest font-black mb-1">Saldo Disponível</p>
                <div className="text-2xl font-display font-black text-brand-success tracking-tighter">
                  <span className="text-sm mr-0.5 opacity-50">R$</span>
                  {(wallet.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              {wallet.type === 'subscription' && (() => {
                const availableDate = wallet.lastCreditAt
                  ? new Date(new Date(wallet.lastCreditAt).getTime() + 32 * 24 * 60 * 60 * 1000)
                  : null;
                const now = new Date();
                const isAvailable = availableDate ? availableDate <= now : false;
                return (
                  <div className={`px-3 py-2 rounded-xl flex items-center gap-2 ${isAvailable ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                    <iconify-icon icon={isAvailable ? 'solar:check-circle-bold-duotone' : 'solar:clock-circle-bold-duotone'} class={`text-sm flex-shrink-0 ${isAvailable ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <p className={`text-[9px] font-mono font-black uppercase tracking-widest ${isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isAvailable ? 'Disponível' : availableDate ? availableDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Aguardando'}
                    </p>
                  </div>
                );
              })()}
              <button
                onClick={() => { setWithdrawModal({ wallet }); setWithdrawForm({ amount: '' }); }}
                className="w-full py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all hover:border-brand-accent/40 hover:text-brand-accent active:scale-95 mt-auto"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}
              >
                Solicitar Saque
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Saques */}
      {withdrawals.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight flex items-center gap-3 px-2">
            <iconify-icon icon="solar:transfer-horizontal-bold-duotone" class="text-3xl text-brand-accent" />
            Saques
          </h2>
          <div className="flashlight-card rounded-[3rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em] font-black" style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--card-border)' }}>
                    <th className="px-8 py-6 text-left">Conta bancária</th>
                    <th className="px-8 py-6 text-left hidden md:table-cell">Data</th>
                    <th className="px-8 py-6 text-left">Status</th>
                    <th className="px-8 py-6 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-brand-accent/[0.02] transition-colors">
                      <td className="px-8 py-6 font-mono text-sm text-brand-main">{w.pixKey}</td>
                      <td className="px-8 py-6 hidden md:table-cell text-[11px] font-mono text-brand-muted">{new Date(w.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-6">
                        <span className={`text-[9px] font-mono font-black uppercase tracking-widest ${statusColor(w.status)}`}>{w.status}</span>
                      </td>
                      <td className="px-8 py-6 text-right font-mono font-black text-rose-400">
                        - R$ {w.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Saque */}
      {withdrawModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="flashlight-card w-full max-w-md rounded-[3rem] overflow-hidden" style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}>
            <div className="px-10 pt-10 pb-6 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest mb-3 block">Saque</span>
                <h2 className="text-3xl font-display font-black text-brand-main uppercase">Solicitar<span className="text-brand-accent">.</span></h2>
              </div>
              <button onClick={() => setWithdrawModal(null)} className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main transition-all hover:rotate-90" style={{ background: 'var(--input-bg)' }}>✕</button>
            </div>

            <div className="px-10 pb-10 space-y-6">
              <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <span className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Saldo disponível</span>
                <span className="font-display font-black text-brand-success text-xl">R$ {(withdrawModal.wallet.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              {!recipientActive ? (
                <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-[11px] font-mono text-amber-400 leading-relaxed">
                    {recipient?.status === 'error' || recipient?.status === 'pending'
                      ? 'Seu cadastro bancário ainda está em análise pela Stone. Assim que for aprovado, você poderá sacar por aqui.'
                      : 'Cadastre seus dados bancários antes de solicitar saque.'}
                  </p>
                  <button onClick={() => { setWithdrawModal(null); setShowRecipientForm(true); }} className="inline-block text-[10px] font-mono font-black text-brand-accent uppercase tracking-widest underline underline-offset-4">
                    Cadastrar dados bancários →
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Conta de destino</p>
                    <p className="text-sm font-mono text-brand-main">
                      Banco {recipient?.bankAccount?.bank} · Ag {recipient?.bankAccount?.branchNumber} · CC {recipient?.bankAccount?.accountNumber}-{recipient?.bankAccount?.accountCheckDigit}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest ml-1">Valor do saque (R$)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={withdrawModal.wallet.balance}
                      value={withdrawForm.amount}
                      onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="0,00"
                      className="w-full rounded-2xl py-4 px-6 text-brand-accent font-mono font-black text-xl outline-none"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
                    />
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawForm.amount}
                    className="w-full py-5 rounded-2xl bg-brand-accent text-white font-display font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,112,255,0.3)] hover:opacity-90 transition-all disabled:opacity-40"
                  >
                    {withdrawing ? 'Processando...' : 'Confirmar Saque'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
