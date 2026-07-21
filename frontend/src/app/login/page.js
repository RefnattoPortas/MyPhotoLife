'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, setCsrfToken } from '@/lib/api';
import PasswordToggle from '@/components/ui/PasswordToggle';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(!!searchParams.get('reset'));
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setResetSent(false);

    const errors = {};
    if (!email.trim()) errors.email = 'Informe seu email';
    if (!password) errors.password = 'Informe sua senha';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.login({ email: email.trim(), password });
      setCsrfToken(data.csrfToken || data.token);
      router.push(searchParams.get('redirect') || '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-xl font-bold tracking-tight block mb-8 text-center">MyPhotoLife</Link>
        <h1 className="text-2xl font-semibold text-center mb-8">Entrar</h1>

        {resetSent && (
          <div className="text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl mb-4" role="status">
            Senha redefinida com sucesso! Faça login com sua nova senha.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div ref={errorRef} className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl" role="alert" tabIndex={-1}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              ref={emailRef}
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border ${fieldErrors.email ? 'border-red-400' : 'border-zinc-200'} focus:border-zinc-900 focus:outline-none transition-colors text-base`}
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email && <p id="login-email-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border pr-10 ${fieldErrors.password ? 'border-red-400' : 'border-zinc-200'} focus:border-zinc-900 focus:outline-none transition-colors text-base`}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
              />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} id="login-password" />
            </div>
            {fieldErrors.password && <p id="login-password-error" className="text-xs text-red-500 mt-1" role="alert">{fieldErrors.password}</p>}
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
              Esqueci minha senha
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Entrando...</>
            ) : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Não tem conta?{' '}
          <Link href="/register" className="text-zinc-900 underline">Criar portfólio</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
