'use client';

import { Camera, LogOut, ArrowLeft } from 'lucide-react';

export default function DashboardHeader({ tenant, selectedAlbum, onBack, onLogout }) {
  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedAlbum ? (
            <button onClick={onBack} className="text-zinc-400 hover:text-zinc-900 transition-colors" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : null}
          <span className="text-lg font-bold tracking-tight">MyImagesLife</span>
          <span className="text-sm text-zinc-400">/</span>
          <span className="text-sm text-zinc-600">{tenant?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/${tenant?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            title="Ver portfólio"
          >
            <Camera className="w-4 h-4 inline" />
            <span className="hidden sm:inline sm:ml-1">Ver portfólio</span>
          </a>
          <button onClick={onLogout} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors" title="Sair">
            <LogOut className="w-4 h-4 inline" />
            <span className="hidden sm:inline sm:ml-1">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
