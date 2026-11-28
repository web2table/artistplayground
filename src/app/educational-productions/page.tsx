'use client';

import { useEffect, useState } from 'react';
import ibongAdarnaPoster from '../../ibongadarna.jpg';
import florantePoster from '../../floranteatlaura.jpg';
import noliPoster from '../../noli.jpg';
import elFiliPoster from '../../elfili.jpg';
import juntoPoster from '../../juntoalpasig.jpg';

const works = [
  { number: '01', title: 'Ibong Adarna', category: 'Corrido · Filipino literature', description: 'Follow Prince Juan and his brothers on their quest to capture the magical Adarna bird, through trials of courage, loyalty, betrayal, and forgiveness.', accent: 'blue', poster: ibongAdarnaPoster },
  { number: '02', title: 'Florante at Laura', category: 'Awit · Filipino literature', description: 'Set in the kingdom of Albania, the poem follows Florante amid betrayal and political turmoil, with themes of love, friendship, injustice, and patriotism.', accent: 'gold', poster: florantePoster },
  { number: '03', title: 'Noli Me Tangere', category: 'Novel · José Rizal', description: 'Crisostomo Ibarra returns to the Philippines and confronts corruption, abuse, and social injustice under colonial rule as he hopes to improve his community.', accent: 'blue', poster: noliPoster },
  {
    number: '04',
    title: 'El Filibusterismo',
    category: 'Novel · José Rizal',
    description: 'Years later, Simoun returns with a plan for revenge. The novel examines oppression, corruption, reform, and the consequences of seeking change through violence.',
    accent: 'gold',
    poster: elFiliPoster,
    synopsis: 'El Filibusterismo addresses topics of great importance to the movement, namely clerical abuses, racism against the Philippine people, and the need for political reform. The story began thirteen years after the deaths of Sisa and Elias. Ibarra disguised as Simoun continued plotting his revenge on the government. Secrets are revealed and choices are made that create chaos and havoc to the characters in this novel. How much blood will be spilled and what are the roles of the youth to this day.',
    themes: 'Revenge, racism against Filipino people, control, abuse of government, and the relativity of truth and goodness.',
    artisticTeam: [
      'Andre Tiangco — Director',
      'Robert Macaraeg — Assistant Director',
      'Jhuss Hitosis — Costume Designer',
      'Steffi Cruz — Lighting Designer',
      'Nico Cabanit — Graphic / Layout Designer',
      'Jess Briones — Video Projection Design'
    ],
    productionTeam: [
      'Kimberly Claire Somoza — Production Manager',
      'Princess Tuason — Stage Manager',
      'Emma Lorena — Assistant Stage Manager',
      'Glenn Caspe — Technical Director',
      'Interns from Pamantasan ng Lungsod ng Valenzuela'
    ],
    cast: 'Senior actors in the industry led by award-winning actor-director Roeder Camañag, Joe Gruta, Arkin Da Silva, Rainier Morales, and Paul Jake Paule, among others. New-generation actors from Artist Playground’s pool of actors, The Players, are joining the cast too.'
  },
  { number: '05', title: 'Junto Al Pasig: The Rock, Ballet & Multimedia Zarzuela', category: 'Zarzuela · José Rizal', description: 'Reimagines José Rizal’s 1880 masterpiece as a fusion of rock music, classical ballet, multimedia art, and theater on a single stage.', accent: 'blue', poster: juntoPoster }
];

type Work = (typeof works)[number];

export default function EducationalProductionsPage() {
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  useEffect(() => {
    if (!selectedWork) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedWork(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedWork]);

  return <div className="ap-page ap-page-educational-productions">
    <section className="catalog">
      <div className="section-heading">
        <p className="eyebrow">OUR LITERARY STAGE</p>
        <h2>Stories students know.<br/><span>Performances they remember.</span></h2>
        <p>Explore titles that can turn reading and discussion into a shared live experience. Select a poster to learn more about each production.</p>
      </div>
      <div className="works">
        {works.map(work => <article className={`work-card ${work.accent}`} key={work.number}>
          <button type="button" className="poster-trigger" onClick={() => setSelectedWork(work)} aria-label={`View details for ${work.title}`}>
            <img className="poster" src={work.poster.src} alt={`${work.title} production poster`} loading="lazy"/>
            <span className="poster-hint">VIEW PRODUCTION DETAILS</span>
          </button>
          <div className="card-content">
            <div className="card-top"><span className="number">{work.number}</span><span className="category">{work.category}</span></div>
            <h3>{work.title}</h3>
            <p>{work.description}</p>
          </div>
        </article>)}
      </div>
    </section>
    <section className="school-cta">
      <p className="eyebrow">FOR EDUCATORS & ORGANIZERS</p>
      <h2>Planning a school performance?</h2>
      <p>Tell us about your school, preferred title, audience, and schedule. Get in touch to discuss an educational production.</p>
    </section>

    {selectedWork && <div className="production-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedWork(null); }}>
      <section className="production-modal" role="dialog" aria-modal="true" aria-labelledby="production-modal-title">
        <button type="button" className="production-modal-close" onClick={() => setSelectedWork(null)} aria-label="Close production details">×</button>
        <div className="production-modal-layout">
          <div className="production-modal-poster-wrap">
            <img className="production-modal-poster" src={selectedWork.poster.src} alt={`${selectedWork.title} production poster`}/>
          </div>
          <div className="production-modal-content">
            <p className="eyebrow">ARTIST PLAYGROUND · THE CLASSICS NOW</p>
            <p className="production-modal-number">{selectedWork.number} · {selectedWork.category}</p>
            <h2 id="production-modal-title">{selectedWork.title}</h2>
            <section className="production-modal-section">
              <h3>Synopsis</h3>
              <p>{'synopsis' in selectedWork && selectedWork.synopsis ? selectedWork.synopsis : selectedWork.description}</p>
            </section>
            {'themes' in selectedWork && <section className="production-modal-section"><h3>Production themes</h3><p>{selectedWork.themes}</p></section>}
            {'artisticTeam' in selectedWork && <section className="production-modal-section"><h3>Artistic team</h3><ul>{selectedWork.artisticTeam.map(member => <li key={member}>{member}</li>)}</ul></section>}
            {'productionTeam' in selectedWork && <section className="production-modal-section"><h3>Production team</h3><ul>{selectedWork.productionTeam.map(member => <li key={member}>{member}</li>)}</ul></section>}
            {'cast' in selectedWork && <section className="production-modal-section"><h3>Cast</h3><p>{selectedWork.cast}</p></section>}
          </div>
        </div>
      </section>
    </div>}
  </div>;
}
