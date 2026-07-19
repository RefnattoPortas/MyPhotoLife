'use client';

import { Camera, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { getCsrfToken } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

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

const FONTS = ['Inter', 'Playfair Display', 'Montserrat', 'Merriweather', 'Nunito', 'Poppins', 'Lora', 'Roboto', 'Open Sans', 'Raleway'];

export default function DashboardSettings({ configForm, setConfigForm, onSave }) {
  const [saving, setSaving] = useState(false);

  const getCurrentTemplateId = (tc) => {
    return TEMPLATES.find((t) => t.bg_color === tc.bg_color && t.hover_color === tc.hover_color && t.text_color === tc.text_color && t.font === tc.font)?.id || null;
  };

  const updateTheme = (updates) => {
    setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, ...updates } }));
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    const headers = {};
    if (getCsrfToken()) headers['x-csrf-token'] = getCsrfToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    try {
      const res = await fetch('/api/tenant/upload', {
        method: 'POST', headers, credentials: 'include', body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const key = type === 'cover' ? 'cover_url' : 'profile_photo_url';
        updateTheme({ [key]: data.url });
        showToast(type === 'cover' ? 'Imagem de capa atualizada' : 'Foto de perfil atualizada');
      } else {
        showToast(data.message || 'Erro ao enviar imagem', 'error');
      }
    } catch {
      showToast('Erro ao enviar imagem', 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field) => (e) => setConfigForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Configurações do Perfil</h2>
      <div className="space-y-8 max-w-lg">

        {/* Informações */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Informações</h3>
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
            <input id="settings-name" type="text" value={configForm.name} onChange={updateField('name')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm" />
          </div>
          <div>
            <label htmlFor="settings-headline" className="block text-sm font-medium text-zinc-700 mb-1">Frase de Destaque (cabeçalho)</label>
            <input id="settings-headline" type="text" value={configForm.headline} onChange={updateField('headline')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="Fotógrafa especializada em casamentos e ensaios" />
          </div>
          <div>
            <label htmlFor="settings-bio" className="block text-sm font-medium text-zinc-700 mb-1">Biografia (aba Quem Sou)</label>
            <textarea id="settings-bio" rows={3} value={configForm.bio} onChange={updateField('bio')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm resize-none"
              placeholder="Conte um pouco sobre você para seus clientes..." />
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Pagamento</h3>
          <div>
            <label htmlFor="settings-pix" className="block text-sm font-medium text-zinc-700 mb-1">Chave Pix</label>
            <input id="settings-pix" type="text" value={configForm.pix_key} onChange={updateField('pix_key')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="Sua chave Pix" />
          </div>
          <div>
            <label htmlFor="settings-pix-type" className="block text-sm font-medium text-zinc-700 mb-1">Tipo da Chave</label>
            <select id="settings-pix-type" value={configForm.pix_key_type} onChange={updateField('pix_key_type')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm bg-white">
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
            <label htmlFor="settings-instagram" className="block text-sm font-medium text-zinc-700 mb-1">Instagram</label>
            <input id="settings-instagram" type="text" value={configForm.instagram} onChange={updateField('instagram')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://instagram.com/seuperfil" />
          </div>
          <div>
            <label htmlFor="settings-twitter" className="block text-sm font-medium text-zinc-700 mb-1">Twitter / X</label>
            <input id="settings-twitter" type="text" value={configForm.twitter} onChange={updateField('twitter')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://twitter.com/seuperfil" />
          </div>
          <div>
            <label htmlFor="settings-facebook" className="block text-sm font-medium text-zinc-700 mb-1">Facebook</label>
            <input id="settings-facebook" type="text" value={configForm.facebook} onChange={updateField('facebook')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://facebook.com/seuperfil" />
          </div>
          <div>
            <label htmlFor="settings-linkedin" className="block text-sm font-medium text-zinc-700 mb-1">LinkedIn</label>
            <input id="settings-linkedin" type="text" value={configForm.linkedin} onChange={updateField('linkedin')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://linkedin.com/in/seuperfil" />
          </div>
          <div>
            <label htmlFor="settings-youtube" className="block text-sm font-medium text-zinc-700 mb-1">YouTube</label>
            <input id="settings-youtube" type="text" value={configForm.youtube} onChange={updateField('youtube')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://youtube.com/@seuperfil" />
          </div>
          <div>
            <label htmlFor="settings-tiktok" className="block text-sm font-medium text-zinc-700 mb-1">TikTok</label>
            <input id="settings-tiktok" type="text" value={configForm.tiktok} onChange={updateField('tiktok')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://tiktok.com/@seuperfil" />
          </div>
          <div>
            <label htmlFor="settings-phone" className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
            <input id="settings-phone" type="text" value={configForm.phone} onChange={updateField('phone')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label htmlFor="settings-whatsapp" className="block text-sm font-medium text-zinc-700 mb-1">WhatsApp</label>
            <input id="settings-whatsapp" type="text" value={configForm.whatsapp} onChange={updateField('whatsapp')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://wa.me/5511999999999" />
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Contato por E-mail</h3>
          <p className="text-xs text-zinc-400">Configure um e-mail para receber mensagens do formulário de contato do seu portfólio. Deixe em branco para desativar.</p>
          <div>
            <label htmlFor="settings-contact-email" className="block text-sm font-medium text-zinc-700 mb-1">E-mail de Contato</label>
            <input id="settings-contact-email" type="email" value={configForm.contact_email} onChange={updateField('contact_email')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="contato@meuemail.com" />
          </div>
        </div>

        {/* Aparência */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Aparência do Portfólio</h3>

          {/* Capa */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2" id="settings-cover-label">Capa do Portfólio</label>
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
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], 'cover')} />
                </label>
                {configForm.theme_config.cover_url && (
                  <button onClick={() => updateTheme({ cover_url: '' })}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors">
                    Remover capa
                  </button>
                )}
                <p className="mt-1 text-xs text-zinc-400">Recomendado: 1920x600px</p>
              </div>
            </div>
          </div>

          {/* Foto do Perfil */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Foto do Perfil</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full sm:w-24 h-48 sm:h-24 rounded-xl border border-zinc-200 overflow-hidden flex-shrink-0 bg-zinc-100">
                {configForm.theme_config.profile_photo_url ? (
                  <img src={configForm.theme_config.profile_photo_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
                  {configForm.theme_config.profile_photo_url ? 'Trocar imagem' : 'Escolher imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], 'profile')} />
                </label>
                {configForm.theme_config.profile_photo_url && (
                  <button onClick={() => updateTheme({ profile_photo_url: '' })}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors">
                    Remover foto
                  </button>
                )}
                <p className="mt-1 text-xs text-zinc-400">Recomendado: 400x400px</p>
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
                  <button key={t.id} onClick={() => updateTheme({ bg_color: t.bg_color, hover_color: t.hover_color, text_color: t.text_color, font: t.font })}
                    className={`relative rounded-xl p-3 border-2 transition-all text-center ${
                      isActive ? 'border-zinc-900 ring-2 ring-zinc-900/20' : 'border-zinc-200 hover:border-zinc-400'
                    }`}>
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
            <label htmlFor="settings-bg-color" className="block text-sm font-medium text-zinc-700 mb-1">Cor de Fundo</label>
            <div className="flex items-center gap-3">
              <input id="settings-bg-color" type="color" value={configForm.theme_config.bg_color}
                onChange={(e) => updateTheme({ bg_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5" />
              <input id="settings-bg-text" type="text" value={configForm.theme_config.bg_color}
                onChange={(e) => updateTheme({ bg_color: e.target.value })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm font-mono" />
            </div>
          </div>

          <div>
            <label htmlFor="settings-hover-color" className="block text-sm font-medium text-zinc-700 mb-1">Cor de Destaque (hover)</label>
            <div className="flex items-center gap-3">
              <input id="settings-hover-color" type="color" value={configForm.theme_config.hover_color}
                onChange={(e) => updateTheme({ hover_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5" />
              <input id="settings-hover-text" type="text" value={configForm.theme_config.hover_color}
                onChange={(e) => updateTheme({ hover_color: e.target.value })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm font-mono" />
            </div>
          </div>

          <div>
            <label htmlFor="settings-text-color" className="block text-sm font-medium text-zinc-700 mb-1">Cor da Fonte</label>
            <div className="flex items-center gap-3">
              <input id="settings-text-color" type="color" value={configForm.theme_config.text_color}
                onChange={(e) => updateTheme({ text_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5" />
              <input id="settings-text-text" type="text" value={configForm.theme_config.text_color}
                onChange={(e) => updateTheme({ text_color: e.target.value })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm font-mono" />
            </div>
          </div>

          <div>
            <label htmlFor="settings-font" className="block text-sm font-medium text-zinc-700 mb-1">Fonte</label>
            <select id="settings-font" value={configForm.theme_config.font}
              onChange={(e) => updateTheme({ font: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm bg-white">
              {FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-zinc-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
