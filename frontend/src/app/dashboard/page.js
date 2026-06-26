'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AlbumModal from '@/components/dashboard/AlbumModal';
import UploadDropzone from '@/components/dashboard/UploadDropzone';
import {
  Plus, Image as ImageIcon, Package, Settings, LogOut, Camera,
  DollarSign, Images, FolderOpen, ArrowLeft, Trash2, Pencil, Calendar, MapPin,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [stats, setStats] = useState({ albumCount: 0, mediaCount: 0, orderCount: 0, revenue: 0 });
  const [albums, setAlbums] = useState([]);
  const [orders, setOrders] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Album modal
  const [albumModal, setAlbumModal] = useState({ open: false, mode: 'create', album: null });

  // Album detail view
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumMedia, setAlbumMedia] = useState([]);

  const TEMPLATES = [
    { id: 'classic', name: 'Clássico', bg_color: '#fafaf9', hover_color: '#1c1917', text_color: '#1c1917', font: 'Inter' },
    { id: 'elegant', name: 'Elegante', bg_color: '#ffffff', hover_color: '#b91c1c', text_color: '#1c1917', font: 'Playfair Display' },
    { id: 'modern', name: 'Moderno', bg_color: '#f0f0f0', hover_color: '#0369a1', text_color: '#1c1917', font: 'Montserrat' },
    { id: 'warm', name: 'Aconchegante', bg_color: '#fef3c7', hover_color: '#92400e', text_color: '#1c1917', font: 'Merriweather' },
    { id: 'dark', name: 'Escuro', bg_color: '#1c1917', hover_color: '#fafaf9', text_color: '#f5f5f4', font: 'Inter' },
    { id: 'soft', name: 'Suave', bg_color: '#fdf2f8', hover_color: '#be185d', text_color: '#1c1917', font: 'Nunito' },
    { id: 'nature', name: 'Natureza', bg_color: '#f0fdf4', hover_color: '#166534', text_color: '#1c1917', font: 'Lora' },
    { id: 'ocean', name: 'Oceano', bg_color: '#ecfeff', hover_color: '#0f766e', text_color: '#1c1917', font: 'Poppins' },
  ];

  const getCurrentTemplateId = (tc) => {
    return TEMPLATES.find((t) => t.bg_color === tc.bg_color && t.hover_color === tc.hover_color && t.text_color === tc.text_color && t.font === tc.font)?.id || null;
  };

  // Config form
  const [configForm, setConfigForm] = useState({ name: '', bio: '', headline: '', pix_key: '', pix_key_type: 'random', instagram: '', twitter: '', phone: '', whatsapp: '', theme_config: { bg_color: '#fafaf9', hover_color: '#1c1917', text_color: '#1c1917', font: 'Inter', cover_url: '' } });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedTenant) setTenant(JSON.parse(storedTenant));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, albumsData, ordersData, profileData, scheduleData] = await Promise.all([
        api.tenant.stats().then((r) => r).catch(() => ({ stats: {} })),
        api.albums.list().catch(() => ({ albums: [] })),
        api.orders.list().catch(() => ({ orders: [] })),
        api.tenant.profile().catch(() => ({})),
        api.schedule.list().catch(() => ({ schedule: [] })),
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
      setSchedule(scheduleData.schedule || []);
      if (profileData.tenant) {
        setProfile(profileData.tenant);
        const tc = profileData.tenant.theme_config || {};
        setConfigForm({
          name: profileData.tenant.name || '',
          bio: profileData.tenant.bio || '',
          headline: profileData.tenant.headline || '',
          pix_key: profileData.tenant.pix_key || '',
          pix_key_type: profileData.tenant.pix_key_type || 'random',
          instagram: profileData.tenant.instagram || '',
          twitter: profileData.tenant.twitter || '',
          phone: profileData.tenant.phone || '',
          whatsapp: profileData.tenant.whatsapp || '',
          theme_config: {
            bg_color: tc.bg_color || '#fafaf9',
            hover_color: tc.hover_color || '#1c1917',
            text_color: tc.text_color || '#1c1917',
            font: tc.font || 'Inter',
            cover_url: tc.cover_url || '',
          },
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

  function ScheduleForm({ onSaved }) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');
    const [status, setStatus] = useState('Agenda Aberta');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!title || !date) return;
      setSaving(true);
      try {
        await api.schedule.create({ title, event_date: date, location, status });
        setTitle(''); setDate(''); setLocation(''); setStatus('Agenda Aberta');
        onSaved();
      } catch (err) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Novo Evento</h3>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm" placeholder="Ex: Casamento" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm bg-white">
              <option value="Agenda Aberta">Agenda Aberta</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Vagas Encerradas">Vagas Encerradas</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Local</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm" placeholder="Ex: São Paulo, SP" />
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50">
          {saving ? 'Salvando...' : 'Adicionar Evento'}
        </button>
      </form>
    );
  }

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
          <div className="flex items-center gap-3">
            <a
              href={`/${tenant?.slug}`}
              target="_blank"
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              title="Ver portfólio"
            >
              <Camera className="w-4 h-4 sm:inline" />
              <span className="hidden sm:inline sm:ml-1">Ver portfólio</span>
            </a>
            <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors" title="Sair">
              <LogOut className="w-4 h-4 sm:inline" />
              <span className="hidden sm:inline sm:ml-1">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {selectedAlbum ? (
          /* === ALBUM DETAIL VIEW === */
          <div>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{selectedAlbum.title}</h1>
                {selectedAlbum.description && (
                  <p className="text-zinc-500 mt-1 text-sm">{selectedAlbum.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-zinc-400">
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
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setAlbumModal({ open: true, mode: 'edit', album: selectedAlbum })}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm hover:bg-zinc-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteAlbum(selectedAlbum.id)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
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
                { key: 'schedule', label: 'Agenda', icon: Calendar },
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <h2 className="text-xl font-semibold">Seus Álbuns</h2>
                  <button
                    onClick={() => setAlbumModal({ open: true, mode: 'create', album: null })}
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

            {/* TAB: Schedule */}
            {tab === 'schedule' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Agenda</h2>
                <div className="max-w-lg space-y-6">
                  <ScheduleForm
                    onSaved={() => api.schedule.list().then(r => setSchedule(r.schedule || [])).catch(() => {})}
                  />
                  {schedule.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                      <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Nenhum evento na agenda</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedule.map((ev) => (
                        <div key={ev.id} className="bg-white rounded-xl p-4 border border-zinc-200 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{ev.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                              <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ev.event_date).toLocaleDateString('pt-BR')}</span>
                              {ev.location && <span className="flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                              ev.status === 'Agenda Aberta' ? 'bg-emerald-50 text-emerald-600' :
                              ev.status === 'Confirmado' ? 'bg-stone-100 text-stone-600' :
                              'bg-rose-50 text-rose-600'
                            }`}>
                              {ev.status}
                            </span>
                            <button
                              onClick={async () => {
                                if (confirm('Excluir este evento?')) {
                                  await api.schedule.delete(ev.id);
                                  const r = await api.schedule.list();
                                  setSchedule(r.schedule || []);
                                }
                              }}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Settings */}
            {tab === 'settings' && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Configurações do Perfil</h2>
                <div className="space-y-8 max-w-lg">
                  {/* Perfil */}
                  <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Informações</h3>
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
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Frase de Destaque (cabeçalho)</label>
                      <input
                        type="text"
                        value={configForm.headline}
                        onChange={(e) => setConfigForm((p) => ({ ...p, headline: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                        placeholder="Fotógrafa especializada em casamentos e ensaios"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Biografia (aba Quem Sou)</label>
                      <textarea
                        rows={3}
                        value={configForm.bio}
                        onChange={(e) => setConfigForm((p) => ({ ...p, bio: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm resize-none"
                        placeholder="Conte um pouco sobre você para seus clientes..."
                      />
                    </div>
                  </div>

                  {/* Pix */}
                  <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Pagamento</h3>
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
                  </div>

                  {/* Redes Sociais */}
                  <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Redes Sociais</h3>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={configForm.instagram}
                        onChange={(e) => setConfigForm((p) => ({ ...p, instagram: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                        placeholder="https://instagram.com/seuperfil"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Twitter / X</label>
                      <input
                        type="text"
                        value={configForm.twitter}
                        onChange={(e) => setConfigForm((p) => ({ ...p, twitter: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                        placeholder="https://twitter.com/seuperfil"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={configForm.phone}
                        onChange={(e) => setConfigForm((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">WhatsApp</label>
                      <input
                        type="text"
                        value={configForm.whatsapp}
                        onChange={(e) => setConfigForm((p) => ({ ...p, whatsapp: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
                        placeholder="https://wa.me/5511999999999"
                      />
                    </div>
                  </div>

                  {/* Aparência */}
                  <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Aparência do Portfólio</h3>

                    {/* Capa */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Capa do Portfólio</label>
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="w-full sm:w-24 h-48 sm:h-24 rounded-xl border border-zinc-200 overflow-hidden flex-shrink-0 bg-zinc-100">
                          {configForm.theme_config.cover_url ? (
                            <img src={configForm.theme_config.cover_url} alt="Capa" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors">
                            <Camera className="w-4 h-4" />
                            {configForm.theme_config.cover_url ? 'Trocar imagem' : 'Escolher imagem'}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const token = localStorage.getItem('auth_token');
                              const formData = new FormData();
                              formData.append('file', file);
                              try {
                                const res = await fetch('/api/tenant/upload', {
                                  method: 'POST',
                                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                                  body: formData,
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, cover_url: data.url } }));
                                } else {
                                  alert(data.message || 'Erro ao enviar imagem');
                                }
                              } catch {
                                alert('Erro ao enviar imagem');
                              }
                            }} />
                          </label>
                          {configForm.theme_config.cover_url && (
                            <button
                              onClick={() => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, cover_url: '' } }))}
                              className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors"
                            >
                              Remover capa
                            </button>
                          )}
                          <p className="mt-1 text-xs text-zinc-400">Recomendado: 1920x600px</p>
                        </div>
                      </div>
                    </div>

                    {/* Template Selector */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Template</label>
                      <div className="grid grid-cols-4 gap-2">
                        {TEMPLATES.map((t) => {
                          const isActive = getCurrentTemplateId(configForm.theme_config) === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, bg_color: t.bg_color, hover_color: t.hover_color, text_color: t.text_color, font: t.font } }))}
                              className={`relative rounded-xl p-3 border-2 transition-all text-center ${
                                isActive ? 'border-zinc-900 ring-2 ring-zinc-900/20' : 'border-zinc-200 hover:border-zinc-400'
                              }`}
                            >
                              <div className="flex gap-1 mb-2 justify-center">
                                <div className="w-5 h-5 rounded-full border border-zinc-200" style={{ backgroundColor: t.bg_color }} />
                                <div className="w-5 h-5 rounded-full border border-zinc-200" style={{ backgroundColor: t.hover_color }} />
                              </div>
                              <span className="text-[11px] font-medium text-zinc-600 block leading-tight">{t.name}</span>
                              {isActive && (
                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                                  <span className="text-white text-[10px] leading-none">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Cor de Fundo</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={configForm.theme_config.bg_color}
                          onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, bg_color: e.target.value } }))}
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={configForm.theme_config.bg_color}
                          onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, bg_color: e.target.value } }))}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Cor de Destaque (hover)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={configForm.theme_config.hover_color}
                          onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, hover_color: e.target.value } }))}
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={configForm.theme_config.hover_color}
                          onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, hover_color: e.target.value } }))}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Cor da Fonte</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={configForm.theme_config.text_color}
                          onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, text_color: e.target.value } }))}
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={configForm.theme_config.text_color}
                          onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, text_color: e.target.value } }))}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Fonte</label>
                      <select
                        value={configForm.theme_config.font}
                        onChange={(e) => setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, font: e.target.value } }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm bg-white"
                      >
                        <option value="Inter">Inter (Padrão)</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Merriweather">Merriweather</option>
                        <option value="Nunito">Nunito</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Lora">Lora</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Salvar Configurações
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
