'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="ap-page ap-page-home">
      <section className="hero">
        <p className="eyebrow">PERFORMANCE · EDUCATION · CREATIVITY</p>
        <h1><span>Theater and creative</span><span className="yellow">experiences.</span></h1>
        <p className="tagline"><span className="tagline-secondary">We stage Filipino literary adaptations, present theater productions, and facilitate workshops for schools, groups, and audiences.</span></p>
      </section>
      <section className="section">
        <div className="section-heading"><p className="eyebrow">WHAT WE DO</p><h2>Our programs and productions.</h2></div>
        <div className="offerings">
          <Link className="offering yellow" href="/educational-productions/" style={{ background: "var(--ap-yellow)", color: "#000", padding: "2rem", borderRadius: "1rem", textDecoration: "none", minHeight: "250px" }}><h3>Educational Theater</h3><p>Stage adaptations of Filipino literary works, including Ibong Adarna, Florante at Laura, Noli Me Tangere, and El Filibusterismo.</p><span>Explore ↗</span></Link>
          <Link className="offering blue" href="/productions/" style={{ background: "var(--ap-blue)", color: "#001319", padding: "2rem", borderRadius: "1rem", textDecoration: "none", minHeight: "250px" }}><h3>Theater Productions</h3><p>Live stage productions developed and presented by Artist Playground. Explore our production page for details.</p><span>Explore ↗</span></Link>
          <Link className="offering dark" href="/workshops/" style={{ background: "#171717", border: "1px solid #333", color: "#fff", padding: "2rem", borderRadius: "1rem", textDecoration: "none", minHeight: "250px" }}><h3>Workshops</h3><p>Creative sessions focused on performance, stage skills, storytelling, character, and artistic exploration.</p><span>Explore ↗</span></Link>
        </div>
      </section>
      <section className="section">
        <p className="eyebrow">Stay in the loop</p><h2>See what&apos;s happening.</h2>
        <p>Discover upcoming performances, workshops, and announcements from Artist Playground.</p>
        <Link className="cta" href="/events/">View Events ↗</Link>
      </section>
      
    </div>
  );
}
