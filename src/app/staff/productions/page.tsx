'use client';

import { useCallback, useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Category = { id: string; name: string; price: number; allocation: number; reserved_count: number; sold_count: number; active: boolean };
type Performance = { id: string; starts_at: string; doors_open_at: string | null; venue_name: string; venue_address: string | null; capacity: number; status: string; ticket_categories: Category[] };
type Production = { id: string; slug: string; title: string; description: string | null; status: string; created_at: string; performances: Performance[] };
type EditableCategory = Omit<Category, 'price' | 'allocation'> & { price: string; allocation: string };
type EditablePerformance = Omit<Performance, 'capacity' | 'ticket_categories'> & { capacity: string; ticket_categories: EditableCategory[] };

function TimePicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [hour24, minute] = value ? value.split(':').map(Number) : [19, 0];
  const [hour, setHour] = useState(String((hour24 % 12) || 12).padStart(2, '0'));
  const [minutes, setMinutes] = useState(String(minute || 0).padStart(2, '0'));
  const [period, setPeriod] = useState(hour24 >= 12 ? 'PM' : 'AM');

  useEffect(() => {
    if (!open) {
      const [h, m] = value ? value.split(':').map(Number) : [19, 0];
      setHour(String((h % 12) || 12).padStart(2, '0'));
      setMinutes(String(m || 0).padStart(2, '0'));
      setPeriod(h >= 12 ? 'PM' : 'AM');
    }
  }, [value, open]);

  function confirmTime() {
    let h = Number(hour) % 12;
    if (period === 'PM') h += 12;
    onChange(String(h).padStart(2, '0') + ':' + minutes);
    setOpen(false);
  }

  return <div className="prod-time-picker">
    <button type="button" className="prod-time-trigger" aria-label={label} aria-expanded={open} onClick={() => setOpen(v => !v)}>
      <span>{value ? new Date('2000-01-01T' + value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Select time'}</span>
      <span className="prod-time-clock" aria-hidden="true">◷</span>
    </button>
    {open && <div className="prod-time-popover" role="dialog" aria-label={label + ' selector'}>
      <div className="prod-time-selects">
        <select aria-label="Hour" value={hour} onChange={e => setHour(e.target.value)}>{Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(v=><option key={v} value={v}>{v}</option>)}</select>
        <select aria-label="Minute" value={minutes} onChange={e => setMinutes(e.target.value)}>{Array.from({length:60},(_,i)=>String(i).padStart(2,'0')).map(v=><option key={v} value={v}>{v}</option>)}</select>
        <select aria-label="AM or PM" value={period} onChange={e => setPeriod(e.target.value)}><option>AM</option><option>PM</option></select>
      </div>
      <button type="button" className="prod-time-done" onClick={confirmTime}>Done</button>
    </div>}
  </div>;
}

function decimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...fraction] = cleaned.split('.');
  return fraction.length ? whole + '.' + fraction.join('').slice(0, 2) : whole;
}

