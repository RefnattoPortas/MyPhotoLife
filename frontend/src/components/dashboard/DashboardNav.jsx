'use client';

import { useRouter } from 'next/navigation';
import { ImageIcon, FolderOpen, Calendar, Package, Settings } from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'Visão Geral', icon: ImageIcon, href: '/dashboard' },
  { key: 'albums', label: 'Álbuns', icon: FolderOpen, href: '/dashboard?tab=albums' },
  { key: 'schedule', label: 'Agenda', icon: Calendar, href: '/dashboard?tab=schedule' },
  { key: 'orders', label: 'Pedidos', icon: Package, href: '/dashboard?tab=orders' },
  { key: 'settings', label: 'Configurar', icon: Settings, href: '/dashboard?tab=settings' },
];

export default function DashboardNav({ activeTab, onTabChange }) {
  const router = useRouter();

  return (
    <nav className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 border border-zinc-200 w-fit overflow-x-auto" aria-label="Navegação do painel">
      {TABS.map((t) => (
        <a
          key={t.key}
          href={t.href}
          onClick={(e) => {
            e.preventDefault();
            onTabChange(t.key);
            router.push(t.href, { scroll: false });
          }}
          role="tab"
          aria-selected={activeTab === t.key}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === t.key ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <t.icon className="w-4 h-4" />
          {t.label}
        </a>
      ))}
    </nav>
  );
}
