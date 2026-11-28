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


type EventRow={id:string;event_type:string;title:string;description:string;starts_at:string;ends_at:string|null;venue_name:string;venue_address:string|null;image_url:string|null;info_url:string|null;status:'draft'|'published'|'cancelled'};
const localValue=(value:string|null)=>value?new Date(value).toLocaleString('sv-SE',{timeZone:'Asia/Manila'}).replace(' ','T').slice(0,16):'';
const isoValue=(value:string)=>value?new Date(value).toISOString():null;

export default function StaffEventsPage(){
 const [rows,setRows]=useState<EventRow[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const blank=()=>({id:'',event_type:'Workshop',title:'',description:'',starts_at:'',ends_at:'',venue_name:'',venue_address:'',image_url:'',info_url:'',status:'draft' as 'draft'|'published'|'cancelled'});
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
 return <><main className="prod-main"><header className="prod-header"><div><p className="prod-eyebrow">MANAGEMENT WORKSPACE · MANAGEMENT</p><h1>Events</h1><p>Publish and manage workshops and other public Artist Playground activities.</p></div><button className="prod-refresh" type="button" onClick={()=>void load()} disabled={loading}>Refresh</button></header>
 {error&&<div className="prod-alert error" role="alert">{error}</div>}{message&&<div className="prod-alert success" role="status">{message}</div>}
 <section className="prod-panel"><div className="prod-panel-heading"><div><h2>{form.id?'Edit event':'Create an event'}</h2><p>Manage workshops and public activities. Show productions are managed separately.</p></div><span className="prod-plus">＋</span></div>
 <form className="prod-form" onSubmit={save}>
 <div className="prod-field"><label htmlFor="event-type">Event type</label><input id="event-type" type="text" value={form.event_type} onChange={e=>set('event_type',e.target.value)} required maxLength={60} placeholder="e.g. Workshop, Audition, Open Call"/></div>
 <div className="prod-field"><label htmlFor="event-status">Visibility</label><select id="event-status" value={form.status} onChange={e=>set('status',e.target.value)}><option value="draft">Draft (not public)</option><option value="published">Published</option><option value="cancelled">Cancelled</option></select></div>
 <div className="prod-field full"><label htmlFor="event-title">Event title</label><input id="event-title" value={form.title} onChange={e=>set('title',e.target.value)} required maxLength={160} placeholder="Workshop or event name"/></div>
 <div className="prod-field full"><label htmlFor="event-description">Description</label><textarea id="event-description" rows={4} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Tell visitors what to expect."/></div>
 <div className="prod-field"><label>Start date and time</label><div className="prod-date-time"><label htmlFor="event-start-date">Date<input id="event-start-date" type="date" value={form.starts_at.slice(0,10)} onChange={e=>setDatePart('starts_at',e.target.value)} required/></label><label>Time<TimePicker label="Event start time" value={form.starts_at.slice(11,16)} onChange={v=>setTimePart('starts_at',v)}/></label></div></div>
 <div className="prod-field"><label>End date and time (optional)</label><div className="prod-date-time"><label htmlFor="event-end-date">Date<input id="event-end-date" type="date" value={form.ends_at.slice(0,10)} onChange={e=>setDatePart('ends_at',e.target.value)}/></label><label>Time<TimePicker label="Event end time" value={form.ends_at.slice(11,16)} onChange={v=>setTimePart('ends_at',v)}/></label></div></div>
 <div className="prod-field"><label htmlFor="event-venue">Venue name</label><input id="event-venue" value={form.venue_name} onChange={e=>set('venue_name',e.target.value)} placeholder="Venue name"/></div>
 <div className="prod-field"><label htmlFor="event-venue-address">Venue address</label><input id="event-venue-address" value={form.venue_address} onChange={e=>set('venue_address',e.target.value)} placeholder="Street, city, or full venue address"/></div>
 <div className="prod-field full"><label htmlFor="event-poster">Event poster</label><input id="event-poster" type="file" accept="image/jpeg,image/png,image/webp" disabled={posterUploading||saving} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPoster(file);e.currentTarget.value='';}}/><small className="prod-field-hint">JPG, PNG, or WebP · maximum 8 MB</small>{form.image_url&&<div className="prod-poster-preview"><img src={form.image_url} alt="Event poster preview"/><button type="button" className="prod-remove-category" onClick={()=>set('image_url','')}>Remove poster</button></div>}{posterUploading&&<small className="prod-field-hint">Uploading poster…</small>}</div>

 <div className="ap-staff-event-actions"><button className="prod-submit" type="submit" disabled={saving}>{saving?'Saving…':form.id?'Save changes':'Create event'}</button>{form.id&&<button type="button" className="prod-refresh" onClick={()=>setForm(blank())} disabled={saving}>Cancel edit</button>}</div>
 </form></section>
 <section className="prod-panel"><div className="prod-panel-heading"><div><h2>Managed events</h2><p>Published, draft, and cancelled workshops and public activities.</p></div><span className="prod-count">{rows.length}</span></div>
 {loading?<p className="prod-muted">Loading events…</p>:rows.length===0?<p className="prod-muted">No management events yet.</p>:<div className="ap-staff-event-list">{rows.map(row=><article className="ap-staff-event-row" key={row.id}><div><span className={'ap-staff-event-status '+row.status}>{row.status}</span><h3>{row.title}</h3><p>{row.event_type} · {new Date(row.starts_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})}{row.venue_name?' · '+row.venue_name:''}</p></div><div className="ap-staff-event-row-actions"><button type="button" onClick={()=>edit(row)}>Edit</button><button type="button" className="danger" onClick={()=>void remove(row)} disabled={saving}>Delete</button></div></article>)}</div>}</section>
 </main></>; 
}