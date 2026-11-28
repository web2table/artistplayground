'use client';

import { useCallback, useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Category = { id: string; name: string; price: number; allocation: number; reserved_count: number; sold_count: number; active: boolean };
type Performance = { id: string; starts_at: string; doors_open_at: string | null; venue_name: string; venue_address: string | null; capacity: number; status: string; ticket_categories: Category[] };
type Production = { id: string; slug: string; title: string; description: string | null; poster_url: string | null; status: string; created_at: string; performances: Performance[] };
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
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [posterUploading, setPosterUploading] = useState(false);
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

  async function uploadPoster(file: File, editingExisting = false) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, or WebP poster image.'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Poster image must be 8 MB or smaller.'); return; }
    setPosterUploading(true); setError(''); setMessage('');
    try {
      const supabase = createSupabaseBrowserClient();
      const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
      const path = 'shows/' + crypto.randomUUID() + '.' + extension;
      const { error: uploadError } = await supabase.storage.from('production-posters').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('production-posters').getPublicUrl(path);
      if (editingExisting) setEditPosterUrl(data.publicUrl); else setPosterUrl(data.publicUrl);
      setMessage('Poster uploaded. Save the show to publish the poster with its details.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to upload poster.'); }
    finally { setPosterUploading(false); }
  }

  async function createProduction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const data = await invoke({
        action: 'create', title, description, poster_url: posterUrl, starts_at: new Date(startsAt).toISOString(),
        doors_open_at: doorsAt ? new Date(doorsAt).toISOString() : null,
        venue_name: venue, venue_address: venueAddress, capacity: Number(capacity),
        categories: newCategories.map(cat => ({ name: cat.name.trim(), price: Number(cat.price), allocation: Number(cat.allocation) })),
      });
      setMessage(data.message || 'Show created.');
      setTitle(''); setDescription(''); setPosterUrl(''); setStartsAt(''); setDoorsAt(''); setVenue(''); setVenueAddress('');
      setCapacity('50'); setNewCategories([{ name: 'General Admission', price: '100', allocation: '50' }]);
      await loadProductions();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create show.'); }
    finally { setSaving(false); }
  }

  function beginEdit(show: Production) {
    setEditing(show);
    setEditTitle(show.title);
    setEditDescription(show.description || '');
    setEditPosterUrl(show.poster_url || '');
    setEditPerformances(show.performances.map(perf => ({ ...perf, capacity: String(perf.capacity), ticket_categories: perf.ticket_categories.map(cat => ({ ...cat, price: String(cat.price), allocation: String(cat.allocation) })) })));
    setError(''); setMessage('');
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const overCapacity = editPerformances.find(perf => perf.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0) > Number(perf.capacity));
    if (overCapacity) {
      const allocated = overCapacity.ticket_categories.reduce((sum, cat) => sum + Number(cat.allocation || 0), 0);
      setError('');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      const data = await invoke({
        action: 'update', production_id: editing.id, title: editTitle, description: editDescription, poster_url: editPosterUrl,
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

  return (
    <>
      <main className="prod-main">
        <header className="prod-header"><div><p className="prod-eyebrow">MANAGEMENT WORKSPACE · MANAGEMENT</p><h1>Productions</h1><p>Create shows, schedule performances, and configure ticket inventory.</p></div><button className="prod-refresh" type="button" onClick={() => void loadProductions()} disabled={loading}>Refresh</button></header>
        {error && <div className="prod-alert error" role="alert">{error}</div>}
        {message && <div className="prod-alert success" role="status">{message}</div>}
        <section className="prod-panel">
          <div className="prod-panel-heading"><div><h2>Create a show</h2><p>A show is created with its first performance and ticket category.</p></div><span className="prod-plus">＋</span></div>
          <form className="prod-form" onSubmit={createProduction}>
            <div className="prod-field full"><label htmlFor="show-title">Show title</label><input id="show-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. TEST SHOW – DO NOT PURCHASE" required maxLength={160}/></div>
            <div className="prod-field full"><label htmlFor="show-description">Description</label><textarea id="show-description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Short description of the production" rows={3}/></div>
            <div className="prod-field full"><label htmlFor="show-poster">Production poster</label><input id="show-poster" type="file" accept="image/jpeg,image/png,image/webp" disabled={posterUploading || saving} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPoster(file);e.currentTarget.value='';}}/><small className="prod-field-hint">JPG, PNG, or WebP · maximum 8 MB</small>{posterUrl && <div className="prod-poster-preview"><img src={posterUrl} alt="Production poster preview"/><button type="button" className="prod-remove-category" onClick={()=>setPosterUrl('')}>Remove poster</button></div>}{posterUploading && <small className="prod-field-hint">Uploading poster…</small>}</div>
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
            <div className="prod-field full"><label htmlFor="edit-show-poster">Production poster</label><input id="edit-show-poster" type="file" accept="image/jpeg,image/png,image/webp" disabled={posterUploading || saving} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPoster(file,true);e.currentTarget.value='';}}/><small className="prod-field-hint">JPG, PNG, or WebP · maximum 8 MB</small>{editPosterUrl && <div className="prod-poster-preview"><img src={editPosterUrl} alt="Production poster preview"/><button type="button" className="prod-remove-category" onClick={()=>setEditPosterUrl('')}>Remove poster</button></div>}{posterUploading && <small className="prod-field-hint">Uploading poster…</small>}</div>
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
        <footer className="prod-footer">Artist Playground · Internal management workspace</footer>
      </main>
      
    </>
  );
}
