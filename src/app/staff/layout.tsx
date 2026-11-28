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

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace(appPath('/staff/login/'));
        return;
      }
      const { data } = await supabase.from('staff_profiles').select('display_name,active').eq('user_id', user.id).maybeSingle();
      if (!data?.active) {
        await supabase.auth.signOut();
        window.location.replace(appPath('/staff/login/?error=unauthorized'));
        return;
      }
      if (active) setDisplayName(data.display_name || 'Management member');
    })();
    return () => { active = false; };
  }, []);

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
      <div className="ap-staff-page">{children}</div>
      
    </div>
  );
}
