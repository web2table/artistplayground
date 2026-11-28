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
  const [activeTab, setActiveTab] = useState(() => typeof window === 'undefined' ? 'overview' : ((window.location.hash.slice(1) === 'sales' || window.location.hash.slice(1) === 'payments' ? 'reports' : window.location.hash.slice(1) || 'overview')));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { const sync = () => setActiveTab(window.location.hash.slice(1) === 'sales' || window.location.hash.slice(1) === 'payments' ? 'reports' : window.location.hash.slice(1) || 'overview'); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync); }, []);
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
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Staff session check timed out. Please sign in again.')), 15000)),
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
        if (active) setError('Unable to verify your staff session. Please sign in again.');
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
    try { const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('staff-ticket-scan',{body:{action:'validate',credential,device_label:'Staff workspace'}});
      if(error||!data?.ok)throw new Error(data?.error||error?.message||'Ticket validation failed.');setScanResult(data as ScanResult);
    } catch(err){setCameraMessage(err instanceof Error?err.message:'Unable to validate ticket.');} finally{setScanLoading(false);}
  }
  async function submitTicketScan(event:React.FormEvent<HTMLFormElement>){event.preventDefault();await validateTicketValue(scanCredential);}
  async function denyTicketEntry(){
    if(!scanCredential.trim()||!scanResult||!['ready','unpaid','wrong_performance'].includes(scanResult.result))return;
    setScanLoading(true);setCameraMessage('');
    try{const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('staff-ticket-scan',{body:{action:'deny_entry',credential:scanCredential.trim(),device_label:'Staff workspace'}});
      if(error||!data?.ok)throw new Error(data?.error||error?.message||'Unable to record denied entry.');
      setScanResult(current=>current?{...current,result:'denied',message:data.message}:current);
    }catch(err){setCameraMessage(err instanceof Error?err.message:'Unable to record denied entry.');}finally{setScanLoading(false);}
  }
  async function clockInTicket(){
    if(!scanCredential.trim()||scanResult?.result!=='ready')return;setScanLoading(true);setCameraMessage('');
    try{const supabase=createSupabaseBrowserClient();const {data,error}=await supabase.functions.invoke('staff-ticket-scan',{body:{action:'clock_in',credential:scanCredential.trim(),device_label:'Staff workspace'}});
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

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace(appPath('/staff/login/'));
  }

  const today = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  if (loading) return <main className="staff-loading" style={{ minHeight: '100svh', width: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '2rem', boxSizing: 'border-box', background: '#080808', color: '#aaa', fontSize: '.9rem', letterSpacing: '.02em' }}>Loading staff workspace…</main>;

  return (
    <div className="staff-workspace">
      <aside className="staff-sidebar">
        <a className="staff-brand" href="#overview" onClick={() => setActiveTab("overview")} aria-label="Staff workspace overview"><img className="staff-brand-logo" src={appPath("/ap.jpg")} alt="Artist Playground logo" /><span>ARTIST PLAYGROUND<small>STAFF WORKSPACE</small></span></a>
        <button type="button" className={`staff-menu-toggle ${mobileMenuOpen ? "is-open" : ""}`} aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileMenuOpen} aria-controls="staff-mobile-navigation" onClick={() => setMobileMenuOpen(open => !open)}><span className="staff-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span></button>
        <nav id="staff-mobile-navigation" className={`staff-nav-links ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Staff navigation" onClick={() => setMobileMenuOpen(false)}>
          <div className="staff-nav-label">WORKSPACE</div>
          <a className={`staff-nav-item ${activeTab === 'overview' ? 'selected' : ''}`} href="#overview" onClick={() => setActiveTab('overview')}><span>⌂</span> Overview</a>
          <div className="staff-nav-label">MANAGEMENT</div>
          <a className="staff-nav-item" href={appPath('/staff/productions/')}><span>▣</span> Productions</a>
          <a className="staff-nav-item" href={appPath('/staff/events/')}><span>▤</span> Events</a>
          <div className="staff-nav-label">OPERATIONS</div>
          <a className={`staff-nav-item ${activeTab === 'bookings' ? 'selected' : ''}`} href="#bookings" onClick={() => setActiveTab('bookings')}><span>▤</span> Bookings</a>
          <a className={`staff-nav-item ${activeTab === 'refunds' ? 'selected' : ''}`} href="#refunds" onClick={() => setActiveTab('refunds')}><span>↺</span> Refunds</a>
          <a className={`staff-nav-item ${activeTab === 'scanner' ? 'selected' : ''}`} href="#scanner" onClick={() => setActiveTab('scanner')}><span>▦</span> Ticket scanner</a>
          <a className={`staff-nav-item ${activeTab === 'box-office' ? 'selected' : ''}`} href="#box-office" onClick={() => setActiveTab('box-office')}><span>＋</span> Box office</a>
          <div className="staff-nav-label">INSIGHTS</div>
          <a className={`staff-nav-item ${activeTab === 'reports' ? 'selected' : ''}`} href="#reports" onClick={() => setActiveTab('reports')}><span>▥</span> Reports</a>
        </nav>
        <div className="staff-sidebar-bottom"><div className="staff-user"><span className="staff-avatar">{(profile?.display_name || 'S').slice(0,1).toUpperCase()}</span><span>{profile?.display_name || 'Staff member'}<small>Staff account</small></span></div><button type="button" onClick={signOut}>Sign out</button></div>
      </aside>

      <main className="staff-main" id="overview">
        <header className="staff-topbar"><div><p className="staff-eyebrow">STAFF WORKSPACE</p><h1>Good day{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.</h1><p className="staff-muted">Your operations desk for Artist Playground.</p></div><div className="staff-date">{today}</div></header>
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
              <div className="overview-panel-heading"><div><h3>Recent bookings</h3><p>Latest customer booking activity</p></div><a href="#bookings" onClick={()=>setActiveTab('bookings')}>Find a booking →</a></div>
              {overview.recent_bookings.length?<div className="overview-bookings">{overview.recent_bookings.map(b=><div className="overview-booking" key={b.booking_reference}><div><strong>{b.purchaser_name}</strong><span>{b.booking_reference} · {new Date(b.created_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</span></div><div className="overview-booking-right"><strong>{b.currency} {Number(b.total_amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</strong><span className={'overview-status status-'+b.status}>{b.status.replaceAll('_',' ')}</span></div></div>)}</div>:<div className="overview-empty">No bookings have been recorded yet.</div>}
            </div>
            <p className="overview-updated">Last updated {new Date(overview.generated_at).toLocaleString('en-PH',{dateStyle:'medium',timeStyle:'short'})}</p>
          </>
          ) : null}
        </section>}

{activeTab === 'bookings' &&         <section className="staff-section" id="bookings">
          <div className="section-heading"><div><h2>Booking lookup</h2><p>Search by the booking reference supplied by the customer.</p></div></div>
          <div className="booking-lookup-panel">
            <form className="booking-search-form" onSubmit={searchBooking}>
              <label htmlFor="booking-reference">Booking reference</label>
              <div className="booking-search-row"><input id="booking-reference" value={bookingReference} onChange={e => setBookingReference(e.target.value.toUpperCase())} placeholder="Enter booking reference" maxLength={40} pattern="[A-Za-z0-9-]+" required /><button type="submit" disabled={bookingLoading}>{bookingLoading ? 'Searching…' : 'Find booking'}</button></div>
            </form>
            {bookingMessage && <p className="booking-message" role="status">{bookingMessage}</p>}
            {bookingResult && <div className="booking-result">
              <div className="booking-result-heading"><div><span className="result-label">BOOKING REFERENCE</span><h3>{bookingResult.booking.booking_reference}</h3></div><span className={`booking-status status-${bookingResult.booking.status}`}>{bookingResult.booking.status.replaceAll('_',' ')}</span></div>
              <div className="booking-facts"><div><small>PURCHASER</small><strong>{bookingResult.booking.purchaser_name}</strong><span>{bookingResult.booking.purchaser_email}</span></div><div><small>BOOKED ON</small><strong>{new Date(bookingResult.booking.created_at).toLocaleString()}</strong></div><div><small>BOOKING TOTAL</small><strong>{bookingResult.booking.currency} {Number(bookingResult.booking.total_amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div></div>
              <div className="result-subsection"><h4>Tickets ({bookingResult.tickets.length})</h4>{bookingResult.tickets.length ? <div className="ticket-result-list">{bookingResult.tickets.map(ticket => <article className="ticket-result" key={ticket.ticket_reference}><div><strong>{ticket.attendee_name}</strong><span>{ticket.category} · {ticket.ticket_reference}</span>{ticket.performance && <small>{new Date(ticket.performance.starts_at).toLocaleString()} · {ticket.performance.venue_name}</small>}</div><span className={`ticket-status ticket-${ticket.status}`}>{ticket.status}</span></article>)}</div> : <p className="result-muted">No tickets have been issued for this booking yet.</p>}</div>
              <div className="result-subsection"><h4>Payment history ({bookingResult.payments.length})</h4>{bookingResult.payments.length ? <div className="payment-result-list">{bookingResult.payments.map((payment,i) => <div className="payment-result" key={payment.provider_reference || i}><span>{payment.method.toUpperCase()} · {payment.status.replaceAll('_',' ')}</span><strong>{payment.currency} {Number(payment.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>)}</div> : <p className="result-muted">No payment records found.</p>}</div>
              <div className="result-subsection">
                <h4>Ticket email delivery</h4>
                <p className="result-muted">Send all tickets and their QR images in one email. During development, delivery goes only to the verified Resend test recipient.</p>
                <button type="button" className="outline-button" onClick={() => void sendTicketEmail()} disabled={ticketEmailLoading || bookingResult.booking.status !== 'confirmed' || !bookingResult.tickets.length}>{ticketEmailLoading ? 'Sending ticket email…' : 'Send / resend ticket email'}</button>
                {ticketEmailMessage && <p className="booking-message" role="status">{ticketEmailMessage}</p>}
              </div>
            </div>}
          </div>
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
              {scanResult.result==='denied'&&<p className="scan-denied">Entry denied by staff. Ticket remains valid for its assigned show.</p>}
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
        <footer className="staff-footer">Artist Playground · Internal staff workspace</footer>
      </main>

      <style>{`
        .staff-workspace{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr);background:#090a0c;color:#f4f5f7;font-family:Inter,Arial,sans-serif}
        .staff-sidebar{position:sticky;top:0;height:100vh;min-height:620px;background:#0e1013;border-right:1px solid #252a31;padding:1.35rem 1rem;display:flex;flex-direction:column}
        .staff-menu-toggle{display:none;align-items:center;justify-content:center;width:42px;height:42px;padding:0;border:0;background:transparent;border-radius:8px;color:#e8edf2;cursor:pointer}
        .staff-menu-icon{display:grid;gap:4px;width:20px}.staff-menu-icon i{display:block;height:2px;width:20px;border-radius:2px;background:#62d7f5;transition:transform .18s ease,opacity .18s ease}
        .staff-nav-links{display:flex;flex-direction:column}

        .staff-brand{display:flex;align-items:center;gap:.75rem;padding:.35rem .5rem 2.3rem;color:#f2f4f6;text-decoration:none;font-size:.68rem;font-weight:800;letter-spacing:.08em}.staff-sidebar{position:relative}.staff-brand{padding-right:3rem}.staff-menu-toggle{position:absolute;top:1.15rem;right:1rem;z-index:120}
        .staff-brand small{display:block;color:#7f8995;font-size:.6rem;letter-spacing:.13em;margin-top:.35rem}
        .staff-brand-logo{display:block;flex:0 0 39px;width:39px;height:39px;object-fit:contain;border-radius:6px}
        .staff-nav-label{font-size:.62rem;letter-spacing:.16em;font-weight:800;color:#697380;padding:.75rem .7rem .45rem}
        .staff-nav-item{display:flex;align-items:center;gap:.75rem;padding:.72rem .75rem;border-radius:7px;text-decoration:none;color:#aeb6c0;font-size:.8rem;margin:.08rem 0}
        .staff-nav-item span{width:18px;text-align:center;color:#7b8996;font-size:1rem}
        .staff-nav-item:hover,.staff-nav-item.selected{background:#19252c;color:#62d7f5}.staff-nav-item.selected span{color:#62d7f5}
        .staff-sidebar-bottom{margin-top:auto;border-top:1px solid #282d34;padding-top:1rem}
        .staff-user{display:flex;align-items:center;gap:.65rem;padding:.35rem .25rem;font-size:.75rem;font-weight:700}
        .staff-avatar{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#24323b;color:#79dcf8}
        .staff-user small{display:block;color:#818b97;font-size:.65rem;font-weight:400;margin-top:.2rem}
        .staff-sidebar-bottom button{width:100%;margin-top:.8rem;padding:.65rem;background:#171a1f;border:1px solid #353b44;border-radius:7px;color:#dce0e5;cursor:pointer}
        .staff-main{padding:2rem clamp(1.2rem,3vw,3rem);min-width:0;max-width:1600px;width:100%;margin:0 auto}
        .staff-topbar{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;flex-wrap:wrap;margin-bottom:1.6rem}
        .staff-eyebrow{color:#00b8e6;letter-spacing:.16em;font-size:.67rem;font-weight:800;margin:0 0 .5rem}
        .staff-topbar h1{font-family:Manrope,Inter,sans-serif;font-size:clamp(1.8rem,3vw,2.4rem);letter-spacing:-.04em;margin:0}
        .staff-muted,.section-heading p{color:#929ba6;font-size:.8rem;margin:.45rem 0 0;line-height:1.5}
        .staff-date{color:#aab2bd;font-size:.76rem;border:1px solid #2b3038;border-radius:7px;padding:.65rem .8rem}
        .staff-welcome{min-height:190px;border:1px solid #263c45;border-radius:12px;background:linear-gradient(110deg,#101c22,#101317 70%);padding:1.7rem 2rem;display:flex;align-items:center;justify-content:space-between;overflow:hidden;position:relative}
        .welcome-label{color:#4ac9ec;font-size:.63rem;letter-spacing:.15em;font-weight:800}
        .staff-welcome h2{font-family:Manrope,Inter,sans-serif;font-size:clamp(1.5rem,3vw,2.2rem);line-height:1.15;letter-spacing:-.04em;margin:.7rem 0}
        .staff-welcome p{color:#aab4be;font-size:.8rem;max-width:520px;line-height:1.55;margin:0}
        .welcome-mark{font-size:8rem;font-weight:900;letter-spacing:-.15em;color:rgba(0,168,214,.10);padding-right:2rem}
        .overview-heading{align-items:center}.overview-heading .outline-button{white-space:nowrap}.overview-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.75rem;margin:1rem 0}.overview-metric{min-width:0;padding:1rem;background:#111419;border:1px solid #282e36;border-radius:9px}.overview-metric span,.overview-metric small{display:block;color:#a0a9b4;font-size:.68rem}.overview-metric strong{display:block;color:#f4f5f7;font-size:1.65rem;letter-spacing:-.04em;margin:.55rem 0 .35rem;overflow-wrap:anywhere}.overview-metric small{font-size:.62rem;color:#737e8b;line-height:1.4}.overview-revenue{border-color:#3c3a20}.overview-revenue strong{color:#f5e900;font-size:1.35rem}.overview-panel{margin-top:1rem;padding:1.15rem;background:#101317;border:1px solid #282e36;border-radius:10px}.overview-panel-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.7rem}.overview-panel-heading h3{margin:0;font-size:.9rem}.overview-panel-heading p{margin:.3rem 0 0;color:#89939e;font-size:.68rem}.overview-panel-heading a{color:#5ed4f2;text-decoration:none;font-size:.68rem;white-space:nowrap}.overview-performance{padding:.9rem 0;border-top:1px solid #252b33}.overview-performance-main,.overview-booking{display:flex;align-items:center;justify-content:space-between;gap:1rem}.overview-performance-main>div,.overview-booking>div:first-child{display:grid;gap:.3rem;min-width:0}.overview-performance-main strong,.overview-booking strong{font-size:.75rem}.overview-performance-main span,.overview-booking span{color:#929ba6;font-size:.65rem}.overview-capacity{white-space:nowrap}.overview-progress{height:5px;margin:.7rem 0 .4rem;background:#292e35;border-radius:10px;overflow:hidden}.overview-progress span{display:block;height:100%;background:#00b8e6;border-radius:10px}.overview-performance-foot{display:flex;gap:1rem;flex-wrap:wrap}.overview-performance-foot span,.overview-categories span{color:#929ba6;font-size:.62rem}.overview-categories{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.55rem}.overview-categories span{padding:.25rem .45rem;background:#191e24;border-radius:4px}.overview-booking{padding:.75rem 0;border-top:1px solid #252b33}.overview-booking-right{display:flex;align-items:flex-end;flex-direction:column;gap:.3rem;white-space:nowrap}.overview-status{padding:.2rem .45rem;border-radius:20px;background:#272e36;text-transform:capitalize;font-size:.58rem!important}.overview-empty,.overview-loading{padding:1.3rem;color:#929ba6;font-size:.75rem;text-align:center}.overview-updated{color:#737e8b;font-size:.62rem;text-align:right;margin-top:.8rem}
        .staff-section{margin-top:2rem;scroll-margin-top:1rem}
        .section-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1rem}
        .section-heading h2{font-family:Manrope,Inter,sans-serif;font-size:1.12rem;margin:0}
        .section-heading p{font-size:.74rem}
        .live-indicator{font-size:.6rem;letter-spacing:.12em;color:#a4b0bc;border:1px solid #343b44;padding:.4rem .6rem;border-radius:99px}
        .staff-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.85rem}
        .metric-card{background:#111419;border:1px solid #282e36;border-radius:9px;padding:1rem 1.1rem}
        .metric-card span,.metric-card small{display:block;color:#a0a9b4;font-size:.72rem}
        .metric-card strong{display:block;font-size:1.7rem;margin:.45rem 0;color:#f3f5f7}
        .metric-card small{font-size:.65rem;color:#737e8b}
        .work-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.85rem}
        .work-card{position:relative;display:block;min-height:170px;padding:1.1rem;border:1px solid #292f38;border-radius:10px;background:#111419;text-decoration:none;color:#f4f5f7;transition:border-color .15s,transform .15s}
        .work-card:hover{border-color:#087c9b;transform:translateY(-2px)}
        .work-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:#172a32;color:#55cdec;font-size:1.15rem;margin-bottom:.8rem}
        .work-tag{position:absolute;top:1.2rem;right:1rem;color:#737e8b;font-size:.55rem;letter-spacing:.1em;font-weight:800}
        .work-card h3{font-size:.9rem;margin:0 0 .4rem}
        .work-card p{font-size:.72rem;line-height:1.5;color:#929ba6;margin:0;max-width:300px}
        .work-arrow{display:inline-block;color:#65d5f2;font-size:.68rem;margin-top:.85rem}
        .workflow-note{display:flex;gap:1rem;align-items:flex-start;padding:1rem 1.1rem;background:#111419;border:1px solid #282e36;border-radius:9px}
        .workflow-note>span{display:grid;place-items:center;flex:0 0 34px;height:34px;border-radius:8px;background:#172a32;color:#55cdec;font-size:1.1rem}
        .workflow-note strong{font-size:.8rem}.workflow-note p{color:#929ba6;font-size:.73rem;line-height:1.55;margin:.35rem 0 0}
        .staff-footer{border-top:1px solid #252a31;color:#66717e;font-size:.66rem;margin-top:2.5rem;padding:1.2rem 0}
        .cash-sale-form{display:grid;gap:.55rem}.cash-sale-form label{display:block;color:#cbd1d9;font-size:.72rem;margin:.35rem 0 .1rem}.cash-sale-form input,.cash-sale-form select{width:100%;min-width:0;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.75rem .8rem;color:#f4f5f7;font:inherit;font-size:.78rem}.cash-sale-two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.cash-sale-two-col>div{min-width:0}.attendee-heading{display:flex;align-items:center;justify-content:space-between;margin-top:.5rem}.attendee-heading strong{font-size:.8rem}.attendee-row{position:relative;padding:.7rem;background:#0c0f13;border:1px solid #252b33;border-radius:8px}.remove-attendee{align-self:end;background:transparent;border:0;color:#f19aa4;font-size:.68rem;cursor:pointer;padding:.6rem}.cash-sale-total{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #2b3038;padding-top:1rem;margin-top:.5rem}.cash-sale-total span{color:#aeb7c1;font-size:.8rem}.cash-sale-total strong{font-size:1.2rem}.sale-receipt{margin-top:1rem;padding:1rem;border:1px solid #245a3c;background:#10251b;border-radius:8px}.sale-receipt h3{font-size:1.2rem;margin:.4rem 0}.sale-receipt p{font-size:.75rem;color:#a8e8c2}.refund-request-panel{margin:1rem 0}.refund-request-panel h3{font-size:.9rem;margin:0}.refund-request-panel label{display:block;color:#cbd1d9;font-size:.72rem;margin:.8rem 0 .35rem}.refund-request-panel textarea{width:100%;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.75rem;color:#f4f5f7;font:inherit;font-size:.78rem;resize:vertical}.refund-payment-option{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;padding:.75rem 0;border-top:1px solid #252b33;font-size:.72rem;color:#aeb7c1}.payment-filters{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin:1rem 0}.payment-filters label{font-size:.7rem;color:#aeb7c1}.payment-filters select{background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.6rem;color:#f4f5f7;font:inherit;font-size:.75rem}.payment-desk-list{display:grid;gap:.65rem;margin:1rem 0}.payment-desk-row{background:#111419;border:1px solid #282e36;border-radius:9px;padding:1rem}.payment-desk-main{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.payment-desk-main>div{display:grid;gap:.3rem}.payment-desk-main strong{font-size:.85rem}.payment-desk-main span,.payment-desk-meta,.payment-ref{font-size:.68rem;color:#aeb7c1}.payment-desk-meta{display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-top:.7rem}.payment-ref{margin:.5rem 0 0}.payment-error{color:#f19aa4}.status-pill{padding:.2rem .5rem;border-radius:30px;background:#272e36;color:#d6dde5;text-transform:uppercase;font-size:.6rem}.status-paid{background:#123323;color:#8de0ad}.status-pending{background:#382d13;color:#f2d27b}.status-failed,.status-cancelled,.status-refunded{background:#30252a;color:#e4a5b1}.scanner-camera{display:grid;gap:.65rem;margin:.7rem 0}.scanner-camera video{display:block;width:100%;height:clamp(220px,56vw,300px);object-fit:contain;background:#050607;border:1px solid #303740;border-radius:8px}.scanner-camera-actions{display:flex;align-items:center;justify-content:center;gap:.6rem;flex-wrap:wrap;width:100%}.scan-start-button{background:#151a20;border:1px solid #39414b;color:#dce2e9}.scan-start-button:hover{background:#1c2730;border-color:#00b8e6;color:#fff}.outline-button{background:#151a20;border:1px solid #39414b;border-radius:7px;color:#dce2e9;padding:.6rem .85rem;cursor:pointer;font-size:.72rem}.scan-result{margin-top:1rem;padding:1rem;border:1px solid #39414b;background:#111820;border-radius:10px}.scan-result .result-label{display:inline-flex;align-items:center;padding:.3rem .55rem;border:1px solid #24566a;border-radius:5px;background:#0d2530;color:#62d7f5;font-size:.62rem;font-weight:800;letter-spacing:.1em}.scan-result h3{font-size:1.08rem;line-height:1.35;margin:.75rem 0 .9rem;color:#f4f7fa}.scan-ticket-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;margin:1rem 0}.scan-ticket-facts>div{padding:.8rem;background:#0b0f14;border:1px solid #303943;border-radius:8px;min-width:0}.scan-ticket-facts small,.scan-ticket-facts strong{display:block}.scan-ticket-facts small{font-size:.59rem;letter-spacing:.1em;color:#62bcd5;font-weight:800}.scan-ticket-facts strong{font-size:.82rem;line-height:1.45;margin-top:.4rem;color:#f0f3f6;overflow-wrap:anywhere}.scan-clock-in{display:flex!important;align-items:center;justify-content:center;width:100%;min-height:48px;margin-top:.6rem;padding:.85rem 1rem!important;border:1px solid #00c8f5!important;border-radius:8px!important;background:#00c8f5!important;color:#061117!important;font-size:.84rem!important;font-weight:800!important;letter-spacing:.01em;box-shadow:0 5px 16px rgba(0,200,245,.16);cursor:pointer}.scan-clock-in:hover:not(:disabled){background:#48dcff!important;border-color:#48dcff!important;transform:translateY(-1px)}.scan-clock-in:disabled{opacity:.65;cursor:wait;box-shadow:none}.scan-deny-entry{width:100%;margin-top:.65rem;border-color:#a34b4b;color:#ffaaaa}.scan-denied{padding:.85rem;border-radius:7px;background:#2b1515;color:#ffaaaa;font-weight:800}.scan-clocked-in{padding:.85rem;border-radius:7px;background:#10251b;color:#8de0ad;font-weight:800}.scan-result h3{font-size:1rem;margin:.45rem 0}.scan-result p{font-size:.75rem;color:#aab4be}.scan-accepted{border-color:#2d8052;background:#10251b}.scan-already_redeemed,.scan-cancelled,.scan-refunded,.scan-unpaid,.scan-wrong_performance{border-color:#805b2d;background:#251c10}.booking-lookup-panel{background:#111419;border:1px solid #282e36;border-radius:10px;padding:1.2rem}
        .booking-search-form label{display:block;color:#cbd1d9;font-size:.72rem;margin-bottom:.5rem}
        .booking-search-row{display:flex;gap:.65rem;max-width:720px}
        .booking-search-row input{flex:1;min-width:0;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.8rem .9rem;color:#f4f5f7;font:inherit;font-size:.8rem}
        .booking-search-row button{border:0;border-radius:7px;background:#f5e900;color:#090909;font-weight:800;padding:.75rem 1.2rem;cursor:pointer}
        .booking-search-row button:disabled{opacity:.6;cursor:wait}
        .booking-message{color:#f2c66d;font-size:.78rem;margin:1rem 0 0}
        .booking-result{margin-top:1.3rem;border-top:1px solid #2b3038;padding-top:1.2rem}
        .booking-result-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem}
        .result-label,.booking-facts small{color:#7f8996;font-size:.6rem;letter-spacing:.12em;font-weight:800}
        .booking-result-heading h3{font-size:1.25rem;margin:.35rem 0}
        .booking-status,.ticket-status{display:inline-block;border-radius:99px;padding:.4rem .65rem;font-size:.65rem;text-transform:capitalize;background:#252b33;color:#dce2e9}
        .status-confirmed,.ticket-issued{background:#123323;color:#8de0ad}.status-pending_payment,.ticket-redeemed{background:#382d13;color:#f2d27b}.status-refunded,.ticket-refunded,.ticket-cancelled,.status-cancelled{background:#30252a;color:#e4a5b1}
        .booking-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin:1rem 0;padding:1rem;background:#0c0f13;border:1px solid #252b33;border-radius:8px}
        .booking-facts strong,.booking-facts span{display:block;margin-top:.35rem;font-size:.78rem}.booking-facts span{color:#9aa4af;font-size:.7rem;overflow-wrap:anywhere}
        .result-subsection{margin-top:1.2rem}.result-subsection h4{font-size:.78rem;margin:0 0 .6rem}
        .ticket-result,.payment-result{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.75rem 0;border-top:1px solid #252b33}
        .ticket-result strong,.ticket-result span,.ticket-result small{display:block}.ticket-result strong{font-size:.75rem}.ticket-result div>span,.ticket-result small,.result-muted{font-size:.68rem;color:#929ba6;margin-top:.25rem}.payment-result{font-size:.72rem;color:#aeb7c1}.payment-result strong{color:#f4f5f7}
        .staff-error{background:#2a1517;border:1px solid #713237;color:#ffc0c4;padding:.8rem;border-radius:8px;margin-bottom:1rem}
        .staff-loading{min-height:100vh;min-height:100svh;width:100%;display:grid;place-items:center;text-align:center;padding:2rem;background:#080808;color:#aaa;font-size:.9rem;letter-spacing:.02em}
        @media(max-width:1150px){.overview-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.work-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.staff-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.scan-ticket-facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}.scan-ticket-facts>div{padding:.7rem}.scan-ticket-facts strong{font-size:.76rem}.staff-sidebar{position:relative;z-index:50}.staff-menu-toggle{display:flex;align-items:center;justify-content:center;width:42px;height:42px;margin:0 0 0 auto;padding:0;border:0;background:transparent;border-radius:8px;color:#e8edf2}.staff-menu-toggle:hover{background:#19252c}.staff-menu-toggle:focus-visible{outline:2px solid #62d7f5;outline-offset:2px}.staff-menu-toggle.is-open .staff-menu-icon i:first-child{transform:translateY(6px) rotate(45deg)}.staff-menu-toggle.is-open .staff-menu-icon i:nth-child(2){opacity:0}.staff-menu-toggle.is-open .staff-menu-icon i:last-child{transform:translateY(-6px) rotate(-45deg)}.staff-nav-links{display:none;position:absolute;top:calc(100% - .1rem);left:0;right:0;z-index:60;max-height:calc(100svh - 110px);overflow-y:auto;padding:.75rem 1rem 1rem;border:1px solid #252a31;border-top:0;border-radius:0 0 10px 10px;background:#0e1013;box-shadow:0 18px 32px rgba(0,0,0,.55)}.staff-nav-links.is-open{display:flex}.staff-nav-links .staff-nav-item{display:flex;width:100%;margin:.08rem 0;padding:.72rem .75rem}.staff-nav-links .staff-nav-label{display:block}.scan-ticket-facts{grid-template-columns:1fr}.overview-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-panel-heading{align-items:flex-start}.overview-performance-main{align-items:flex-start;flex-direction:column;gap:.35rem}.overview-booking{align-items:flex-start}.overview-booking-right{align-items:flex-end}.cash-sale-two-col{grid-template-columns:1fr}.booking-search-row{flex-direction:column}.booking-facts{grid-template-columns:1fr}.staff-workspace{grid-template-columns:1fr;grid-auto-rows:max-content;align-content:start}.staff-sidebar{position:static;height:auto!important;min-height:0!important;align-self:start;padding:1rem 1rem .55rem}.staff-brand{padding-bottom:1rem}.staff-nav-label,.staff-sidebar-bottom{display:none}.staff-sidebar{display:block;position:relative!important;z-index:100}.staff-nav-links{top:100%;left:0;right:0;z-index:110}.staff-nav-links .staff-nav-item{display:flex;margin:.08rem 0;padding:.72rem .75rem}.staff-main{padding:1.3rem 1rem}.staff-welcome{padding:1.3rem}.welcome-mark{font-size:5rem;padding:0}.work-grid{grid-template-columns:1fr}.staff-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
    </div>
  );
}
