'use client';

import { useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function SetStaffPasswordPage() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) window.location.replace(appPath('/staff/login/'));
      } catch { setMessage('The authentication service is not configured.'); }
    }
    void checkSession();
  }, []);

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmation = String(form.get('confirm_password') ?? '');
    if (password.length < 10) { setMessage('Use a password with at least 10 characters.'); setBusy(false); return; }
    if (password !== confirmation) { setMessage('The passwords do not match.'); setBusy(false); return; }
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace(appPath('/staff/login/')); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase.from('staff_profiles')
        .select('role, active').eq('user_id', user.id).maybeSingle();
      if (profileError || !profile?.active || !['staff', 'system_admin'].includes(profile.role)) {
        await supabase.auth.signOut();
        window.location.replace(appPath('/staff/login/?error=unauthorized'));
        return;
      }
      window.location.replace(appPath(profile.role === 'system_admin' ? '/admin/' : '/staff/'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not update your password. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '3rem 1.5rem' }}>
      <section style={{ width: '100%', maxWidth: 480, background: '#111', color: '#fff', padding: '2rem', border: '1px solid #333', borderRadius: 12 }}>
        <p style={{ color: '#00a8d6', letterSpacing: '.12em', fontSize: '.75rem' }}>ARTIST PLAYGROUND</p>
        <h1 style={{ color: '#f5e900', marginBottom: '.75rem' }}>Set your password</h1>
        <p>Choose a password to finish setting up your management account.</p>
        {message && <p role="alert" style={{ color: '#ff8b8b' }}>{message}</p>}
        <form onSubmit={savePassword} style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
          <label style={{ display: 'grid', gap: '.4rem' }}>New password
            <input name="password" type="password" minLength={10} autoComplete="new-password" required style={{ padding: '.8rem', borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff' }} />
          </label>
          <label style={{ display: 'grid', gap: '.4rem' }}>Confirm password
            <input name="confirm_password" type="password" minLength={10} autoComplete="new-password" required style={{ padding: '.8rem', borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff' }} />
          </label>
          <button type="submit" disabled={busy} style={{ padding: '.85rem 1rem', border: 0, borderRadius: 6, background: '#f5e900', color: '#000', fontWeight: 800, cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      </section>
    </main>
  );
}
