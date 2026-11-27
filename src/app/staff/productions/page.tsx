'use client';

import { useCallback, useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Category = { id: string; name: string; price: number; allocation: number; reserved_count: number; sold_count: number; active: boolean };
type Performance = { id: string; starts_at: string; doors_open_at: string | null; venue_name: string; venue_address: string | null; capacity: number; status: string; ticket_categories: Category[] };
type Production = { id: string; slug: string; title: string; description: string | null; status: string; created_at: string; performances: Performance[] };

export default function StaffProductionsPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [doorsAt, setDoorsAt] = useState('');
  const [venue, setVenue] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [category, setCategory] = useState('General Admission');
  const [price, setPrice] = useState('100');
  const [allocation, setAllocation] = useState('50');

  const invoke = async (body: Record<string, unknown>) => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke('manage-productions', { body });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'The request could not be completed.');
    return data;
  };

  const loadProductions = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await invoke({ action: 'list' });
      setProductions(data.productions as Production[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load shows.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace(appPath('/staff/login/')); return; }
      const { data: profile, error } = await supabase.from('staff_profiles').select('active').eq('user_id', user.id).maybeSingle();
      if (error || !profile?.active) { await supabase.auth.signOut(); window.location.replace(appPath('/staff/login/?error=unauthorized')); return; }
      if (active) await loadProductions();
    })();
    return () => { active = false; };
  }, [loadProductions]);

  async function createProduction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const data = await invoke({
        action: 'create', title, description, starts_at: new Date(startsAt).toISOString(),
        doors_open_at: doorsAt ? new Date(doorsAt).toISOString() : null,
        venue_name: venue, venue_address: venueAddress, capacity: Number(capacity),
        category_name: category, price: Number(price), allocation: Number(allocation),
      });
      setMessage(data.message || 'Show created.');
      setTitle(''); setDescription(''); setStartsAt(''); setDoorsAt(''); setVenue(''); setVenueAddress('');
      setCapacity('50'); setCategory('General Admission'); setPrice('100'); setAllocation('50');
      await loadProductions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create show.'); }
    finally { setSaving(false); }
  }

  async function publish(id: string) {
    setPublishing(id); setError(''); setMessage('');
    try { const data = await invoke({ action: 'publish', production_id: id }); setMessage(data.message || 'Show published.'); await loadProductions(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to publish show.'); }
    finally { setPublishing(''); }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace(appPath('/staff/login/'));
  }

  return (
    <div className="prod-workspace">
      <aside className="prod-sidebar">
        <a className="prod-brand" href={appPath('/')}><span className="prod-mark">AP</span><span>ARTIST PLAYGROUND<small>STAFF WORKSPACE</small></span></a>
        <div className="prod-nav-label">WORKSPACE</div>
        <a className="prod-nav" href={appPath('/staff/#overview')}>⌂　Overview</a>
        <div className="prod-nav-label">MANAGEMENT</div>
        <a className="prod-nav active" href={appPath('/staff/productions/')}>▣　Productions</a>
        <div className="prod-nav-label">OPERATIONS</div>
        <a className="prod-nav" href={appPath('/staff/#sales')}>₱　Daily sales</a>
        <a className="prod-nav" href={appPath('/staff/#bookings')}>▤　Bookings</a>
        <a className="prod-nav" href={appPath('/staff/#payments')}>▣　Payment desk</a>
        <a className="prod-nav" href={appPath('/staff/#refunds')}>↺　Refunds</a>
        <a className="prod-nav" href={appPath('/staff/#scanner')}>▦　Ticket scanner</a>
        <a className="prod-nav" href={appPath('/staff/#box-office')}>＋　Box office</a>
        <div className="prod-sidebar-bottom"><span>Staff Workspace</span><button type="button" onClick={signOut}>Sign out</button></div>
      </aside>
      <main className="prod-main">
        <header className="prod-header"><div><p className="prod-eyebrow">STAFF WORKSPACE · MANAGEMENT</p><h1>Productions</h1><p>Create shows, schedule performances, and configure ticket inventory.</p></div><button className="prod-refresh" type="button" onClick={() => void loadProductions()} disabled={loading}>Refresh</button></header>
        {error && <div className="prod-alert error" role="alert">{error}</div>}
        {message && <div className="prod-alert success" role="status">{message}</div>}
        <section className="prod-panel">
          <div className="prod-panel-heading"><div><h2>Create a show</h2><p>A show is created with its first performance and ticket category.</p></div><span className="prod-plus">＋</span></div>
          <form className="prod-form" onSubmit={createProduction}>
            <div className="prod-field full"><label htmlFor="show-title">Show title</label><input id="show-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. TEST SHOW – DO NOT PURCHASE" required maxLength={160}/></div>
            <div className="prod-field full"><label htmlFor="show-description">Description</label><textarea id="show-description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Short description of the production" rows={3}/></div>
            <div className="prod-field"><label htmlFor="show-start">Performance date and time</label><input id="show-start" type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} required/></div>
            <div className="prod-field"><label htmlFor="show-doors">Doors open (optional)</label><input id="show-doors" type="datetime-local" value={doorsAt} onChange={e=>setDoorsAt(e.target.value)}/></div>
            <div className="prod-field"><label htmlFor="show-venue">Venue name</label><input id="show-venue" value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Artist Playground Test Venue" required/></div>
            <div className="prod-field"><label htmlFor="show-address">Venue address (optional)</label><input id="show-address" value={venueAddress} onChange={e=>setVenueAddress(e.target.value)} placeholder="Street, city"/></div>
            <div className="prod-field"><label htmlFor="show-capacity">Performance capacity</label><input id="show-capacity" type="number" min="1" step="1" value={capacity} onChange={e=>setCapacity(e.target.value)} required/></div>
            <div className="prod-field"><label htmlFor="show-category">Ticket category</label><input id="show-category" value={category} onChange={e=>setCategory(e.target.value)} required maxLength={80}/></div>
            <div className="prod-field"><label htmlFor="show-price">Ticket price (PHP)</label><input id="show-price" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} required/></div>
            <div className="prod-field"><label htmlFor="show-allocation">Ticket allocation</label><input id="show-allocation" type="number" min="1" step="1" value={allocation} onChange={e=>setAllocation(e.target.value)} required/></div>
            <div className="prod-form-note"><strong>Publishing safety</strong><span>New shows are saved as drafts. You can review the details before publishing them to the public ticket catalog.</span></div>
            <button className="prod-submit" type="submit" disabled={saving}>{saving ? 'Creating show…' : 'Create show'}</button>
          </form>
        </section>
        <section className="prod-list-section">
          <div className="prod-list-heading"><div><h2>Existing shows</h2><p>Review show status, performance schedule, and ticket inventory.</p></div><span>{productions.length} total</span></div>
          {loading ? <div className="prod-empty">Loading productions…</div> : productions.length === 0 ? <div className="prod-empty">No shows have been created yet.</div> : <div className="prod-list">{productions.map(show=><article className="prod-card" key={show.id}>
            <div className="prod-card-top"><div><span className="prod-slug">{show.slug}</span><h3>{show.title}</h3><p>{show.description || 'No description added.'}</p></div><span className={'prod-status '+show.status}>{show.status}</span></div>
            {show.performances.map(perf=><div className="prod-performance" key={perf.id}><div><strong>{new Date(perf.starts_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</strong><span>{perf.venue_name}{perf.venue_address ? ' · '+perf.venue_address : ''}</span></div><span>Capacity: {perf.capacity}</span>
              {perf.ticket_categories.map(cat=><div className="prod-category" key={cat.id}><span>{cat.name}</span><span>₱{Number(cat.price).toLocaleString('en-PH',{minimumFractionDigits:2})}</span><span>{cat.sold_count + cat.reserved_count}/{cat.allocation} allocated</span></div>)}
            </div>)}
            <div className="prod-card-actions">{show.status === 'draft' ? <button type="button" onClick={()=>void publish(show.id)} disabled={publishing===show.id}>{publishing===show.id?'Publishing…':'Publish show'}</button> : <span className="prod-published-note">Listed in public ticket catalog</span>}</div>
          </article>)}</div>}
        </section>
        <footer className="prod-footer">Artist Playground · Internal staff workspace</footer>
      </main>
      <style>{`
        .prod-workspace{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr);background:#090a0c;color:#f4f5f7;font-family:Inter,Arial,sans-serif}
        .prod-sidebar{position:sticky;top:0;height:100vh;min-height:620px;background:#0e1013;border-right:1px solid #252a31;padding:1.35rem 1rem;display:flex;flex-direction:column}
        .prod-brand{display:flex;align-items:center;gap:.75rem;padding:.35rem .5rem 2.3rem;color:#f2f4f6;text-decoration:none;font-size:.68rem;font-weight:800;letter-spacing:.08em}.prod-brand small{display:block;color:#7f8995;font-size:.6rem;letter-spacing:.13em;margin-top:.35rem}
        .prod-mark{display:grid;place-items:center;width:39px;height:39px;border:1px solid #00a8d6;border-radius:10px;color:#f5e900;font-size:.9rem}
        .prod-nav-label{font-size:.62rem;letter-spacing:.16em;font-weight:800;color:#697380;padding:.75rem .7rem .45rem}
        .prod-nav{display:block;padding:.72rem .75rem;border-radius:7px;text-decoration:none;color:#aeb6c0;font-size:.8rem;margin:.08rem 0}.prod-nav:hover,.prod-nav.active{background:#19252c;color:#62d7f5}
        .prod-sidebar-bottom{margin-top:auto;border-top:1px solid #282d34;padding-top:1rem;color:#818b97;font-size:.7rem}.prod-sidebar-bottom button{display:block;width:100%;margin-top:.8rem;padding:.65rem;background:#171a1f;border:1px solid #353b44;border-radius:7px;color:#dce0e5;cursor:pointer}
        .prod-main{padding:2rem clamp(1.2rem,3vw,3rem);min-width:0;max-width:1500px;width:100%;margin:0 auto}
        .prod-header{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem}.prod-eyebrow{color:#00b8e6;letter-spacing:.16em;font-size:.67rem;font-weight:800;margin:0 0 .5rem}.prod-header h1{font-family:Manrope,Inter,sans-serif;font-size:clamp(1.8rem,3vw,2.4rem);letter-spacing:-.04em;margin:0}.prod-header p:not(.prod-eyebrow),.prod-panel-heading p,.prod-list-heading p{color:#929ba6;font-size:.78rem;margin:.45rem 0 0;line-height:1.5}
        .prod-refresh,.prod-panel button{background:#151a20;border:1px solid #39414b;border-radius:7px;color:#dce2e9;padding:.65rem .9rem;cursor:pointer;font-size:.74rem}.prod-panel{background:#111419;border:1px solid #282e36;border-radius:11px;padding:1.25rem}
        .prod-panel-heading,.prod-list-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.2rem}.prod-panel-heading h2,.prod-list-heading h2{font-size:1rem;margin:0}.prod-plus{display:grid;place-items:center;width:32px;height:32px;border-radius:8px;background:#172a32;color:#55cdec;font-size:1.2rem}
        .prod-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem}.prod-field{display:grid;gap:.4rem;min-width:0}.prod-field.full{grid-column:1/-1}.prod-field label{font-size:.72rem;color:#cbd1d9}.prod-field input,.prod-field textarea{width:100%;box-sizing:border-box;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.75rem .8rem;color:#f4f5f7;font:inherit;font-size:.78rem}.prod-field textarea{resize:vertical}.prod-form-note{grid-column:1/-1;padding:.85rem 1rem;border:1px solid #33404a;border-radius:8px;background:#0c1116;display:grid;gap:.3rem}.prod-form-note strong{font-size:.72rem;color:#7bdcf5}.prod-form-note span{font-size:.7rem;color:#929ba6;line-height:1.5}.prod-submit{grid-column:1/-1;background:#f5e900!important;color:#090909!important;border:0!important;font-weight:800;padding:.85rem!important}.prod-submit:disabled{opacity:.6;cursor:wait}
        .prod-alert{padding:.8rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:.78rem}.prod-alert.error{background:#2a1517;border:1px solid #713237;color:#ffc0c4}.prod-alert.success{background:#10251b;border:1px solid #245a3c;color:#a8e8c2}
        .prod-list-section{margin-top:2rem}.prod-list-heading{align-items:flex-end}.prod-list-heading>span{color:#89939f;font-size:.68rem}.prod-list{display:grid;gap:.75rem}.prod-card{background:#111419;border:1px solid #282e36;border-radius:10px;padding:1.1rem}.prod-card-top{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.prod-slug{font-size:.6rem;color:#6e7b89;letter-spacing:.08em}.prod-card h3{font-size:.95rem;margin:.35rem 0}.prod-card p{font-size:.72rem;color:#929ba6;margin:.25rem 0;line-height:1.5}.prod-status{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;padding:.35rem .55rem;border-radius:99px;background:#302d1c;color:#f0d77b}.prod-status.published{background:#123323;color:#8de0ad}.prod-status.archived{background:#30252a;color:#e4a5b1}
        .prod-performance{margin-top:1rem;padding:.85rem;background:#0c0f13;border:1px solid #252b33;border-radius:8px;display:grid;gap:.5rem}.prod-performance>div:first-child{display:grid;gap:.25rem}.prod-performance strong{font-size:.75rem}.prod-performance span{font-size:.68rem;color:#aeb7c1}.prod-category{display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap;border-top:1px solid #242a32;padding-top:.5rem}.prod-card-actions{display:flex;justify-content:flex-end;margin-top:.8rem}.prod-card-actions button{background:#f5e900;border:0;border-radius:7px;color:#090909;padding:.65rem .9rem;font-size:.72rem;font-weight:800;cursor:pointer}.prod-card-actions button:disabled{opacity:.6}.prod-published-note{font-size:.68rem;color:#8de0ad}.prod-empty{padding:1.5rem;text-align:center;color:#929ba6;background:#111419;border:1px solid #282e36;border-radius:9px;font-size:.78rem}.prod-footer{border-top:1px solid #252a31;color:#66717e;font-size:.66rem;margin-top:2.5rem;padding:1.2rem 0}
        @media(max-width:760px){.prod-workspace{grid-template-columns:1fr}.prod-sidebar{position:static;height:auto;min-height:0;padding:1rem}.prod-brand{padding-bottom:1rem}.prod-nav-label,.prod-sidebar-bottom{display:none}.prod-nav{display:inline-block;padding:.55rem;margin-right:.2rem}.prod-main{padding:1.3rem 1rem}.prod-form{grid-template-columns:1fr}.prod-field.full,.prod-form-note,.prod-submit{grid-column:1}.prod-category{justify-content:flex-start}}
      `}</style>
    </div>
  );
}
