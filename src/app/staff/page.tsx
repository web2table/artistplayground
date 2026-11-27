'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function StaffDashboardPage() {
  const [displayName, setDisplayName] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.replace('/staff/login/'); return; }
        const { data: profile, error } = await supabase.from('staff_profiles')
          .select('display_name, role, active').eq('user_id', user.id).maybeSingle();
        if (error || !profile?.active || !['staff', 'system_admin'].includes(profile.role)) {
          await supabase.auth.signOut();
          window.location.replace('/staff/login/?error=unauthorized');
          return;
        }
        if (active) setDisplayName(profile.display_name || '');
      } catch { window.location.replace('/staff/login/'); }
    }
    void load();
    return () => { active = false; };
  }, []);
  return (
    <section style={{ padding: '2.5rem 5vw', color: '#fff', background: '#080808', minHeight: '55vh' }}>
      <p style={{ color: '#00a8d6', letterSpacing: '.15em', fontSize: '.75rem', fontWeight: 800 }}>STAFF WORKSPACE</p>
      <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem,5vw,3rem)' }}>Welcome{displayName ? `, ${displayName}` : ''}.</h1>
      <p style={{ color: '#aaa' }}>Your staff account is authenticated. Ticketing operations will appear here as their workflows are implemented.</p>
    </section>
  );
}
