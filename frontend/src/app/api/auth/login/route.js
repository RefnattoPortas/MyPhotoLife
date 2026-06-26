import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'email and password are required' }, { status: 400 });
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, display_name, role, tenant_id')
      .eq('email', email)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Database error' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('name, slug, is_active')
      .eq('id', user.tenant_id)
      .single();

    if (tenantErr || !tenant) {
      console.error(tenantErr);
      return NextResponse.json({ message: 'Tenant not found' }, { status: 500 });
    }

    if (!tenant.is_active) {
      return NextResponse.json({ message: 'Account is disabled' }, { status: 401 });
    }

    const token = jwt.sign(
      { sub: user.id, tenantId: user.tenant_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.display_name,
        role: user.role,
      },
      tenant: {
        id: user.tenant_id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
