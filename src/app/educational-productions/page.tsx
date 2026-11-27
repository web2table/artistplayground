'use client';

import ibongAdarnaPoster from '../../ibongadarna.jpg';
import florantePoster from '../../floranteatlaura.jpg';
import noliPoster from '../../noli.jpg';
import elFiliPoster from '../../elfili.jpg';
import juntoPoster from '../../juntoalpasig.jpg';
const works=[
{number:'01',title:'Ibong Adarna',category:'Corrido · Filipino literature',description:'Follow Prince Juan and his brothers on their quest to capture the magical Adarna bird, through trials of courage, loyalty, betrayal, and forgiveness.',accent:'blue',poster:ibongAdarnaPoster},
{number:'02',title:'Florante at Laura',category:'Awit · Filipino literature',description:'Set in the kingdom of Albania, the poem follows Florante amid betrayal and political turmoil, with themes of love, friendship, injustice, and patriotism.',accent:'gold',poster:florantePoster},
{number:'03',title:'Noli Me Tangere',category:'Novel · José Rizal',description:'Crisostomo Ibarra returns to the Philippines and confronts corruption, abuse, and social injustice under colonial rule as he hopes to improve his community.',accent:'blue',poster:noliPoster},
{number:'04',title:'El Filibusterismo',category:'Novel · José Rizal',description:'Years later, Simoun returns with a plan for revenge. The novel examines oppression, corruption, reform, and the consequences of seeking change through violence.',accent:'gold',poster:elFiliPoster},
{number:'05',title:'Junto Al Pasig: The Rock, Ballet & Multimedia Zarzuela',category:'Zarzuela · José Rizal',description:'Reimagines José Rizal’s 1880 masterpiece as a fusion of rock music, classical ballet, multimedia art, and theater on a single stage.',accent:'blue',poster:juntoPoster}
];
export default function EducationalProductionsPage(){return <div className="ap-page ap-page-educational-productions">
<section className="hero"><p className="eyebrow">ARTIST PLAYGROUND · FOR SCHOOLS</p><h1>Bring the pages<br/><span>to the stage.</span></h1><p className="lead">Artist Playground presents stage adaptations of Filipino literary works. Read about each title to see its story, characters, and themes before discussing a school performance.</p></section>
<section className="catalog"><div className="section-heading"><p className="eyebrow">OUR LITERARY STAGE</p><h2>Stories students know.<br/><span>Performances they remember.</span></h2><p>Explore titles that can turn reading and discussion into a shared live experience.</p></div><div className="works">{works.map(work=><article className={`work-card ${work.accent}`} key={work.number}><img className="poster" src={work.poster.src} alt={`${work.title} production poster`} loading="lazy"/><div className="card-content"><div className="card-top"><span className="number">{work.number}</span><span className="category">{work.category}</span></div><h3>{work.title}</h3><p>{work.description}</p></div></article>)}</div></section>
<section className="school-cta"><p className="eyebrow">FOR EDUCATORS & ORGANIZERS</p><h2>Planning a school performance?</h2><p>Tell us about your school, preferred title, audience, and schedule. Get in touch to discuss an educational production.</p></section>

</div>}