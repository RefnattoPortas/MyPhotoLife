'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, ShoppingBag } from 'lucide-react';

export default function MasonryGrid({ items, onImageClick, columnCount = 3 }) {
  const [columns, setColumns] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!items?.length) { setColumns([]); return; }
    const cols = Array.from({ length: columnCount }, () => []);
    items.forEach((item, i) => {
      cols[i % columnCount].push(item);
    });
    setColumns(cols);
  }, [items, columnCount]);

  if (!items?.length) return null;

  return (
    <div ref={containerRef} className="flex gap-4 md:gap-5">
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 flex flex-col gap-4 md:gap-5">
          {col.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid cursor-pointer rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 hover:border-stone-300/60 hover:shadow-lg hover:shadow-stone-200/30 transition-all duration-500 group relative"
              onClick={() => onImageClick?.(item)}
            >
              <img
                src={item.optimized_path}
                alt={item.filename || ''}
                className="w-full h-auto block group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex items-center justify-center">
                <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <Eye className="w-[18px] h-[18px] text-white" />
                </div>
              </div>

              {item.is_for_sale && parseFloat(item.price) > 0 && (
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="bg-stone-900/80 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <ShoppingBag className="w-3 h-3 text-amber-400" />
                    R$ {parseFloat(item.price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
