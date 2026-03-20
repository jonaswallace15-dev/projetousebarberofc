'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, Tag } from 'lucide-react';
import { supabaseService } from '@/services/supabaseService';
import { useAuth } from '@/components/AuthProvider';
import type { Service, Product } from '@/types';

const emptyService: Partial<Service> = { name: '', price: 0, duration: 30, active: true };
const emptyProduct: Partial<Product> = { name: '', price: 0, stock: 0, active: true };

export default function ServicesPage() {
  const { user } = useAuth();
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
    if (!confirm('Excluir serviço?')) return;
    await supabaseService.deleteService(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Excluir produto?')) return;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-md rounded-[2.5rem] p-8 space-y-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-black text-brand-main uppercase tracking-tight">
                {editingType === 'service'
                  ? (serviceForm.id ? 'Editar Serviço' : 'Novo Serviço')
                  : (productForm.id ? 'Editar Produto' : 'Novo Produto')}
              </h2>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-main transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>✕</button>
            </div>

            {editingType === 'service' ? (
              <form onSubmit={handleSaveService} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome</label>
                  <input required value={serviceForm.name || ''} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Preço (R$)</label>
                    <input required type="number" min="0" value={serviceForm.price || 0} onChange={e => setServiceForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Duração (min)</label>
                    <input required type="number" min="5" value={serviceForm.duration || 30} onChange={e => setServiceForm(f => ({ ...f, duration: Number(e.target.value) }))}
                      className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar Serviço'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Nome</label>
                  <input required value={productForm.name || ''} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-2xl px-5 py-4 text-brand-main font-medium outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Preço (R$)</label>
                    <input required type="number" min="0" value={productForm.price || 0} onChange={e => setProductForm(f => ({ ...f, price: Number(e.target.value) }))}
                      className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-brand-muted uppercase tracking-widest">Estoque</label>
                    <input required type="number" min="0" value={productForm.stock || 0} onChange={e => setProductForm(f => ({ ...f, stock: Number(e.target.value) }))}
                      className="w-full rounded-2xl px-5 py-4 text-brand-main font-mono font-bold outline-none transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }} />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-brand-accent text-white font-display font-black text-sm uppercase tracking-widest hover:bg-brand-accent/90 transition-all disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
