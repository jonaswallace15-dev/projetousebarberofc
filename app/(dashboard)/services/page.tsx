'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Clock, Tag, Upload, X as XIcon, Image as ImageIcon } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import { useUI } from '@/components/UIProvider';
import type { Service, Product } from '@/types';

const emptyService: Partial<Service> = { name: '', price: 0, duration: 30, active: true };
const emptyProduct: Partial<Product> = { name: '', price: 0, stock: 0, active: true };

/* ─── Modal Component ─── */
function ServiceProductModal({
  type, serviceForm, productForm, saving,
  onClose, onChangeService, onChangeProduct,
  onSaveService, onSaveProduct,
  onDeleteService, onDeleteProduct,
}: {
  type: 'service' | 'product';
  serviceForm: Partial<Service>;
  productForm: Partial<Product>;
  saving: boolean;
  onClose: () => void;
  onChangeService: (fn: (f: Partial<Service>) => Partial<Service>) => void;
  onChangeProduct: (fn: (f: Partial<Product>) => Partial<Product>) => void;
  onSaveService: (e: React.FormEvent) => void;
  onSaveProduct: (e: React.FormEvent) => void;
  onDeleteService: (id: string) => void;
  onDeleteProduct: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isService = type === 'service';
  const form = isService ? serviceForm : productForm;
  const isEditing = !!form.id;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (isService) onChangeService(f => ({ ...f, image: url }));
      else onChangeProduct(f => ({ ...f, image: url }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    if (isService) onChangeService(f => ({ ...f, image: undefined }));
    else onChangeProduct(f => ({ ...f, image: undefined }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = () => {
    if (!form.id) return;
    if (isService) onDeleteService(form.id);
    else onDeleteProduct(form.id);
    onClose();
  };

  const inputCls = "w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none transition-all focus:border-brand-accent/60";
  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--input-border)' };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[3rem] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
        style={{ background: 'var(--header-bg)', border: '1px solid var(--card-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-10 pt-10 pb-7 flex items-start justify-between border-b" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-3">
              <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-widest text-brand-accent font-bold">
                {isEditing ? 'Editar' : 'Novo'} {isService ? 'Serviço' : 'Produto'}
              </span>
            </div>
            <h2 className="text-3xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
              {isEditing ? (isService ? serviceForm.name || 'Serviço' : productForm.name || 'Produto') : (isService ? 'Novo Serviço' : 'Novo Produto')}
              <span className="text-brand-accent">.</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-main hover:rotate-90 transition-all"
            style={{ background: 'var(--input-bg)' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={isService ? onSaveService : onSaveProduct} className="px-10 py-8 space-y-6">

          {/* Foto */}
          <div>
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest mb-3 block">
              Foto do {isService ? 'Serviço' : 'Produto'}
            </label>
            <div className="relative">
              {form.image ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden group">
                  <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-brand-accent text-white text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Upload size={12} /> Trocar
                    </button>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <XIcon size={12} /> Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 text-brand-muted hover:text-brand-accent hover:border-brand-accent/40 transition-all group"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--input-bg)' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-brand-accent/10 transition-all" style={{ background: 'var(--card-border)' }}>
                    <ImageIcon size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-mono font-black uppercase tracking-widest">Adicionar Foto</p>
                    <p className="text-[9px] font-mono text-brand-muted/60 mt-0.5">JPG, PNG ou WEBP</p>
                  </div>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome</label>
            <input
              required
              placeholder={isService ? 'Ex: Corte Degradê' : 'Ex: Pomada Modeladora'}
              value={form.name || ''}
              onChange={e => isService
                ? onChangeService(f => ({ ...f, name: e.target.value }))
                : onChangeProduct(f => ({ ...f, name: e.target.value }))}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Preço + Duração/Estoque */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Preço (R$)</label>
              <input
                required type="number" min="0" step="0.01"
                value={form.price || 0}
                onChange={e => isService
                  ? onChangeService(f => ({ ...f, price: Number(e.target.value) }))
                  : onChangeProduct(f => ({ ...f, price: Number(e.target.value) }))}
                className={`${inputCls} font-mono font-black text-brand-accent`}
                style={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">
                {isService ? 'Duração (min)' : 'Estoque'}
              </label>
              <input
                required type="number" min={isService ? 5 : 0}
                value={isService ? (serviceForm.duration || 30) : (productForm.stock || 0)}
                onChange={e => isService
                  ? onChangeService(f => ({ ...f, duration: Number(e.target.value) }))
                  : onChangeProduct(f => ({ ...f, stock: Number(e.target.value) }))}
                className={`${inputCls} font-mono font-black`}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Ações */}
          <div className={`flex gap-3 pt-2 ${isEditing ? 'flex-col sm:flex-row' : ''}`}>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15 transition-all font-mono font-black text-[11px] uppercase tracking-widest sm:w-auto w-full"
              >
                <Trash2 size={14} /> Excluir
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-5 rounded-2xl bg-brand-accent text-white font-display font-black text-[13px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,112,255,0.3)] hover:opacity-90 hover:-translate-y-0.5 transition-all disabled:opacity-40"
            >
              {saving ? 'Salvando...' : `Salvar ${isService ? 'Serviço' : 'Produto'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { user } = useAuth();
  const { confirm } = useUI();
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<'service' | 'product'>('service');
  const [serviceForm, setServiceForm] = useState<Partial<Service>>(emptyService);
  const [productForm, setProductForm] = useState<Partial<Product>>(emptyProduct);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([supabaseService.getServices(), supabaseService.getProducts()])
      .then(([s, p]) => { setServices(s); setProducts(p); })
      .finally(() => setLoading(false));
  }, [user]);

  const openServiceModal = (service?: Service) => {
    setEditingType('service');
    setServiceForm(service ? { ...service } : { ...emptyService });
    setModalOpen(true);
  };

  const openProductModal = (product?: Product) => {
    setEditingType('product');
    setProductForm(product ? { ...product } : { ...emptyProduct });
    setModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await supabaseService.upsertService(serviceForm);
      setServices(prev => serviceForm.id ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved]);
      setModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await supabaseService.upsertProduct(productForm);
      setProducts(prev => productForm.id ? prev.map(p => p.id === saved.id ? saved : p) : [...prev, saved]);
      setModalOpen(false);
    } finally { setSaving(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (!await confirm({ message: 'Excluir serviço?', danger: true, confirmLabel: 'Excluir' })) return;
    await supabaseService.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteProduct = async (id: string) => {
    if (!await confirm({ message: 'Excluir produto?', danger: true, confirmLabel: 'Excluir' })) return;
    await supabaseService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleService = async (service: Service) => {
    const updated = await supabaseService.upsertService({ ...service, active: !service.active });
    setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const toggleProduct = async (product: Product) => {
    const updated = await supabaseService.upsertProduct({ ...product, active: !product.active });
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/30 bg-brand-accent/5 mb-4">
            <span className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse shadow-[0_0_10px_#0070FF]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-accent font-bold">Catalog Management Active</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-black text-brand-main uppercase tracking-tighter leading-none">
            {activeTab === 'services' ? 'Serviços' : 'Produtos'}<span className="text-brand-accent">.</span>
          </h1>
          <p className="text-brand-muted mt-4 font-medium text-lg leading-relaxed">
            {activeTab === 'services'
              ? 'Defina seu menu de experiências e tratamentos de alta performance.'
              : 'Controle seu inventário e oferta de produtos premium.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="p-1.5 rounded-2xl flex backdrop-blur-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-8 py-3 text-[11px] font-mono uppercase tracking-[0.2em] font-bold rounded-xl transition-all ${activeTab === 'services' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'text-brand-muted hover:text-white'}`}
            >Serviços</button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-8 py-3 text-[11px] font-mono uppercase tracking-[0.2em] font-bold rounded-xl transition-all ${activeTab === 'products' ? 'bg-brand-accent text-white shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'text-brand-muted hover:text-white'}`}
            >Produtos</button>
          </div>
          <button
            onClick={() => activeTab === 'services' ? openServiceModal() : openProductModal()}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,112,255,0.4)] hover:bg-brand-accent/90 transition-all"
          >
            <Plus size={16} />
            {activeTab === 'services' ? 'Novo Serviço' : 'Novo Produto'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeTab === 'services' ? (
          <>
            {services.map(service => (
              <div
                key={service.id}
                className={`flashlight-card p-8 lg:p-10 rounded-[3.5rem] group flex flex-col justify-between hover:border-brand-accent/30 transition-all relative overflow-hidden min-h-[480px] pb-12 ${service.active === false ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-all duration-700 pointer-events-none" />
                <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <iconify-icon icon="solar:scissors-bold-duotone" class="text-9xl text-brand-accent" />
                </div>

                <div className="relative z-10 space-y-8 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-24 h-24 rounded-3xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent overflow-hidden shadow-[0_0_30px_rgba(0,112,255,0.1)]">
                      {service.image
                        ? <img src={service.image} className="w-full h-full object-cover" alt={service.name} />
                        : <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-4xl" />}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openServiceModal(service)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-brand-muted hover:text-brand-accent transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteService(service.id)} className="w-12 h-12 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/10 flex items-center justify-center rounded-2xl text-rose-500 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-3xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors leading-tight mb-2 uppercase tracking-tight">{service.name}</h3>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em]">
                      <span className="flex items-center gap-2"><Clock size={12} className="text-brand-accent" /> {service.duration} Min</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl group-hover:border-brand-accent/20 transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                    <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest mb-1 font-bold">Investimento Premium</p>
                    <div className="text-4xl font-display font-black text-brand-success tracking-tighter">
                      R$ {service.price}<span className="text-lg opacity-40 ml-1">,00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${service.active !== false ? 'bg-brand-success animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">
                      {service.active !== false ? 'Atendimento Ativo' : 'Atendimento Pausado'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleService(service)}
                    className={`w-14 h-7 rounded-full flex items-center px-1 transition-all duration-500 ${service.active !== false ? 'bg-brand-accent shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-500 transform ${service.active !== false ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => openServiceModal()}
              className="flashlight-card min-h-[480px] rounded-[3.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-12 group hover:border-brand-accent/50 transition-all"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-brand-muted group-hover:bg-brand-accent group-hover:text-white transition-all group-hover:scale-110 group-hover:rotate-12" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <Plus size={40} />
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors uppercase tracking-tight">Novo Serviço</h3>
                <p className="text-brand-muted mt-3 text-xs font-mono uppercase tracking-widest max-w-[200px]">Adicione novas experiências ao seu catálogo.</p>
              </div>
            </button>
          </>
        ) : (
          <>
            {products.map(product => (
              <div
                key={product.id}
                className={`flashlight-card p-8 lg:p-10 rounded-[3.5rem] group flex flex-col justify-between hover:border-brand-accent/30 transition-all relative overflow-hidden min-h-[480px] pb-12 ${product.active === false ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-accent/5 rounded-full blur-3xl group-hover:bg-brand-accent/10 transition-all duration-700 pointer-events-none" />
                <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <iconify-icon icon="solar:box-bold-duotone" class="text-9xl text-brand-accent" />
                </div>

                <div className="relative z-10 space-y-8 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-24 h-24 rounded-3xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(0,112,255,0.1)]">
                      {product.image
                        ? <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                        : <iconify-icon icon="solar:box-bold-duotone" class="text-4xl text-brand-accent" />}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openProductModal(product)} className="w-12 h-12 flex items-center justify-center rounded-2xl text-brand-muted hover:text-brand-accent transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="w-12 h-12 bg-rose-500/5 hover:bg-rose-500/20 border border-rose-500/10 flex items-center justify-center rounded-2xl text-rose-500 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-3xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors leading-tight mb-2 uppercase tracking-tight">{product.name}</h3>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em]">
                      <span className="flex items-center gap-2"><Tag size={12} className="text-brand-accent" /> {product.stock} Unidades</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl group-hover:border-brand-accent/20 transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                    <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest mb-1 font-bold">Valor Unitário</p>
                    <div className="text-4xl font-display font-black text-brand-success tracking-tighter">
                      R$ {product.price}<span className="text-lg opacity-40 ml-1">,00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${product.active !== false ? 'bg-brand-success animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-[10px] font-mono font-black text-brand-muted uppercase tracking-widest">
                      {product.active !== false ? 'Estoque Disponível' : 'Fora de Estoque'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleProduct(product)}
                    className={`w-14 h-7 rounded-full flex items-center px-1 transition-all duration-500 ${product.active !== false ? 'bg-brand-accent shadow-[0_0_20px_rgba(0,112,255,0.4)]' : 'bg-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-500 transform ${product.active !== false ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={() => openProductModal()}
              className="flashlight-card min-h-[480px] rounded-[3.5rem] border-2 border-dashed flex flex-col items-center justify-center text-center p-12 group hover:border-brand-accent/50 transition-all"
              style={{ borderColor: 'var(--card-border)' }}
            >
              <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-brand-muted group-hover:bg-brand-accent group-hover:text-white transition-all group-hover:scale-110 group-hover:rotate-12" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                <Plus size={40} />
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-display font-black text-brand-main group-hover:text-brand-accent transition-colors uppercase tracking-tight">Novo Produto</h3>
                <p className="text-brand-muted mt-3 text-xs font-mono uppercase tracking-widest max-w-[200px]">Adicione produtos ao seu inventário.</p>
              </div>
            </button>
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ServiceProductModal
          type={editingType}
          serviceForm={serviceForm}
          productForm={productForm}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onChangeService={setServiceForm}
          onChangeProduct={setProductForm}
          onSaveService={handleSaveService}
          onSaveProduct={handleSaveProduct}
          onDeleteService={handleDeleteService}
          onDeleteProduct={handleDeleteProduct}
        />
      )}
    </div>
  );
}
