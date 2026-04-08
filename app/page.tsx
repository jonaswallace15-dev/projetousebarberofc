'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
    ArrowRight,
    ChevronRight,
    Github,
    Instagram,
    Smartphone,
    CheckCircle2,
    Play,
    Clock,
    ShieldCheck,
    Zap,
    BarChart3,
    Users,
    Calendar,
    Layers,
    Sparkles,
    Command,
    Database,
    Cpu,
    Monitor,
    Code2,
    TrendingUp,
    UserMinus,
    PieChart,
    Menu,
    X
} from 'lucide-react';
import { ShimmerButton } from '@/components/ui/shimmer-button';



export default function LandingPage() {
    const router = useRouter();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [showcaseActiveTab, setShowcaseActiveTab] = useState('dashboard');

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const mockTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'solar:widget-2-bold-duotone' },
        { id: 'agenda', label: 'Agenda', icon: 'solar:calendar-date-bold-duotone' },
        { id: 'clientes', label: 'Clientes', icon: 'solar:users-group-two-rounded-bold-duotone' },
        { id: 'finance', label: 'Financeiro', icon: 'solar:dollar-bold-duotone' },
        { id: 'config', label: 'Configurações', icon: 'solar:settings-bold-duotone' },
    ];
    const slides = [
        {
            img: "/hero/slide1.png",
            title: "PERFORMANCE",
            subtitle: "SUPERIOR."
        },
        {
            img: "/hero/slide2.png",
            title: "ESTÉTICA",
            subtitle: "DE ELITE."
        },
        {
            img: "/hero/slide3.png",
            title: "GESTÃO",
            subtitle: "TERMINAL."
        }
    ];

    useEffect(() => {
        const slideInterval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
        }, 3000);
        return () => clearInterval(slideInterval);
    }, [slides.length]);

    // Reveal animations logic removed

    const navItems = [
        { label: 'Início', href: '#inicio' },
        { label: 'Recursos', href: '#recursos' },
        { label: 'Planos', href: '#planos' },
        { label: 'Dúvidas', href: '#faq' }
    ];

    return (
        <div className="min-h-screen bg-brand-deep text-brand-main selection:bg-brand-accent selection:text-white font-sans overflow-x-hidden relative">

            {/* EFEITOS DE DESIGN SYSTEM OFICIAL (NEXUS) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .noise {
                    position: fixed;
                    inset: 0;
                    opacity: 0.02;
                    pointer-events: none;
                    z-index: 9999;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }
                .bg-nexus-grid {
                    background-size: 50px 50px;
                    background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0);
                }
                .text-nexus-outline {
                    color: transparent;
                    -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.8);
                    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
                    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
                }
                .text-nexus-outline:hover {
                    -webkit-text-stroke: 1.5px var(--brand-accent);
                    filter: drop-shadow(0 0 20px rgba(0, 112, 255, 0.5));
                }
                .text-reveal-wrapper {
                    overflow: hidden;
                    display: inline-block;
                    vertical-align: bottom;
                    padding-bottom: 0.1em;
                    margin-bottom: -0.1em;
                }
                .text-reveal-content {
                    transform: translateY(115%);
                    opacity: 0;
                    filter: blur(8px);
                    transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s ease, filter 1.2s ease;
                }
                .reveal, .reveal-up {
                    opacity: 1 !important;
                    transform: none !important;
                    filter: none !important;
                    transition: none !important;
                }
                .text-reveal-content {
                    transform: none !important;
                    opacity: 1 !important;
                    filter: none !important;
                }
                .carousel-slide {
                    position: absolute;
                    inset: 0;
                    transition: opacity 1s ease-in-out;
                    opacity: 0;
                    overflow: hidden;
                }
                .carousel-slide.active {
                    opacity: 1;
                }
                .carousel-slide img {
                    transform: scale(1);
                    transition: transform 6s ease-out;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    /* Filtro DS7: Grayscale com brilho para visibilidade */
                    filter: grayscale(100%) contrast(1.1) brightness(0.6);
                }
                .carousel-slide.active img {
                    transform: scale(1.1);
                }
                .dash-mockup {
                    background: #080808;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 2rem;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                @media (min-width: 768px) {
                    .dash-mockup {
                        flex-direction: row;
                    }
                }
                .dash-sidebar {
                    background: rgba(255, 255, 255, 0.02);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                }
                @media (min-width: 768px) {
                    .dash-sidebar {
                        border-bottom: none;
                        border-right: 1px solid rgba(255, 255, 255, 0.03);
                    }
                }
                .dash-item {
                    transition: all 0.3s ease;
                    border-radius: 0.75rem;
                }
                .dash-item-active {
                    background: rgba(0, 112, 255, 0.1);
                    color: #0070FF !important;
                    border: 1px solid rgba(0, 112, 255, 0.2);
                }
                .dash-content-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 1.5rem;
                }
                .animate-in-dash {
                    animation: dashIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes dashIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hero-overlay-nexus {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        to bottom,
                        rgba(3, 3, 3, 0.5) 0%,
                        rgba(3, 3, 3, 0.2) 50%,
                        rgba(3, 3, 3, 1) 100%
                    );
                    pointer-events: none;
                    z-index: 1;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}} />

            {/* CAMADAS DE FUNDO */}
            <div className="noise" />
            <div className="fixed inset-0 bg-nexus-grid pointer-events-none z-0" />

            {/* BACKGROUND DE FEIXES ANIMADOS */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className="bg-beam opacity-10 md:opacity-20"
                        style={{
                            '--x': `${i * 10}vw`,
                            '--duration': `${4 + Math.random() * 6}s`,
                            left: `${i * 10}%`
                        } as any}
                    />
                ))}
            </div>

            {/* BARRA DE NAVEGAÇÃO */}
            <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-brand-deep/60 backdrop-blur-xl">
                <div className="max-w-[1440px] mx-auto flex justify-between items-center px-6 md:px-8 py-4 md:py-5">
                    <div className="flex items-center gap-3 md:gap-4 group cursor-pointer transition-all hover:scale-105">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-accent rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_var(--brand-accent-glow)] group-hover:rotate-12 transition-all duration-500">
                            <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-2xl md:text-3xl"></iconify-icon>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-display font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">USE<span className="text-brand-accent">BARBER</span></span>
                            <span className="text-[8px] font-mono uppercase tracking-[0.4em] text-brand-muted hidden md:block">PORTAL_NEXUS_BRASIL</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-10 text-[10px] font-mono uppercase tracking-[0.3em] text-brand-muted">
                        {navItems.map((item) => (
                            <a key={item.label} href={item.href} className="hover:text-white transition-colors relative group">
                                {item.label}
                                <span className="absolute -bottom-2 left-0 w-0 h-[1px] bg-brand-accent transition-all group-hover:w-full"></span>
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/login")}
                            className="hidden md:flex items-center px-6 py-2.5 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest text-brand-main hover:bg-white/10 transition-all"
                        >
                            Login
                        </button>
                        <ShimmerButton
                            onClick={() => router.push("/login?cadastro=1")}
                            background="var(--brand-accent)"
                            shimmerColor="#ffffff"
                            className="hidden md:flex px-6 text-[10px] tracking-widest text-white border-brand-accent/50 shadow-[0_0_20px_rgba(0,112,255,0.3)]"
                        >
                            TESTAR GRÁTIS
                        </ShimmerButton>

                        <button
                            className="lg:hidden text-brand-main p-2 hover:bg-white/5 rounded-lg transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* BACKDROP PARA MOBILE MENU */}
            {isMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/90 backdrop-blur-sm z-[2000] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* SIDEBAR MOBILE - PRETO SÓLIDO (FORA DO NAV PARA EVITAR TRANSPARÊNCIA) */}
            <div className={`lg:hidden fixed inset-y-0 right-0 w-[280px] bg-black z-[2001] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) border-l border-white/10 flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,1)] ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Header da Sidebar */}
                <div className="p-8 pb-6 flex justify-between items-center border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_var(--brand-accent-glow)]">
                            <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-2xl"></iconify-icon>
                        </div>
                        <span className="font-display font-black text-lg uppercase tracking-tighter">USEBARBER</span>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="p-2 text-zinc-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Itens de Navegação */}
                <nav className="flex-1 py-12 px-6 flex flex-col gap-4">
                    {navItems.map((item, i) => (
                        <a
                            key={item.label}
                            href={item.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-[11px] font-mono font-black uppercase tracking-[0.2em] text-[#666] hover:text-white hover:bg-white/5 transition-all ${isMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                {/* Footer com Login CTA */}
                <div className="p-8 border-t border-white/10 flex flex-col gap-3">
                    <button
                        onClick={() => { setIsMenuOpen(false); router.push("/login"); }}
                        className="w-full border border-white/20 py-5 rounded-[2rem] text-[10px] font-mono font-black uppercase tracking-[0.3em] text-white active:scale-95 transition-all hover:bg-white/10"
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setIsMenuOpen(false); router.push("/login?cadastro=1"); }}
                        className="w-full bg-brand-accent py-5 rounded-[2rem] text-[10px] font-mono font-black uppercase tracking-[0.3em] text-white shadow-[0_15px_30px_rgba(0,112,255,0.4)] active:scale-95 transition-all"
                    >
                        Testar Grátis
                    </button>
                    <p className="text-[7px] font-mono text-center text-zinc-600 uppercase tracking-widest mt-2">SISTEMA_V3.0_NEXUS</p>
                </div>
            </div>

            <main className="relative z-10 scale-100 origin-top">

                {/* SEÇÃO HERO - INSPIRADA NO DS7 (AURA v3) */}
                <section id="inicio" className="relative h-screen min-h-[800px] flex items-center justify-center overflow-hidden">

                    {/* CARROSSEL DE FUNDO - ESTILO DS7 */}
                    <div className="absolute inset-0 z-0 h-full w-full">
                        {slides.map((slide, idx) => (
                            <div key={idx} className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}>
                                <img src={slide.img} alt={`Slide ${idx}`} />
                            </div>
                        ))}
                    </div>

                    {/* OVERLAY DE GRADIENTE */}
                    <div className="hero-overlay-nexus" />

                    {/* CONTEÚDO PRINCIPAL (CENTRADO) */}
                    <div
                        className="relative z-20 text-center px-4 max-w-7xl mx-auto text-white transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) will-change-transform scale-100"
                        style={{
                            transform: `translateY(${scrollY * 0.15}px)`,
                            opacity: Math.max(0, 1 - scrollY / 800)
                        }}
                    >
                        <div className="mb-8 flex justify-center reveal active">
                            <span className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-black/20 backdrop-blur-xl text-[10px] font-mono uppercase tracking-[0.4em] text-white/80">
                                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
                                A GESTÃO DE BARBEARIAS DE ELITE
                            </span>
                        </div>

                        {/* TIPOGRAFIA GIGANTE - COM EFEITO ESCALA NA ENTRADA */}
                        <h1 key={currentSlide} className="text-[clamp(3.5rem,11vw,12.5rem)] leading-[0.8] font-display font-black tracking-tighter mb-6 select-none uppercase">
                            <span className="text-reveal-wrapper reveal active block">
                                <span className="text-reveal-content block drop-shadow-2xl">
                                    {slides[currentSlide].title}
                                </span>
                            </span>
                            <span className="text-reveal-wrapper reveal active block -mt-[clamp(1rem,3vw,3.5rem)]">
                                <span className="text-reveal-content text-nexus-outline block" style={{ transitionDelay: '0.3s' }}>
                                    {slides[currentSlide].subtitle}
                                </span>
                            </span>
                        </h1>

                        <p className="text-xl md:text-3xl font-light tracking-wide max-w-3xl mx-auto mt-12 opacity-80">
                            A arquitetura digital <span className="font-medium text-brand-accent">definitiva</span> para quem exige<br className="hidden md:block" /> o ápice da estética e gestão na barbearia.
                        </p>

                        <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => router.push("/login")}
                                className="w-56 py-5 rounded-full border border-white/30 text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                Login
                            </button>

                            <ShimmerButton
                                onClick={() => router.push("/login?cadastro=1")}
                                background="var(--brand-accent)"
                                shimmerColor="#ffffff"
                                className="w-56 py-4 shadow-[0_20px_50px_rgba(0,112,255,0.4)] text-xs tracking-widest text-white border-brand-accent/50"
                            >
                                TESTAR GRÁTIS
                            </ShimmerButton>
                        </div>
                    </div>

                    {/* ELEMENTOS FLUTUANTES - DECORAÇÃO DS7 */}
                    <div className="absolute bottom-16 left-12 z-20 hidden xl:block reveal animate-float" style={{ transitionDelay: '900ms' }}>
                        <div className="p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl w-72 text-white mix-blend-difference">
                            <div className="flex items-center gap-4 mb-4">
                                <iconify-icon class="text-4xl text-brand-accent" icon="solar:scissors-square-bold-duotone"></iconify-icon>
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest">Plataforma</h4>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-accent w-full animate-shimmer"></div>
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-widest opacity-50">
                                    <span>Sync</span>
                                    <span>Global</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SEÇÃO DE RESULTADOS & CONTROLE - FOCO NO BARBEIRO */}
                <section id="recursos" className="py-24 md:py-48 bg-brand-surface/40 relative border-y border-white/5 overflow-hidden">
                    <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32 items-center lg:items-end mb-24 md:mb-32">
                            <div className="reveal text-center lg:text-left">
                                <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-[0.4em] md:tracking-[0.6em] text-brand-accent mb-6 block overflow-hidden">
                                    <span className="text-reveal-content inline-block">— O SISTEMA DEFINITIVO</span>
                                </span>
                                <h2 className="text-5xl sm:text-6xl lg:text-[6rem] xl:text-[7.5rem] font-display font-black leading-[0.85] tracking-tighter uppercase mb-10 text-white">
                                    <span className="text-reveal-wrapper block">
                                        <span className="text-reveal-content block">Controle</span>
                                    </span>
                                    <br className="hidden lg:block" />
                                    <span className="text-reveal-wrapper block lg:-mt-4">
                                        <span className="text-reveal-content block text-brand-accent italic text-outline hover:text-brand-accent transition-all" style={{ transitionDelay: '0.2s' }}>Completo.</span>
                                    </span>
                                </h2>
                                <p className="max-w-md mx-auto lg:mx-0 text-brand-muted text-lg md:text-xl lg:text-2xl font-light leading-relaxed">
                                    Mais clientes. Menos faltas. Mais lucro. <br />
                                    <span className="text-white font-medium">Tudo automatizado</span> para você focar no que importa: o corte.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:gap-8 reveal-up">
                                {[
                                    { icon: <TrendingUp />, label: 'Agendamentos', val: '+27%' },
                                    { icon: <UserMinus />, label: 'Menos Faltas', val: '-40%' },
                                    { icon: <PieChart />, label: 'Controle Financeiro', val: '100%' },
                                    { icon: <Clock />, label: 'Operação Ativa', val: '24h' }
                                ].map((stat, i) => (
                                    <div key={i} className="reveal-up p-6 md:p-10 glass rounded-2xl md:rounded-[2.5rem] border-white/5 group hover:border-brand-accent/30 transition-all text-center lg:text-left shadow-2xl" style={{ transitionDelay: `${0.1 + i * 0.1}s` }}>
                                        <div className="text-brand-accent mb-6 flex justify-center lg:justify-start group-hover:scale-110 transition-transform">{stat.icon}</div>
                                        <p className="text-2xl md:text-4xl font-display font-black mb-1 text-white">{stat.val}</p>
                                        <p className="text-[8px] md:text-[10px] font-mono text-brand-muted uppercase tracking-widest">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                            {[
                                { id: '01', title: 'Agenda Inteligente', desc: 'Preencha automaticamente horários vagos e elimine falhas na sua agenda diária.', icon: 'solar:calendar-date-bold-duotone' },
                                { id: '02', title: 'Pagamentos Integrados', desc: 'Receba via Pix diretamente pelo sistema, sem burocracia ou complicações.', icon: 'solar:banknote-bold-duotone' },
                                { id: '03', title: 'Clientes Fidelizados', desc: 'Histórico completo e IA para transformar clientes casuais em recorrentes.', icon: 'solar:users-group-two-rounded-bold-duotone' }
                            ].map((card, i) => (
                                <div key={i} className="flashlight-card p-10 md:p-14 rounded-[2.5rem] md:rounded-[4rem] group reveal-up" style={{ transitionDelay: `${i * 150}ms` }}>
                                    <div className="flex justify-between items-start mb-12">
                                        <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-2xl flex items-center justify-center text-brand-accent border border-white/5 group-hover:border-brand-accent/20 transition-all shadow-inner">
                                            <iconify-icon icon={card.icon} class="text-3xl md:text-4xl"></iconify-icon>
                                        </div>
                                        <span className="text-4xl font-display font-black text-white/5 group-hover:text-brand-accent/20 transition-all">{card.id}</span>
                                    </div>
                                    <h3 className="text-2xl md:text-4xl font-display font-bold text-white mb-6 leading-tight transition-all group-hover:text-brand-accent">{card.title}</h3>
                                    <p className="text-brand-muted leading-relaxed text-base md:text-lg font-light">{card.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SHOWCASE - O SISTEMA POR DENTRO */}
                <section id="showcase" className="py-24 md:py-48 relative px-6 md:px-12 bg-grid overflow-hidden">
                    <div className="max-w-[1440px] mx-auto">
                        <div className="text-center mb-20 md:mb-32 reveal">
                            <span className="text-[10px] font-mono uppercase tracking-[0.5em] text-brand-accent mb-8 block overflow-hidden">
                                <span className="text-reveal-content inline-block">— CONTROLE TOTAL</span>
                            </span>
                            <h2 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-display font-black leading-[0.85] md:leading-tight uppercase tracking-tighter mb-10 text-white">
                                <span className="text-reveal-wrapper reveal active block mb-2">
                                    <span className="text-reveal-content">Sua Barbearia.</span>
                                </span>
                                <span className="text-reveal-wrapper reveal active block md:inline-block">
                                    <span className="text-reveal-content text-brand-accent drop-shadow-[0_0_20px_var(--brand-accent-glow)] lg:transition-all lg:duration-700 hover:scale-105 inline-block" style={{ transitionDelay: '0.2s' }}>Sob Seu Controle.</span>
                                </span>
                            </h2>
                            <p className="text-brand-muted text-base md:text-xl max-w-2xl mx-auto font-light leading-relaxed reveal-up" style={{ transitionDelay: '0.4s' }}>
                                Uma interface cirúrgica, projetada para a elite. <br className="hidden md:block" />
                                Gerencie cada detalhe da sua operação com precisão absoluta.
                            </p>
                        </div>

                        <div className="relative group lg:perspective-2000 reveal-up" style={{ transitionDelay: '0.6s' }}>
                            {/* Brilho de fundo pulsante */}
                            <div className="absolute inset-x-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-accent/20 blur-[150px] md:blur-[300px] -z-10 animate-pulse"></div>

                            <div className="relative z-10 dash-mockup w-full max-w-[1340px] mx-auto h-[650px] md:h-[850px] shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-white/5 transition-all duration-1000 group-hover:scale-[1.01] group-hover:rotate-x-1">

                                {/* SIDEBAR MOCKUP - INTERATIVO */}
                                <div className="dash-sidebar w-full md:w-[260px] p-4 md:p-8 flex flex-row md:flex-col gap-2 md:gap-10 overflow-x-auto md:overflow-visible no-scrollbar shrink-0">
                                    <div className="flex items-center gap-3 px-2 md:mb-4 shrink-0 pr-6 border-r border-white/5 md:border-none">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-accent rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_var(--brand-accent-glow)]">
                                            <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-xl md:text-2xl"></iconify-icon>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-display font-black text-sm md:text-lg tracking-tighter text-white leading-none">USEBARBER</span>
                                            <span className="text-[6px] md:text-[7px] font-mono text-brand-accent tracking-[0.3em] uppercase mt-0.5 md:mt-1 hidden sm:block">PRO SUITE</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-2 flex-1 items-center md:items-stretch">
                                        {[
                                            { id: 'dashboard', label: 'Dashboard', icon: 'solar:widget-2-bold-duotone' },
                                            { id: 'agenda', label: 'Agendamentos', icon: 'solar:calendar-date-bold-duotone' },
                                            { id: 'clientes', label: 'Clientes', icon: 'solar:users-group-two-rounded-bold-duotone' },
                                            { id: 'finance', label: 'Financeiro', icon: 'solar:dollar-bold-duotone' },
                                            { id: 'config', label: 'Ajustes', icon: 'solar:settings-bold-duotone' },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setShowcaseActiveTab(tab.id)}
                                                className={`dash-item flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2.5 md:py-4 whitespace-nowrap text-[9px] md:text-[10px] font-mono uppercase tracking-widest flex-shrink-0 md:flex-shrink-1 transition-all ${showcaseActiveTab === tab.id ? 'dash-item-active text-white' : 'text-brand-muted hover:text-white hover:bg-white/5'}`}
                                            >
                                                <iconify-icon icon={tab.icon} class="text-lg md:text-xl"></iconify-icon>
                                                <span>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="hidden md:block mt-auto bg-brand-accent/5 p-6 rounded-[2rem] border border-brand-accent/10">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent border border-brand-accent/20">
                                                <iconify-icon icon="solar:user-bold-duotone" class="text-xl"></iconify-icon>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-white font-bold uppercase leading-none">Barbeiro Elite</span>
                                                <span className="text-[8px] text-brand-accent font-mono tracking-widest mt-1">MASTER ADMIN</span>
                                            </div>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full w-[85%] bg-brand-accent animate-pulse"></div>
                                        </div>
                                        <p className="text-[7px] text-brand-muted text-center mt-3 font-mono tracking-widest uppercase">SINCRONIZAÇÃO_100%</p>
                                    </div>
                                </div>

                                {/* MAIN CONTENT MOCKUP */}
                                <div className="flex-1 bg-black/40 p-5 md:p-12 lg:p-16 overflow-y-auto no-scrollbar custom-scrollbar h-full relative">
                                    {showcaseActiveTab === 'dashboard' && (
                                        <div className="animate-in-dash space-y-12 lg:space-y-16 h-full">
                                            {/* Header Section with Balanced Title */}
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
                                                <div className="relative">
                                                    <h3 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-white leading-none uppercase tracking-tighter flex items-end">
                                                        Dash<span className="text-brand-accent drop-shadow-[0_0_25px_var(--brand-accent-glow)]">board</span>
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-8 lg:gap-16">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-brand-muted uppercase font-mono tracking-widest mb-2">Faturamento_Mensal</span>
                                                        <span className="text-3xl md:text-4xl font-display font-black text-white tabular-nums">R$ 18.250</span>
                                                        <span className="text-[10px] text-green-400 font-mono mt-1 flex items-center gap-1">
                                                            <iconify-icon icon="solar:round-alt-arrow-up-bold" class="text-xs"></iconify-icon>
                                                            +14.2% VS MÊS ANT.
                                                        </span>
                                                    </div>
                                                    <div className="h-16 w-px bg-white/10 hidden md:block"></div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] text-brand-muted uppercase font-mono tracking-widest mb-2">Top_Performance_Staff</span>
                                                        <span className="text-3xl md:text-4xl font-display font-black text-brand-accent italic drop-shadow-[0_0_20px_var(--brand-accent-glow)]">Staff_Elite</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Advanced Stats Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {[
                                                    { label: 'Lucro Líquido', val: 'R$ 9.4K', trend: '+14%', icon: 'solar:graph-up-bold-duotone', color: 'from-green-500/20 to-transparent', iconRef: 'text-green-400' },
                                                    { label: 'Novos Clientes', val: '42', trend: '+22%', icon: 'solar:user-plus-bold-duotone', color: 'from-blue-500/20 to-transparent', iconRef: 'text-blue-400' },
                                                    { label: 'Taxa_Retenção', val: '96%', trend: 'Estável', icon: 'solar:medal-star-bold-duotone', color: 'from-brand-accent/20 to-transparent', iconRef: 'text-brand-accent' },
                                                    { label: 'Faltas_Evitadas', val: '12', trend: 'IA_Active', icon: 'solar:shield-check-bold-duotone', color: 'from-purple-500/20 to-transparent', iconRef: 'text-purple-400' },
                                                ].map((stat, i) => (
                                                    <div key={i} className={`dash-content-card p-8 group relative overflow-hidden transition-all duration-700 hover:scale-[1.05] hover:border-brand-accent/40`}>
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-30 group-hover:opacity-60 transition-opacity`}></div>
                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-start mb-10">
                                                                <div className={`p-4 rounded-2xl bg-black/40 border border-white/5 ${stat.iconRef} shadow-2xl group-hover:scale-110 transition-transform`}>
                                                                    <iconify-icon icon={stat.icon} class="text-3xl md:text-4xl"></iconify-icon>
                                                                </div>
                                                                <span className="text-[8px] font-mono text-white/50 bg-white/5 border border-white/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                                                                    {stat.trend}
                                                                </span>
                                                            </div>
                                                            <p className="text-4xl md:text-5xl font-display font-black text-white mb-2 tracking-tight group-hover:text-brand-accent transition-colors tabular-nums">{stat.val}</p>
                                                            <p className="text-[10px] text-brand-muted uppercase tracking-[0.3em] font-mono">{stat.label}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Middle Charts & AI Hub */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                                                <div className="lg:col-span-2 dash-content-card p-10 relative overflow-hidden border-white/10">
                                                    <div className="flex justify-between items-center mb-14">
                                                        <div className="flex items-center gap-4">
                                                            <iconify-icon icon="solar:chart-2-bold-duotone" class="text-2xl text-brand-accent"></iconify-icon>
                                                            <h4 className="text-[12px] font-mono text-white tracking-[0.4em] uppercase">Atividade_Nexus_Realtime</h4>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {['24H', '7D', '30D'].map(t => (
                                                                <button key={t} className={`px-3 py-1 rounded text-[8px] font-mono border ${t === '24H' ? 'bg-brand-accent border-brand-accent text-white' : 'border-white/10 text-brand-muted hover:text-white transition-colors'}`}>{t}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-end justify-between h-[240px] gap-3 md:gap-5 px-4 relative">
                                                        {/* Animated Grid Lines */}
                                                        <div className="absolute inset-0 flex flex-col justify-between opacity-5">
                                                            {[1, 2, 3, 4].map(l => <div key={l} className="w-full h-px bg-white"></div>)}
                                                        </div>
                                                        {[45, 65, 35, 85, 100, 75, 95, 60, 40, 80, 55, 90].map((h, i) => (
                                                            <div key={i} className="flex-1 relative group cursor-pointer h-full flex flex-col justify-end">
                                                                <div className="w-full bg-brand-accent/5 group-hover:bg-brand-accent/10 transition-all rounded-t-xl absolute inset-0 mb-8"></div>
                                                                <div
                                                                    className="w-full bg-gradient-to-t from-brand-accent to-blue-400 rounded-t-xl relative group-hover:shadow-[0_0_40px_rgba(45,212,191,0.5)] transition-all duration-700"
                                                                    style={{ height: `${h}%` }}
                                                                >
                                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-deep border border-brand-accent/40 text-[9px] font-mono px-2 py-1 rounded text-white z-20">
                                                                        VAL:{h}%
                                                                    </div>
                                                                </div>
                                                                <span className="text-[7px] font-mono text-brand-muted mt-4 text-center">{10 + i}:00</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="dash-content-card p-10 bg-gradient-to-b from-brand-accent/10 to-transparent border-brand-accent/30 relative overflow-hidden group">
                                                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-accent/10 blur-[100px] rounded-full group-hover:bg-brand-accent/20 transition-all"></div>
                                                    <div className="flex items-center gap-4 mb-12 relative z-10">
                                                        <div className="w-12 h-12 rounded-2xl bg-brand-accent/20 flex items-center justify-center border border-brand-accent/30 shadow-[0_0_30px_rgba(45,212,191,0.3)]">
                                                            <iconify-icon icon="solar:magic-stick-bold-duotone" class="text-brand-accent text-3xl animate-spin-slow"></iconify-icon>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[13px] font-mono text-white tracking-[0.3em] uppercase">IA_Aura_Insights</h4>
                                                            <span className="text-[8px] font-mono text-brand-muted animate-pulse">PROCESSANDO_DADOS...</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-6 relative z-10">
                                                        {[
                                                            { text: "Ticket médio pode subir 22% com combos de barba.", accent: "border-brand-accent", score: "Score: 9.8" },
                                                            { text: "7 clientes vips não retornam há 20 dias.", accent: "border-blue-500", score: "Prioritário" },
                                                            { text: "Horários vago de Quinta-feira preenchidos em 80%.", accent: "border-purple-500", score: "Otimizado" }
                                                        ].map((insight, i) => (
                                                            <div key={i} className={`p-6 bg-black/40 rounded-2xl border-l-[6px] ${insight.accent} hover:bg-black/60 transition-all cursor-default translate-x-0 hover:translate-x-2 border-white/5`}>
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-[7px] font-mono text-brand-muted uppercase tracking-widest">{insight.score}</span>
                                                                    <iconify-icon icon="solar:check-read-bold" class="text-xs text-brand-accent/50"></iconify-icon>
                                                                </div>
                                                                <p className="text-[12px] md:text-[13px] text-white/90 leading-relaxed font-light italic">"{insight.text}"</p>
                                                            </div>
                                                        ))}
                                                        <button className="w-full py-5 mt-4 border border-brand-accent/30 rounded-2xl text-[10px] font-mono text-brand-accent uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-all shadow-xl group/btn overflow-hidden relative">
                                                            <span className="relative z-10">Ver_Relatório_Completo</span>
                                                            <div className="absolute inset-x-0 bottom-0 h-0 group-hover/btn:h-full bg-brand-accent transition-all duration-300"></div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {showcaseActiveTab === 'agenda' && (
                                        <div className="animate-in-dash space-y-8 lg:space-y-12 h-full">
                                            {/* Agenda Header: Date & Filters */}
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
                                                <div className="flex items-center gap-6 lg:gap-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-brand-muted uppercase font-mono tracking-widest mb-1">Próximo_Dia_Livre</span>
                                                        <span className="text-xl md:text-2xl font-display font-black text-white">TERÇA, 04 MAR</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-2xl">
                                                        <button className="w-10 h-10 flex items-center justify-center text-brand-muted hover:text-white transition-colors"><iconify-icon icon="solar:alt-arrow-left-linear"></iconify-icon></button>
                                                        <span className="px-4 text-[10px] font-mono text-white tracking-widest uppercase">HOJE</span>
                                                        <button className="w-10 h-10 flex items-center justify-center text-brand-muted hover:text-white transition-colors"><iconify-icon icon="solar:alt-arrow-right-linear"></iconify-icon></button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {['Tudo', 'Ativos', 'Finalizados'].map((f, i) => (
                                                        <button key={i} className={`px-4 py-2 rounded-xl text-[9px] font-mono uppercase tracking-widest border transition-all ${i === 0 ? 'bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'border-white/5 text-brand-muted hover:text-white hover:bg-white/5'}`}>{f}</button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Agenda Content */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                                                <div className="lg:col-span-2 space-y-4">
                                                    {[
                                                        { time: '09:00', client: 'Marcos Silva', service: 'Corte + Barba', status: 'Confirmado', type: 'success' },
                                                        { time: '10:30', client: 'Ricardo Oliveira', service: 'Degradê Navalhado', status: 'Em espera', type: 'warning' },
                                                        { time: '11:45', client: 'Staff_Elite', service: 'Treinamento Equipe', status: 'Bloqueado', type: 'muted' },
                                                        { time: '14:00', client: 'João Gabriel', service: 'Pigmentação', status: 'Confirmado', type: 'success' },
                                                        { time: '15:30', client: 'Disponível', service: '—', status: 'AGENDAR', type: 'accent', active: true },
                                                        { time: '17:00', client: 'Carlos Magno', service: 'Corte Clássico', status: 'Confirmado', type: 'success' },
                                                    ].map((item, i) => (
                                                        <div key={i} className={`group p-5 md:p-6 rounded-2xl border transition-all duration-500 flex items-center justify-between ${item.active ? 'border-brand-accent/40 bg-brand-accent/5 animate-pulse cursor-pointer' : 'border-white/5 bg-white/2 hover:border-white/20'}`}>
                                                            <div className="flex items-center gap-6 lg:gap-8">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-white font-display font-black text-lg lg:text-xl tracking-tight leading-none">{item.time}</span>
                                                                    <span className="text-[7px] text-brand-muted font-mono mt-1">45min</span>
                                                                </div>
                                                                <div className="h-10 w-px bg-white/5"></div>
                                                                <div>
                                                                    <p className="text-white font-bold group-hover:text-brand-accent transition-colors">{item.client}</p>
                                                                    <p className="text-[9px] text-brand-muted uppercase tracking-widest mt-0.5">{item.service}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 lg:gap-8">
                                                                <span className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-lg text-[8px] font-mono tracking-widest uppercase border ${item.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                                    item.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                                        item.type === 'accent' ? 'bg-brand-accent/20 text-brand-accent border-brand-accent/30' :
                                                                            'bg-white/5 text-brand-muted border-white/10'
                                                                    }`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'success' ? 'bg-green-400' :
                                                                        item.type === 'warning' ? 'bg-yellow-400' :
                                                                            item.type === 'accent' ? 'bg-brand-accent animate-pulse' :
                                                                                'bg-brand-muted'
                                                                        }`}></span>
                                                                    {item.status}
                                                                </span>
                                                                <div className="flex items-center gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                                                    <button className="p-2 bg-white/5 rounded-lg text-brand-muted hover:text-white"><iconify-icon icon="solar:pen-linear"></iconify-icon></button>
                                                                    <button className="p-2 bg-white/5 rounded-lg text-brand-muted hover:text-red-400"><iconify-icon icon="solar:trash-bin-trash-linear"></iconify-icon></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="dash-content-card p-8 bg-brand-accent/5 border-brand-accent/20 relative overflow-hidden group">
                                                        <h4 className="text-[10px] font-mono text-white tracking-[0.3em] uppercase mb-8">Performance_Day</h4>
                                                        <div className="space-y-6">
                                                            <div className="flex justify-between items-end">
                                                                <div>
                                                                    <p className="text-3xl font-display font-black text-white">84%</p>
                                                                    <p className="text-[8px] text-brand-muted uppercase font-mono tracking-widest">Taxa de Ocupação</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-white font-bold">14/18</p>
                                                                    <p className="text-[8px] text-brand-muted uppercase font-mono tracking-widest">Horários</p>
                                                                </div>
                                                            </div>
                                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-brand-accent w-[84%] relative">
                                                                    <div className="absolute inset-x-0 top-0 h-full bg-white/20 animate-pulse"></div>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] text-brand-muted uppercase font-mono tracking-tighter mb-1">Total Previsto</span>
                                                                    <span className="text-lg font-display font-black text-white">R$ 1.540</span>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] text-brand-muted uppercase font-mono tracking-tighter mb-1">Cortes Realiz.</span>
                                                                    <span className="text-lg font-display font-black text-white">08</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="dash-content-card p-8 border-white/5">
                                                        <h4 className="text-[10px] font-mono text-white tracking-[0.3em] uppercase mb-6 flex items-center gap-2">
                                                            <iconify-icon icon="solar:bell-bing-bold-duotone" class="text-brand-accent"></iconify-icon>
                                                            Avisos do Sistema
                                                        </h4>
                                                        <div className="space-y-4">
                                                            <div className="p-4 bg-white/2 rounded-xl border border-white/5">
                                                                <p className="text-[10px] text-white/80 leading-relaxed italic">"Ricardo Oliveira acabou de chegar. Notificar profissional?"</p>
                                                                <div className="flex gap-2 mt-4">
                                                                    <button className="flex-1 py-2 bg-brand-accent text-white text-[8px] font-mono uppercase tracking-widest rounded-lg">SIM</button>
                                                                    <button className="flex-1 py-2 bg-white/5 text-brand-muted text-[8px] font-mono uppercase tracking-widest rounded-lg border border-white/10">AGORA NÃO</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {showcaseActiveTab === 'clientes' && (
                                        <div className="animate-in-dash space-y-8 lg:space-y-12 h-full">
                                            {/* Header Stats & Search */}
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0 h-auto">
                                                <div className="flex gap-10 lg:gap-14">
                                                    <div>
                                                        <p className="text-[10px] text-brand-muted uppercase font-mono tracking-widest mb-1">Base Total</p>
                                                        <p className="text-2xl lg:text-3xl font-display font-black text-white">1.428 <span className="text-[9px] text-brand-accent ml-2 border border-brand-accent/20 px-2 rounded-full">+24 ESTE MÊS</span></p>
                                                    </div>
                                                    <div className="border-l border-white/5 pl-10 lg:pl-14">
                                                        <p className="text-[10px] text-brand-muted uppercase font-mono tracking-widest mb-1">Taxa de Retorno</p>
                                                        <p className="text-2xl lg:text-3xl font-display font-black text-white">82% <span className="text-[9px] text-green-400 ml-2 border border-green-400/20 px-2 rounded-full">ALTO</span></p>
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-80 relative group">
                                                    <iconify-icon icon="solar:magnifer-linear" class="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-hover:text-brand-accent transition-colors"></iconify-icon>
                                                    <div className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-[9px] font-mono text-brand-muted uppercase tracking-widest cursor-text group-hover:border-white/20 transition-all">Buscar_C_Id_00124...</div>
                                                </div>
                                            </div>

                                            {/* Clients Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                                {[
                                                    { name: 'Arthur Lima', visits: 12, last: 'Ontem', tag: 'VIP', color: 'bg-brand-accent/20 text-brand-accent', icon: 'solar:crown-minimalistic-bold-duotone' },
                                                    { name: 'Guilherme Santos', visits: 8, last: '3 dias atrás', tag: 'Recorrente', color: 'bg-blue-500/20 text-blue-400', icon: 'solar:re-order-bold-duotone' },
                                                    { name: 'Caio Roberto', visits: 24, last: 'Semana passada', tag: 'Fiel', color: 'bg-purple-500/20 text-purple-400', icon: 'solar:heart-bold-duotone' },
                                                    { name: 'Lucas Menezes', visits: 1, last: 'Hoje', tag: 'Novo', color: 'bg-green-500/20 text-green-400', icon: 'solar:user-plus-bold-duotone' },
                                                    { name: 'Bruno Alves', visits: 15, last: '15 dias atrás', tag: 'Master', color: 'bg-white/10 text-white', icon: 'solar:medal-star-bold-duotone' },
                                                    { name: 'Vitor Hugo', visits: 3, last: 'Há 1 mês', tag: 'Observar', color: 'bg-red-500/20 text-red-400', icon: 'solar:ghost-bold-duotone' },
                                                ].map((client, i) => (
                                                    <div key={i} className="dash-content-card p-6 md:p-8 group hover:-translate-y-2 transition-all duration-700 hover:border-brand-accent/40 relative">
                                                        <div className="flex justify-between items-start mb-8">
                                                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/5 flex items-center justify-center text-brand-accent border border-white/5 group-hover:border-brand-accent/30 transition-all font-display font-black text-xl md:text-2xl shadow-xl">
                                                                {client.name.charAt(0)}
                                                            </div>
                                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border border-white/5 font-mono text-[8px] uppercase tracking-widest ${client.color}`}>
                                                                <iconify-icon icon={client.icon} class="text-xs"></iconify-icon>
                                                                {client.tag}
                                                            </div>
                                                        </div>
                                                        <div className="mb-8">
                                                            <h5 className="text-white text-lg md:text-xl font-bold mb-2 group-hover:text-brand-accent transition-colors">{client.name}</h5>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[10px] text-brand-muted flex items-center gap-1 font-mono uppercase tracking-tighter">
                                                                    <iconify-icon icon="solar:check-circle-bold-duotone" class="text-brand-accent"></iconify-icon>
                                                                    {client.visits} Visitas
                                                                </span>
                                                                <span className="text-[10px] text-brand-muted flex items-center gap-1 font-mono uppercase tracking-tighter">
                                                                    <iconify-icon icon="solar:bill-list-bold-duotone" class="text-blue-400"></iconify-icon>
                                                                    LTV: R$ {client.visits * 85}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] text-brand-muted uppercase font-mono tracking-widest mb-1">Última Visita</span>
                                                                <span className="text-white text-[10px] uppercase font-mono">{client.last}</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button className="p-2 md:p-3 bg-white/2 border border-white/5 rounded-xl text-brand-muted hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30 transition-all group/btn shadow-lg">
                                                                    <iconify-icon icon="logos:whatsapp-icon" class="text-sm md:text-lg grayscale group-hover/btn:grayscale-0"></iconify-icon>
                                                                </button>
                                                                <button className="p-2 md:p-3 bg-white/2 border border-white/5 rounded-xl text-brand-muted hover:bg-brand-accent/10 hover:text-brand-accent hover:border-brand-accent/30 transition-all shadow-lg">
                                                                    <iconify-icon icon="solar:pen-new-square-bold-duotone" class="text-sm md:text-lg"></iconify-icon>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showcaseActiveTab === 'finance' && (
                                        <div className="animate-in-dash space-y-10 lg:space-y-12">
                                            {/* Top Summary Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {[
                                                    { label: 'Saldo Atual', val: 'R$ 14.850', icon: 'solar:wallet-money-bold-duotone', trend: '+12%', color: 'text-brand-accent' },
                                                    { label: 'Entradas (Hoje)', val: 'R$ 1.250', icon: 'solar:round-alt-arrow-down-bold-duotone', trend: '+5%', color: 'text-green-400' },
                                                    { label: 'A Receber', val: 'R$ 4.300', icon: 'solar:hourglass-line-bold-duotone', trend: 'Pendente', color: 'text-yellow-400' },
                                                ].map((card, i) => (
                                                    <div key={i} className="dash-content-card p-8 group hover:scale-[1.02] transition-transform duration-500">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className={`p-3 rounded-2xl bg-white/5 ${card.color} shadow-lg`}>
                                                                <iconify-icon icon={card.icon} class="text-3xl"></iconify-icon>
                                                            </div>
                                                            <span className="text-[8px] font-mono text-brand-muted uppercase tracking-tighter bg-black/20 px-2 py-1 rounded border border-white/5">{card.trend}</span>
                                                        </div>
                                                        <p className="text-[10px] text-brand-muted uppercase font-mono tracking-[0.2em] mb-2">{card.label}</p>
                                                        <p className="text-3xl lg:text-4xl font-display font-black text-white tracking-tight">{card.val}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Subsections: Cashflow and Transactions */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
                                                {/* Simulated Cashflow Chart */}
                                                <div className="dash-content-card p-8 border-white/10">
                                                    <div className="flex justify-between items-center mb-10">
                                                        <h4 className="text-[11px] font-mono text-white tracking-[0.3em] uppercase">Fluxo de Caixa Weekly</h4>
                                                        <div className="flex gap-4">
                                                            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-brand-accent"></span><span className="text-[8px] font-mono text-brand-muted">IN</span></div>
                                                            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400"></span><span className="text-[8px] font-mono text-brand-muted">OUT</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-end justify-between h-[160px] gap-2 lg:gap-4 px-2">
                                                        {[
                                                            { in: 60, out: 30 }, { in: 80, out: 45 }, { in: 40, out: 20 },
                                                            { in: 100, out: 50 }, { in: 70, out: 40 }, { in: 90, out: 35 }, { in: 85, out: 40 }
                                                        ].map((day, i) => (
                                                            <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative">
                                                                <div className="w-full bg-brand-accent/20 hover:bg-brand-accent transition-all duration-500 rounded-t-sm" style={{ height: `${day.in}%` }}></div>
                                                                <div className="w-full bg-red-400/20 hover:bg-red-400 transition-all duration-500 rounded-b-sm" style={{ height: `${day.out}%` }}></div>
                                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-mono text-brand-muted">D{i + 1}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Recent Transactions */}
                                                <div className="dash-content-card p-8">
                                                    <h4 className="text-[11px] font-mono text-white tracking-[0.3em] uppercase mb-10">Transações Recentes</h4>
                                                    <div className="space-y-4">
                                                        {[
                                                            { desc: 'Pgto Agendamento #442', val: '+ R$ 85,00', type: 'in' },
                                                            { desc: 'Aluguel Cadeira - Staff', val: '- R$ 120,00', type: 'out' },
                                                            { desc: 'Pgto Agendamento #441', val: '+ R$ 60,00', type: 'in' },
                                                            { desc: 'Combo Barba & Corte', val: '+ R$ 110,00', type: 'in' },
                                                            { desc: 'Fornecedor de Pomadas', val: '- R$ 245,00', type: 'out' },
                                                        ].map((tx, i) => (
                                                            <div key={i} className="flex justify-between items-center p-4 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                                                <div className="flex flex-col">
                                                                    <span className="text-white text-[11px] font-medium">{tx.desc}</span>
                                                                    <span className="text-[8px] text-brand-muted uppercase font-mono tracking-tighter">Hoje, 14:32h</span>
                                                                </div>
                                                                <span className={`text-[12px] font-display font-bold ${tx.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {tx.val}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(!['dashboard', 'agenda', 'clientes', 'finance'].includes(showcaseActiveTab)) && (
                                        <div className="animate-in-dash flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-8 lg:gap-12">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-brand-accent/20 blur-[60px] rounded-full animate-pulse"></div>
                                                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-brand-deep rounded-3xl border border-brand-accent/30 flex items-center justify-center text-brand-accent relative z-10 shadow-2xl">
                                                    <iconify-icon icon={mockTabs.find(t => t.id === showcaseActiveTab)?.icon} class="text-5xl lg:text-7xl"></iconify-icon>
                                                </div>
                                            </div>
                                            <div className="max-w-md">
                                                <h3 className="text-4xl lg:text-6xl font-display font-black text-white uppercase tracking-tighter mb-4 lg:mb-6 leading-none">Módulo {showcaseActiveTab.toUpperCase()}</h3>
                                                <p className="text-brand-muted text-sm md:text-lg font-light leading-relaxed">Navegue por uma interface otimizada para quem exige o ápice da performance. Tudo o que você precisa em uma única tela.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reflexos e ornamentos decorativos */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-accent/40 blur-[150px] rounded-full opacity-50"></div>
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-accent/20 blur-[150px] rounded-full opacity-30"></div>
                        </div>
                    </div>
                </section>

                {/* PRICING */}
                <section id="planos" className="py-24 md:py-48 relative bg-brand-deep">
                    <div className="max-w-[1440px] mx-auto px-6 md:px-12">
                        <div className="text-center mb-16 md:mb-24 reveal">
                            <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-[0.4em] md:tracking-[0.6em] text-brand-accent mb-6 block overflow-hidden">
                                <span className="text-reveal-content inline-block">— ESPEC_03_CAPITAL</span>
                            </span>
                            <h2 className="text-7xl sm:text-8xl lg:text-[9rem] xl:text-[11rem] font-display font-black leading-[0.85] md:leading-tight tracking-tighter uppercase mb-16 text-white flex flex-col md:flex-row justify-center items-center md:gap-x-8">
                                <span className="text-reveal-wrapper reveal active">
                                    <span className="text-reveal-content block">Nossos</span>
                                </span>
                                <span className="text-reveal-wrapper reveal active">
                                    <span className="text-reveal-content block text-brand-accent text-nexus-outline hover:text-brand-accent transition-all" style={{ transitionDelay: '0.1s' }}>Planos.</span>
                                </span>
                            </h2>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-16">
                                <div className="flex items-center gap-6 p-2 bg-white/5 rounded-full border border-white/5">
                                    <span className={`text-[10px] font-mono tracking-widest uppercase px-4 py-2 rounded-full transition-all duration-300 ${billingCycle === 'monthly' ? 'text-white bg-brand-accent font-bold' : 'text-brand-muted hover:text-white'}`}>MENSAL</span>
                                    <button
                                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                                        className="w-14 h-7 bg-brand-deep rounded-full p-1 relative border border-white/10 group overflow-hidden"
                                    >
                                        <div className={`w-5 h-5 bg-brand-accent rounded-full transition-all duration-500 shadow-[0_0_15px_var(--brand-accent-glow)] ${billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'}`}></div>
                                    </button>
                                    <span className={`text-[10px] font-mono tracking-widest uppercase px-4 py-2 rounded-full transition-all duration-300 ${billingCycle === 'yearly' ? 'text-white bg-brand-accent font-bold' : 'text-brand-muted hover:text-white'}`}>ANUAL</span>
                                </div>
                                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Até 2 meses grátis no anual</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14 items-stretch max-w-7xl mx-auto">
                            {[
                                {
                                    name: 'Start',
                                    tag: '🟢 ENTRADA',
                                    tagColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
                                    for: 'Barbeiro iniciante ou barbearia pequena',
                                    monthly: '29', yearly: '290',
                                    desc: 'Porta de entrada para quem quer profissionalizar o negócio sem complicação.',
                                    features: [
                                        '1 barbeiro incluído',
                                        'Agenda online completa',
                                        'Página de agendamento exclusiva',
                                        'Controle básico de clientes',
                                        'Notificações por WhatsApp',
                                        'Link público de agendamento',
                                        'Suporte por e-mail',
                                    ],
                                    accent: false, popular: false,
                                    cta: 'Começar Agora',
                                },
                                {
                                    name: 'Pro',
                                    tag: '🔵 MAIS VENDIDO',
                                    tagColor: 'text-brand-accent border-brand-accent/30 bg-brand-accent/5',
                                    for: 'Barbearia em crescimento com equipe',
                                    monthly: '49', yearly: '490',
                                    desc: 'O plano que a maioria das barbearias precisa. Tudo que importa, sem excessos.',
                                    features: [
                                        'Até 3 barbeiros',
                                        'Agenda completa + bloqueios',
                                        'Gestão avançada de clientes',
                                        'Relatórios básicos de desempenho',
                                        'Confirmação automática',
                                        'Integração WhatsApp',
                                        'Controle financeiro simples',
                                    ],
                                    accent: true, popular: true,
                                    cta: 'Assinar Pro',
                                },
                                {
                                    name: 'Premium',
                                    tag: '🟣 LUCRO REAL',
                                    tagColor: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
                                    for: 'Barbearia que já fatura e quer escalar',
                                    monthly: '79', yearly: '790',
                                    desc: 'Para quem já vê valor e quer dominar a operação por completo.',
                                    features: [
                                        'Barbeiros ilimitados',
                                        'Relatórios avançados',
                                        'Controle financeiro completo',
                                        'Gestão de comissão da equipe',
                                        'Automações (lembrete + reativação)',
                                        'Personalização da página',
                                        'Suporte prioritário dedicado',
                                    ],
                                    accent: false, popular: false,
                                    cta: 'Assinar Premium',
                                },
                            ].map((plan, i) => (
                                <div key={i} className="relative group">
                                    {plan.popular && (
                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-8 py-2 bg-brand-accent rounded-full text-[10px] font-mono font-black text-white uppercase tracking-[0.2em] z-30 shadow-[0_0_40px_var(--brand-accent-glow)] border border-white/20 whitespace-nowrap">
                                            80% das vendas
                                        </div>
                                    )}
                                    <div className={`reveal flex flex-col h-full p-10 md:p-14 rounded-[3rem] md:rounded-[4rem] border transition-all duration-700 ${plan.accent ? 'border-brand-accent/50 bg-brand-accent/[0.08] lg:scale-105 z-10 shadow-[0_40px_100px_rgba(0,102,255,0.15)]' : 'border-white/10 bg-white/[0.03] hover:border-white/20'}`} style={{ transitionDelay: `${i * 150}ms` }}>
                                        <div className="mb-10">
                                            {/* Tag colorida */}
                                            <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-black uppercase tracking-[0.35em] px-3 py-1.5 rounded-full border mb-5 ${plan.tagColor}`}>
                                                {plan.tag}
                                            </span>

                                            {/* Nome do plano */}
                                            <h3 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tighter leading-none mb-2">{plan.name}</h3>

                                            {/* Para quem */}
                                            <p className="text-[10px] font-mono text-brand-muted uppercase tracking-widest mb-6 opacity-60">{plan.for}</p>

                                            {/* Preço */}
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-xl font-light text-brand-muted">R$</span>
                                                <span className="text-6xl md:text-7xl font-display font-black text-white leading-none">{billingCycle === 'monthly' ? plan.monthly : plan.yearly}</span>
                                                <div className="flex flex-col ml-1">
                                                    <span className="text-xs text-brand-muted uppercase font-mono tracking-widest">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                                                </div>
                                            </div>

                                            {billingCycle === 'yearly' && (
                                                <p className="mt-3 text-[11px] font-mono text-emerald-400 uppercase tracking-widest font-black inline-flex items-center gap-2">
                                                    <CheckCircle2 size={10} /> Economia de R$ {parseInt(plan.monthly) * 12 - parseInt(plan.yearly)} no ano
                                                </p>
                                            )}

                                            <p className="mt-6 text-xs md:text-sm text-brand-muted leading-relaxed opacity-80 min-h-[44px]">{plan.desc}</p>
                                        </div>

                                        {/* Divisor */}
                                        <div className={`w-full h-px mb-8 ${plan.accent ? 'bg-brand-accent/20' : 'bg-white/5'}`} />

                                        <div className="space-y-4 mb-12 flex-1">
                                            {plan.features.map((f, j) => (
                                                <div key={j} className="flex items-center gap-3 group/item">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${plan.accent ? 'bg-brand-accent/15 border border-brand-accent/30' : 'bg-white/5 border border-white/10'}`}>
                                                        <iconify-icon icon="solar:check-bold" class={`text-[10px] ${plan.accent ? 'text-brand-accent' : 'text-brand-muted/50'} group-hover/item:text-brand-accent transition-all duration-300`}> </iconify-icon>
                                                    </div>
                                                    <span className="text-[11px] md:text-xs font-mono text-brand-muted group-hover/item:text-brand-main transition-colors leading-tight">{f}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => router.push("/login")}
                                            className={`w-full py-5 rounded-2xl md:rounded-3xl font-display font-black text-[13px] md:text-[14px] uppercase tracking-[0.2em] transition-all duration-500 ${plan.accent ? 'bg-brand-accent text-white shadow-[0_20px_60px_rgba(0,102,255,0.35)] hover:-translate-y-1 hover:brightness-110' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                        >
                                            {plan.cta}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Destaque Plano Anual */}
                        <div className="mt-16 md:mt-24 p-8 md:p-12 rounded-[3rem] border border-emerald-500/20 bg-emerald-500/[0.03] flex flex-col md:flex-row items-center justify-between gap-8 max-w-7xl mx-auto">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <iconify-icon icon="solar:calendar-bold-duotone" class="text-2xl text-emerald-400"></iconify-icon>
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-[0.4em] font-black mb-1">Plano Anual — Arma Secreta</p>
                                    <p className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-tight">Pague menos. Fique mais. Cresça mais.</p>
                                    <p className="text-xs font-mono text-brand-muted mt-1">Pro anual: R$ 490/ano · Premium anual: R$ 790/ano</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                                <div className="px-5 py-3 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">Pro — Economia</p>
                                    <p className="text-2xl font-display font-black text-emerald-400">R$ 98</p>
                                </div>
                                <div className="px-5 py-3 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">Premium — Economia</p>
                                    <p className="text-2xl font-display font-black text-emerald-400">R$ 158</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-24 md:mt-32 border-t border-white/5 pt-20 overflow-hidden relative">
                            {/* Gradientes de "fade" nas bordas para o carrossel (Mobile) */}
                            <div className="absolute inset-y-20 left-0 w-20 bg-gradient-to-r from-brand-deep to-transparent z-10 pointer-events-none md:hidden"></div>
                            <div className="absolute inset-y-20 right-0 w-20 bg-gradient-to-l from-brand-deep to-transparent z-10 pointer-events-none md:hidden"></div>

                            {/* Mobile: Carrossel Infinito (Duplicado) */}
                            <div className="flex md:hidden gap-12 animate-marquee w-max">
                                {[...Array(2)].map((_, groupIdx) => (
                                    <React.Fragment key={groupIdx}>
                                        {[
                                            { icon: 'solar:calendar-minimalistic-bold', text: '7 dias grátis' },
                                            { icon: 'solar:close-circle-bold', text: 'Cancele quando quiser' },
                                            { icon: 'solar:shield-check-bold', text: 'Dados protegidos' },
                                            { icon: 'solar:refresh-bold', text: 'Atualizações inclusas' },
                                            { icon: 'solar:crown-bold', text: 'Suporte em português' }
                                        ].map((item, i) => (
                                            <div key={`${groupIdx}-${i}`} className="flex flex-col items-center gap-4 text-center shrink-0 w-40">
                                                <iconify-icon icon={item.icon} class="text-3xl text-brand-accent opacity-50 transition-opacity"></iconify-icon>
                                                <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-brand-muted">{item.text}</span>
                                            </div>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>

                            {/* Desktop: Grade Estática (5 itens) */}
                            <div className="hidden md:grid md:grid-cols-5 gap-12 w-full">
                                {[
                                    { icon: 'solar:calendar-minimalistic-bold', text: '7 dias grátis' },
                                    { icon: 'solar:close-circle-bold', text: 'Cancele quando quiser' },
                                    { icon: 'solar:shield-check-bold', text: 'Dados protegidos' },
                                    { icon: 'solar:refresh-bold', text: 'Atualizações inclusas' },
                                    { icon: 'solar:crown-bold', text: 'Suporte em português' }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-4 text-center group hover:scale-110 transition-transform">
                                        <iconify-icon icon={item.icon} class="text-3xl text-brand-accent opacity-50 group-hover:opacity-100 transition-opacity"></iconify-icon>
                                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-brand-muted group-hover:text-white transition-colors">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA FINAL */}
                <section className="py-40 md:py-72 relative overflow-hidden bg-grid">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,112,255,0.1)_0%,transparent_70%)]"></div>
                    <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                        <div className="reveal">
                            <h2 className="text-6xl sm:text-6xl md:text-[5vw] xl:text-[6vw] font-display font-black leading-[0.9] uppercase tracking-tighter mb-12 text-white">
                                <span className="text-reveal-wrapper reveal active inline-block mr-3">
                                    <span className="text-reveal-content">Comece a Usar o</span>
                                </span>
                                <br />
                                <span className="text-reveal-wrapper reveal active inline-block">
                                    <span className="text-reveal-content text-brand-accent" style={{ transitionDelay: '0.2s' }}>UseBarber Hoje.</span>
                                </span>
                            </h2>
                            <p className="text-brand-muted text-lg md:text-3xl font-light mb-16 italic px-4 max-w-3xl mx-auto leading-relaxed reveal-up" style={{ transitionDelay: '0.4s' }}>
                                A conexão final que seu negócio aguardava está a um comando de distância.
                            </p>
                            <button
                                onClick={() => router.push("/login")}
                                className="btn-ultra group inline-flex items-center justify-center gap-6 px-10 py-5 md:px-16 md:py-8 w-full sm:w-auto reveal-up"
                                style={{ transitionDelay: '0.6s' }}
                            >
                                Estabelecer Conexão
                                <iconify-icon icon="solar:rocket-bold-duotone" class="text-2xl md:text-3xl group-hover:rotate-[15deg] transition-transform"></iconify-icon>
                            </button>
                        </div>
                    </div>
                </section>

            </main>

            {/* FOOTER / FAQ */}
            <footer id="faq" className="py-24 md:py-48 border-t border-white/10 bg-brand-deep relative z-20">
                <div className="max-w-[1440px] mx-auto px-6 md:px-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-20 md:gap-32 mb-24 md:mb-40">
                        <div className="lg:col-span-5 space-y-12 reveal">
                            <div className="flex items-center gap-4 group">
                                <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center text-white shadow-2xl">
                                    <iconify-icon icon="solar:scissors-square-bold-duotone" class="text-4xl"></iconify-icon>
                                </div>
                                <span className="font-display font-black text-2xl md:text-3xl tracking-tighter uppercase leading-none text-white">USE<span className="text-brand-accent">BARBER</span></span>
                            </div>
                            <p className="text-brand-muted text-xl md:text-2xl font-light leading-relaxed max-w-sm">
                                Engenharia digital de alta performance para barbearias de vanguarda.
                            </p>
                            <div className="flex gap-10">
                                <a href="#" className="text-brand-muted hover:text-brand-accent transition-all hover:scale-125"><Instagram size={32} /></a>
                                <a href="#" className="text-brand-muted hover:text-brand-accent transition-all hover:scale-125"><Smartphone size={32} /></a>
                                <a href="#" className="text-brand-muted hover:text-brand-accent transition-all hover:scale-125"><Github size={32} /></a>
                            </div>
                        </div>

                        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-16 md:gap-24 reveal-up" style={{ transitionDelay: '0.3s' }}>
                            <div>
                                <h5 className="text-[10px] md:text-[11px] font-mono text-white uppercase tracking-[0.5em] mb-12">Protocolo</h5>
                                <ul className="space-y-6 text-[9px] md:text-[11px] font-mono uppercase tracking-widest text-brand-muted font-bold">
                                    <li><a href="#" className="hover:text-brand-accent transition-colors">Especificações</a></li>
                                    <li><a href="#" className="hover:text-brand-accent transition-colors">Nexus_API</a></li>
                                    <li><a href="#" className="hover:text-brand-accent transition-colors">Core_Engine</a></li>
                                </ul>
                            </div>
                            <div>
                                <h5 className="text-[10px] md:text-[11px] font-mono text-white uppercase tracking-[0.5em] mb-12">Conexão</h5>
                                <ul className="space-y-6 text-[9px] md:text-[11px] font-mono uppercase tracking-widest text-brand-muted font-bold">
                                    <li><a href="#" className="hover:text-brand-accent transition-colors">Sobre_Nós</a></li>
                                    <li><a href="#" className="hover:text-brand-accent transition-colors">Privacidade</a></li>
                                    <li><a href="#" className="hover:text-brand-accent transition-colors">Jurídico</a></li>
                                </ul>
                            </div>
                            <div className="col-span-2 sm:col-span-1 p-8 md:p-10 glass rounded-[2rem] md:rounded-[3rem] border-brand-accent/20 flex flex-col justify-center reveal-up" style={{ transitionDelay: '0.6s' }}>
                                <p className="text-[10px] text-brand-muted font-mono uppercase tracking-widest leading-relaxed mb-8 font-bold">
                                    Acesso Alpha
                                </p>
                                <div className="relative">
                                    <input type="email" placeholder="EMAIL_ADDR" className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-4 text-[10px] font-mono outline-none focus:border-brand-accent transition-all text-white placeholder:text-white/20" />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-accent hover:scale-125 transition-transform"><ArrowRight size={20} /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 md:pt-16 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-10 text-[9px] md:text-[11px] font-mono text-brand-muted uppercase tracking-[0.3em] md:tracking-[0.5em] text-center md:text-left">
                        <p>© 2026 UseBarber. High Precision Software Engineering.</p>
                        <div className="flex flex-wrap justify-center gap-10 md:gap-16">
                            <span className="flex items-center gap-3">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]"></span>
                                OPERACIONAL: 100%
                            </span>
                            <span>BUILD_V3.4.5_LATEST</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
