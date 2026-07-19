'use client';

import { ImageIcon, FolderOpen, Calendar, Package, Settings } from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Visão Geral', icon: ImageIcon },
  { key: 'albums', label: 'Álbuns', icon: FolderOpen },
  { key: 'schedule', label: 'Agenda', icon: Calendar },
  { key: 'orders', label: 'Pedidos', icon: Package },
  { key: 'settings', label: 'Configurar', icon: Settings },
];

export default function DashboardNav({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 border border-zinc-200 w-fit overflow-x-auto">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === t.key ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <t.icon className="w-4 h-4" />
          {t.label}
        </button>
      ))}
    </div>
  );
}
