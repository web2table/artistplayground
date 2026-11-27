'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'Educational', href: '/educational-productions/' },
  { label: 'Theater', href: '/productions/' },
  { label: 'Workshops', href: '/workshops/' },
  { label: 'Events', href: '/events/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Book Tickets', href: '/book/' },
];

export default function Header() {
  const pathname = usePathname() || '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const activeFor = (href: string) => href === '/' ? pathname === '/' : pathname === href.replace(/\/$/, '') || pathname.startsWith(href);

  return (
    <header className={`site-header${menuOpen ? ' menu-open' : ''}`}>
      <Link className="brand" href="/" aria-label="Artist Playground home">
        <img className="brand-logo" src="https://raw.githubusercontent.com/web2table/artistplayground/main/ap.jpg" alt="Artist Playground logo" width="220" height="56" style={{ display: "block", width: "auto", height: "3.5rem", maxWidth: "220px", objectFit: "contain" }} />
      </Link>
      <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>
        <span className="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>
        <span className="menu-label">Menu</span>
      </button>
      <nav id="main-navigation" aria-label="Main navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={`${activeFor(link.href) ? 'is-active ' : ''}${link.href === '/book/' ? 'nav-cta' : ''}`} aria-current={activeFor(link.href) ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
            {link.label}
          </Link>
        ))}
      </nav>
      <style jsx>{`
        .site-header{display:flex;align-items:center;justify-content:space-between;gap:2rem;padding:1rem 5vw;border-bottom:1px solid var(--ap-border);background:var(--ap-black);position:relative;z-index:20}
        .brand{display:flex;align-items:center;text-decoration:none;flex-shrink:0}
        .brand-logo{width:auto;height:3.5rem;max-width:220px;object-fit:contain}
        nav{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:.4rem}
        nav :global(a){text-decoration:none;font-size:var(--ap-size-nav);padding:.6rem .75rem;color:var(--ap-text);border:1px solid transparent;border-radius:.45rem;transition:color .15s,background .15s,border-color .15s}
        nav :global(a:hover),nav :global(a:focus-visible){color:var(--ap-yellow);border-color:var(--ap-border);outline:none}
        nav :global(a.is-active){color:var(--ap-yellow);border-color:var(--ap-yellow);background:transparent;font-weight:400;box-shadow:none}
        nav :global(a.nav-cta){margin-left:.35rem;padding:.65rem 1.05rem;background:var(--ap-yellow);border:1px solid var(--ap-yellow);border-radius:.5rem;color:#080808;font-weight:800;box-shadow:0 2px 10px rgba(255,220,0,.12)}
        nav :global(a.nav-cta:hover),nav :global(a.nav-cta:focus-visible){background:#ffe84a;border-color:#ffe84a;color:#080808;transform:translateY(-1px)}
        nav :global(a.nav-cta.is-active){background:var(--ap-yellow);border-color:var(--ap-yellow);color:#080808}
        .menu-toggle{display:none;align-items:center;justify-content:center;gap:.65rem;border:1px solid var(--ap-border);background:#111;color:var(--ap-text);padding:.65rem .8rem;border-radius:.5rem;cursor:pointer}
        .menu-icon{display:flex;width:1.1rem;flex-direction:column;gap:4px}
        .menu-icon span{display:block;width:100%;height:2px;background:currentColor;transition:transform .2s,opacity .2s}
        .menu-label{font-size:var(--ap-size-menu);font-weight:700}
        @media(max-width:850px){.site-header{flex-direction:row;align-items:center;gap:1rem;padding:1rem 5vw}.menu-toggle{display:flex}nav{display:none;position:absolute;left:0;right:0;top:100%;padding:1rem 5vw 1.25rem;background:var(--ap-black);border-bottom:1px solid var(--ap-border);flex-direction:column;align-items:stretch;gap:.3rem;box-shadow:0 16px 28px rgba(0,0,0,.35)}.menu-open nav{display:flex}nav :global(a){display:block;width:100%;padding:.8rem 1rem;font-size:var(--ap-size-nav-mobile);border-radius:.4rem}nav :global(a:hover),nav :global(a:focus-visible){background:#151515}.menu-open .menu-icon span:nth-child(1){transform:translateY(6px) rotate(45deg)}.menu-open .menu-icon span:nth-child(2){opacity:0}.menu-open .menu-icon span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}}
        @media(max-width:480px){.site-header{padding:1rem 4vw}.brand-logo{height:3rem;max-width:190px}nav{padding-left:4vw;padding-right:4vw}}
      `}</style>
    </header>
  );
}
