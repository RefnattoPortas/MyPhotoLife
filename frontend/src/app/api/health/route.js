export async function GET() {
  const hasBackend = !!process.env.API_URL;
  const hasNativeAuth = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  return Response.json({
    status: hasBackend || hasNativeAuth ? 'ok' : 'degraded',
    source: 'next-api',
    timestamp: new Date().toISOString(),
    auth_source: hasNativeAuth ? 'supabase' : hasBackend ? 'backend' : 'none',
  }, { status: hasBackend || hasNativeAuth ? 200 : 503 });
}
