'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function AdminDashboardPage() {
  const [staffName, setStaffName] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('success');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.replace('/staff/login/'); return; }
        const { data: profile, error } = await supabase
          .from('staff_profiles').select('display_name, role, active')
          .eq('user_id', user.id).maybeSingle();
        if (error || !profile?.active || profile.role !== 'system_admin') {
          await supabase.auth.signOut();
          window.location.replace('/staff/login/?error=unauthorized');
          return;
        }
        if (active) setStaffName(profile.display_name || user.email || user.id);
      } catch {
        if (active) setNotice('The authentication service is not configured.');
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, []);

  async function inviteStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get('email') ?? '').trim().toLowerCase();
      const display_name = String(form.get('display_name') ?? '').trim();
      const role = String(form.get('role') ?? 'staff');
      if (!email || !display_name || !['staff', 'system_admin'].includes(role)) {
        throw new Error('Enter a valid email, full name, and role.');
      }
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('provision-staff', {
        body: { email, display_name, role },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Invitation failed. Check the Edge Function logs.');
      setNotice('Invitation sent. The staff member can use the email link to set up access.');
      setNoticeType('success');
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The invitation could not be completed.');
      setNoticeType('error');
    } finally { setBusy(false); }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace('/staff/login/');
  }

  return (
    <section className="admin-page">
      <header className="admin-heading">
        <div><p className="admin-eyebrow">SYSTEM ADMINISTRATION</p><h1>System Admin</h1><p className="admin-copy">Signed in as {staffName || '…'}.</p></div>
        <button className="admin-secondary" type="button" onClick={signOut}>Sign out</button>
      </header>
      <div className="admin-card">
        <h2>Invite staff member</h2>
        <p className="admin-copy">Create an account by sending an invitation. Public registration is not part of the staff workflow.</p>
        {notice && <p className={noticeType === 'success' ? 'admin-notice' : 'admin-error'} role="status">{notice}</p>}
        <form onSubmit={inviteStaff} className="admin-form">
          <label htmlFor="display_name">Full name</label><input id="display_name" name="display_name" type="text" maxLength={120} required />
          <label htmlFor="email">Email address</label><input id="email" name="email" type="email" maxLength={254} required />
          <label htmlFor="role">Account role</label>
          <select id="role" name="role" defaultValue="staff"><option value="staff">Staff</option><option value="system_admin">System Admin</option></select>
          <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send invitation'}</button>
        </form>
      </div>
      <style>{`
        .admin-page{min-height:60vh;padding:2.5rem 5vw;background:#080808;color:#fff}
        .admin-heading{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;margin-bottom:2rem}
        .admin-eyebrow{color:#00a8d6;letter-spacing:.15em;font-size:.75rem;font-weight:800}
        .admin-heading h1{font-family:Manrope,sans-serif;font-size:clamp(2rem,5vw,3rem);margin:.5rem 0}
        .admin-copy{color:#aaa;line-height:1.6}
        .admin-card{max-width:38rem;padding:1.5rem;border:1px solid #333;border-radius:.8rem;background:#101010}
        .admin-card h2{font-family:Manrope,sans-serif;font-size:1.35rem;margin:0 0 .5rem}
        .admin-form{display:grid;gap:.55rem;margin-top:1.25rem}
        .admin-form label{margin-top:.5rem;font-size:.9rem}
        .admin-form input,.admin-form select{width:100%;padding:.8rem;border:1px solid #444;border-radius:.45rem;background:#080808;color:#fff;font:inherit}
        .admin-primary,.admin-secondary{padding:.75rem 1rem;border:0;border-radius:.45rem;font:inherit;font-weight:800;cursor:pointer}
        .admin-primary{margin-top:.8rem;background:#f5e900;color:#000}.admin-secondary{background:#222;color:#fff;border:1px solid #444}
        .admin-notice,.admin-error{padding:.8rem;border-radius:.45rem;font-size:.9rem}
        .admin-notice{border:1px solid #276b48;color:#b9f5d0}.admin-error{border:1px solid #8b3333;color:#ffb5b5}
      `}</style>
    </section>
  );
}
