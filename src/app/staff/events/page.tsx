'use client';

import { useCallback, useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

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


type EventRow={id:string;event_type:'workshop'|'other';title:string;description:string;starts_at:string;ends_at:string|null;venue_name:string;venue_address:string|null;image_url:string|null;info_url:string|null;status:'draft'|'published'|'cancelled'};
const localValue=(value:string|null)=>value?new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Manila'}).replace(' ','T').slice(0,16):'';
const isoValue=(value:string)=>value?new Date(value).toISOString():null;

export default function StaffEventsPage(){
 const [rows,setRows]=useState<EventRow[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const blank=()=>({id:'',event_type:'workshop' as 'workshop'|'other',title:'',description:'',starts_at:'',ends_at:'',venue_name:'',venue_address:'',image_url:'',info_url:'',status:'draft' as 'draft'|'published'|'cancelled'});
 const [form,setForm]=useState(blank());
 const [posterUploading,setPosterUploading]=useState(false);
 const invoke=async(body:Record<string,unknown>)=>{const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('manage-events',{body});if(error||!data?.ok)throw new Error(data?.error||error?.message||'The request could not be completed.');return data;};
 const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await invoke({action:'list'});setRows(data.events||[]);}catch(e){setError(e instanceof Error?e.message:'Unable to load events.');}finally{setLoading(false);}},[]);
 useEffect(()=>{let active=true;(async()=>{const supabase=createSupabaseBrowserClient();const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.replace(appPath('/staff/login/'));return;}const {data:profile,error}=await supabase.from('staff_profiles').select('active').eq('user_id',user.id).maybeSingle();if(error||!profile?.active){await supabase.auth.signOut();window.location.replace(appPath('/staff/login/?error=unauthorized'));return;}if(active)await load();})();return()=>{active=false;};},[load]);
 const set=(key:keyof ReturnType<typeof blank>,value:string)=>setForm(current=>({...current,[key]:value} as ReturnType<typeof blank>));
 const setDatePart=(key:'starts_at'|'ends_at',date:string)=>setForm(current=>({...current,[key]:date+'T'+(current[key].slice(11,16)||'19:00')}));
 const setTimePart=(key:'starts_at'|'ends_at',time:string)=>setForm(current=>({...current,[key]:(current[key].slice(0,10)||new Date().toLocaleDateString('en-CA'))+'T'+time}));
 async function uploadPoster(file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPG, PNG, or WebP poster.');return;}
  if(file.size>8*1024*1024){setError('Poster must be 8 MB or smaller.');return;}
  setPosterUploading(true);setError('');setMessage('');
  try{
   const supabase=createSupabaseBrowserClient();
   const extension=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
   const path='events/'+crypto.randomUUID()+'.'+extension;
   const {error:uploadError}=await supabase.storage.from('production-posters').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
   if(uploadError)throw uploadError;
   const {data}=supabase.storage.from('production-posters').getPublicUrl(path);
   set('image_url',data.publicUrl);
  }catch(e){setError(e instanceof Error?e.message:'Unable to upload poster.');}
  finally{setPosterUploading(false);}
 }
 const edit=(row:EventRow)=>{setForm({id:row.id,event_type:row.event_type,title:row.title,description:row.description||'',starts_at:localValue(row.starts_at),ends_at:localValue(row.ends_at),venue_name:row.venue_name||'',venue_address:row.venue_address||'',image_url:row.image_url||'',info_url:row.info_url||'',status:row.status});setError('');setMessage('');window.scrollTo({top:0,behavior:'smooth'});};
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setMessage('');try{const data=await invoke({action:'save',...(form.id?{id:form.id}:{}),event_type:form.event_type,title:form.title,description:form.description,starts_at:isoValue(form.starts_at),ends_at:isoValue(form.ends_at),venue_name:form.venue_name,venue_address:form.venue_address,image_url:form.image_url,info_url:form.info_url,status:form.status});setMessage(data.message);setForm(blank());await load();}catch(e){setError(e instanceof Error?e.message:'Unable to save event.');}finally{setSaving(false);}}
 async function remove(row:EventRow){if(!window.confirm('Delete “'+row.title+'”? This cannot be undone.'))return;setSaving(true);setError('');try{const data=await invoke({action:'delete',id:row.id});setMessage(data.message);if(form.id===row.id)setForm(blank());await load();}catch(e){setError(e instanceof Error?e.message:'Unable to delete event.');}finally{setSaving(false);}}
 async function signOut(){const supabase=createSupabaseBrowserClient();await supabase.auth.signOut();window.location.replace(appPath('/staff/login/'));}
 return <main className="prod-main"><header className="prod-header"><div><p className="prod-eyebrow">STAFF WORKSPACE · MANAGEMENT</p><h1>Events</h1><p>Publish and manage workshops and other public Artist Playground activities.</p></div><button className="prod-refresh" type="button" onClick={()=>void load()} disabled={loading}>Refresh</button></header>
 {error&&<div className="prod-alert error" role="alert">{error}</div>}{message&&<div className="prod-alert success" role="status">{message}</div>}
 <section className="prod-panel"><div className="prod-panel-heading"><div><h2>{form.id?'Edit event':'Create an event'}</h2><p>Manage workshops and public activities. Show productions are managed separately.</p></div><span className="prod-plus">＋</span></div>
 <form className="prod-form" onSubmit={save}>
 <div className="prod-field"><label htmlFor="event-type">Event type</label><select id="event-type" value={form.event_type} onChange={e=>set('event_type',e.target.value)}><option value="workshop">Workshop</option><option value="other">Other event</option></select></div>
 <div className="prod-field"><label htmlFor="event-status">Visibility</label><select id="event-status" value={form.status} onChange={e=>set('status',e.target.value)}><option value="draft">Draft (not public)</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></div>
 <div className="prod-field full"><label htmlFor="event-title">Event title</label><input id="event-title" value={form.title} onChange={e=>set('title',e.target.value)} required maxLength={160} placeholder="Workshop or event name"/></div>
 <div className="prod-field full"><label htmlFor="event-description">Description</label><textarea id="event-description" rows={4} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Tell visitors what to expect."/></div>
 <div className="prod-field"><label>Start date and time</label><div className="prod-date-time"><label htmlFor="event-start-date">Date<input id="event-start-date" type="date" value={form.starts_at.slice(0,10)} onChange={e=>setDatePart('starts_at',e.target.value)} required/></label><label>Time<TimePicker label="Event start time" value={form.starts_at.slice(11,16)} onChange={v=>setTimePart('starts_at',v)}/></label></div></div>
 <div className="prod-field"><label>End date and time (optional)</label><div className="prod-date-time"><label htmlFor="event-end-date">Date<input id="event-end-date" type="date" value={form.ends_at.slice(0,10)} onChange={e=>setDatePart('ends_at',e.target.value)}/></label><label>Time<TimePicker label="Event end time" value={form.ends_at.slice(11,16)} onChange={v=>setTimePart('ends_at',v)}/></label></div></div>
 <div className="prod-field full"><label htmlFor="event-venue">Venue</label><input id="event-venue" value={form.venue_name} onChange={e=>set('venue_name',e.target.value)} placeholder="Venue name"/></div>
 <div className="prod-field full"><label htmlFor="event-poster">Event poster</label><input id="event-poster" type="file" accept="image/jpeg,image/png,image/webp" disabled={posterUploading||saving} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPoster(file);e.currentTarget.value='';}}/><small className="prod-field-hint">JPG, PNG, or WebP · maximum 8 MB</small>{form.image_url&&<div className="prod-poster-preview"><img src={form.image_url} alt="Event poster preview"/><button type="button" className="prod-remove-category" onClick={()=>set('image_url','')}>Remove poster</button></div>}{posterUploading&&<small className="prod-field-hint">Uploading poster…</small>}</div>

 <div className="ap-staff-event-actions"><button className="prod-submit" type="submit" disabled={saving}>{saving?'Saving…':form.id?'Save changes':'Create event'}</button>{form.id&&<button type="button" className="prod-refresh" onClick={()=>setForm(blank())} disabled={saving}>Cancel edit</button>}</div>
 </form></section>
 <section className="prod-panel"><div className="prod-panel-heading"><div><h2>Managed events</h2><p>Published, draft, and cancelled workshops and public activities.</p></div><span className="prod-count">{rows.length}</span></div>
 {loading?<p className="prod-muted">Loading events…</p>:rows.length===0?<p className="prod-muted">No staff-managed events yet.</p>:<div className="ap-staff-event-list">{rows.map(row=><article className="ap-staff-event-row" key={row.id}><div><span className={'ap-staff-event-status '+row.status}>{row.status}</span><h3>{row.title}</h3><p>{row.event_type==='workshop'?'Workshop':'Other event'} · {new Date(row.starts_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})}{row.venue_name?' · '+row.venue_name:''}</p></div><div className="ap-staff-event-row-actions"><button type="button" onClick={()=>edit(row)}>Edit</button><button type="button" className="danger" onClick={()=>void remove(row)} disabled={saving}>Delete</button></div></article>)}</div>}</section>
 </main><style>{`
        .prod-workspace{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr);background:#090a0c;color:#f4f5f7;font-family:Inter,Arial,sans-serif}
        .prod-sidebar{position:sticky;top:0;height:100vh;min-height:620px;background:#0e1013;border-right:1px solid #252a31;padding:1.35rem 1rem;display:flex;flex-direction:column}
        .prod-brand{display:flex;align-items:center;gap:.75rem;padding:.35rem .5rem 2.3rem;color:#f2f4f6;text-decoration:none;font-size:.68rem;font-weight:800;letter-spacing:.08em}.prod-brand small{display:block;color:#7f8995;font-size:.6rem;letter-spacing:.13em;margin-top:.35rem}
        .prod-mark{display:block;flex:0 0 39px;width:39px;height:39px;object-fit:contain;border:0;border-radius:0}
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
      
        .ap-staff-event-actions{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}
        .ap-staff-event-list{display:grid;gap:.7rem}
        .ap-staff-event-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border:1px solid #2a3037;border-radius:9px;background:#0c0f13}
        .ap-staff-event-row h3{margin:.45rem 0;font-size:.95rem}
        .ap-staff-event-row p,.prod-muted{margin:0;color:#9aa4af;font-size:.72rem;line-height:1.5}
        .ap-staff-event-status{display:inline-block;border-radius:99px;padding:.25rem .55rem;background:#252b33;color:#d8e0e8;font-size:.6rem;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
        .ap-staff-event-status.published{background:#123323;color:#8de0ad}
        .ap-staff-event-status.cancelled{background:#30252a;color:#e4a5b1}
        .ap-staff-event-row-actions{display:flex;gap:.5rem;flex-shrink:0}
        .ap-staff-event-row-actions button{border:1px solid #3b444e;border-radius:6px;padding:.45rem .7rem;background:#151a20;color:#e7edf3;font:inherit;font-size:.7rem;cursor:pointer}
        .ap-staff-event-row-actions button.danger{color:#ffb0b0;border-color:#704044}
        .ap-staff-event-row-actions button:disabled{opacity:.5;cursor:wait}
        .prod-count{display:grid;place-items:center;min-width:30px;height:30px;border-radius:50%;background:#202830;color:#dfe7ed;font-size:.75rem}
        .prod-field-hint{display:block;margin-top:.45rem;color:#9aa4af;font-size:.72rem}
        @media(max-width:760px){.ap-staff-event-row{align-items:flex-start;flex-direction:column}.ap-staff-event-row-actions{width:100%}.ap-staff-event-row-actions button{flex:1}}
      `}</style>;
}