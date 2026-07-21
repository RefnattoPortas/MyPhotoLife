'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setCsrfToken } from '@/lib/api';
import { getDomain } from '@/lib/app-url';
import PasswordToggle from '@/components/ui/PasswordToggle';
import { Check, X, Loader } from 'lucide-react';

const STRENGTH_LABELS = ['', 'Fraca', 'Média', 'Forte', 'Muito forte'];
const STRENGTH_COLORS = ['', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

function normalizeSlug(value) {
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateSlug(s) {
  if (s.length < 3) return 'Mínimo de 3 caracteres';
  if (s.length > 63) return 'Máximo de 63 caracteres';
  if (!/^[a-z0-9]/.test(s)) return 'Deve começar com letra ou número';
  if (!/[a-z0-9]$/.test(s)) return 'Deve terminar com letra ou número';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s)) return 'Use apenas letras, números e hífens';
  return null;
}

const RESERVED = ['admin', 'api', 'login', 'register', 'dashboard', 'suporte', 'support', 'termos', 'privacidade', 'checkout', 'pagamentos', 'www', 'app', 'dev', 'test', 'mail', 'help', 'status', 'docs'];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirm: '', slug: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null);
  const [slugChecking, setSlugChecking] = useState(false);
  const slugTimerRef = useRef(null);
  const errorRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'slug') {
      newValue = normalizeSlug(value);
      setSlugStatus(null);
      clearTimeout(slugTimerRef.current);
      if (newValue.length >= 3) {
        setSlugChecking(true);
        slugTimerRef.current = setTimeout(async () => {
          try {
            const data = await api.auth.checkSlug(newValue);
            setSlugStatus(data.available ? 'disponivel' : 'indisponivel');
          } catch {
            setSlugStatus(null);
          } finally {
            setSlugChecking(false);
          }
        }, 400);
      }
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors = {};
    if (!form.name.trim()) errors.name = 'Informe seu nome';
    if (!form.email.trim()) errors.email = 'Informe seu email';
    if (!form.password) errors.password = 'Informe uma senha';
    if (form.password !== form.password_confirm) errors.password_confirm = 'Senhas não conferem';

    const slugErr = validateSlug(form.slug);
    if (slugErr) errors.slug = slugErr;
    else if (RESERVED.includes(form.slug)) errors.slug = 'Este endereço é reservado';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      if (firstKey === 'name') nameRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.register(form);
      setCsrfToken(data.csrfToken || data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const domain = getDomain();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-xl font-bold tracking-tight block mb-8 text-center">
          MyPhotoLife
        </Link>
        <h1 className="text-2xl font-semibold text-center mb-8">Criar Portfólio</h1>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div ref={errorRef} className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl" role="alert" tabIndex={-1}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
            <input
              ref={nameRef}
              id="reg-name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-xl border ${fieldErrors.name ? 'border-red-400' : 'border-zinc-200'} focus:border-zinc-900 focus:outline-none transition-colors text-base`}
              placeholder="Seu nome"
              autoComplete="name"
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? 'reg-name-error' : undefined}
            />
            {fieldErrors.name && <p id="reg-name-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-xl border ${fieldErrors.email ? 'border-red-400' : 'border-zinc-200'} focus:border-zinc-900 focus:outline-none transition-colors text-base`}
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
            />
            {fieldErrors.email && <p id="reg-email-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="reg-slug" className="block text-sm font-medium text-zinc-700 mb-1">
              Link do seu portfólio
            </label>
            <div className={`flex items-center border rounded-xl px-4 focus-within:border-zinc-900 transition-colors ${fieldErrors.slug ? 'border-red-400' : 'border-zinc-200'}`}>
              <span className="text-zinc-400 text-sm shrink-0">{domain}/</span>
              <input
                id="reg-slug"
                name="slug"
                type="text"
                required
                minLength={3}
                maxLength={63}
                value={form.slug}
                onChange={handleChange}
                className="flex-1 py-2.5 bg-transparent focus:outline-none text-sm"
                placeholder="seu-nome"
                autoComplete="off"
                aria-invalid={!!fieldErrors.slug}
                aria-describedby={fieldErrors.slug ? 'reg-slug-error' : 'reg-slug-help'}
              />
              <div className="w-5 h-5 shrink-0 ml-2">
                {slugChecking ? (
                  <Loader size={16} className="animate-spin text-zinc-400" />
                ) : slugStatus === 'disponivel' ? (
                  <Check size={16} className="text-emerald-500" />
                ) : slugStatus === 'indisponivel' ? (
                  <X size={16} className="text-red-500" />
                ) : null}
              </div>
            </div>
            {fieldErrors.slug ? (
              <p id="reg-slug-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.slug}</p>
            ) : (
              <p id="reg-slug-help" className="text-xs text-zinc-400 mt-1">3 a 63 caracteres: letras, números e hífens</p>
            )}
            {form.slug && !fieldErrors.slug && slugStatus && (
              <p className={`text-xs mt-1 ${slugStatus === 'disponivel' ? 'text-emerald-600' : 'text-red-500'}`}>
                {slugStatus === 'disponivel' ? 'Disponível' : 'Indisponível'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <div className="relative">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border pr-10 ${fieldErrors.password ? 'border-red-400' : 'border-zinc-200'} focus:border-zinc-900 focus:outline-none transition-colors text-base`}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
              />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} id="reg-password" />
            </div>
            {fieldErrors.password && <p id="reg-password-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.password}</p>}
            {form.password.length > 0 && (
              <div className="mt-2" role="meter" aria-label="Força da senha" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={4} aria-valuetext={STRENGTH_LABELS[strength]}>
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-zinc-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-zinc-500">{STRENGTH_LABELS[strength]}</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reg-password-confirm" className="block text-sm font-medium text-zinc-700 mb-1">Confirmar Senha</label>
            <div className="relative">
              <input
                id="reg-password-confirm"
                name="password_confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={8}
                value={form.password_confirm}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-xl border pr-10 ${fieldErrors.password_confirm ? 'border-red-400' : 'border-zinc-200'} focus:border-zinc-900 focus:outline-none transition-colors text-base`}
                placeholder="Repita a senha"
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.password_confirm}
                aria-describedby={fieldErrors.password_confirm ? 'reg-password-confirm-error' : undefined}
              />
              <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} id="reg-password-confirm" />
            </div>
            {fieldErrors.password_confirm && <p id="reg-password-confirm-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.password_confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Portfólio'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Já tem conta?{' '}
          <Link href="/login" className="text-zinc-900 underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
