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

export async function POST(request) {
  try {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `cover-${tenantId}-${Date.now()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('covers')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('covers')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
