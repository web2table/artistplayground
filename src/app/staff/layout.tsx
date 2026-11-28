'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState('Staff member');
  const [menuOpen, setMenuOpen] = useState(false);

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
      if (active) setDisplayName(data.display_name || 'Staff member');
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace(appPath('/staff/login/'));
  }

  const isOverview = pathname.endsWith('/staff') || pathname.endsWith('/staff/');
  const links = [
    { label: 'Overview', href: appPath('/staff/#overview'), icon: '⌂', active: isOverview },
    { label: 'Productions', href: appPath('/staff/productions/'), icon: '▣', active: pathname.includes('/staff/productions') },
    { label: 'Events', href: appPath('/staff/events/'), icon: '▤', active: pathname.includes('/staff/events') },
    { label: 'Refunds', href: appPath('/staff/#refunds'), icon: '↺', active: isOverview && typeof window !== 'undefined' && window.location.hash === '#refunds' },
    { label: 'Ticket scanner', href: appPath('/staff/#scanner'), icon: '▦', active: isOverview && typeof window !== 'undefined' && window.location.hash === '#scanner' },
    { label: 'Box office', href: appPath('/staff/#box-office'), icon: '＋', active: isOverview && typeof window !== 'undefined' && window.location.hash === '#box-office' },
    { label: 'Reports', href: appPath('/staff/#reports'), icon: '▥', active: isOverview && typeof window !== 'undefined' && window.location.hash === '#reports' },
  ];

  return (
    <div className="ap-staff-shell">
      <aside className="ap-staff-sidebar">
        <a className="ap-staff-brand" href={appPath('/staff/#overview')} aria-label="Artist Playground staff overview">
          <img src={appPath('/ap.jpg')} alt="Artist Playground logo" />
          <span>ARTIST PLAYGROUND<small>STAFF WORKSPACE</small></span>
        </a>
        <button className={`ap-staff-menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="ap-staff-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
          <span><i /><i /><i /></span>
        </button>
        <nav id="ap-staff-navigation" className={`ap-staff-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Staff navigation">
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
          <span className="ap-staff-account-name">{displayName}<small>Staff account</small></span>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <div className="ap-staff-page">{children}</div>
      <style jsx global>{`
        .ap-staff-shell{min-height:100svh;display:grid;grid-template-columns:224px minmax(0,1fr);background:#080a0c;color:#f4f5f7}
        .ap-staff-sidebar{position:sticky;top:0;height:100svh;min-height:620px;display:flex;flex-direction:column;padding:1.1rem .85rem;background:#0e1013;border-right:1px solid #252a31;z-index:100}
        .ap-staff-brand{display:flex;align-items:center;gap:.7rem;padding:.35rem .55rem 1.8rem;color:#f4f5f7;text-decoration:none;font-size:.65rem;font-weight:900;letter-spacing:.05em;line-height:1.2}
        .ap-staff-brand img{width:34px;height:40px;object-fit:contain}
        .ap-staff-brand small{display:block;margin-top:.3rem;color:#84909d;font-size:.57rem;letter-spacing:.14em}
        .ap-staff-menu-toggle{display:none}
        .ap-staff-nav{display:flex;flex-direction:column;gap:.18rem;flex:1}
        .ap-staff-nav-label{margin:1.05rem .55rem .45rem;color:#687583;font-size:.58rem;font-weight:800;letter-spacing:.16em}
        .ap-staff-nav a{display:flex;align-items:center;gap:.7rem;padding:.72rem .7rem;border-radius:7px;color:#b9c3ce;text-decoration:none;font-size:.75rem;transition:background .15s,color .15s}
        .ap-staff-nav a>span{width:15px;text-align:center;color:#8ba1b1}
        .ap-staff-nav a:hover,.ap-staff-nav a.active{background:#192930;color:#58d8f5}
        .ap-staff-nav a.active>span{color:#58d8f5}
        .ap-staff-account{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:.1rem .55rem;padding:.9rem .2rem .1rem;border-top:1px solid #252a31}
        .ap-staff-avatar{grid-row:span 1;display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#1b3039;color:#62d7f5;font-size:.75rem;font-weight:800}
        .ap-staff-account-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.7rem;font-weight:800}
        .ap-staff-account-name small{display:block;margin-top:.2rem;color:#7f8996;font-size:.62rem;font-weight:400}
        .ap-staff-account button{grid-column:1/-1;width:100%;margin-top:.7rem;padding:.65rem;border:1px solid #39414b;border-radius:7px;background:#151a20;color:#dce2e9;font:inherit;font-size:.74rem;cursor:pointer}
        .ap-staff-page{min-width:0;min-height:100svh}
        .staff-main,.prod-main{width:100%;max-width:1500px;box-sizing:border-box;margin:0 auto;padding:2rem clamp(1.2rem,3vw,3rem);min-width:0}
        @media(max-width:760px){
          .ap-staff-shell{grid-template-columns:minmax(0,1fr);grid-template-rows:auto 1fr;align-content:start}
          .ap-staff-sidebar{position:relative;top:auto;height:auto;min-height:0;padding:.7rem 1rem .55rem;border-right:0;border-bottom:1px solid #252a31}
          .ap-staff-brand{padding:.2rem 0;max-width:calc(100% - 52px)}
          .ap-staff-brand img{width:30px;height:34px}
          .ap-staff-menu-toggle{display:grid;place-items:center;position:absolute;right:1rem;top:.75rem;width:40px;height:40px;border:0;border-radius:8px;background:#151a20;color:#e8edf2}
          .ap-staff-menu-toggle>span{display:grid;gap:5px}
          .ap-staff-menu-toggle i{display:block;width:18px;height:2px;border-radius:2px;background:currentColor;transition:transform .15s,opacity .15s}
          .ap-staff-menu-toggle.is-open i:first-child{transform:translateY(7px) rotate(45deg)}
          .ap-staff-menu-toggle.is-open i:nth-child(2){opacity:0}
          .ap-staff-menu-toggle.is-open i:last-child{transform:translateY(-7px) rotate(-45deg)}
          .ap-staff-nav{display:none;position:absolute;top:100%;left:0;right:0;z-index:120;max-height:calc(100svh - 100px);overflow-y:auto;padding:.5rem 1rem 1rem;border-bottom:1px solid #252a31;background:#0e1013;box-shadow:0 18px 32px #0009}
          .ap-staff-nav.is-open{display:flex}
          .ap-staff-nav-label{margin:.85rem .55rem .35rem}
          .ap-staff-nav a{padding:.72rem .7rem}
          .ap-staff-account{display:none}
          .staff-main,.prod-main{padding:1.3rem 1rem}
        }
      `}</style>
    </div>
  );
}
