'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import PasswordToggle from '@/components/ui/PasswordToggle';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

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

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const errorRef = useRef(null);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (error && errorRef.current) errorRef.current.focus();
  }, [error]);

  if (!token || !emailParam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Link inválido</h1>
          <p className="text-zinc-500 text-sm mb-8">Este link de recuperação é inválido ou está incompleto.</p>
          <Link href="/forgot-password" className="text-zinc-900 underline text-sm">Solicitar novo link</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">Senha redefinida</h1>
          <p className="text-zinc-500 text-sm mb-8">Sua senha foi atualizada com sucesso. Você já pode fazer login.</p>
          <Link href="/login?reset=1" className="inline-flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors">
            Fazer login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Senhas não conferem');
      return;
    }

    if (getPasswordStrength(password) < 1) {
      setError('Escolha uma senha mais forte');
      return;
    }

    setLoading(true);

    try {
      await api.auth.resetPassword({ token, email: emailParam, password, password_confirm: passwordConfirm });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-6">
          <Lock className="w-6 h-6 text-zinc-700" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Redefinir senha</h1>
        <p className="text-zinc-500 text-sm mb-8">Escolha uma nova senha para sua conta.</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div ref={errorRef} className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl" role="alert" tabIndex={-1}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-zinc-700 mb-1">Nova senha</label>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-base pr-10"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
              />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} id="reset-password" />
            </div>
            {password.length > 0 && (
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
            <label htmlFor="reset-password-confirm" className="block text-sm font-medium text-zinc-700 mb-1">Confirmar nova senha</label>
            <div className="relative">
              <input
                id="reset-password-confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:outline-none transition-colors text-base pr-10"
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
              <PasswordToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} id="reset-password-confirm" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redefinindo...</>
            ) : 'Redefinir senha'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="text-zinc-900 underline">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}
