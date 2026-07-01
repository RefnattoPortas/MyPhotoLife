import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-long-random-string';

const ALLOWED_TYPES = ['cover', 'profile'];

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
    const type = formData.get('type') || 'cover';

    if (!file) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ message: 'Invalid upload type' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${type}-${tenantId}-${Date.now()}.${ext}`;

    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === 'covers');

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket('covers', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (createError) {
        console.error('Failed to create covers bucket:', createError);
        return NextResponse.json({ message: 'Failed to initialize storage' }, { status: 500 });
      }
    }

    const { data, error } = await supabaseAdmin.storage
      .from('covers')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ message: 'Falha ao enviar arquivo: ' + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('covers')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
