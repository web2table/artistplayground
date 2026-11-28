'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';
import './staff-workspace.css';

export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState('Management member');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const isLoginPage = pathname.includes('/staff/login');

  useEffect(() => {
    if (isLoginPage) return;
    let active = true;
    async function verifyManagementSession() {
      setAuthError('');
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          window.location.replace(appPath('/staff/login/'));
          return;
        }
        const { data, error } = await supabase.from('staff_profiles')
          .select('display_name,active').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (!data?.active) {
          await supabase.auth.signOut();
          window.location.replace(appPath('/staff/login/?error=unauthorized'));
          return;
        }
        if (active) {
          setDisplayName(data.display_name || 'Management member');
          setAuthReady(true);
        }
      } catch (error) {
        if (active) setAuthError(error instanceof Error ? error.message : 'Unable to verify your management session.');
      }
    }
    void verifyManagementSession();
    return () => { active = false; };
  }, [isLoginPage]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash || '');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace(appPath('/staff/login/'));
  }

  const isOverview = pathname.endsWith('/staff') || pathname.endsWith('/staff/');
  const links = [
    { label: 'Overview', href: appPath('/staff/#overview'), icon: '⌂', active: isOverview && (!activeHash || activeHash === '#overview') },
    { label: 'Productions', href: appPath('/staff/productions/'), icon: '▣', active: pathname.includes('/staff/productions') },
    { label: 'Events', href: appPath('/staff/events/'), icon: '▤', active: pathname.includes('/staff/events') },
    { label: 'Refunds', href: appPath('/staff/#refunds'), icon: '↺', active: isOverview && activeHash === '#refunds' },
    { label: 'Ticket scanner', href: appPath('/staff/#scanner'), icon: '▦', active: isOverview && activeHash === '#scanner' },
    { label: 'Box office', href: appPath('/staff/#box-office'), icon: '＋', active: isOverview && activeHash === '#box-office' },
    { label: 'Reports', href: appPath('/staff/#reports'), icon: '▥', active: isOverview && activeHash === '#reports' },
  ];

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="ap-staff-shell">
      <aside className="ap-staff-sidebar">
        <a className="ap-staff-brand" href={appPath('/staff/#overview')} aria-label="Artist Playground management overview">
          <img src={appPath('/ap.jpg')} alt="Artist Playground logo" />
          <span>ARTIST PLAYGROUND<small>MANAGEMENT WORKSPACE</small></span>
        </a>
        <button className={`ap-staff-menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="ap-staff-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
          <span><i /><i /><i /></span>
        </button>
        <nav id="ap-staff-navigation" className={`ap-staff-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Management navigation">
          <p className="ap-staff-nav-label">WORKSPACE</p>
          {links.slice(0, 1).map(link => <a key={link.label} className={link.active ? 'active' : ''} href={link.href}><span>{link.icon}</span>{link.label}</a>)}
          <p className="ap-staff-nav-label">MANAGEMENT</p>
          {links.slice(1, 3).map(link => <a key={link.label} className={link.active ? 'active' : ''} href={link.href}><span>{link.icon}</span>{link.label}</a>)}
          <p className="ap-staff-nav-label">OPERATIONS</p>
          {links.slice(3, 6).map(link => <a key={link.label} className={link.active ? 'active' : ''} href={link.href}><span>{link.icon}</span>{link.label}</a>)}
          <p className="ap-staff-nav-label">INSIGHTS</p>
          {links.slice(6).map(link => <a key={link.label} className={link.active ? 'active' : ''} href={link.href}><span>{link.icon}</span>{link.label}</a>)}
        </nav>
        <div className="ap-staff-account">
          <span className="ap-staff-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
          <span className="ap-staff-account-name">{displayName}<small>Management account</small></span>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <div className="ap-staff-page">{authReady ? children : authError ? <main className="ap-staff-auth-state" role="alert"><h1>Unable to verify session</h1><p>{authError}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></main> : <main className="ap-staff-auth-state" aria-live="polite">Verifying management access…</main>}</div>
      <style jsx>{`.ap-staff-auth-state{min-height:60vh;display:grid;align-content:center;justify-items:center;gap:.75rem;padding:2rem;text-align:center;color:#dce2e9}.ap-staff-auth-state p{max-width:34rem;color:#9aa4af}.ap-staff-auth-state button{padding:.7rem 1rem;border:1px solid #39414b;border-radius:7px;background:#151a20;color:#fff;cursor:pointer}`}</style>
    </div>
  );
}
