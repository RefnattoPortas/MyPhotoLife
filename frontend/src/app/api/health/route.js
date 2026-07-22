import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = !!process.env.JWT_SECRET;

  if (!supabaseUrl || !serviceKey || !jwtSecret) {
    return Response.json(
      { status: 'degraded', code: 'MISSING_ENV' },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const { error } = await supabaseAdmin
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      return Response.json(
        { status: 'degraded', code: 'DB_ERROR' },
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    return Response.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch {
    return Response.json(
      { status: 'degraded', code: 'TIMEOUT' },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}
