'use client';
export const dynamic = 'force-dynamic';
// app/menu/page.tsx — redirects to homepage which IS the menu now
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MenuRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}
