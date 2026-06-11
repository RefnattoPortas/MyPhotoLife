'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', slug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'slug' ? value.toLowerCase().replace(/[^a-z0-9-]/g, '') : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.register(form);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tenant', JSON.stringify(data.tenant));
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
            <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
            <input
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Link do seu portfólio
            </label>
            <div className="flex items-center border border-zinc-200 rounded-xl px-4 focus-within:border-zinc-900 transition-colors">
              <span className="text-zinc-400 text-sm">myphotolife.com/</span>
              <input
                name="slug"
                type="text"
                required
                value={form.slug}
                onChange={handleChange}
                className="flex-1 py-2.5 bg-transparent focus:outline-none text-sm"
                placeholder="seu-nome"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors"
              placeholder="Mínimo 8 caracteres"
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
