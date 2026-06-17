import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabaseClient'; // The existing client

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string'; // Fallback for local dev

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, slug } = body;

    if (!name || !email || !password || !slug) {
      return NextResponse.json({ message: 'name, email, password and slug are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: 'Password must have at least 8 characters' }, { status: 400 });
    }

    // Check if email or slug exists
    const { data: existingTenants, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .or(`slug.eq.${slug},email.eq.${email}`);

    if (tenantErr) {
      console.error(tenantErr);
      return NextResponse.json({ message: 'Database error while checking existing tenant' }, { status: 500 });
    }

    if (existingTenants && existingTenants.length > 0) {
      return NextResponse.json({ message: 'Slug or email already in use' }, { status: 400 });
    }

    const tenantId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert Tenant
    const { error: insertTenantErr } = await supabase
      .from('tenants')
      .insert([
        {
          id: tenantId,
          name,
          email,
          slug,
          subdomain: slug
        }
      ]);

    if (insertTenantErr) {
      console.error(insertTenantErr);
      return NextResponse.json({ message: 'Failed to create tenant' }, { status: 500 });
    }

    // Insert User
    const { error: insertUserErr } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          tenant_id: tenantId,
          email,
          password_hash: passwordHash,
          display_name: name,
          role: 'owner'
        }
      ]);

    if (insertUserErr) {
      // Rollback tenant creation (poor man's transaction since no native RPC transaction here)
      await supabase.from('tenants').delete().eq('id', tenantId);
      console.error(insertUserErr);
      return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
    }

    // Generate Token
    const token = jwt.sign(
      { sub: userId, tenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      user: { id: userId, email, name, role: 'owner' },
      tenant: { id: tenantId, slug },
    }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
