'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Verifique seu email</h1>
          <p className="text-zinc-500 text-sm leading-relaxed mb-8">
            Se existir uma conta com este email, enviaremos as instruções de recuperação.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-8">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-6">
          <Mail className="w-6 h-6 text-zinc-700" />
        </div>

        <h1 className="text-2xl font-semibold mb-2">Recuperar senha</h1>
        <p className="text-zinc-500 text-sm mb-8">
          Informe seu email e enviaremos as instruções para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl" role="alert">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-base"
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar instruções'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
