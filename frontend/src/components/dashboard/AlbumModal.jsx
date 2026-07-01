'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function AlbumModal({ mode, album, onClose, onSave }) {
  const isEditing = mode === 'edit';
  const [form, setForm] = useState({
    title: album?.title || '',
    description: album?.description || '',
    price: album?.price || '',
    is_for_sale: album?.is_for_sale || false,
    is_public: album?.is_public ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: form.is_for_sale ? parseFloat(form.price || 0) : 0,
      });
    } catch (err) {
      alert(err.message || 'Erro ao salvar álbum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <h2 className="text-lg font-semibold">{isEditing ? 'Editar Álbum' : 'Novo Álbum'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
            <input
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="Ex: Casamento João & Maria"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors resize-none"
              placeholder="Uma breve descrição do álbum..."
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_for_sale"
                checked={form.is_for_sale}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all" />
            </label>
            <span className="text-sm text-zinc-700">Álbum à venda</span>
          </div>

          {form.is_for_sale && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Preço do Álbum (R$)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
                placeholder="49,90"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_public"
                checked={form.is_public}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-zinc-200 rounded-full peer peer-checked:bg-zinc-900 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all" />
            </label>
            <span className="text-sm text-zinc-700">Álbum ativo (visível no portfólio)</span>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Álbum'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
