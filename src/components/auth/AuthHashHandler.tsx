'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { appPath } from '@/lib/supabase/browser';

export default function AuthHashHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');

    if (!accessToken || !refreshToken) return;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createBrowserClient(url, key);
    void supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      if (error) {
        window.location.replace(appPath('/staff/login/?error=invalid'));
        return;
      }
      window.location.replace(appPath('/staff/set-password/'));
    });
  }, [pathname]);

  return null;
}
