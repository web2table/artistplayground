'use client';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="brand-block">
          <a className="brand" href="/" aria-label="Artist Playground home">
            <img src="https://raw.githubusercontent.com/web2table/artistplayground/main/ap.jpg" alt="Artist Playground logo" />
          </a>
          <p>A space for talent at every stage.</p>
        </div>
        <div className="follow-block">
          <p className="follow-label">FOLLOW OUR JOURNEY</p>
          <div className="social-links" aria-label="Artist Playground social media">
            <a className="social" href="https://www.tiktok.com/@artist.playground?lang=en" target="_blank" rel="noopener noreferrer" aria-label="Artist Playground on TikTok">
              <svg className="tiktok-mark" viewBox="0 0 100 100" aria-hidden="true"><path fill="#25F4EE" d="M58 12v46c0 13-10 22-23 22-12 0-21-9-21-20s9-20 21-20c3 0 6 1 8 2v15c-2-2-5-3-8-3-5 0-9 4-9 9s4 9 9 9c6 0 10-5 10-12V12h13c2 11 9 18 20 20v14c-11-2-20-7-27-15V12z" transform="translate(-4 -2)"/><path fill="#FE2C55" d="M58 12v46c0 13-10 22-23 22-12 0-21-9-21-20s9-20 21-20c3 0 6 1 8 2v15c-2-2-5-3-8-3-5 0-9 4-9 9s4 9 9 9c6 0 10-5 10-12V12h13c2 11 9 18 20 20v14c-11-2-20-7-27-15V12z" transform="translate(4 2)"/><path fill="#fff" d="M58 12v46c0 13-10 22-23 22-12 0-21-9-21-20s9-20 21-20c3 0 6 1 8 2v15c-2-2-5-3-8-3-5 0-9 4-9 9s4 9 9 9c6 0 10-5 10-12V12h13c2 11 9 18 20 20v14c-11-2-20-7-27-15V12z"/></svg>
            </a>
            <a className="social" href="https://www.instagram.com/art.playg/" target="_blank" rel="noopener noreferrer" aria-label="Artist Playground on Instagram">
              <svg className="instagram-mark" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="ig-gradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="#FFD600"/><stop offset="35%" stopColor="#FF7A00"/><stop offset="65%" stopColor="#FF0169"/><stop offset="100%" stopColor="#D300C5"/></linearGradient></defs><rect x="5" y="5" width="90" height="90" rx="25" fill="url(#ig-gradient)"/><rect x="23" y="23" width="54" height="54" rx="17" fill="none" stroke="#fff" strokeWidth="8"/><circle cx="50" cy="50" r="14" fill="none" stroke="#fff" strokeWidth="8"/><circle cx="69" cy="31" r="5" fill="#fff"/></svg>
            </a>
            <a className="social" href="https://www.facebook.com/artplayg" target="_blank" rel="noopener noreferrer" aria-label="Artist Playground on Facebook">
              <svg className="facebook-mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="#0866FF"/><path fill="#fff" d="M57 84V55h10l2-13H57v-8c0-4 2-6 7-6h6V16c-3-.5-7-1-11-1-13 0-22 8-22 23v4H27v13h10v29z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} Artist Playground. All rights reserved.</small>
        <small>Performance · Education · Creativity</small>
      </div>
      <style jsx>{`
        .site-footer{margin-top:clamp(2rem,4vw,4rem);border-top:1px solid var(--ap-border);padding:clamp(1.5rem,3vw,2.25rem) 5vw .75rem;color:var(--ap-muted)}
        .footer-main{display:flex;justify-content:space-between;align-items:flex-start;gap:clamp(1.5rem,3vw,3rem)}
        .brand-block{display:flex;flex-direction:column;align-items:flex-start;gap:.75rem}
        .brand{display:inline-flex;align-items:center;text-decoration:none}
        .brand img{display:block;width:auto;height:3.25rem;max-width:200px;object-fit:contain}
        .brand-block p{margin:0;color:var(--ap-muted);line-height:1.6}
        .follow-block{display:flex;flex-direction:column;align-items:flex-end;gap:.65rem}
        .follow-label{margin:0;color:var(--ap-blue);font-size:var(--ap-size-micro);font-weight:800;letter-spacing:.16em}
        .social-links{display:flex;flex-wrap:wrap;gap:.65rem;align-items:center}
        .social{display:inline-flex;align-items:center;justify-content:center;width:2.6rem;height:2.6rem;border-radius:.5rem;background:#161616;text-decoration:none;color:#fff}
        .social svg{width:1.75rem;height:1.75rem;display:block;object-fit:contain}
        .social svg.tiktok-mark{width:1.75rem;height:1.75rem}
        .social:hover,.social:focus-visible{transform:translateY(-2px);outline:2px solid var(--ap-blue);outline-offset:3px}
        .footer-bottom{margin-top:1.5rem;padding-top:.75rem;border-top:1px solid var(--ap-border);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.75rem;font-size:var(--ap-size-support)}
        @media(max-width:700px){.footer-main{flex-direction:column;gap:1.5rem}.follow-block{align-items:flex-start}.footer-bottom{flex-direction:column;align-items:flex-start}}
      `}</style>
    </footer>
  );
}
