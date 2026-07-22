'use client';

import { Plus, ImageIcon, Pencil, Trash2 } from 'lucide-react';

export default function DashboardAlbums({ albums, onOpenAlbum, onCreateAlbum, onEditAlbum, onDeleteAlbum }) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-semibold">Seus Álbuns</h2>
        <button
          onClick={onCreateAlbum}
          className="flex items-center justify-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Álbum
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map((album) => (
          <div
            key={album.id}
            onClick={() => onOpenAlbum(album)}
            className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="aspect-[4/3] bg-zinc-100 relative">
                  {album.cover_thumbnail ? (
                    <img src={album.cover_thumbnail} alt={album.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-300">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); onEditAlbum(album); }}
                  className="bg-white/90 backdrop-blur-sm text-zinc-700 p-1.5 rounded-lg hover:bg-white cursor-pointer"
                  aria-label={`Editar álbum ${album.title}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAlbum(album); }}
                  className="bg-white/90 backdrop-blur-sm text-red-500 p-1.5 rounded-lg hover:bg-white cursor-pointer"
                  aria-label={`Excluir álbum ${album.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {album.is_for_sale && (
                <span className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  R$ {parseFloat(album.price).toFixed(2)}
                </span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium truncate">{album.title}</h3>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-zinc-500">{album.media_count} fotos</span>
                <span className={`text-xs ${album.is_public ? 'text-green-600' : 'text-zinc-400'}`}>
                  {album.is_public ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {albums.length === 0 && (
          <div className="col-span-full text-center py-16 text-zinc-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">Nenhum álbum ainda.</p>
            <button
              onClick={onCreateAlbum}
              className="text-sm text-zinc-900 underline"
            >
              Criar primeiro álbum
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
