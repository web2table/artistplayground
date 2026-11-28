'use client';

import { useEffect, useRef, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type StaffProfile = { display_name: string; role: 'staff' | 'system_admin'; active: boolean };
type BoxOfficePerformance = { id: string; starts_at: string; venue_name: string; production_title: string; categories: { id: string; name: string; price: number; remaining: number }[] };
type SaleAttendee = { full_name: string; birth_date: string };
type ScanPerformance = { id: string; starts_at: string; venue_name: string; production_title: string };
type ScanResult = { result: string; message: string; ticket_reference?: string; attendee_name?: string; birth_date?: string | null; ticket_category?: string; production_title?: string; starts_at?: string | null; venue_name?: string | null };
type RefundRow = { id:string; booking_reference:string; purchaser_name:string; purchaser_email:string; booking_status:string; payment_method:string; provider:string; payment_status:string; currency:string; provider_reference:string|null; amount:number; status:string; reason:string; requested_at:string; reviewed_at:string|null; completed_at:string|null };

type OverviewData = {
  generated_at:string;
  metrics:{active_productions:number;upcoming_performances:number;tickets_issued:number;pending_bookings:number;paid_revenue:number};
  upcoming:{id:string;title:string;starts_at:string;venue_name:string;capacity:number;sold:number;reserved:number;remaining:number;categories:{name:string;sold:number;reserved:number;allocation:number}[]}[];
  recent_bookings:{booking_reference:string;purchaser_name:string;status:string;total_amount:number;currency:string;created_at:string}[];
};
type BookingLookup = {
  booking: { booking_reference: string; purchaser_name: string; purchaser_email: string; status: string; currency: string; subtotal: number; total_amount: number; created_at: string; confirmed_at: string | null };
  tickets: { ticket_reference: string; status: string; attendee_name: string; category: string; performance: { starts_at: string; venue_name: string; status: string } | null }[];
  payments: { id: string; method: string; status: string; amount: number; currency: string; provider_reference: string | null; created_at: string }[];
};



export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [overview,setOverview]=useState<OverviewData|null>(null);
  const [overviewLoading,setOverviewLoading]=useState(false);
  const [overviewError,setOverviewError]=useState('');
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [scanCredential, setScanCredential] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraMessage, setCameraMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState(() => typeof window === 'undefined' ? 'overview' : ((['sales','payments'].includes(window.location.hash.slice(1)) ? 'reports' : window.location.hash.slice(1) === 'bookings' ? 'overview' : window.location.hash.slice(1) || 'overview')));
    useEffect(() => { const sync = () => setActiveTab(['sales','payments'].includes(window.location.hash.slice(1)) ? 'reports' : window.location.hash.slice(1) === 'bookings' ? 'overview' : window.location.hash.slice(1) || 'overview'); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [ticketEmailLoading, setTicketEmailLoading] = useState(false);
  const [ticketEmailMessage, setTicketEmailMessage] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingResult, setBookingResult] = useState<BookingLookup | null>(null);
  const [performances, setPerformances] = useState<BoxOfficePerformance[]>([]);
  const [selectedPerformance, setSelectedPerformance] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [saleAttendees, setSaleAttendees] = useState<SaleAttendee[]>([{ full_name: '', birth_date: '' }]);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleMessage, setSaleMessage] = useState('');
  const [saleReceipt, setSaleReceipt] = useState<{ booking_reference: string; ticket_count: number; subtotal: number; tickets: { ticket_reference: string; attendee_name: string }[] } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const authResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Management session check timed out. Please sign in again.')), 15000)),
        ]);
        const { data: { user } } = authResult;
        if (!user) { window.location.replace(appPath('/staff/login/')); return; }
        const { data, error: profileError } = await supabase.from('staff_profiles')
          .select('display_name, role, active').eq('user_id', user.id).maybeSingle();
        if (profileError || !data?.active || !['staff', 'system_admin'].includes(data.role)) {
          await supabase.auth.signOut();
          window.location.replace(appPath('/staff/login/?error=unauthorized'));
          return;
        }
        if (active) setProfile(data as StaffProfile);
      } catch {
        if (active) setError('Unable to verify your management session. Please sign in again.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function loadOverview() {
    setOverviewLoading(true); setOverviewError('');
    try {
      const supabase=createSupabaseBrowserClient();
      const {data,error}=await supabase.functions.invoke('staff-overview',{body:{}});
      if(error||!data?.ok) throw new Error(data?.error||error?.message||'Unable to load overview.');
      setOverview(data as OverviewData);
    } catch(err) { setOverviewError(err instanceof Error?err.message:'Unable to load overview.'); }
    finally { setOverviewLoading(false); }
  }

  useEffect(()=>{if(activeTab==='overview'&&profile) void loadOverview();},[activeTab,profile]);

  async function searchBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookingLoading(true);
    setBookingMessage('');
    setBookingResult(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('staff-booking-lookup', {
        body: { booking_reference: bookingReference.trim().toUpperCase() },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Booking lookup failed.');
      if (!data.found) {
        setBookingMessage('No booking was found for that reference. Check the reference and try again.');
      } else {
        setBookingResult(data as BookingLookup);
      }
    } catch (err) {
      setBookingMessage(err instanceof Error ? err.message : 'Unable to look up this booking.');
    } finally {
      setBookingLoading(false);
    }
  }


  async function sendTicketEmail() {
    if (!bookingResult) return;
    setTicketEmailLoading(true);
    setTicketEmailMessage('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('staff-ticket-email', {
        body: { booking_reference: bookingResult.booking.booking_reference, request_key: crypto.randomUUID() },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Ticket email could not be sent.');
      setTicketEmailMessage(data.already_sent
        ? 'This send request was already completed; no duplicate email was sent.'
        : `Ticket email accepted by Resend for ${data.recipient}. ${data.ticket_count} ticket(s) included.`);
    } catch (err) {
      setTicketEmailMessage(err instanceof Error ? err.message : 'Unable to send ticket email.');
    } finally {
      setTicketEmailLoading(false);
    }
  }

  async function loadRefunds() {
    setRefundLoading(true); setRefundMessage('');
    try { const supabase=createSupabaseBrowserClient(); const {data,error}=await supabase.functions.invoke('staff-refunds',{body:{action:'list'}}); if(error||!data?.ok) throw new Error(data?.error||error?.message||'Unable to load refunds.'); setRefunds(data.refunds as RefundRow[]); }
    catch(err){setRefundMessage(err instanceof Error?err.message:'Unable to load refund requests.');} finally{setRefundLoading(false);}
  }

  async function submitRefundRequest(paymentId:string) {
    if(!bookingResult) return;
    setRefundLoading(true); setRefundMessage('');
    try { const supabase=createSupabaseBrowserClient(); const {data,error}=await supabase.functions.invoke('staff-refunds',{body:{action:'request',booking_reference:bookingReference.trim().toUpperCase(),payment_id:paymentId,reason:refundReason}}); if(error||!data?.ok) throw new Error(data?.error||error?.message||'Unable to submit refund request.'); setRefundReason(''); setRefundMessage('Full-booking refund request submitted for System Admin review.'); await loadRefunds(); }
    catch(err){setRefundMessage(err instanceof Error?err.message:'Unable to submit refund request.');} finally{setRefundLoading(false);}
  }

  async function reviewRefund(refundId:string,decision:'approved'|'rejected') {
    setRefundLoading(true); setRefundMessage('');
    try { const supabase=createSupabaseBrowserClient(); const {data,error}=await supabase.functions.invoke('staff-refunds',{body:{action:'review',refund_id:refundId,decision}}); if(error||!data?.ok) throw new Error(data?.error||error?.message||'Unable to review refund.'); setRefundMessage('Refund request '+decision+'.'); await loadRefunds(); }
    catch(err){setRefundMessage(err instanceof Error?err.message:'Unable to review refund.');} finally{setRefundLoading(false);}
  }

  useEffect(() => {
    if (activeTab === 'refunds' && profile) void loadRefunds();
  }, [activeTab, profile]);

  async function validateTicketValue(value: string) {
    const credential=value.trim(); if(!credential)return;
    setScanLoading(true);setScanResult(null);setCameraMessage('');setScanCredential(credential);
    try { const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('staff-ticket-scan',{body:{action:'validate',credential,device_label:'Management workspace'}});
      if(error||!data?.ok)throw new Error(data?.error||error?.message||'Ticket validation failed.');setScanResult(data as ScanResult);
    } catch(err){setCameraMessage(err instanceof Error?err.message:'Unable to validate ticket.');} finally{setScanLoading(false);}
  }
  async function submitTicketScan(event:React.FormEvent<HTMLFormElement>){event.preventDefault();await validateTicketValue(scanCredential);}
  async function denyTicketEntry(){
    if(!scanCredential.trim()||!scanResult||!['ready','unpaid','wrong_performance'].includes(scanResult.result))return;
    setScanLoading(true);setCameraMessage('');
    try{const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('staff-ticket-scan',{body:{action:'deny_entry',credential:scanCredential.trim(),device_label:'Management workspace'}});
      if(error||!data?.ok)throw new Error(data?.error||error?.message||'Unable to record denied entry.');
      setScanResult(current=>current?{...current,result:'denied',message:data.message}:current);
    }catch(err){setCameraMessage(err instanceof Error?err.message:'Unable to record denied entry.');}finally{setScanLoading(false);}
  }
  async function clockInTicket(){
    if(!scanCredential.trim()||scanResult?.result!=='ready')return;setScanLoading(true);setCameraMessage('');
    try{const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('staff-ticket-scan',{body:{action:'clock_in',credential:scanCredential.trim(),device_label:'Management workspace'}});
      if(error||!data?.ok)throw new Error(data?.error||error?.message||'Unable to record admission.');
      setScanResult(current=>current?{...current,result:data.result,message:data.message,attendee_name:data.attendee_name||current.attendee_name,ticket_reference:data.ticket_reference||current.ticket_reference}:data as ScanResult);
      if(data.result==='accepted')setScanCredential('');
    }catch(err){setCameraMessage(err instanceof Error?err.message:'Unable to record admission.');}finally{setScanLoading(false);}
  }

  async function startQrCamera() {
    setCameraMessage('');
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector) { setCameraMessage('Camera QR scanning is not supported by this browser. Use a QR scanner connected as a keyboard, or enter the ticket reference.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new Detector({ formats: ['qr_code'] });
      const detectFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length && codes[0].rawValue) {
            stopQrCamera();
            void validateTicketValue(codes[0].rawValue);
            return;
          }
        } catch { /* Continue scanning the next camera frame. */ }
        frameRef.current = window.requestAnimationFrame(() => { void detectFrame(); });
      };
      frameRef.current = window.requestAnimationFrame(() => { void detectFrame(); });
    } catch {
      setCameraMessage('Unable to access the camera. Check browser camera permissions or enter the ticket reference manually.');
    }
  }

  function stopQrCamera() {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => () => stopQrCamera(), []);

  const currentPerformance = performances.find(p => p.id === selectedPerformance);
  const currentCategory = currentPerformance?.categories.find(category => category.id === selectedCategory);
  const saleTotal = (currentCategory?.price ?? 0) * saleAttendees.length;

  async function submitCashSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaleLoading(true); setSaleMessage(''); setSaleReceipt(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('staff-box-office', {
        body: {
          action: 'create',
          purchaser_name: purchaserName,
          purchaser_email: purchaserEmail,
          idempotency_key: crypto.randomUUID(),
          items: [{ category_id: selectedCategory, attendees: saleAttendees }],
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Cash sale failed.');
      setSaleReceipt({ ...data.sale, tickets: data.tickets });
      setSaleMessage('Cash sale recorded and tickets issued.');
      setPurchaserName(''); setPurchaserEmail(''); setSaleAttendees([{ full_name: '', birth_date: '' }]);
      const { data: refreshed } = await supabase.functions.invoke('staff-box-office', { body: { action: 'options' } });
      if (refreshed?.ok) setPerformances(refreshed.performances as BoxOfficePerformance[]);
    } catch (err) {
      setSaleMessage(err instanceof Error ? err.message : 'Unable to record cash sale.');
    } finally { setSaleLoading(false); }
  }

  const today = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  if (loading) return <main className="staff-loading" style={{ minHeight: '100svh', width: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '2rem', boxSizing: 'border-box', background: '#080808', color: '#aaa', fontSize: '.9rem', letterSpacing: '.02em' }}>Loading management workspace…</main>;

  return (
    <>
      <main className="staff-main" id="overview">
        <header className="staff-topbar"><div><p className="staff-eyebrow">MANAGEMENT WORKSPACE</p><h1>Good day{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.</h1><p className="staff-muted">Your operations desk for Artist Playground.</p></div><div className="staff-date">{today}</div></header>
        {error && <div className="staff-error" role="alert">{error}</div>}

{activeTab === 'overview' && <section className="staff-section staff-overview" id="overview-dashboard">
          <div className="section-heading overview-heading"><div><h2>Operations overview</h2><p>A live snapshot of your productions, ticket sales, and upcoming performances.</p></div><button type="button" className="outline-button" onClick={()=>void loadOverview()} disabled={overviewLoading}>{overviewLoading?'Refreshing…':'↻ Refresh'}</button></div>
          {overviewError&&<div className="staff-error" role="alert">{overviewError}</div>}
          {overviewLoading && !overview ? (
            <div className="overview-loading">Loading your ticketing overview…</div>
          ) : overview ? (
            <>
            <div className="overview-metrics">
              <article className="overview-metric"><span>Published productions</span><strong>{overview.metrics.active_productions}</strong><small>Currently published shows</small></article>
              <article className="overview-metric"><span>Upcoming performances</span><strong>{overview.metrics.upcoming_performances}</strong><small>Scheduled future performances</small></article>
              <article className="overview-metric"><span>Tickets issued</span><strong>{overview.metrics.tickets_issued.toLocaleString('en-PH')}</strong><small>Issued and valid admission tickets</small></article>
              <article className="overview-metric"><span>Pending bookings</span><strong>{overview.metrics.pending_bookings}</strong><small>Awaiting payment confirmation</small></article>
              <article className="overview-metric overview-revenue"><span>Paid revenue</span><strong>₱{overview.metrics.paid_revenue.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><small>Payments with paid status</small></article>
            </div>
            <div className="overview-panel">
              <div className="overview-panel-heading"><div><h3>Upcoming performances</h3><p>Ticket inventory by scheduled performance</p></div><a href="#box-office" onClick={()=>setActiveTab('box-office')}>Open box office →</a></div>
              {overview.upcoming.length? <div className="overview-performance-list">{overview.upcoming.map(item=><article className="overview-performance" key={item.id}>
                <div className="overview-performance-main"><div><strong>{item.title}</strong><span>{new Date(item.starts_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})} · {item.venue_name}</span></div><span className="overview-capacity">{item.sold+item.reserved} / {item.capacity} allocated</span></div>
                <div className="overview-progress"><span style={{width:(item.capacity?Math.min(100,(item.sold+item.reserved)/item.capacity*100):0)+'%'}}/></div>
                <div className="overview-performance-foot"><span>{item.sold} sold</span><span>{item.reserved} reserved</span><span>{item.remaining} remaining</span></div>
                {item.categories.length>1&&<div className="overview-categories">{item.categories.map(cat=><span key={cat.name}>{cat.name}: {cat.sold} sold · {cat.reserved} reserved</span>)}</div>}
              </article>)}</div>:<div className="overview-empty">No upcoming published performances. Add a performance in Productions to see it here.</div>}
            </div>
            <div className="overview-panel">
              <div className="overview-panel-heading"><div><h3>Recent bookings</h3><p>Latest customer booking activity</p></div><span>Latest customer booking activity</span></div>
              {overview.recent_bookings.length?<div className="overview-bookings">{overview.recent_bookings.map(b=><div className="overview-booking" key={b.booking_reference}><div><strong>{b.purchaser_name}</strong><span>{b.booking_reference} · {new Date(b.created_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</span></div><div className="overview-booking-right"><strong>{b.currency} {Number(b.total_amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</strong><span className={'overview-status status-'+b.status}>{b.status.replaceAll('_',' ')}</span></div></div>)}</div>:<div className="overview-empty">No bookings have been recorded yet.</div>}
            </div>
            <p className="overview-updated">Last updated {new Date(overview.generated_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</p>
          </>
          ) : null}
        </section>}

{activeTab === 'box-office' &&         <section className="staff-section" id="box-office">
          <div className="section-heading"><div><h2>Box office · Cash sale</h2><p>Record an in-person cash purchase and issue tickets against live inventory.</p></div></div>
          <div className="booking-lookup-panel">
            <form className="cash-sale-form" onSubmit={submitCashSale}>
              <label htmlFor="sale-performance">Performance</label>
              <select id="sale-performance" value={selectedPerformance} onChange={e => { setSelectedPerformance(e.target.value); setSelectedCategory(''); }} required>
                <option value="">Choose a performance</option>
                {performances.map(p => <option key={p.id} value={p.id}>{p.production_title} · {new Date(p.starts_at).toLocaleString()} · {p.venue_name}</option>)}
              </select>
              <label htmlFor="sale-category">Ticket category</label>
              <select id="sale-category" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} required disabled={!currentPerformance}>
                <option value="">Choose a ticket category</option>
                {currentPerformance?.categories.map(category => <option key={category.id} value={category.id}>{category.name} · ₱{Number(category.price).toLocaleString('en-PH',{minimumFractionDigits:2})} · {category.remaining} remaining</option>)}
              </select>
              <div className="cash-sale-two-col"><div><label htmlFor="purchaser-name">Purchaser name</label><input id="purchaser-name" value={purchaserName} onChange={e => setPurchaserName(e.target.value)} maxLength={120} required /></div><div><label htmlFor="purchaser-email">Purchaser email</label><input id="purchaser-email" type="email" value={purchaserEmail} onChange={e => setPurchaserEmail(e.target.value)} maxLength={254} required /></div></div>
              <div className="attendee-heading"><strong>Attendees</strong><button type="button" className="outline-button" disabled={saleAttendees.length>=20} onClick={() => setSaleAttendees(rows => [...rows,{full_name:'',birth_date:''}])}>＋ Add ticket</button></div>
              {saleAttendees.map((attendee,index) => <div className="cash-sale-two-col attendee-row" key={index}><div><label htmlFor={`attendee-name-${index}`}>Attendee {index+1} full name</label><input id={`attendee-name-${index}`} value={attendee.full_name} maxLength={120} onChange={e => setSaleAttendees(rows => rows.map((row,i)=>i===index?{...row,full_name:e.target.value}:row))} required /></div><div><label htmlFor={`attendee-birth-${index}`}>Birthday</label><input id={`attendee-birth-${index}`} type="date" max={new Date().toISOString().slice(0,10)} value={attendee.birth_date} onChange={e => setSaleAttendees(rows => rows.map((row,i)=>i===index?{...row,birth_date:e.target.value}:row))} required /></div>{saleAttendees.length>1 && <button type="button" className="remove-attendee" onClick={() => setSaleAttendees(rows => rows.filter((_,i)=>i!==index))}>Remove</button>}</div>)}
              <div className="cash-sale-total"><span>Cash sale total</span><strong>₱{saleTotal.toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>
              <button className="primary-button" type="submit" disabled={saleLoading || !selectedCategory}>{saleLoading?'Recording cash sale…':'Confirm cash received & issue tickets'}</button>
            </form>
            {saleMessage && <p className="booking-message" role="status">{saleMessage}</p>}
            {saleReceipt && <div className="sale-receipt"><div className="result-label">SALE CONFIRMED</div><h3>{saleReceipt.booking_reference}</h3><p>{saleReceipt.ticket_count} ticket(s) · ₱{Number(saleReceipt.subtotal).toLocaleString('en-PH',{minimumFractionDigits:2})}</p>{saleReceipt.tickets.map(ticket=><div className="payment-result" key={ticket.ticket_reference}><span>{ticket.attendee_name}</span><strong>{ticket.ticket_reference}</strong></div>)}</div>}
            {!performances.length && <p className="result-muted">No published upcoming performances with available ticket inventory are open for box-office sales.</p>}
          </div>
        </section>}
{activeTab === 'scanner' && <section className="staff-section" id="scanner">
          <div className="section-heading"><div><h2>Ticket scanner</h2><p>Scan the ticket. Its show and attendee details load automatically before admission is recorded.</p></div></div>
          <div className="booking-lookup-panel">
            <form className="cash-sale-form" onSubmit={submitTicketScan}>
              <div className="scanner-camera"><video ref={videoRef} playsInline muted aria-label="Ticket QR camera preview" />
                <div className="scanner-camera-actions"><button type="button" className="outline-button scan-start-button" onClick={startQrCamera}>Scan QR</button><button type="button" className="outline-button" onClick={stopQrCamera}>Stop camera</button></div>
              </div>
              <label htmlFor="ticket-credential">Or enter ticket reference / QR value</label>
              <input id="ticket-credential" value={scanCredential} onChange={e=>{setScanCredential(e.target.value);setScanResult(null);}} placeholder="Scan QR code or enter ticket reference" maxLength={512} required />
              <button className="outline-button" type="submit" disabled={scanLoading||!scanCredential.trim()}>{scanLoading?'Checking ticket…':'Look up ticket'}</button>
            </form>
            {cameraMessage&&<p className="booking-message" role="status">{cameraMessage}</p>}
            {scanResult&&<div className={`scan-result scan-${scanResult.result}`} role="status">
              <span className="result-label">TICKET · {scanResult.result.replaceAll('_',' ').toUpperCase()}</span><h3>{scanResult.production_title||'Ticket details unavailable'}</h3>
              <div className="scan-ticket-facts">
                <div><small>ATTENDEE</small><strong>{scanResult.attendee_name||'—'}</strong></div>
                <div><small>BIRTHDATE</small><strong>{scanResult.birth_date?new Date(`${scanResult.birth_date}T00:00:00`).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}):'—'}</strong></div>
                <div><small>TICKET CATEGORY</small><strong>{scanResult.ticket_category||'—'}</strong></div>
                <div><small>PERFORMANCE</small><strong>{scanResult.starts_at?new Date(scanResult.starts_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'}):'—'}</strong></div>
                <div><small>VENUE</small><strong>{scanResult.venue_name||'—'}</strong></div>
                <div><small>TICKET REFERENCE</small><strong>{scanResult.ticket_reference||'—'}</strong></div>
              </div>
              {scanResult.result==='ready'&&<button type="button" className="primary-button scan-clock-in" onClick={clockInTicket} disabled={scanLoading}>{scanLoading?'Recording admission…':'Clock in attendee'}</button>}
              {['ready','unpaid','wrong_performance'].includes(scanResult.result)&&<button type="button" className="outline-button scan-deny-entry" onClick={denyTicketEntry} disabled={scanLoading}>Deny entry</button>}
              {scanResult.result==='denied'&&<p className="scan-denied">Entry denied by management. Ticket remains valid for its assigned show.</p>}
              {scanResult.result==='accepted'&&<p className="scan-clocked-in">✓ Attendee successfully clocked in.</p>}
            </div>}
          </div>
        </section>}
{activeTab === 'reports' &&         <section className="staff-section" id="reports"><div className="workflow-note"><span>▥</span><div><strong>Production &amp; performance reports</strong><p>Review ticket sales, revenue, payment status, and admissions by production or individual performance. Reporting tools will appear here as they are connected.</p></div></div></section>}

        {activeTab === 'refunds' && <section className="staff-section" id="refunds">
          <div className="section-heading"><div><h2>Refund requests</h2><p>Refunds apply to the entire booking and payment only. Partial ticket refunds are not supported.</p></div><button type="button" className="outline-button" onClick={()=>void loadRefunds()} disabled={refundLoading}>{refundLoading?'Refreshing…':'Refresh'}</button></div>
          {refundMessage && <p className="booking-message" role="status">{refundMessage}</p>}
          {bookingResult && <div className="booking-lookup-panel refund-request-panel"><h3>Request a full-booking refund</h3><p className="result-muted">Booking {bookingResult.booking.booking_reference} · {bookingResult.booking.purchaser_name}</p>
            {bookingResult.payments.filter(p=>p.status==='paid').map(p=><div className="refund-payment-option" key={p.id}><span>{p.method.toUpperCase()} · {p.currency} {Number(p.amount).toLocaleString('en-PH',{minimumFractionDigits:2})} · {p.status}</span><button type="button" className="outline-button" disabled={refundLoading||!refundReason.trim()} onClick={()=>void submitRefundRequest(p.id)}>Submit full refund request</button></div>)}
            {!bookingResult.payments.some(p=>p.status==='paid') && <p className="result-muted">This booking has no verified paid transaction eligible for a refund request.</p>}
            <label htmlFor="refund-reason">Reason for refund request</label><textarea id="refund-reason" value={refundReason} onChange={e=>setRefundReason(e.target.value)} placeholder="Explain why the full booking should be refunded" rows={3} maxLength={1000}/>
            <p className="result-muted">Search a booking in the Bookings tab first. Only verified paid payments can be requested.</p>
          </div>}
          {refundLoading && !refunds.length ? <p className="result-muted">Loading refund requests…</p> : refunds.length ? <div className="payment-desk-list">{refunds.map(r=><article className="payment-desk-row" key={r.id}>
            <div className="payment-desk-main"><div><strong>{r.booking_reference}</strong><span>{r.purchaser_name} · {r.purchaser_email}</span></div><strong>{r.currency} {Number(r.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>
            <div className="payment-desk-meta"><span className="status-pill">{r.status.replaceAll('_',' ')}</span><span>{r.payment_method.toUpperCase()} · {r.provider}</span><span>Payment: {r.payment_status}</span><span>{new Date(r.requested_at).toLocaleString()}</span></div>
            <p className="payment-ref">Reason: {r.reason}</p>
            {profile?.role==='system_admin' && r.status==='requested' && <div className="scanner-camera-actions"><button type="button" className="outline-button" disabled={refundLoading} onClick={()=>void reviewRefund(r.id,'approved')}>Approve request</button><button type="button" className="outline-button" disabled={refundLoading} onClick={()=>void reviewRefund(r.id,'rejected')}>Reject request</button></div>}
          </article>)}</div> : <p className="result-muted">No refund requests have been submitted.</p>}
          <div className="workflow-note"><span>ⓘ</span><div><strong>Approval is not a completed refund</strong><p>Approval records the company decision only. PayMongo processing is not connected yet; cash must actually be returned before completion. Tickets remain valid until a verified refund completion is recorded.</p></div></div>
        </section>}
        <footer className="staff-footer">Artist Playground · Internal management workspace</footer>
      </main>

      
    </>
  );
}
