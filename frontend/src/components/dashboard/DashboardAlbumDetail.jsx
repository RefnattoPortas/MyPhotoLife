'use client';

import { Pencil, Trash2, ImageIcon, Images } from 'lucide-react';
import UploadDropzone from './UploadDropzone';
import { showToast } from '@/components/ui/Toast';

export default function DashboardAlbumDetail({
  album, media, onRefresh, onEditAlbum, onDeleteAlbum, onSetPrice, onSetForSale, onRemoveSale, onDeleteMedia
}) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{album.title}</h1>
          {album.description && (
            <p className="text-zinc-500 mt-1 text-sm">{album.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-400">
            <span>{media.length} fotos</span>
            {album.is_for_sale && (
              <span className="text-green-600 font-medium">
                R$ {parseFloat(album.price).toFixed(2)}
              </span>
            )}
            <span className={album.is_public ? 'text-green-600' : 'text-zinc-400'}>
              {album.is_public ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => onEditAlbum(album)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => onDeleteAlbum(album)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Fazer Upload</h2>
        <UploadDropzone
          albumId={album.id}
          onUploadComplete={() => onRefresh()}
        />
      </div>

      {media.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Fotos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {media.map((m) => (
              <div key={m.id} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                <img src={m.thumbnail_path || m.optimized_path} alt={m.filename || 'Foto do álbum'} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  {m.is_for_sale && (
                    <span className="text-white text-xs font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      R$ {parseFloat(m.price).toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!m.is_for_sale ? (
                    <button
                      onClick={() => onSetForSale(m)}
                      className="text-xs bg-white text-zinc-900 px-2 py-1 rounded-lg"
                    >
                      Por à venda
                    </button>
                  ) : (
                    <button
                      onClick={() => onRemoveSale(m)}
                      className="text-xs bg-white text-zinc-900 px-2 py-1 rounded-lg"
                    >
                      Remover venda
                    </button>
                  )}
                  <button
                    onClick={() => onSetPrice(m)}
                    className="text-xs bg-white text-zinc-900 px-2 py-1 rounded-lg"
                  >
                    Preço
                  </button>
                  <button
                    onClick={() => onDeleteMedia(m)}
                    className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg ml-auto"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <Images className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhuma foto ainda. Arraste suas fotos acima!</p>
        </div>
      )}
    </div>
  );
}
