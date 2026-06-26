import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
    if (!tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      console.error(error);
      return NextResponse.json({ message: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ tenant });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updates = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.headline !== undefined) updates.headline = body.headline;
    if (body.pix_key !== undefined) updates.pix_key = body.pix_key;
    if (body.pix_key_type !== undefined) updates.pix_key_type = body.pix_key_type;
    if (body.theme_config !== undefined) updates.theme_config = body.theme_config;
    if (body.instagram !== undefined) updates.instagram = body.instagram;
    if (body.twitter !== undefined) updates.twitter = body.twitter;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update(updates)
      .eq('id', tenantId);

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ updated: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
