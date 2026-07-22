'use client';

import { FolderOpen, Images, Package, DollarSign, ImageIcon } from 'lucide-react';

const STAT_CARDS = [
  { key: 'albums', label: 'Álbuns', icon: FolderOpen, color: 'bg-blue-50 text-blue-600', valueKey: 'albumCount' },
  { key: 'photos', label: 'Fotos', icon: Images, color: 'bg-violet-50 text-violet-600', valueKey: 'mediaCount' },
  { key: 'orders', label: 'Pedidos', icon: Package, color: 'bg-amber-50 text-amber-600', valueKey: 'orderCount' },
  { key: 'revenue', label: 'Faturamento', icon: DollarSign, color: 'bg-green-50 text-green-600', valueKey: 'revenue' },
];

export default function DashboardOverview({ stats, albums, orders, onOpenAlbum }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:col-span-2">
        {STAT_CARDS.map((card) => {
          let value = stats[card.valueKey];
          if (card.valueKey === 'revenue') value = `R$ ${(value || 0).toFixed(2)}`;
          return (
            <div key={card.key} className="bg-white rounded-2xl p-5 border border-zinc-200">
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-zinc-500 mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Albums */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <h3 className="font-medium mb-2">Álbuns Recentes</h3>
        {albums.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum álbum criado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {albums.slice(0, 5).map((a) => (
              <button
                key={a.id}
                onClick={() => onOpenAlbum(a)}
                className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                  {a.cover_thumbnail ? (
                    <img src={a.cover_thumbnail} alt={a.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-zinc-300 m-auto mt-2.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  <p className="text-xs text-zinc-400">{a.media_count} fotos</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200">
        <h3 className="font-medium mb-2">Últimos Pedidos</h3>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum pedido recebido.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{o.customer_name}</p>
                  <p className="text-xs text-zinc-400">{o.customer_email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  o.status === 'paid' ? 'bg-green-50 text-green-700' :
                  o.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {o.status === 'paid' ? 'Pago' : o.status === 'pending' ? 'Pendente' : 'Cancelado'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
