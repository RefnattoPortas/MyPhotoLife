'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AlbumsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard?tab=albums'); }, [router]);
  return null;
}
