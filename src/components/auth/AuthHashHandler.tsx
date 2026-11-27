'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { appPath } from '@/lib/supabase/browser';

export default function AuthHashHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');

    if (!accessToken || !refreshToken) return;

    const supabase = createSupabaseBrowserClient();
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