function localDatePart(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
function localTimePart(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0');
}
function toIsoLocal(date: string, time: string) {
  if (!date || !time) return null;
  const value = new Date(date + 'T' + time);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export default function StaffProductionsPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState('');
  const [editing, setEditing] = useState<Production | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPerformances, setEditPerformances] = useState<EditablePerformance[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [doorsAt, setDoorsAt] = useState('');
  const [venue, setVenue] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [newCategories, setNewCategories] = useState([{ name: 'General Admission', price: '100', allocation: '50' }]);

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
        categories: newCategories.map(cat => ({ name: cat.name.trim(), price: Number(cat.price), allocation: Number(cat.allocation) })),
      });
      setMessage(data.message || 'Show created.');
      setTitle(''); setDescription(''); setStartsAt(''); setDoorsAt(''); setVenue(''); setVenueAddress('');
      setCapacity('50'); setNewCategories([{ name: 'General Admission', price: '100', allocation: '50' }]);
      await loadProductions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create show.'); }
    finally { setSaving(false); }
  }

  function beginEdit(show: Production) {
    setEditing(show);
    setEditTitle(show.title);
    setEditDescription(show.description || '');
    setEditPerformances(show.performances.map(perf => ({ ...perf, capacity: String(perf.capacity), ticket_categories: perf.ticket_categories.map(cat => ({ ...cat, price: String(cat.price), allocation: String(cat.allocation) })) })));
    setError(''); setMessage('');
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const overCapacity = editPerformances.find(perf => perf.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0) > Number(perf.capacity));
    if (overCapacity) {
      const allocated = overCapacity.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0);
      setError(`Combined ticket allocations (${allocated}) exceed this performance's capacity (${overCapacity.capacity}). Reduce one or more category allocations before saving.`);
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await invoke({
        action: 'update', production_id: editing.id, title: editTitle, description: editDescription,
        performances: editPerformances.map(perf => ({
          id: perf.id, starts_at: perf.starts_at, doors_open_at: perf.doors_open_at,
          venue_name: perf.venue_name, venue_address: perf.venue_address, capacity: Number(perf.capacity),
          categories: perf.ticket_categories.map(cat => ({ ...(cat.id ? { id: cat.id } : {}), name: cat.name, price: Number(cat.price), allocation: Number(cat.allocation), active: cat.active }))
        }))
      });
      setMessage(data.message || 'Show updated.');
      setEditing(null);
      await loadProductions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update show.'); }
    finally { setSaving(false); }
  }

  async function deleteProduction(show: Production) {
    const confirmed = window.confirm(`Delete "${show.title}" permanently? This can only proceed if the show has no bookings or issued tickets. This action cannot be undone.`);
    if (!confirmed) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await invoke({ action: 'delete', production_id: show.id });
      setMessage(data.message || 'Production deleted.');
      await loadProductions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete production.'); }
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
            <div className="prod-field"><label>Performance date and time</label><div className="prod-date-time"><label htmlFor="show-start-date">Date<input id="show-start-date" type="date" value={startsAt.slice(0,10)} onChange={e=>setStartsAt(e.target.value + (startsAt.length >= 16 ? startsAt.slice(10) : 'T' + (startsAt.slice(11,16) || '19:00')))} required/></label><label>Time<TimePicker label="Performance time" value={startsAt.slice(11,16)} onChange={v=>setStartsAt((startsAt.slice(0,10) || new Date().toLocaleDateString('en-CA')) + 'T' + v)}/></label></div></div>
            <div className="prod-field"><label>Doors open (optional)</label><div className="prod-date-time"><label htmlFor="show-doors-date">Date<input id="show-doors-date" type="date" value={doorsAt.slice(0,10)} onChange={e=>setDoorsAt(e.target.value + (doorsAt.length >= 16 ? doorsAt.slice(10) : 'T' + (doorsAt.slice(11,16) || '18:30')))} /></label><label>Time<TimePicker label="Doors open time" value={doorsAt.slice(11,16)} onChange={v=>setDoorsAt((doorsAt.slice(0,10) || startsAt.slice(0,10)) + 'T' + v)}/></label></div></div>
            <div className="prod-field"><label htmlFor="show-venue">Venue name</label><input id="show-venue" value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Artist Playground Test Venue" required/></div>
            <div className="prod-field"><label htmlFor="show-address">Venue address (optional)</label><input id="show-address" value={venueAddress} onChange={e=>setVenueAddress(e.target.value)} placeholder="Street, city"/></div>
            <div className="prod-field"><label htmlFor="show-capacity">Performance capacity</label><input id="show-capacity" type="text" inputMode="numeric" pattern="[0-9]*" value={capacity} onChange={e=>setCapacity(e.target.value.replace(/[^0-9]/g, ''))} required/></div>
            <div className="prod-field full"><div className="prod-category-heading"><label>Ticket categories</label><button type="button" className="prod-add-category" onClick={()=>setNewCategories(rows=>[...rows,{name:'',price:'0',allocation:'0'}])}>＋ Add category</button></div></div>
            {newCategories.map((cat,ci)=><div className="prod-new-category" key={ci}>
              <div className="prod-new-category-heading"><strong>Category {ci+1}</strong>{newCategories.length>1 && <button type="button" className="prod-remove-category" onClick={()=>setNewCategories(rows=>rows.filter((_,i)=>i!==ci))}>Remove</button>}</div>
              <div className="prod-form">
                <div className="prod-field"><label>Category name</label><input value={cat.name} onChange={e=>setNewCategories(rows=>rows.map((row,i)=>i===ci?{...row,name:e.target.value}:row))} placeholder="e.g. VIP" required maxLength={80}/></div>
                <div className="prod-field"><label>Price (PHP)</label><input type="text" inputMode="decimal" value={cat.price} onChange={e=>setNewCategories(rows=>rows.map((row,i)=>i===ci?{...row,price:decimalInput(e.target.value)}:row))} required/></div>
                <div className="prod-field"><label>Allocation</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={cat.allocation} onChange={e=>setNewCategories(rows=>rows.map((row,i)=>i===ci?{...row,allocation:e.target.value.replace(/[^0-9]/g,'')}:row))} required/></div>
              </div>
            </div>)}
            <div className="prod-form-note"><strong>Publishing safety</strong><span>New shows are saved as drafts. You can review the details before publishing them to the public ticket catalog.</span></div>
            <button className="prod-submit" type="submit" disabled={saving}>{saving ? 'Creating show…' : 'Create show'}</button>
          </form>
        </section>
        {editing && <div className="prod-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setEditing(null); }}><section className="prod-modal" role="dialog" aria-modal="true" aria-labelledby="edit-show-title">
          <div className="prod-panel-heading"><div><h2 id="edit-show-title">Edit show</h2><p>Changes apply to the existing public listing. Published status is preserved.</p></div><button type="button" className="prod-modal-close" aria-label="Close edit show" onClick={()=>setEditing(null)} disabled={saving}>×</button></div>
          <form className="prod-form" onSubmit={saveEdit}>
            <div className="prod-field full"><label>Show title</label><input value={editTitle} onChange={e=>setEditTitle(e.target.value)} required maxLength={160}/></div>
            <div className="prod-field full"><label>Description</label><textarea rows={3} value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></div>
            {editPerformances.map((perf, pi)=><div className="prod-edit-performance" key={perf.id}>
              <h3>Performance {pi+1}</h3>
              <div className="prod-form">
                <div className="prod-field"><label>Performance date and time</label><div className="prod-date-time"><label>Date<input type="date" value={localDatePart(perf.starts_at)} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,starts_at:toIsoLocal(e.target.value,localTimePart(row.starts_at)) || row.starts_at}:row))} required/></label><label>Time<TimePicker label="Performance time" value={localTimePart(perf.starts_at)} onChange={v=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,starts_at:toIsoLocal(localDatePart(row.starts_at),v) || row.starts_at}:row))}/></label></div></div>
                <div className="prod-field"><label>Doors open (optional)</label><div className="prod-date-time"><label>Date<input type="date" value={localDatePart(perf.doors_open_at)} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,doors_open_at:toIsoLocal(e.target.value,localTimePart(row.doors_open_at))}:row))}/></label><label>Time<TimePicker label="Doors open time" value={localTimePart(perf.doors_open_at)} onChange={v=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,doors_open_at:toIsoLocal(localDatePart(row.doors_open_at) || localDatePart(row.starts_at),v)}:row))}/></label></div></div>
                <div className="prod-field"><label>Venue</label><input value={perf.venue_name} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,venue_name:e.target.value}:row))} required/></div>
                <div className="prod-field"><label>Venue address</label><input value={perf.venue_address || ''} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,venue_address:e.target.value}:row))}/></div>
                <div className="prod-field"><label>Capacity</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={perf.capacity} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,capacity:e.target.value.replace(/[^0-9]/g, '')}:row))} required aria-label="Performance capacity"/></div>
                <div className="prod-category-heading"><strong>Ticket categories</strong><button type="button" className="prod-add-category" onClick={()=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,ticket_categories:[...row.ticket_categories,{id:'',name:'',price:'0',allocation:'0',reserved_count:0,sold_count:0,active:true}]}:row))}>＋ Add category</button></div>
                {perf.ticket_categories.map((cat,ci)=><div className="prod-edit-category" key={cat.id || 'new-'+ci}>
                  <div className="prod-new-category-heading"><strong>Ticket category {ci+1}</strong><button type="button" className="prod-remove-category" disabled={Boolean(cat.id && (cat.sold_count>0 || cat.reserved_count>0))} title={cat.sold_count+cat.reserved_count>0?'Categories with sold or reserved tickets cannot be removed':''} onClick={()=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,ticket_categories:row.ticket_categories.filter((_,j)=>j!==ci)}:row))}>Remove</button></div>
                  <div className="prod-form">
                    <div className="prod-field"><label>Category name</label><input value={cat.name} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,ticket_categories:row.ticket_categories.map((c,j)=>j===ci?{...c,name:e.target.value}:c)}:row))} required maxLength={80}/></div>
                    <div className="prod-field"><label>Price (PHP)</label><input type="text" inputMode="decimal" value={cat.price} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,ticket_categories:row.ticket_categories.map((c,j)=>j===ci?{...c,price:decimalInput(e.target.value)}:c)}:row))} required/></div>
                    <div className="prod-field"><label>Allocation</label><input type="text" inputMode="numeric" pattern="[0-9]*" value={cat.allocation} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,ticket_categories:row.ticket_categories.map((c,j)=>j===ci?{...c,allocation:e.target.value.replace(/[^0-9]/g,'')}:c)}:row))} required/></div>
                    <div className="prod-field"><label>Availability</label><select value={cat.active?'active':'inactive'} onChange={e=>setEditPerformances(rows=>rows.map((row,i)=>i===pi?{...row,ticket_categories:row.ticket_categories.map((c,j)=>j===ci?{...c,active:e.target.value==='active'}:c)}:row))}><option value="active">On sale</option><option value="inactive">Paused</option></select></div>
                  </div>
                </div>)}
                {perf.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0) > Number(perf.capacity) && <div className="prod-inline-error" role="alert"><strong>Allocation exceeds capacity</strong><span>You&apos;ve allocated {perf.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0)} tickets, but this performance capacity is {perf.capacity}. Reduce the category allocations by at least {perf.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0) - Number(perf.capacity)}.</span></div>}
              </div>
            </div>)}
            {error && <div className="prod-inline-error prod-submit-error" role="alert"><strong>Unable to save changes</strong><span>{error}</span></div>}
            <div className="prod-form-note"><strong>Inventory protection</strong><span>Sold and reserved tickets cannot be reduced or deleted. Total category allocations cannot exceed performance capacity.</span></div>
            <button className="prod-submit" type="submit" disabled={saving}>{saving?'Saving changes…':'Save changes'}</button>
          </form>
        </section></div>}
        <section className="prod-list-section">
          <div className="prod-list-heading"><div><h2>Existing shows</h2><p>Review show status, performance schedule, and ticket inventory.</p></div><span>{productions.length} total</span></div>
          {loading ? <div className="prod-empty">Loading productions…</div> : productions.length === 0 ? <div className="prod-empty">No shows have been created yet.</div> : <div className="prod-list">{productions.map(show=><article className="prod-card" key={show.id}>
            <div className="prod-card-top"><div><span className="prod-slug">{show.slug}</span><h3>{show.title}</h3><p>{show.description || 'No description added.'}</p></div><span className={'prod-status '+show.status}>{show.status}</span></div>
            {show.performances.map(perf=><div className="prod-performance" key={perf.id}><div><strong>{new Date(perf.starts_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</strong><span>{perf.venue_name}{perf.venue_address ? ' · '+perf.venue_address : ''}</span></div><span>Capacity: {perf.capacity}</span>
              {perf.ticket_categories.map(cat=><div className="prod-category" key={cat.id}><span>{cat.name}</span><span>₱{Number(cat.price).toLocaleString('en-PH',{minimumFractionDigits:2})}</span><span>{cat.sold_count + cat.reserved_count}/{cat.allocation} allocated</span></div>)}
            </div>)}
            <div className="prod-card-actions"><span className="prod-published-note">{show.status === 'published' ? 'Listed in public ticket catalog' : 'Draft · Not listed publicly'}</span><div className="prod-card-buttons"><button type="button" className="prod-edit-button" onClick={()=>beginEdit(show)}>Edit show</button><button type="button" className="prod-delete-button" onClick={()=>void deleteProduction(show)} disabled={saving}>Delete</button>{show.status === 'draft' && <button type="button" onClick={()=>void publish(show.id)} disabled={publishing===show.id}>{publishing===show.id?'Publishing…':'Publish show'}</button>}</div></div>
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
        .prod-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem}.prod-date-time{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(110px,.8fr);gap:.55rem}.prod-date-time>label{display:grid;gap:.35rem;font-size:.65rem;color:#929ba6}.prod-date-time input{width:100%;min-width:0;min-height:44px;color-scheme:dark}.prod-field>label{line-height:1.4}@media(max-width:420px){.prod-date-time{grid-template-columns:minmax(0,1fr) minmax(100px,.8fr);gap:.4rem}}.prod-time-picker{position:relative;width:100%}.prod-time-trigger{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:.7rem;padding:.7rem .8rem;background:#090c10;border:1px solid #39414b;border-radius:7px;color:#f4f5f7;font:inherit;font-size:.78rem;text-align:left;cursor:pointer}.prod-time-trigger:hover,.prod-time-trigger[aria-expanded="true"]{border-color:#16bde8}.prod-time-clock{color:#16bde8;font-size:1rem}.prod-time-popover{position:absolute;z-index:80;top:calc(100% + 7px);right:0;width:min(280px,calc(100vw - 48px));padding:.8rem;background:#11161c;border:1px solid #35414d;border-radius:10px;box-shadow:0 14px 36px #000a}.prod-time-selects{display:grid;grid-template-columns:1fr 1fr .95fr;gap:.45rem}.prod-time-selects select{width:100%;min-width:0;height:42px;padding:0 .45rem;background:#090c10;border:1px solid #39414b;border-radius:6px;color:#f4f5f7;font:inherit;font-size:.78rem}.prod-time-done{width:100%;height:40px;margin-top:.65rem;border:1px solid #087e9b;border-radius:6px;background:#12313b;color:#8ce8ff;font:inherit;font-size:.76rem;font-weight:700;cursor:pointer}.prod-time-done:hover{background:#174454}.prod-field{display:grid;gap:.4rem;min-width:0}.prod-field.full{grid-column:1/-1}.prod-field label{font-size:.72rem;color:#cbd1d9}.prod-field input,.prod-field textarea{width:100%;box-sizing:border-box;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.75rem .8rem;color:#f4f5f7;font:inherit;font-size:.78rem}.prod-field textarea{resize:vertical}.prod-form-note{grid-column:1/-1;padding:.85rem 1rem;border:1px solid #33404a;border-radius:8px;background:#0c1116;display:grid;gap:.3rem}.prod-form-note strong{font-size:.72rem;color:#7bdcf5}.prod-form-note span{font-size:.7rem;color:#929ba6;line-height:1.5}.prod-submit{grid-column:1/-1;background:#f5e900!important;color:#090909!important;border:0!important;font-weight:800;padding:.85rem!important}.prod-submit:disabled{opacity:.6;cursor:wait}
        .prod-inline-error{grid-column:1/-1;display:grid;gap:.3rem;padding:.8rem .95rem;border:1px solid #8a3e45;border-radius:8px;background:#2a171a;color:#ffb9bf}.prod-inline-error strong{font-size:.74rem}.prod-inline-error span{font-size:.7rem;line-height:1.5;color:#f0b7bd}.prod-submit-error{margin-top:.15rem}.prod-category-heading{display:flex;align-items:center;justify-content:space-between;gap:.8rem}.prod-category-heading>label,.prod-category-heading>strong{font-size:.75rem;color:#7bdcf5}.prod-add-category{background:#142b34!important;border:1px solid #276074!important;color:#83e4fa!important;border-radius:7px;padding:.5rem .7rem;font-size:.7rem;cursor:pointer}.prod-new-category{grid-column:1/-1;border:1px solid #303944;border-radius:8px;padding:.85rem;background:#0c0f13}.prod-new-category-heading{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-bottom:.7rem}.prod-new-category-heading strong{font-size:.73rem;color:#dce3eb}.prod-remove-category{background:#29191b!important;border:1px solid #67373c!important;color:#ff9da5!important;border-radius:6px;padding:.35rem .55rem;font-size:.66rem;cursor:pointer}.prod-remove-category:disabled{opacity:.45;cursor:not-allowed}.prod-edit-performance{grid-column:1/-1;border:1px solid #303944;border-radius:9px;padding:1rem;background:#0c0f13}.prod-edit-performance h3{font-size:.85rem;margin:0 0 .8rem}.prod-edit-category{grid-column:1/-1;border-top:1px solid #252b33;padding-top:.8rem;margin-top:.25rem}.prod-edit-category>strong{font-size:.72rem;color:#7bdcf5;display:block;margin-bottom:.7rem}.prod-edit-panel{margin-top:1.5rem}.prod-card-actions .prod-edit-button{background:#19252c;border:1px solid #3b5964;color:#73d9f3}.prod-field select{width:100%;box-sizing:border-box;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.75rem .8rem;color:#f4f5f7;font:inherit;font-size:.78rem}
        .prod-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.76);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:1.25rem}.prod-modal{position:relative;width:min(900px,100%);max-height:min(90vh,900px);overflow:auto;background:#111419;border:1px solid #39414b;border-radius:14px;padding:1.35rem;box-shadow:0 24px 80px rgba(0,0,0,.55)}.prod-modal .prod-panel-heading{position:sticky;top:-1.35rem;z-index:2;background:#111419;padding:.15rem 0 .9rem;margin-bottom:1rem;border-bottom:1px solid #252b33}.prod-modal-close{width:36px;height:36px;flex:0 0 auto;border:1px solid #39414b;border-radius:8px;background:#191e24;color:#e9edf2;font-size:1.5rem;line-height:1;cursor:pointer}
        .prod-card-actions{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:.9rem;padding-top:.8rem;border-top:1px solid #252b33}.prod-card-buttons{display:flex;align-items:center;justify-content:flex-end;gap:.55rem}.prod-card-actions button{background:#f5e900;border:0;border-radius:7px;color:#090909;padding:.65rem .9rem;font-size:.72rem;font-weight:800;cursor:pointer}.prod-card-actions button.prod-edit-button{background:#19252c;border:1px solid #3b5964;color:#73d9f3}.prod-card-actions button.prod-delete-button{background:#2a1719;border:1px solid #71383d;color:#ff9ca3}.prod-card-actions button:disabled{opacity:.6}
        .prod-alert{padding:.8rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:.78rem}.prod-alert.error{background:#2a1517;border:1px solid #713237;color:#ffc0c4}.prod-alert.success{background:#10251b;border:1px solid #245a3c;color:#a8e8c2}
        .prod-list-section{margin-top:2rem}.prod-list-heading{align-items:flex-end}.prod-list-heading>span{color:#89939f;font-size:.68rem}.prod-list{display:grid;gap:.75rem}.prod-card{background:#111419;border:1px solid #282e36;border-radius:10px;padding:1.1rem}.prod-card-top{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.prod-slug{font-size:.6rem;color:#6e7b89;letter-spacing:.08em}.prod-card h3{font-size:.95rem;margin:.35rem 0}.prod-card p{font-size:.72rem;color:#929ba6;margin:.25rem 0;line-height:1.5}.prod-status{font-size:.62rem;text-transform:uppercase;letter-spacing:.08em;padding:.35rem .55rem;border-radius:99px;background:#302d1c;color:#f0d77b}.prod-status.published{background:#123323;color:#8de0ad}.prod-status.archived{background:#30252a;color:#e4a5b1}
        .prod-performance{margin-top:1rem;padding:.85rem;background:#0c0f13;border:1px solid #252b33;border-radius:8px;display:grid;gap:.5rem}.prod-performance>div:first-child{display:grid;gap:.25rem}.prod-performance strong{font-size:.75rem}.prod-performance span{font-size:.68rem;color:#aeb7c1}.prod-category{display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap;border-top:1px solid #242a32;padding-top:.5rem}.prod-card-actions{display:flex;justify-content:flex-end;margin-top:.8rem}.prod-card-actions button{background:#f5e900;border:0;border-radius:7px;color:#090909;padding:.65rem .9rem;font-size:.72rem;font-weight:800;cursor:pointer}.prod-card-actions button:disabled{opacity:.6}.prod-published-note{font-size:.68rem;color:#8de0ad}.prod-empty{padding:1.5rem;text-align:center;color:#929ba6;background:#111419;border:1px solid #282e36;border-radius:9px;font-size:.78rem}.prod-footer{border-top:1px solid #252a31;color:#66717e;font-size:.66rem;margin-top:2.5rem;padding:1.2rem 0}
        @media(max-width:760px){.prod-modal-backdrop{padding:.5rem;align-items:flex-end}.prod-modal{max-height:94vh;padding:1rem;border-radius:14px 14px 8px 8px}.prod-modal .prod-panel-heading{top:-1rem}.prod-card-actions{align-items:flex-start}.prod-card-buttons{flex-wrap:wrap}.prod-workspace{grid-template-columns:1fr}.prod-sidebar{position:static;height:auto;min-height:0;padding:1rem}.prod-brand{padding-bottom:1rem}.prod-nav-label,.prod-sidebar-bottom{display:none}.prod-nav{display:inline-block;padding:.55rem;margin-right:.2rem}.prod-main{padding:1.3rem 1rem}.prod-form{grid-template-columns:1fr}.prod-field.full,.prod-form-note,.prod-submit{grid-column:1}.prod-category{justify-content:flex-start}}
      `}</style>
    </div>
  );
}
