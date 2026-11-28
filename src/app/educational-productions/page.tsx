'use client';

import { useEffect, useState } from 'react';
import ibongAdarnaPoster from '../../ibongadarna.jpg';
import florantePoster from '../../floranteatlaura.jpg';
import noliPoster from '../../noli.jpg';
import elFiliPoster from '../../elfili.jpg';
import juntoPoster from '../../juntoalpasig.jpg';

const works = [
  {
    number: '01',
    title: 'Mga Awit ng Ibong Adarna',
    category: 'Corrido · Filipino literature',
    description: 'A musical reimagining of the beloved Filipino epic through music, dance, and dramatic storytelling.',
    accent: 'blue',
    poster: ibongAdarnaPoster,
    synopsis: `Mga Awit ng Ibong Adranal is a captivating theatrical experience that reimagines the beloved Filipino epic through a powerful blend of music, dance, and dramatic storytelling. The production transports the audience to a world of magic and mystery, using innovative stage design, dynamic choreography, and an evocative score to bring the legend to life.

The musical features a rich tapestry of songs that range from haunting ballads to vibrant ensemble numbers, each capturing the emotional depth and grandeur of the tale. The choreography combines traditional Filipino dance forms with contemporary movement, creating visually stunning scenes that reflect the characters’ inner journeys.

The set design is fluid and imaginative, with shifts in lighting and staging that seamlessly transform the space from royal courts to enchanted forests. Costumes are meticulously crafted, blending traditional elements with modern flair, enhancing the visual spectacle.

Throughout the production, the music takes center stage, with powerful vocal performances that convey the epic’s themes of love, betrayal, and redemption. The score is a mix of traditional and modern influences, creating a soundscape that is both familiar and fresh, resonating deeply with the audience.

The musical concludes with a rousing finale that leaves the audience uplifted, celebrating the enduring power of storytelling and the richness of Filipino culture.`
  },
  {
    number: '02',
    title: 'Florante at Laura',
    category: 'Awit · Filipino literature',
    description: 'Set in the kingdom of Albania, the poem follows Florante amid betrayal and political turmoil, with themes of love, friendship, injustice, and patriotism.',
    accent: 'gold',
    poster: florantePoster,
    synopsis: `Florante at Laura is a classic Filipino epic by Francisco Balagtas that tells a powerful story of love, honor, and resilience amid war and betrayal.

Set in the kingdoms of Albania and Persia, the story follows Florante, a brave Albanian warrior, who is betrayed by his fellow countryman Adolfo and left bound and helpless in a dark forest. There, Florante mourns his fate and his deep love for Laura, the daughter of King Linceo of Albania.

Meanwhile, Laura faces her own struggle as Adolfo seizes power and attempts to force her affection. Refusing to surrender her love and principles, Laura escapes the palace, driven by loyalty and courage. Her journey leads her to the same forest where Florante is imprisoned.

Through faith, perseverance, and true love, Florante and Laura are reunited and freed from oppression. Justice is restored as truth prevails over deceit, and rightful leadership returns to the kingdom.

Florante at Laura remains a timeless tale that reflects the Filipino values of katapatan (loyalty), pag-ibig (love), and katarungan (justice), reminding audiences that hope and righteousness endure even in the darkest moments.`
  },
  {
    number: '03',
    title: 'Huwag Mo Kaming Hawakan: Noli Me Tangere',
    category: 'Devised play · José Rizal',
    description: 'A devised play inspired by Noli Me Tangere, exploring the loss of identity and honor in a society marked by corruption and oppression.',
    accent: 'blue',
    poster: noliPoster,
    synopsis: `"Kaming Nangalagas sa Dilim ng Gabi" is a gripping devised play inspired by Jose Rizal's renowned novel, "Noli Me Tangere." It delves into the profound effects of losing one's identity and honor within a society plagued by corruption and oppression.

Set in the late 19th century Philippines during Spanish colonial rule, the play follows the lives of various characters from Rizal's novel, who are grappling with the relentless burden of societal expectations and the consequences of compromising their integrity. The narrative primarily revolves around the central character, Crisostomo Ibarra, a young idealist returning to his homeland after studying abroad.

As the story unfolds, Ibarra encounters an array of individuals entangled in a web of deceit and moral decay. Through their interconnected stories, the play explores the multifaceted impacts of losing one's identity and honor. Ibarra's journey serves as a lens through which the audience witnesses the tragic consequences of succumbing to societal pressures, compromising values, and abandoning personal convictions.

The play delves into the internal struggles faced by each character as they navigate a society rife with corruption, injustice, and social inequality. It sheds light on the choices they make in their pursuit of power, acceptance, or survival, often at the expense of their integrity. As the characters confront their own inner demons, the audience witnesses the profound psychological and emotional toll of such compromises.

"Kaming Nangalagas sa Dilim ng Gabi" skillfully weaves together poignant dialogues, evocative visuals, and powerful performances to emphasize the profound impact of losing one's identity and honor. The play serves as a stark reminder of the timeless relevance of Rizal's themes, urging audiences to reflect on the consequences of sacrificing personal integrity for societal acceptance or personal gain.

Ultimately, "Kaming Nangalagas sa Dilim ng Gabi" serves as a thought-provoking exploration of the human condition, exposing the devastating consequences of forsaking one's identity and honor in a world marked by corruption and oppression. It compels viewers to question the choices they make and the values they hold dear, urging them to strive for a society built on truth, justice, and personal integrity.`
  },
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
