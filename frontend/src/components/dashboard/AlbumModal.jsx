'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const titleRef = useRef(null);
  const modalRef = useRef(null);
  const triggerRef = useRef(null);
  const lastFocusRef = useRef(null);

  useEffect(() => {
    lastFocusRef.current = document.activeElement;
    titleRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Tab') {
      const focusable = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusRef.current?.focus();
    };
  }, [handleKeyDown]);

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Título é obrigatório';
    if (form.is_for_sale && (form.price === '' || parseFloat(form.price) < 0)) {
      errors.price = 'Informe um preço válido';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        price: form.is_for_sale ? parseFloat(form.price || 0) : 0,
      });
    } catch (err) {
      setError(err.message || 'Erro ao salvar álbum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-modal-title"
      aria-describedby="album-modal-desc"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <h2 id="album-modal-title" className="text-lg font-semibold">{isEditing ? 'Editar Álbum' : 'Novo Álbum'}</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl" role="alert">{error}</div>
          )}
          <p id="album-modal-desc" className="sr-only">Preencha os campos do álbum e clique em salvar.</p>

          <div>
            <label htmlFor="album-title" className="block text-sm font-medium text-zinc-700 mb-1">
              Título <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="album-title"
              ref={titleRef}
              name="title"
              value={form.title}
              onChange={handleChange}
              aria-required="true"
              aria-invalid={!!fieldErrors.title}
              aria-describedby={fieldErrors.title ? 'album-title-error' : undefined}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-zinc-900 ${
                fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-zinc-200'
              }`}
              placeholder="Ex: Casamento João & Maria"
            />
            {fieldErrors.title && (
              <p id="album-title-error" className="mt-1 text-xs text-red-500" role="alert">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="album-desc" className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
            <textarea
              id="album-desc"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors resize-none text-sm"
              placeholder="Uma breve descrição do álbum..."
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="sr-only">Opções do álbum</legend>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="album-for-sale"
                name="is_for_sale"
                checked={form.is_for_sale}
                onChange={handleChange}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <label htmlFor="album-for-sale" className="text-sm text-zinc-700 cursor-pointer">
                Álbum à venda
              </label>
            </div>

            {form.is_for_sale && (
              <div className="ml-7">
                <label htmlFor="album-price" className="block text-sm font-medium text-zinc-700 mb-1">Preço (R$)</label>
                <input
                  id="album-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  aria-invalid={!!fieldErrors.price}
                  aria-describedby={fieldErrors.price ? 'album-price-error' : undefined}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-zinc-900 ${
                    fieldErrors.price ? 'border-red-300 bg-red-50' : 'border-zinc-200'
                  }`}
                  placeholder="49,90"
                />
                {fieldErrors.price && (
                  <p id="album-price-error" className="mt-1 text-xs text-red-500" role="alert">{fieldErrors.price}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="album-public"
                name="is_public"
                checked={form.is_public}
                onChange={handleChange}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <label htmlFor="album-public" className="text-sm text-zinc-700 cursor-pointer">
                Álbum ativo (visível no portfólio)
              </label>
            </div>
          </fieldset>

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
