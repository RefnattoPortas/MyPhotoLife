'use client';

import { useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

export default function Lightbox({ items, currentIndex, onClose, onPrev, onNext, onBuy }) {
  const item = items?.[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = items && currentIndex < items.length - 1;
  const containerRef = useRef(null);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
      if (e.key === 'Tab' && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, onPrev, onNext, hasPrev, hasNext],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const closeBtn = containerRef.current?.querySelector('button[aria-label="Fechar"]');
      closeBtn?.focus();
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!item) return null;

  const showBuyButton = item.is_for_sale && parseFloat(item.price) > 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={item.filename || 'Visualizador de fotos'}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 md:px-8 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 font-medium uppercase tracking-widest">
            {currentIndex + 1}
            <span className="text-white/20 mx-1.5">/</span>
            {items.length}
          </span>
          {item.filename && (
            <span className="hidden md:inline text-sm text-white/30 font-light truncate max-w-xs">
              {item.filename}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 rounded-full text-white/60 hover:text-white transition-all duration-300 active:scale-95"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-full text-white/60 hover:text-white transition-all duration-300 active:scale-95"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-full text-white/60 hover:text-white transition-all duration-300 active:scale-95"
          aria-label="Próxima"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 pb-28">
        <img
          src={item.optimized_path}
          alt={item.filename || ''}
          className="max-w-full max-h-full object-contain rounded-lg select-none shadow-2xl shadow-black/50 animate-scale-in"
          draggable="false"
        />
      </div>

      {/* Dot indicators */}
      {items.length > 1 && items.length <= 20 && (
        <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const diff = i - currentIndex;
                if (diff < 0) for (let d = 0; d < Math.abs(diff); d++) onPrev?.();
                else if (diff > 0) for (let d = 0; d < diff; d++) onNext?.();
              }}
              className={`rounded-full transition-all duration-500 ${
                i === currentIndex
                  ? 'w-6 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Ir para foto ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center px-6 py-6 bg-gradient-to-t from-black/60 to-transparent z-10">
        {showBuyButton ? (
          <button
            onClick={() => onBuy?.(item)}
            className="flex items-center gap-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 px-8 py-3.5 rounded-full text-sm font-semibold shadow-xl shadow-amber-500/20 hover:shadow-amber-400/30 active:scale-95 transition-all duration-300"
          >
            <ShoppingBag className="w-4 h-4" />
            Comprar por R$ {parseFloat(item.price).toFixed(2)}
          </button>
        ) : (
          <span className="text-white/20 text-xs font-medium uppercase tracking-[0.15em]">
            Foto do portfólio
          </span>
        )}
      </div>
    </div>
  );
}
