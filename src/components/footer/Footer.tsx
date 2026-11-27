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
            <a className="social" href="https://www.tiktok.com/@artist.playground?lang=en" target="_blank" rel="noopener noreferrer" aria-label="Artist Playground on TikTok"><span aria-hidden="true">♪</span></a>
            <a className="social" href="https://www.instagram.com/art.playg/" target="_blank" rel="noopener noreferrer" aria-label="Artist Playground on Instagram"><span aria-hidden="true">◎</span></a>
            <a className="social" href="https://www.facebook.com/artplayg" target="_blank" rel="noopener noreferrer" aria-label="Artist Playground on Facebook"><span aria-hidden="true">f</span></a>
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
        .social{display:inline-flex;align-items:center;justify-content:center;width:2.6rem;height:2.6rem;border-radius:.5rem;background:#161616;text-decoration:none;color:#fff;font-size:1.7rem;font-weight:800}
        .social:hover,.social:focus-visible{transform:translateY(-2px);outline:2px solid var(--ap-blue);outline-offset:3px}
        .footer-bottom{margin-top:1.5rem;padding-top:.75rem;border-top:1px solid var(--ap-border);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.75rem;font-size:var(--ap-size-support)}
        @media(max-width:700px){.footer-main{flex-direction:column;gap:1.5rem}.follow-block{align-items:flex-start}.footer-bottom{flex-direction:column;align-items:flex-start}}
      `}</style>
    </footer>
  );
}
