'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { label: 'About', href: '/' },
  { label: 'Educational Theater', href: '/educational-productions/' },
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
      <Link className="brand" href="/" aria-label="Artist Playground">
        <img className="brand-logo" src="https://raw.githubusercontent.com/web2table/artistplayground/main/ap.jpg" alt="Artist Playground logo" width="220" height="56" style={{ display: "block", width: "auto", height: "3.5rem", maxWidth: "220px", objectFit: "contain" }} />
      </Link>
      <button className={`menu-toggle${menuOpen ? " is-open" : ""}`} type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>
        <span className="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
      <nav id="main-navigation" aria-label="Main navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className={`${activeFor(link.href) ? 'is-active ' : ''}${link.href === '/book/' ? 'nav-cta' : ''}`} aria-current={activeFor(link.href) ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
            {link.label}
          </Link>
        ))}
      </nav>
      
    </header>
  );
}
