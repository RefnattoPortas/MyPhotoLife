import { clearCookieHeader } from '@/lib/auth-native';

export async function POST() {
  return new Response(JSON.stringify({ message: 'Sessão encerrada com sucesso' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookieHeader(),
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
