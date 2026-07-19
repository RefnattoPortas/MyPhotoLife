'use client';

import { Package } from 'lucide-react';

export default function DashboardOrders({ orders }) {
  if (orders.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Pedidos</h2>
        <div className="text-center py-16 text-zinc-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum pedido recebido</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Pedidos</h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-xl px-5 py-4 border border-zinc-200 flex items-center justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-sm text-zinc-500">{order.customer_email}</p>
              <p className="text-xs text-zinc-400 mt-1">
                {new Date(order.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="font-semibold">R$ {parseFloat(order.total_amount).toFixed(2)}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${
                order.status === 'paid' ? 'bg-green-50 text-green-700' :
                order.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'
              }`}>
                {order.status === 'paid' ? 'Pago' : order.status === 'pending' ? 'Pendente' : 'Cancelado'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
