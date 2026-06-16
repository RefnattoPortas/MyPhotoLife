'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ArrowLeft, ShoppingBag, Camera, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import MasonryGrid from '@/components/portfolio/MasonryGrid';
import Lightbox from '@/components/portfolio/Lightbox';

export default function AlbumPage({ params }) {
  const { slug, id } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    api.portfolio.getAlbum(slug, id)
      .then(setData)
      .catch(() => {
        setData({
          album: {
            id,
            title: 'Ensaios Externos',
            description: 'Sessões ao ar livre com luz natural. Fotos espontâneas e cheias de personalidade.',
            price: '149.90',
            is_for_sale: true,
            is_public: true,
          },
          media: Array.from({ length: 12 }, (_, i) => ({
            id: `m${i}`,
            filename: `foto_${i + 1}.jpg`,
            optimized_path: null,
            thumbnail_path: null,
            width: 1200,
            height: Math.floor(800 + Math.random() * 600),
            is_for_sale: i % 3 === 0,
            price: (i % 3 === 0) ? '29.90' : '0',
            display_order: i,
          })),
        });
      })
      .finally(() => setLoading(false));
  }, [slug, id]);

  useEffect(() => {
    if (!data?.theme) return;
    const theme = data.theme;
    const root = document.documentElement;
    if (theme.bg_color) root.style.setProperty('--color-bg', theme.bg_color);
    if (theme.hover_color) root.style.setProperty('--color-hover', theme.hover_color);
    if (theme.font && theme.font !== 'Inter') {
      root.style.setProperty('--font-family', `'${theme.font}', system-ui, sans-serif`);
      const id = `gf-${theme.font.replace(/\s+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${theme.font.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    } else if (theme.font === 'Inter') {
      root.style.setProperty('--font-family', `'Inter', system-ui, sans-serif`);
    }
  }, [data]);

  const handleBuy = (item) => {
    setCart((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
    setLightboxIndex(null);
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
            <ImageIcon className="w-6 h-6 text-stone-400" />
          </div>
          <h1 className="text-lg font-semibold text-stone-900 mb-2">Álbum não encontrado</h1>
          <p className="text-sm text-stone-500 mb-7 leading-relaxed">
            Este álbum pode ter sido removido ou estar inativo.
          </p>
          <Link
            href={`/${slug}`}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-medium hover:bg-stone-800 transition-all duration-300"
          >
            Voltar para o Portfólio
          </Link>
        </div>
      </div>
    );
  }

  const { album, media } = data;
  const albumOnSale = album.is_for_sale && parseFloat(album.price) > 0;
  const cartTotal = cart.reduce((acc, item) => acc + parseFloat(item.price || 0), 0);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/60 backdrop-blur-lg border-b border-stone-100/80 transition-all duration-500">
        <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link
              href={`/${slug}`}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-white border border-stone-200 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all duration-300 flex-shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-stone-900 truncate">{album.title}</h1>
              {album.description && (
                <p className="text-xs text-stone-400 font-light truncate max-w-[140px] sm:max-w-sm">
                  {album.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {albumOnSale && (
              <button
                onClick={() => {
                  const albumItem = { id: album.id, type: 'album', title: album.title, price: album.price };
                  setCart((prev) => prev.find((i) => i.id === album.id) ? prev : [...prev, albumItem]);
                }}
                className="flex items-center gap-1.5 sm:gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-semibold hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all duration-300"
              >
                <ShoppingBag className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                <span className="hidden sm:inline">Álbum Completo</span>
                <span className="hidden sm:inline">&middot;</span>
                <span className="hidden sm:inline">R$ {parseFloat(album.price).toFixed(2)}</span>
                <span className="sm:hidden font-bold">{parseFloat(album.price).toFixed(2)}</span>
              </button>
            )}

            {cart.length > 0 && (
              <Link
                href={`/${slug}`}
                className="relative flex items-center justify-center w-9 h-9 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors flex-shrink-0"
                title="Ver carrinho"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-950 font-bold text-[9px] w-[18px] h-[18px] rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-16 md:h-20" />

      <main className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        {media.length > 0 ? (
          <div>
            <div className="flex items-center justify-between pb-5 mb-8 border-b border-stone-200">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.2em]">
                Fotos
              </span>
              <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg">
                {media.length} {media.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
            <MasonryGrid
              items={media}
              onImageClick={(item) => setLightboxIndex(media.indexOf(item))}
            />
          </div>
        ) : (
          <div className="text-center py-24 bg-white border border-dashed border-stone-200 rounded-2xl max-w-lg mx-auto">
            <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Camera className="w-7 h-7 text-stone-300" />
            </div>
            <p className="text-base font-medium text-stone-500">Nenhuma foto neste álbum</p>
            <p className="text-sm text-stone-400 mt-1 font-light">
              Este álbum ainda não possui fotos publicadas.
            </p>
          </div>
        )}
      </main>

      {lightboxIndex !== null && (
        <Lightbox
          items={media}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(media.length - 1, i + 1))}
          onBuy={handleBuy}
        />
      )}

      {cart.length > 0 && lightboxIndex === null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-stone-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-xl shadow-stone-950/20 border border-white/10 flex items-center gap-5 w-[90%] max-w-sm animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <ShoppingBag className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-semibold">Carrinho</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {cart.length} {cart.length === 1 ? 'item' : 'itens'} &middot; R$ {cartTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <Link
            href={`/${slug}`}
            className="bg-white hover:bg-stone-100 text-stone-950 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 flex-shrink-0"
          >
            Ver Carrinho
          </Link>
        </div>
      )}
    </div>
  );
}
