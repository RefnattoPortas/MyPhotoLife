'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Camera, ShoppingBag, ArrowRight, Trash2, X, AlertCircle, Image as ImageIcon, User, Mail, Calendar, MapPin, Instagram, Twitter, Phone, MessageCircle } from 'lucide-react';

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('animate-fade-up');
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function ScrollReveal({ children, className = '' }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`opacity-0 ${className}`}>{children}</div>;
}

export default function PortfolioPage({ params }) {
  const router = useRouter();
  const { slug } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState('albums');

  useEffect(() => {
    api.portfolio.get(slug)
      .then((res) => setData(res || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data?.photographer?.theme) return;
    const theme = data.photographer.theme;
    const bg = theme.bg_color || '#fafaf9';
    const hover = theme.hover_color || '#1c1917';
    const rawText = theme.text_color || '';
    const isDark = /^#[0-9a-f]{6}$/i.test(bg) && parseInt(bg.replace('#',''),16) < 0x808080;
    const textColor = /^#[0-9a-f]{6}$/i.test(rawText) ? rawText : (isDark ? '#f5f5f4' : '#1c1917');
    const textSecondary = isDark ? '#a8a29e' : '#78716c';
    const surface = isDark ? '#2d2a27' : '#ffffff';
    const border = isDark ? '#3d3a37' : '#e7e5e4';
    const heroFrom = isDark ? '#2d2a27' : '#f5f5f4';

    let styleEl = document.getElementById('portfolio-theme');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'portfolio-theme';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .portfolio-root {
        background-color: ${bg} !important;
        color: ${textColor} !important;
      }
      .portfolio-root .bg-stone-50,
      .portfolio-root .bg-stone-100,
      .portfolio-root div:has(> .pf-hero) { background-color: ${bg} !important; }
      .portfolio-root .bg-white { background-color: ${surface} !important; }
      .portfolio-root .bg-stone-900,
      .portfolio-root .bg-zinc-900 { background-color: ${hover} !important; }
      .portfolio-root .text-stone-900,
      .portfolio-root .text-zinc-900,
      .portfolio-root .text-stone-800,
      .portfolio-root .text-zinc-800 { color: ${textColor} !important; }
      .portfolio-root .text-stone-500,
      .portfolio-root .text-zinc-500,
      .portfolio-root .text-stone-400,
      .portfolio-root .text-zinc-400 { color: ${textSecondary} !important; }
      .portfolio-root .border-stone-200,
      .portfolio-root .border-stone-100,
      .portfolio-root .border-zinc-200 { border-color: ${border} !important; }
      .portfolio-root .hover\\:bg-stone-800:hover,
      .portfolio-root .hover\\:bg-zinc-800:hover { background-color: ${adjustColor(hover, -20)} !important; }
      .portfolio-root .hover\\:text-stone-900:hover,
      .portfolio-root .hover\\:text-zinc-900:hover { color: ${textColor} !important; }
      .portfolio-root button:not(.no-theme) { transition: all 0.2s !important; }
      .portfolio-root header { backdrop-filter: blur(12px) !important; }
      .portfolio-root .pf-hero {
        background: ${bg} !important;
      }
      .portfolio-root [class*="bg-gradient"] { background: ${bg} !important; }
      .portfolio-root [class*="radial-gradient"] { background-image: none !important; }
      .portfolio-root .pf-accent {
        background-color: ${hover} !important;
        color: ${getContrastColor(hover)} !important;
      }
    `;

    if (theme.font && theme.font !== 'Inter') {
      styleEl.textContent += `
        .portfolio-root { font-family: '${theme.font}', system-ui, sans-serif !important; }
      `;
      const linkId = `gf-${theme.font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${theme.font.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    } else {
      styleEl.textContent += `
        .portfolio-root { font-family: 'Inter', system-ui, sans-serif !important; }
      `;
    }
  }, [data]);

  function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function getContrastColor(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    const luminance = (0.299 * (num >> 16) + 0.587 * ((num >> 8) & 0x00FF) + 0.114 * (num & 0x0000FF)) / 255;
    return luminance > 0.5 ? '#1c1917' : '#ffffff';
  }

  const addToCart = (item) => {
    setCart((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-stone-200" />
          <div className="absolute inset-0 rounded-full border-2 border-t-stone-900 animate-spin" />
        </div>
        <p className="mt-5 text-[11px] font-medium text-stone-400 uppercase tracking-[0.2em] animate-pulse">
          Carregando
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center p-10 bg-white border border-stone-200 rounded-3xl shadow-sm max-w-sm">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Camera className="w-6 h-6 text-stone-400" />
          </div>
          <h1 className="text-lg font-semibold text-stone-900 mb-2">Portfólio não encontrado</h1>
          <p className="text-sm text-stone-500 mb-7 leading-relaxed">
            Não conseguimos encontrar este portfólio. Verifique o link e tente novamente.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-all duration-300"
          >
            Ir para Home
          </Link>
        </div>
      </div>
    );
  }

  const { photographer, albums, schedule } = data;
  const cartTotal = cart.reduce((acc, item) => acc + parseFloat(item.price || 0), 0);

  return (
    <div className="portfolio-root min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-stone-900/15 backdrop-blur-lg shadow-md shadow-black/10 border-b border-black/10 transition-all duration-500">
        <div className="relative z-10 max-w-6xl mx-auto px-6 h-[52px] md:h-16 flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="text-sm font-semibold tracking-tight text-white/90 hover:text-white transition-colors"
          >
            {photographer.name}
          </Link>
          <button
            onClick={() => cart.length > 0 && setShowCart(!showCart)}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500 ${
              cart.length > 0
                ? 'bg-white/20 text-white shadow-lg shadow-black/10 hover:bg-white/30'
                : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80'
            }`}
            disabled={cart.length === 0}
            aria-label="Carrinho"
          >
            <ShoppingBag className="w-[18px] h-[18px]" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-950 font-bold text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-[52px] md:h-16" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-8 md:pt-16 md:pb-12">
        {photographer.theme?.cover_url ? (
          <div className="absolute inset-0">
            <img src={photographer.theme.cover_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-stone-50" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-stone-100/60 to-stone-50" />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-stone-100 border-4 border-white shadow-lg mb-6 overflow-hidden animate-fade-in">
             <img src={photographer.theme?.profile_photo_url || "https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=200&auto=format&fit=crop"} className="w-full h-full object-cover" alt={photographer.name}/>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-stone-900 leading-[1.08] animate-fade-up">
            {photographer.name}
          </h1>
          {photographer.headline ? (
            <p className="mt-5 max-w-2xl mx-auto text-stone-500 text-base md:text-lg leading-relaxed font-light animate-fade-up stagger-2">
              {photographer.headline}
            </p>
          ) : (
            <p className="mt-5 max-w-2xl mx-auto text-stone-400 text-base md:text-lg leading-relaxed font-light italic animate-fade-up stagger-2">
              Capturando momentos extraordinários e transformando-os em memórias eternas.
            </p>
          )}
          
          {/* Navigation Tabs */}
          <div className="mt-10 flex items-center justify-start sm:justify-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar max-w-full animate-fade-up stagger-3 px-2">
             {[
                { id: 'albums', label: 'Álbuns', icon: ImageIcon },
                ...(photographer.bio ? [{ id: 'about', label: 'Quem Sou', icon: User }] : []),
                ...(schedule?.length > 0 ? [{ id: 'schedule', label: 'Agenda', icon: Calendar }] : []),
                { id: 'contact', label: 'Contato', icon: Mail },
              ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center gap-2 px-2 sm:px-3 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                     activeTab === tab.id
                       ? 'border-stone-900 text-stone-900'
                       : 'border-transparent text-stone-400 hover:text-stone-700'
                   }`}
                 >
                   <tab.icon size={16} />
                   {tab.label}
                 </button>
              ))}
           </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 pb-24 min-h-[40vh]">
        {/* TAB: ALBUMS */}
        {activeTab === 'albums' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {albums.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-6">
                {albums.map((album, i) => (
                  <ScrollReveal key={album.id} className={`stagger-${Math.min(i + 1, 6)}`}>
                    <Link
                      href={`/${slug}/albums/${album.id}`}
                      className="group block rounded-2xl overflow-hidden bg-white border border-stone-200/80 hover:border-stone-300/80 hover:shadow-lg hover:shadow-stone-200/50 hover:-translate-y-1 transition-all duration-500"
                    >
                      <div className="aspect-[4/3] bg-stone-100 overflow-hidden relative">
                        {album.cover_thumbnail ? (
                          <img
                            src={album.cover_thumbnail}
                            alt={album.title}
                            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <ImageIcon className="w-10 h-10" />
                          </div>
                        )}
                        {album.is_for_sale && (
                          <span className="absolute top-4 left-4 bg-amber-500/90 backdrop-blur-sm text-stone-950 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg">
                            R$ {parseFloat(album.price).toFixed(2)}
                          </span>
                        )}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.1), transparent, transparent)' }} />
                      </div>
                      <div className="p-5 md:p-6">
                        <h3 className="font-semibold text-stone-900 group-hover:text-stone-700 transition-colors flex items-center justify-between gap-2">
                          <span className="truncate flex-1 min-w-0">{album.title}</span>
                          <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-900 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
                        </h3>
                        {album.description && (
                          <p className="mt-2 text-sm text-stone-500 line-clamp-2 leading-relaxed font-light">
                            {album.description}
                          </p>
                        )}
                        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-xs font-medium text-stone-400">
                            {album.media_count} {album.media_count === 1 ? 'foto' : 'fotos'}
                          </span>
                          {album.is_for_sale && (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                              Digital
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white border border-dashed border-stone-200 rounded-2xl max-w-lg mx-auto mt-6">
                <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Camera className="w-7 h-7 text-stone-300" />
                </div>
                <p className="text-base font-medium text-stone-500">Nenhum álbum publicado</p>
                <p className="text-sm text-stone-400 mt-1 font-light">
                  Este fotógrafo ainda não disponibilizou álbuns públicos.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: ABOUT ME */}
        {activeTab === 'about' && photographer.bio && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto mt-6">
             <div className="bg-white p-6 md:p-12 rounded-3xl border border-stone-200 shadow-sm">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">Sobre {photographer.name}</h2>
                 <div className="text-stone-600 leading-relaxed text-base md:text-lg font-light whitespace-pre-line">
                  {photographer.bio}
                </div>
                {(photographer.instagram || photographer.twitter || photographer.phone || photographer.whatsapp) && (
                  <div className="mt-8 flex flex-wrap gap-4">
                    {photographer.phone && (
                      <a href={`tel:${photographer.phone}`}
                        className="flex items-center gap-2 bg-stone-100 text-stone-800 px-6 py-3 rounded-full hover:bg-stone-200 transition-colors text-sm font-medium">
                        <Phone size={18} /> {photographer.phone}
                      </a>
                    )}
                    {photographer.whatsapp && (
                      <a href={photographer.whatsapp.startsWith('http') ? photographer.whatsapp : `https://wa.me/${photographer.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-stone-100 text-stone-800 px-6 py-3 rounded-full hover:bg-stone-200 transition-colors text-sm font-medium">
                        <MessageCircle size={18} /> WhatsApp
                      </a>
                    )}
                    {photographer.instagram && (
                      <a href={photographer.instagram} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-stone-100 text-stone-800 px-6 py-3 rounded-full hover:bg-stone-200 transition-colors text-sm font-medium">
                        <Instagram size={18} /> Instagram
                      </a>
                    )}
                    {photographer.twitter && (
                      <a href={photographer.twitter} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-stone-100 text-stone-800 px-6 py-3 rounded-full hover:bg-stone-200 transition-colors text-sm font-medium">
                        <Twitter size={18} /> Twitter
                      </a>
                    )}
                  </div>
                )}
             </div>
          </div>
        )}



        {/* TAB: SCHEDULE */}
        {activeTab === 'schedule' && schedule?.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto mt-6">
            <div className="space-y-4">
              {schedule.map((event) => (
                <div key={event.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-stone-300 transition-colors">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{event.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-stone-500 font-light flex-wrap">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(event.event_date).toLocaleDateString('pt-BR')}</span>
                      {event.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.location}</span>}
                    </div>
                  </div>
                  {event.status && (
                    <div className={`px-4 py-2 rounded-full text-[11px] font-semibold tracking-wider uppercase self-start sm:self-center ${
                      event.status === 'Agenda Aberta' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      event.status === 'Confirmado' ? 'bg-stone-100 text-stone-600 border border-stone-200' :
                      'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {event.status}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-10 text-center p-8 bg-stone-100 rounded-3xl border border-stone-200">
              <h3 className="text-xl font-semibold mb-2">Gostaria de agendar um ensaio?</h3>
              <p className="text-stone-500 mb-6 text-sm">Entre em contato para consultar datas disponíveis.</p>
              <button
                onClick={() => setActiveTab('contact')}
                className="bg-stone-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Solicitar Orçamento
              </button>
            </div>
          </div>
        )}

        {/* TAB: CONTACT */}
        {activeTab === 'contact' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto mt-6">
            <form className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-stone-200 space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Vamos Conversar</h2>
                <p className="text-stone-500 mt-2 text-sm">Preencha o formulário abaixo para entrar em contato.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Nome Completo</label>
                  <input type="text" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 transition-all" placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">E-mail</label>
                  <input type="email" className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 transition-all" placeholder="seu@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Assunto</label>
                <select className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 transition-all">
                  <option>Orçamento para Ensaio</option>
                  <option>Orçamento para Casamento</option>
                  <option>Dúvidas gerais</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Mensagem</label>
                <textarea rows={4} className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 transition-all resize-none" placeholder="Como posso ajudar?"></textarea>
              </div>
              <button type="button" className="w-full bg-stone-900 text-white font-medium py-3.5 rounded-xl hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/10 active:scale-[0.98]">
                Enviar Mensagem
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative bg-stone-50 pt-16 pb-8 mt-10 before:content-[''] before:absolute before:inset-x-0 before:bottom-0 before:h-full before:bg-gradient-to-b before:from-transparent before:to-black/30">
        <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-0 text-xs text-stone-500">
          <span>&copy; {new Date().getFullYear()} {photographer.name}</span>
          <span className="font-light">Criado com MyPhotoLife</span>
        </div>
      </footer>

      {/* Cart Sidebar */}
      {showCart && cart.length > 0 && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative w-full max-w-sm bg-white h-full shadow-2xl border-l border-stone-100 flex flex-col z-10 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h2 className="font-semibold text-stone-900">Seu Carrinho</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
              <button
                onClick={() => setShowCart(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4 bg-stone-50 rounded-xl p-3 border border-stone-100 transition-colors">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    <img src={item.thumbnail_path} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.filename || 'Foto'}</p>
                    <p className="text-sm font-semibold text-amber-600 mt-0.5">
                      R$ {parseFloat(item.price).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remover"
                  >
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-6 border-t border-stone-100 space-y-4 bg-stone-50/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-500">Total</span>
                <span className="font-bold text-lg text-stone-900">
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 text-xs text-stone-400 items-start">
                <AlertCircle className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Os arquivos digitais serão liberados para download após a confirmação do pagamento via Pix.
                </p>
              </div>

              <button className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-medium hover:bg-stone-800 active:scale-[0.98] transition-all text-sm shadow-lg shadow-stone-900/10">
                Finalizar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
