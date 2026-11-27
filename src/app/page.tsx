'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">PERFORMANCE · EDUCATION · CREATIVITY</p>
        <h1><span>Theater and creative</span><span className="yellow">experiences.</span></h1>
        <p className="tagline"><span className="tagline-secondary">We stage Filipino literary adaptations, present theater productions, and facilitate workshops for schools, groups, and audiences.</span></p>
      </section>
      <section className="section">
        <div className="section-heading"><p className="eyebrow">WHAT WE DO</p><h2>Our programs and productions.</h2></div>
        <div className="offerings">
          <Link className="offering yellow" href="/educational-productions/"><h3>Educational Theater</h3><p>Stage adaptations of Filipino literary works, including Ibong Adarna, Florante at Laura, Noli Me Tangere, and El Filibusterismo.</p><span>Explore ↗</span></Link>
          <Link className="offering blue" href="/productions/"><h3>Theater Productions</h3><p>Live stage productions developed and presented by Artist Playground. Explore our production page for details.</p><span>Explore ↗</span></Link>
          <Link className="offering dark" href="/workshops/"><h3>Workshops</h3><p>Creative sessions focused on performance, stage skills, storytelling, character, and artistic exploration.</p><span>Explore ↗</span></Link>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">Stay in the loop</p><h2>See what&apos;s happening.</h2>
        <p>Discover upcoming performances, workshops, and announcements from Artist Playground.</p>
        <Link className="cta" href="/events/">View Events ↗</Link>
      </section>
      <style jsx>{`
        .hero{min-height:0;padding:clamp(2.5rem,4vw,3.5rem) 5vw;display:flex;flex-direction:column;justify-content:flex-start}
        .eyebrow{color:var(--ap-blue);letter-spacing:.15em;font-size:var(--ap-size-eyebrow)}
        h1{font-family:var(--ap-font-display);font-size:var(--ap-size-hero);line-height:.88;margin:1.5rem 0}
        h1 span{display:block}.yellow{color:var(--ap-yellow)}
        .tagline{color:var(--ap-muted);font-size:var(--ap-size-body);margin-top:1.25rem;display:flex;flex-direction:column;align-items:flex-start;gap:.35rem}
        .tagline-secondary{color:var(--ap-muted);font-size:var(--ap-size-body)}
        .section{padding:clamp(2rem,4vw,3rem) 5vw}
        .section-heading h2,h2{font-family:var(--ap-font-display);font-size:var(--ap-size-section);line-height:1.05;letter-spacing:-.035em}
        .offerings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}
        .offering{min-height:250px;padding:2rem;text-decoration:none;border-radius:1rem;display:flex;flex-direction:column;justify-content:flex-end;gap:.5rem}
        .offering h3{font-size:var(--ap-size-card);margin:0 0 .5rem}.offering p{margin:0}.offering span{font-weight:800;margin-top:.75rem}
        .offering.yellow{background:var(--ap-yellow);color:#000}.offering.blue{background:var(--ap-blue);color:#001319}.offering.dark{background:#171717;border:1px solid #333;color:white}
        .cta{display:inline-block;margin-top:1.5rem;color:var(--ap-yellow);font-weight:bold;text-decoration:none}
        @media(max-width:700px){.hero{min-height:0;padding:2.5rem 5vw 2rem;justify-content:flex-start}.hero h1{margin:1rem 0}.hero .tagline{margin-top:.5rem}.offerings{grid-template-columns:1fr}.offering{min-height:180px}}
      `}</style>
    </>
  );
}
