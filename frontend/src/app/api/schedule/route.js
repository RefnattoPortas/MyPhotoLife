import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string';

function getTenantId(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    return payload.tenantId;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('schedule')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ schedule: data || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { title, event_date, location, status } = body;

    if (!title || !event_date) {
      return NextResponse.json({ message: 'title and event_date are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('schedule')
      .insert([{
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        title,
        event_date,
        location: location || null,
        status: status || 'Agenda Aberta',
      }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json({ schedule: data }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updates = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.event_date !== undefined) updates.event_date = body.event_date;
    if (body.location !== undefined) updates.location = body.location;
    if (body.status !== undefined) updates.status = body.status;

    const { error } = await supabaseAdmin
      .from('schedule')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to update event' }, { status: 500 });
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('schedule')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
