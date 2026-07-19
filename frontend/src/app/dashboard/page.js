'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, setCsrfToken } from '@/lib/api';
import ToastContainer, { showToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardNav from '@/components/dashboard/DashboardNav';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import DashboardAlbums from '@/components/dashboard/DashboardAlbums';
import DashboardAlbumDetail from '@/components/dashboard/DashboardAlbumDetail';
import DashboardSchedule from '@/components/dashboard/DashboardSchedule';
import DashboardOrders from '@/components/dashboard/DashboardOrders';
import DashboardSettings from '@/components/dashboard/DashboardSettings';
import AlbumModal from '@/components/dashboard/AlbumModal';

const EMPTY_THEME = { bg_color: '#fafaf9', hover_color: '#1c1917', text_color: '#1c1917', font: 'Inter', cover_url: '', profile_photo_url: '' };

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
  const loadingRef = useRef(false);

  const [albumModal, setAlbumModal] = useState({ open: false, mode: 'create', album: null });

  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumMedia, setAlbumMedia] = useState([]);
  const [albumLoading, setAlbumLoading] = useState(false);

  const [configForm, setConfigForm] = useState({
    name: '', bio: '', headline: '', pix_key: '', pix_key_type: 'random',
    instagram: '', twitter: '', facebook: '', linkedin: '', youtube: '', tiktok: '',
    phone: '', whatsapp: '', contact_email: '',
    theme_config: { ...EMPTY_THEME },
  });

  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [priceModal, setPriceModal] = useState({ open: false, media: null, value: '' });

  useEffect(() => {
    api.auth.session()
      .then((data) => {
        setCsrfToken(data.csrfToken);
        setUser(data.user);
        setTenant(data.tenant);
        loadData();
      })
      .catch(() => {
        router.push('/login');
      });
  }, []);

  const loadData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
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
          facebook: profileData.tenant.facebook || '',
          linkedin: profileData.tenant.linkedin || '',
          youtube: profileData.tenant.youtube || '',
          tiktok: profileData.tenant.tiktok || '',
          phone: profileData.tenant.phone || '',
          whatsapp: profileData.tenant.whatsapp || '',
          contact_email: profileData.tenant.contact_email || '',
          theme_config: {
            bg_color: tc.bg_color || '#fafaf9',
            hover_color: tc.hover_color || '#1c1917',
            text_color: tc.text_color || '#1c1917',
            font: tc.font || 'Inter',
            cover_url: tc.cover_url || '',
            profile_photo_url: tc.profile_photo_url || '',
          },
        });
      }
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('Invalid or expired token')) {
        router.push('/login');
        return;
      }
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const confirmAction = (title, message, onConfirm) => {
    setConfirmModal({ open: true, title, message, onConfirm });
  };

  const handleCreateAlbum = useCallback(async (data) => {
    await api.albums.create(data);
    setAlbumModal({ open: false, mode: 'create', album: null });
    showToast('Álbum criado com sucesso');
    loadData();
  }, []);

  const handleEditAlbum = useCallback(async (data) => {
    await api.albums.update(albumModal.album.id, data);
    setAlbumModal({ open: false, mode: 'create', album: null });
    if (selectedAlbum?.id === albumModal.album.id) {
      setSelectedAlbum((prev) => ({ ...prev, ...data }));
    }
    showToast('Álbum atualizado com sucesso');
    loadData();
  }, [albumModal.album, selectedAlbum]);

  const handleDeleteAlbum = (album) => {
    confirmAction(
      'Excluir Álbum',
      `Tem certeza que deseja excluir "${album.title}" e todas as suas fotos? Esta ação não pode ser desfeita.`,
      async () => {
        await api.albums.delete(album.id);
        if (selectedAlbum?.id === album.id) setSelectedAlbum(null);
        showToast('Álbum excluído com sucesso');
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        loadData();
      },
    );
  };

  const openAlbum = async (album) => {
    setAlbumLoading(true);
    try {
      const data = await api.albums.get(album.id);
      setSelectedAlbum(data.album);
      setAlbumMedia(data.media || []);
    } catch (err) {
      showToast(err.message || 'Erro ao carregar álbum', 'error');
    } finally {
      setAlbumLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.tenant.update(configForm);
      showToast('Configurações salvas com sucesso!');
      loadData();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar configurações', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    setCsrfToken(null);
    router.push('/login');
  };

  const handleDeleteSchedule = (ev) => {
    confirmAction(
      'Excluir Evento',
      `Tem certeza que deseja excluir o evento "${ev.title}"?`,
      async () => {
        await api.schedule.delete(ev.id);
        showToast('Evento excluído');
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        const r = await api.schedule.list();
        setSchedule(r.schedule || []);
      },
    );
  };

  const handleSetMediaPrice = (m) => {
    setPriceModal({ open: true, media: m, value: m.price || '0' });
  };

  const handleSavePrice = async () => {
    const m = priceModal.media;
    const price = parseFloat(priceModal.value);
    if (isNaN(price) || price < 0) {
      showToast('Preço inválido', 'error');
      return;
    }
    try {
      await api.media.update(m.id, { price, is_for_sale: price > 0 });
      showToast('Preço atualizado');
      setPriceModal({ open: false, media: null, value: '' });
      openAlbum(selectedAlbum);
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar preço', 'error');
    }
  };

  const handleSetForSale = async (m) => {
    try {
      await api.media.update(m.id, { is_for_sale: true, price: m.price || 0 });
      openAlbum(selectedAlbum);
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar', 'error');
    }
  };

  const handleRemoveSale = async (m) => {
    try {
      await api.media.update(m.id, { is_for_sale: false, price: 0 });
      openAlbum(selectedAlbum);
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar', 'error');
    }
  };

  const handleDeleteMedia = (m) => {
    confirmAction(
      'Excluir Foto',
      'Tem certeza que deseja excluir esta foto?',
      async () => {
        await api.media.delete(m.id);
        showToast('Foto excluída');
        setConfirmModal({ open: false, title: '', message: '', onConfirm: null });
        openAlbum(selectedAlbum);
      },
    );
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
      <DashboardHeader
        tenant={tenant}
        selectedAlbum={selectedAlbum}
        onBack={() => setSelectedAlbum(null)}
        onLogout={handleLogout}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {selectedAlbum ? (
          <DashboardAlbumDetail
            album={selectedAlbum}
            media={albumMedia}
            onRefresh={() => openAlbum(selectedAlbum)}
            onEditAlbum={(album) => setAlbumModal({ open: true, mode: 'edit', album })}
            onDeleteAlbum={handleDeleteAlbum}
            onSetPrice={handleSetMediaPrice}
            onSetForSale={handleSetForSale}
            onRemoveSale={handleRemoveSale}
            onDeleteMedia={handleDeleteMedia}
          />
        ) : (
          <>
            <DashboardOverview
              stats={stats}
              albums={albums}
              orders={orders}
              onOpenAlbum={openAlbum}
            />

            <DashboardNav activeTab={tab} onTabChange={setTab} />

            {tab === 'albums' && (
              <DashboardAlbums
                albums={albums}
                onOpenAlbum={openAlbum}
                onCreateAlbum={() => setAlbumModal({ open: true, mode: 'create', album: null })}
                onEditAlbum={(album) => setAlbumModal({ open: true, mode: 'edit', album })}
                onDeleteAlbum={handleDeleteAlbum}
              />
            )}

            {tab === 'orders' && <DashboardOrders orders={orders} />}

            {tab === 'schedule' && (
              <DashboardSchedule
                schedule={schedule}
                onRefresh={async () => {
                  const r = await api.schedule.list();
                  setSchedule(r.schedule || []);
                }}
                onDelete={handleDeleteSchedule}
                api={api}
              />
            )}

            {tab === 'settings' && (
              <DashboardSettings
                configForm={configForm}
                setConfigForm={setConfigForm}
                onSave={handleSaveProfile}
              />
            )}
          </>
        )}
      </div>

      {albumModal.open && (
        <AlbumModal
          mode={albumModal.mode}
          album={albumModal.album}
          onClose={() => setAlbumModal({ open: false, mode: 'create', album: null })}
          onSave={albumModal.mode === 'edit' ? handleEditAlbum : handleCreateAlbum}
        />
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })}
      />

      {priceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPriceModal({ open: false, media: null, value: '' })}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl border border-zinc-200 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Definir Preço</h2>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceModal.value}
              onChange={(e) => setPriceModal((p) => ({ ...p, value: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none text-sm mb-4"
              placeholder="49,90"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setPriceModal({ open: false, media: null, value: '' })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSavePrice}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
