'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { appPath } from '@/lib/supabase/browser';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Verifying your invitation…');

  useEffect(() => {
    const completeInvitation = async () => {
      const url = new URL(window.location.href);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !publishableKey) {
        setMessage('The authentication service is not configured. Please contact the administrator.');
        return;
      }

      const supabase = createBrowserClient(supabaseUrl, publishableKey);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const code = url.searchParams.get('code');

      let error: Error | null = null;

      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        error = result.error;
      } else {
        error = new Error(url.searchParams.get('error_description') || 'The invitation link is invalid or expired.');
      }

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.replace(appPath('/staff/set-password/'));
    };

    void completeInvitation();
  }, []);

  return (
    <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '3rem 1.5rem' }}>
      <section style={{ width: '100%', maxWidth: 480, background: '#111', color: '#fff', padding: '2rem', border: '1px solid #333', borderRadius: 12 }}>
        <p style={{ color: '#00a8d6', letterSpacing: '.12em', fontSize: '.75rem' }}>ARTIST PLAYGROUND</p>
        <h1 style={{ color: '#f5e900', marginBottom: '.75rem' }}>Invitation verification</h1>
        <p role="status">{message}</p>
      </section>
    </main>
  );
}
