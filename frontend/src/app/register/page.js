'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setCsrfToken } from '@/lib/api';

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

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirm: '', slug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'slug' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value,
    }));
  };

  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Senhas não conferem');
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

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-xl font-bold tracking-tight block mb-8 text-center">
          MyPhotoLife
        </Link>
        <h1 className="text-2xl font-semibold text-center mb-8">Criar Portfólio</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl" role="alert">{error}</div>
          )}
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="Seu nome"
              autoComplete="name"
            />
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
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="reg-slug" className="block text-sm font-medium text-zinc-700 mb-1">
              Link do seu portfólio
            </label>
            <div className="flex items-center border border-zinc-200 rounded-xl px-4 focus-within:border-zinc-900 transition-colors">
              <span className="text-zinc-400 text-sm shrink-0">myphotolife.com/</span>
              <input
                id="reg-slug"
                name="slug"
                type="text"
                required
                minLength={3}
                value={form.slug}
                onChange={handleChange}
                className="flex-1 py-2.5 bg-transparent focus:outline-none text-sm"
                placeholder="seu-nome"
              />
            </div>
            <p className="text-xs text-zinc-400 mt-1">3 a 63 caracteres: letras, números e hífens</p>
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
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
            <input
              id="reg-password-confirm"
              name="password_confirm"
              type="password"
              required
              minLength={8}
              value={form.password_confirm}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Criando...' : 'Criar Portfólio'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Já tem conta?{' '}
          <Link href="/login" className="text-zinc-900 underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
