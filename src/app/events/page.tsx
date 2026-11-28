'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type PublicEvent = {
  id: string; event_type: 'show' | 'workshop' | 'other'; title: string; description: string;
  starts_at: string; ends_at: string | null; venue_name: string; venue_address: string | null;
  image_url: string | null; info_url: string | null; lifecycle: 'upcoming' | 'ongoing' | 'past';
};

const tabs = [{id:'all',label:'All events'},{id:'show',label:'Shows'},{id:'workshop',label:'Workshops'},{id:'other',label:'Other events'}] as const;
const groups = [{id:'upcoming',label:'Upcoming'},{id:'ongoing',label:'Ongoing'},{id:'past',label:'Past events'}] as const;
const dateLabel = (value: string) => new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
const categoryLabel = (type: PublicEvent['event_type']) => type === 'show' ? 'Show' : type === 'workshop' ? 'Workshop' : 'Artist Playground';

export default function EventsPage() {
  const [events,setEvents] = useState<PublicEvent[]>([]);
  const [filter,setFilter] = useState<(typeof tabs)[number]['id']>('all');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {data,error} = await supabase.functions.invoke('manage-events',{method:'GET'});
        if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unable to load events.');
        if (active) setEvents(data.events || []);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to load events.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  },[]);
  const visible = useMemo(() => filter === 'all' ? events : events.filter(event => event.event_type === filter),[events,filter]);
  return <div className="ap-page ap-page-events ap-events-dynamic">
    <section className="hero"><p className="eyebrow">ARTIST PLAYGROUND · EVENTS</p><h1>What’s happening at Artist Playground</h1><p className="lead">Discover our upcoming shows, workshops, current activities, and past events.</p></section>
    <section className="ap-events-content">
      <nav className="ap-events-filters" aria-label="Filter events">{tabs.map(tab=><button type="button" key={tab.id} className={filter===tab.id?'active':''} onClick={()=>setFilter(tab.id)}>{tab.label}</button>)}</nav>
      {loading ? <div className="ap-events-empty"><p>Loading events…</p></div> : error ? <div className="ap-events-empty"><h2>Events are temporarily unavailable.</h2><p>{error}</p></div> : groups.map(group=>{
        const rows = visible.filter(event=>event.lifecycle===group.id).sort((a,b)=>group.id==='past'?Date.parse(b.starts_at)-Date.parse(a.starts_at):Date.parse(a.starts_at)-Date.parse(b.starts_at));
        if (!rows.length) return null;
        return <section className="ap-event-group" key={group.id}><div className="ap-event-group-heading"><h2>{group.label}</h2><span>{rows.length} {rows.length===1?'event':'events'}</span></div><div className="ap-event-grid">{rows.map(event=><article className="ap-event-card" key={event.id}>
          {event.image_url ? <img className="ap-event-image" src={event.image_url} alt={event.title}/> : <div className="ap-event-image ap-event-image-placeholder"><span>ARTIST<br/>PLAYGROUND</span></div>}
          <div className="ap-event-card-body"><span className="ap-event-type">{categoryLabel(event.event_type)}</span><h3>{event.title}</h3>{event.description && <p className="ap-event-description">{event.description}</p>}
            <div className="ap-event-facts"><p><strong>{event.lifecycle==='past'?'Date':'When'}</strong>{dateLabel(event.starts_at)}{event.ends_at && ' – '+dateLabel(event.ends_at)}</p>{event.venue_name && <p><strong>Where</strong>{event.venue_name}{event.venue_address && <span>{event.venue_address}</span>}</p>}</div>
            {event.info_url && <a className="ap-event-link" href={event.info_url} target="_blank" rel="noreferrer">More information ↗</a>}
          </div></article>)}</div></section>;
      })}
      {!loading && !error && visible.length===0 && <div className="ap-events-empty"><h2>No events in this category yet.</h2><p>Check back soon for Artist Playground updates.</p></div>}
      {!loading && !error && visible.length>0 && groups.every(group=>!visible.some(event=>event.lifecycle===group.id)) && <div className="ap-events-empty"><h2>No events in this category yet.</h2><p>Check back soon for Artist Playground updates.</p></div>}
    </section>
  </div>;
}