'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AlbumModal from '@/components/dashboard/AlbumModal';
import UploadDropzone from '@/components/dashboard/UploadDropzone';
import {
  Plus, Image as ImageIcon, Package, Settings, LogOut, Camera,
  DollarSign, Images, FolderOpen, ArrowLeft, Trash2, Pencil,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState({ albumCount: 0, mediaCount: 0, orderCount: 0, revenue: 0 });
  const [albums, setAlbums] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Album modal
  const [albumModal, setAlbumModal] = useState({ open: false, mode: 'create', album: null });

  // Album detail view
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumMedia, setAlbumMedia] = useState([]);

  // Config form
  const [configForm, setConfigForm] = useState({ name: '', bio: '', pix_key: '', pix_key_type: 'random' });

  useEffect(() => {
    setUser({ id: 'dev', email: 'dev@local', name: 'Dev', role: 'admin' });
    setTenant({ id: 'dev', name: 'Minha Conta', slug: 'dev' });
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, albumsData, ordersData, profileData] = await Promise.all([
        api.tenant.stats().then((r) => r).catch(() => ({ stats: {} })),
        api.albums.list().catch(() => ({ albums: [] })),
        api.orders.list().catch(() => ({ orders: [] })),
        api.tenant.profile().catch(() => ({})),
      ]);
      const s = statsData.stats || {};
      setStats({
        albumCount: s.albumCount ?? 0,
        mediaCount: s.mediaCount ?? 0,
        orderCount: s.orderCount ?? 0,
        revenue: s.revenue ?? 0,
      });
      setAlbums(albumsData.albums || []);
      setOrders(ordersData.orders || []);
      if (profileData.tenant) {
        setProfile(profileData.tenant);
        setConfigForm({
          name: profileData.tenant.name || '',
          bio: profileData.tenant.bio || '',
          pix_key: profileData.tenant.pix_key || '',
          pix_key_type: profileData.tenant.pix_key_type || 'random',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlbum = useCallback(async (data) => {
    const res = await api.albums.create(data);
    setAlbumModal({ open: false, mode: 'create', album: null });
    loadData();
    return res;
  }, []);

  const handleEditAlbum = useCallback(async (data) => {
    await api.albums.update(albumModal.album.id, data);
    setAlbumModal({ open: false, mode: 'create', album: null });
    if (selectedAlbum?.id === albumModal.album.id) {
      setSelectedAlbum((prev) => ({ ...prev, ...data }));
    }
    loadData();
  }, [albumModal.album, selectedAlbum]);

  const handleDeleteAlbum = async (id) => {
    if (!confirm('Excluir este álbum e todas as suas fotos?')) return;
    await api.albums.delete(id);
    if (selectedAlbum?.id === id) setSelectedAlbum(null);
    loadData();
  };

  const openAlbum = async (album) => {
    const data = await api.albums.get(album.id);
    setSelectedAlbum(data.album);
    setAlbumMedia(data.media || []);
  };

  const handleSaveProfile = async () => {
    await api.tenant.update(configForm);
    alert('Configurações salvas!');
  };

  const handleLogout = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedAlbum ? (
              <button onClick={() => setSelectedAlbum(null)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}
            <span className="text-lg font-bold tracking-tight">MyImagesLife</span>
            <span className="text-sm text-zinc-400">/</span>
            <span className="text-sm text-zinc-600">{tenant?.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`/${tenant?.slug}`}
              target="_blank"
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Camera className="w-4 h-4 inline mr-1" />
              Ver portfólio
            </a>
            <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              <LogOut className="w-4 h-4 inline mr-1" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {selectedAlbum ? (
          /* === ALBUM DETAIL VIEW === */
          <div>
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">{selectedAlbum.title}</h1>
                {selectedAlbum.description && (
                  <p className="text-zinc-500 mt-1">{selectedAlbum.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                  <span>{albumMedia.length} fotos</span>
                  {selectedAlbum.is_for_sale && (
                    <span className="text-green-600 font-medium">
                      R$ {parseFloat(selectedAlbum.price).toFixed(2)}
                    </span>
                  )}
                  <span className={selectedAlbum.is_public ? 'text-green-600' : 'text-zinc-400'}>
                    {selectedAlbum.is_public ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAlbumModal({ open: true, mode: 'edit', album: selectedAlbum })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteAlbum(selectedAlbum.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>

            {/* Upload */}
            <div className="mb-8">
              <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Fazer Upload</h2>
              <UploadDropzone
                albumId={selectedAlbum.id}
                onUploadComplete={() => openAlbum(selectedAlbum)}
              />
            </div>

            {/* Imagess grid */}
            {albumMedia.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">Fotos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {albumMedia.map((m) => (
                    <div key={m.id} className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                      <img src={m.thumbnail_path} alt="" className="w-full h-full object-cover" />
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
                            onClick={async () => {
                              await api.media.update(m.id, { is_for_sale: true, price: 0 });
                              openAlbum(selectedAlbum);
                            }}
                            className="text-xs bg-white text-zinc-900 px-2 py-1 rounded-lg"
                          >
                            Por à venda
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              await api.media.update(m.id, { is_for_sale: false, price: 0 });
                              openAlbum(selectedAlbum);
                            }}
                            className="text-xs bg-white text-zinc-900 px-2 py-1 rounded-lg"
                          >
                            Remover venda
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const price = prompt('Preço (R$):', m.price || '0');
                            if (price !== null) {
                              await api.media.update(m.id, { price: parseFloat(price), is_for_sale: parseFloat(price) > 0 });
                              openAlbum(selectedAlbum);
                            }
                          }}
                          className="text-xs bg-white text-zinc-900 px-2 py-1 rounded-lg"
                        >
                          Preço
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Excluir esta foto?')) {
                              await api.media.delete(m.id);
                              openAlbum(selectedAlbum);
                            }
                          }}
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

            {albumMedia.length === 0 && (
              <div className="text-center py-16 text-zinc-400">
                <Images className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhuma foto ainda. Arraste suas fotos acima!</p>
              </div>
            )}
          </div>
        ) : (
          /* === MAIN DASHBOARD === */
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Álbuns', value: stats.albumCount, icon: FolderOpen, color: 'bg-blue-50 text-blue-600' },
                { label: 'Fotos', value: stats.mediaCount, icon: Images, color: 'bg-violet-50 text-violet-600' },
                { label: 'Pedidos', value: stats.orderCount, icon: Package, color: 'bg-amber-50 text-amber-600' },
                { label: 'Faturamento', value: `R$ ${stats.revenue.toFixed(2)}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl p-5 border border-zinc-200">
                  <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <div className="text-sm text-zinc-500 mt-0.5">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 border border-zinc-200 w-fit overflow-x-auto">
              {[
                { key: 'overview', label: 'Visão Geral', icon: ImageIcon },
                { key: 'albums', label: 'Álbuns', icon: FolderOpen },
                { key: 'orders', label: 'Pedidos', icon: Package },
                { key: 'settings', label: 'Configurar', icon: Settings },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    tab === t.key ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB: Overview */}
            {tab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-zinc-200">
                  <h3 className="font-medium mb-2">Álbuns Recentes</h3>
                  {albums.length === 0 ? (
                    <p className="text-sm text-zinc-400">Nenhum álbum criado.</p>
                  ) : (
                    <div className="space-y-2">
                      {albums.slice(0, 5).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => openAlbum(a)}
                          className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden flex-shrink-0">
                            {a.cover_thumbnail ? (
                              <img src={a.cover_thumbnail} alt="" className="w-full h-full object-cover" />
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
                <div className="bg-white rounded-2xl p-6 border border-zinc-200">
                  <h3 className="font-medium mb-2">Últimos Pedidos</h3>
                  {orders.length === 0 ? (
                    <p className="text-sm text-zinc-400">Nenhum pedido recebido.</p>
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
            )}

            {/* TAB: Albums */}
            {tab === 'albums' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Seus Álbuns</h2>
                  <button
                    onClick={() => setAlbumModal({ open: true, mode: 'create', album: null })}
                    className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Álbum
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => openAlbum(album)}
                      className="bg-white rounded-2xl border border-zinc-200 overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="aspect-[4/3] bg-zinc-100 relative">
                        {album.cover_thumbnail ? (
                          <img src={album.cover_thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-300">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span
                            onClick={(e) => { e.stopPropagation(); setAlbumModal({ open: true, mode: 'edit', album }); }}
                            className="bg-white/90 backdrop-blur-sm text-zinc-700 p-1.5 rounded-lg hover:bg-white"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </span>
                          <span
                            onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                            className="bg-white/90 backdrop-blur-sm text-red-500 p-1.5 rounded-lg hover:bg-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        {album.is_for_sale && (
                          <span className="absolute bottom-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            R$ {parseFloat(album.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium">{album.title}</h3>
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
                        onClick={() => setAlbumModal({ open: true, mode: 'create', album: null })}
                        className="text-sm text-zinc-900 underline"
                      >
                        Criar primeiro álbum
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Orders */}
            {tab === 'orders' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Pedidos</h2>
                {orders.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pedido recebido</p>
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {/* TAB: Settings */}
            {tab === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Configurações do Perfil</h2>
                <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={configForm.name}
                      onChange={(e) => setConfigForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Biografia</label>
                    <textarea
                      rows={3}
                      value={configForm.bio}
                      onChange={(e) => setConfigForm((p) => ({ ...p, bio: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm resize-none"
                      placeholder="Conte um pouco sobre você para seus clientes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Chave Pix</label>
                    <input
                      type="text"
                      value={configForm.pix_key}
                      onChange={(e) => setConfigForm((p) => ({ ...p, pix_key: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                      placeholder="Sua chave Pix"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo da Chave</label>
                    <select
                      value={configForm.pix_key_type}
                      onChange={(e) => setConfigForm((p) => ({ ...p, pix_key_type: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm bg-white"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">Email</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Album Modal */}
      {albumModal.open && (
        <AlbumModal
          mode={albumModal.mode}
          album={albumModal.album}
          onClose={() => setAlbumModal({ open: false, mode: 'create', album: null })}
          onSave={albumModal.mode === 'edit' ? handleEditAlbum : handleCreateAlbum}
        />
      )}
    </div>
  );
}
