'use client';

import { useState, useCallback } from 'react';
import { Camera, ImageIcon, ChevronDown, AlertCircle } from 'lucide-react';
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

function AccordionSection({ id, title, open, onToggle, children }) {
  const panelId = `${id}-panel`;
  const headerId = `${id}-header`;
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <h3>
        <button
          id={headerId}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider hover:bg-zinc-50 transition-colors"
        >
          {title}
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={headerId} hidden={!open} className="px-6 pb-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

function validateUrl(value) {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  }
  return value;
}

export default function DashboardSettings({ configForm, setConfigForm, onSave }) {
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({ perfil: true, contato: false, pagamento: false, redes: false, aparencia: false });
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  const toggleSection = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const getCurrentTemplateId = (tc) => {
    return TEMPLATES.find((t) => t.bg_color === tc.bg_color && t.hover_color === tc.hover_color && t.text_color === tc.text_color && t.font === tc.font)?.id || null;
  };

  const updateTheme = (updates) => {
    setConfigForm((p) => ({ ...p, theme_config: { ...p.theme_config, ...updates } }));
    setDirty(true);
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    const headers = {};
    if (getCsrfToken()) headers['x-csrf-token'] = getCsrfToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    try {
      const res = await fetch('/api/tenant/upload', { method: 'POST', headers, credentials: 'include', body: formData });
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

  const validate = () => {
    const errs = {};
    if (configForm.phone && configForm.phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Telefone deve ter pelo menos 10 dígitos';
    }
    if (configForm.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configForm.contact_email)) {
      errs.contact_email = 'E-mail inválido';
    }
    if (configForm.instagram && !validateUrl(configForm.instagram)) errs.instagram = 'URL inválida';
    if (configForm.twitter && !validateUrl(configForm.twitter)) errs.twitter = 'URL inválida';
    if (configForm.facebook && !validateUrl(configForm.facebook)) errs.facebook = 'URL inválida';
    if (configForm.linkedin && !validateUrl(configForm.linkedin)) errs.linkedin = 'URL inválida';
    if (configForm.youtube && !validateUrl(configForm.youtube)) errs.youtube = 'URL inválida';
    if (configForm.tiktok && !validateUrl(configForm.tiktok)) errs.tiktok = 'URL inválida';
    if (configForm.theme_config.bg_color && !validateHex(configForm.theme_config.bg_color)) errs.bg_color = 'Use formato #RRGGBB';
    if (configForm.theme_config.hover_color && !validateHex(configForm.theme_config.hover_color)) errs.hover_color = 'Use formato #RRGGBB';
    if (configForm.theme_config.text_color && !validateHex(configForm.theme_config.text_color)) errs.text_color = 'Use formato #RRGGBB';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      showToast('Corrija os campos em destaque antes de salvar', 'error');
      return;
    }
    setSaving(true);
    try {
      await onSave();
      setDirty(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const updateField = useCallback((field) => (e) => {
    setConfigForm((p) => ({ ...p, [field]: e.target.value }));
    setDirty(true);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, [setConfigForm]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Configurações do Perfil</h2>
      <p className="text-sm text-zinc-400 mb-6">Gerencie suas informações, contato e aparência do portfólio.</p>

      {dirty && (
        <div className="flex items-center gap-2 mb-4 text-xs text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Você tem alterações não salvas.
        </div>
      )}

      <div className="space-y-3 max-w-lg">
        {/* Perfil */}
        <AccordionSection id="perfil" title="Perfil" open={openSections.perfil} onToggle={() => toggleSection('perfil')}>
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
            <input id="settings-name" type="text" value={configForm.name} onChange={updateField('name')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm" />
          </div>
          <div>
            <label htmlFor="settings-headline" className="block text-sm font-medium text-zinc-700 mb-1">Frase de Destaque</label>
            <input id="settings-headline" type="text" value={configForm.headline} onChange={updateField('headline')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="Fotógrafa especializada em casamentos e ensaios" />
          </div>
          <div>
            <label htmlFor="settings-bio" className="block text-sm font-medium text-zinc-700 mb-1">Biografia</label>
            <textarea id="settings-bio" rows={3} value={configForm.bio} onChange={updateField('bio')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm resize-none"
              placeholder="Conte um pouco sobre você para seus clientes..." />
          </div>
        </AccordionSection>

        {/* Contato */}
        <AccordionSection id="contato" title="Contato" open={openSections.contato} onToggle={() => toggleSection('contato')}>
          <div>
            <label htmlFor="settings-phone" className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
            <input id="settings-phone" type="tel" value={configForm.phone} onChange={updateField('phone')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'settings-phone-error' : undefined}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-zinc-900 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`}
              placeholder="(11) 99999-9999"
              onBlur={(e) => setConfigForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))} />
            {errors.phone && <p id="settings-phone-error" className="mt-1 text-xs text-red-500" role="alert">{errors.phone}</p>}
          </div>
          <div>
            <label htmlFor="settings-whatsapp" className="block text-sm font-medium text-zinc-700 mb-1">WhatsApp</label>
            <input id="settings-whatsapp" type="text" value={configForm.whatsapp} onChange={updateField('whatsapp')}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm"
              placeholder="https://wa.me/5511999999999" />
          </div>
          <div>
            <label htmlFor="settings-contact-email" className="block text-sm font-medium text-zinc-700 mb-1">E-mail de Contato</label>
            <input id="settings-contact-email" type="email" value={configForm.contact_email} onChange={updateField('contact_email')}
              aria-invalid={!!errors.contact_email}
              aria-describedby={errors.contact_email ? 'settings-contact-email-error' : undefined}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-zinc-900 ${errors.contact_email ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`}
              placeholder="contato@meuemail.com" />
            {errors.contact_email && <p id="settings-contact-email-error" className="mt-1 text-xs text-red-500" role="alert">{errors.contact_email}</p>}
            <p className="mt-1 text-xs text-zinc-400">Deixe em branco para desativar o formulário de contato.</p>
          </div>
        </AccordionSection>

        {/* Pagamento */}
        <AccordionSection id="pagamento" title="Pagamento" open={openSections.pagamento} onToggle={() => toggleSection('pagamento')}>
          <p className="text-xs text-zinc-400">Configurações de pagamento para álbuns à venda.</p>
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
        </AccordionSection>

        {/* Redes Sociais */}
        <AccordionSection id="redes" title="Redes Sociais" open={openSections.redes} onToggle={() => toggleSection('redes')}>
          {[
            { field: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/seuperfil' },
            { field: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/seuperfil' },
            { field: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/seuperfil' },
            { field: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/seuperfil' },
            { field: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@seuperfil' },
            { field: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@seuperfil' },
          ].map(({ field, label, placeholder }) => (
            <div key={field}>
              <label htmlFor={`settings-${field}`} className="block text-sm font-medium text-zinc-700 mb-1">{label}</label>
              <input id={`settings-${field}`} type="text" value={configForm[field]} onChange={updateField(field)}
                aria-invalid={!!errors[field]}
                aria-describedby={errors[field] ? `settings-${field}-error` : undefined}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:border-zinc-900 ${errors[field] ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`}
                placeholder={placeholder} />
              {errors[field] && <p id={`settings-${field}-error`} className="mt-1 text-xs text-red-500" role="alert">{errors[field]}</p>}
            </div>
          ))}
        </AccordionSection>

        {/* Aparência */}
        <AccordionSection id="aparencia" title="Aparência do Portfólio" open={openSections.aparencia} onToggle={() => toggleSection('aparencia')}>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Capa do Portfólio</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full sm:w-24 h-48 sm:h-24 rounded-xl border border-zinc-200 overflow-hidden flex-shrink-0 bg-zinc-100">
                {configForm.theme_config.cover_url ? (
                  <img src={configForm.theme_config.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300"><ImageIcon className="w-8 h-8" /></div>
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
                  {configForm.theme_config.cover_url ? 'Trocar imagem' : 'Escolher imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], 'cover')} />
                </label>
                {configForm.theme_config.cover_url && (
                  <button type="button" onClick={() => updateTheme({ cover_url: '' })}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors">Remover capa</button>
                )}
                <p className="mt-1 text-xs text-zinc-400">Recomendado: 1920x600px</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Foto do Perfil</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-full sm:w-24 h-48 sm:h-24 rounded-xl border border-zinc-200 overflow-hidden flex-shrink-0 bg-zinc-100">
                {configForm.theme_config.profile_photo_url ? (
                  <img src={configForm.theme_config.profile_photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-300"><Camera className="w-8 h-8" /></div>
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors">
                  <Camera className="w-4 h-4" />
                  {configForm.theme_config.profile_photo_url ? 'Trocar imagem' : 'Escolher imagem'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], 'profile')} />
                </label>
                {configForm.theme_config.profile_photo_url && (
                  <button type="button" onClick={() => updateTheme({ profile_photo_url: '' })}
                    className="mt-2 text-xs text-red-500 hover:text-red-700 transition-colors">Remover foto</button>
                )}
                <p className="mt-1 text-xs text-zinc-400">Recomendado: 400x400px</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Template</label>
            <div className="grid grid-cols-4 gap-2">
              {TEMPLATES.map((t) => {
                const isActive = getCurrentTemplateId(configForm.theme_config) === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => updateTheme({ bg_color: t.bg_color, hover_color: t.hover_color, text_color: t.text_color, font: t.font })}
                    className={`relative rounded-xl p-3 border-2 transition-all text-center ${isActive ? 'border-zinc-900 ring-2 ring-zinc-900/20' : 'border-zinc-200 hover:border-zinc-400'}`}
                    aria-label={`Template ${t.name}`}
                    aria-pressed={isActive}>
                    <div className="flex gap-1 mb-2 justify-center">
                      <div className="w-5 h-5 rounded-full border border-zinc-200" style={{ backgroundColor: t.bg_color }} />
                      <div className="w-5 h-5 rounded-full border border-zinc-200" style={{ backgroundColor: t.hover_color }} />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-600 block leading-tight">{t.name}</span>
                    {isActive && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-900 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px] leading-none" aria-hidden="true">✓</span>
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
                aria-invalid={!!errors.bg_color}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono transition-colors focus:outline-none focus:border-zinc-900 ${errors.bg_color ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`} />
            </div>
            {errors.bg_color && <p className="mt-1 text-xs text-red-500" role="alert">{errors.bg_color}</p>}
          </div>

          <div>
            <label htmlFor="settings-hover-color" className="block text-sm font-medium text-zinc-700 mb-1">Cor de Destaque</label>
            <div className="flex items-center gap-3">
              <input id="settings-hover-color" type="color" value={configForm.theme_config.hover_color}
                onChange={(e) => updateTheme({ hover_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5" />
              <input id="settings-hover-text" type="text" value={configForm.theme_config.hover_color}
                onChange={(e) => updateTheme({ hover_color: e.target.value })}
                aria-invalid={!!errors.hover_color}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono transition-colors focus:outline-none focus:border-zinc-900 ${errors.hover_color ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`} />
            </div>
            {errors.hover_color && <p className="mt-1 text-xs text-red-500" role="alert">{errors.hover_color}</p>}
          </div>

          <div>
            <label htmlFor="settings-text-color" className="block text-sm font-medium text-zinc-700 mb-1">Cor da Fonte</label>
            <div className="flex items-center gap-3">
              <input id="settings-text-color" type="color" value={configForm.theme_config.text_color}
                onChange={(e) => updateTheme({ text_color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5" />
              <input id="settings-text-text" type="text" value={configForm.theme_config.text_color}
                onChange={(e) => updateTheme({ text_color: e.target.value })}
                aria-invalid={!!errors.text_color}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-mono transition-colors focus:outline-none focus:border-zinc-900 ${errors.text_color ? 'border-red-300 bg-red-50' : 'border-zinc-200'}`} />
            </div>
            {errors.text_color && <p className="mt-1 text-xs text-red-500" role="alert">{errors.text_color}</p>}
          </div>

          <div>
            <label htmlFor="settings-font" className="block text-sm font-medium text-zinc-700 mb-1">Fonte</label>
            <select id="settings-font" value={configForm.theme_config.font} onChange={(e) => updateTheme({ font: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-sm bg-white">
              {FONTS.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
          </div>
        </AccordionSection>

        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full bg-zinc-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
