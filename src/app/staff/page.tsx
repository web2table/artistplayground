'use client';

import { useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type StaffProfile = { display_name: string; role: 'staff' | 'system_admin'; active: boolean };
type BoxOfficePerformance = { id: string; starts_at: string; venue_name: string; production_title: string; categories: { id: string; name: string; price: number; remaining: number }[] };
type SaleAttendee = { full_name: string; birth_date: string };
type BookingLookup = {
  booking: { booking_reference: string; purchaser_name: string; purchaser_email: string; status: string; currency: string; subtotal: number; total_amount: number; created_at: string; confirmed_at: string | null };
  tickets: { ticket_reference: string; status: string; attendee_name: string; category: string; performance: { starts_at: string; venue_name: string; status: string } | null }[];
  payments: { method: string; status: string; amount: number; currency: string; provider_reference: string | null; created_at: string }[];
};



export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.replace(appPath('/staff/login/')); return; }
        const { data, error: profileError } = await supabase.from('staff_profiles')
          .select('display_name, role, active').eq('user_id', user.id).maybeSingle();
        if (profileError || !data?.active || !['staff', 'system_admin'].includes(data.role)) {
          await supabase.auth.signOut();
          window.location.replace(appPath('/staff/login/?error=unauthorized'));
          return;
        }
        if (active) {
          setProfile(data as StaffProfile);
          if (data.role === 'system_admin') window.location.replace(appPath('/admin/'));
        }
      } catch {
        if (active) setError('Unable to verify your staff session. Please sign in again.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

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

  if (loading) return <main className="staff-loading">Loading staff workspace…</main>;

  return (
    <div className="staff-workspace">
      <aside className="staff-sidebar">
        <a className="staff-brand" href={appPath('/')} aria-label="Artist Playground home"><span className="brand-symbol">AP</span><span>ARTIST PLAYGROUND<small>STAFF WORKSPACE</small></span></a>
        <div className="staff-nav-label">WORKSPACE</div>
        <a className="staff-nav-item selected" href="#overview"><span>⌂</span> Overview</a>
        <div className="staff-nav-label">OPERATIONS</div>
        <a className="staff-nav-item" href="#sales"><span>₱</span> Daily sales</a>
        <a className="staff-nav-item" href="#bookings"><span>▤</span> Bookings</a>
        <a className="staff-nav-item" href="#payments"><span>▣</span> Payment desk</a>
        <a className="staff-nav-item" href="#refunds"><span>↺</span> Refunds</a>
        <a className="staff-nav-item" href="#scanner"><span>▦</span> Ticket scanner</a>
        <div className="staff-nav-label">INSIGHTS</div>
        <a className="staff-nav-item" href="#reports"><span>▥</span> Reports</a>
        <div className="staff-sidebar-bottom"><div className="staff-user"><span className="staff-avatar">{(profile?.display_name || 'S').slice(0,1).toUpperCase()}</span><span>{profile?.display_name || 'Staff member'}<small>Staff account</small></span></div><button type="button" onClick={signOut}>Sign out</button></div>
      </aside>

      <main className="staff-main" id="overview">
        <header className="staff-topbar"><div><p className="staff-eyebrow">STAFF WORKSPACE</p><h1>Good day{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}.</h1><p className="staff-muted">Your operations desk for Artist Playground.</p></div><div className="staff-date">{today}</div></header>
        {error && <div className="staff-error" role="alert">{error}</div>}

        <section className="staff-welcome"><div><span className="welcome-label">ARTIST PLAYGROUND · OPERATIONS</span><h2>Everything you need for<br/>a smooth show day.</h2><p>Manage bookings, payments, admissions, and daily activity from one workspace.</p></div><div className="welcome-mark" aria-hidden="true">AP</div></section>

        <section className="staff-section" id="sales"><div className="section-heading"><div><h2>Today at a glance</h2><p>Live operational figures will appear here as sales and ticketing workflows are connected.</p></div><span className="live-indicator">WORKSPACE</span></div>
          <div className="staff-metrics">
            <article className="metric-card"><span>Today’s sales</span><strong>—</strong><small>Online + box office</small></article>
            <article className="metric-card"><span>Bookings</span><strong>—</strong><small>Confirmed today</small></article>
            <article className="metric-card"><span>Tickets admitted</span><strong>—</strong><small>Scanned today</small></article>
            <article className="metric-card"><span>Pending cash</span><strong>—</strong><small>Awaiting confirmation</small></article>
          </div>
        </section>

        <section className="staff-section" id="bookings">
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
              <div className="result-subsection"><h4>Payments ({bookingResult.payments.length})</h4>{bookingResult.payments.length ? <div className="payment-result-list">{bookingResult.payments.map((payment,i) => <div className="payment-result" key={payment.provider_reference || i}><span>{payment.method.toUpperCase()} · {payment.status.replaceAll('_',' ')}</span><strong>{payment.currency} {Number(payment.amount).toLocaleString('en-PH',{minimumFractionDigits:2})}</strong></div>)}</div> : <p className="result-muted">No payment records found.</p>}</div>
            </div>}
          </div>
        </section>

        <section className="staff-section" id="box-office">
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
        </section>
        <section className="staff-section" id="refunds"><div className="workflow-note"><span>↺</span><div><strong>Refund handling</strong><p>Staff will be able to review a booking and submit a refund request for approval. Approved refunds apply to the complete booking.</p></div></div></section>
        <section className="staff-section" id="scanner"><div className="workflow-note"><span>▦</span><div><strong>Admission and ticket validation</strong><p>The scanner will support QR codes and manual ticket references, with duplicate scans rejected by the backend.</p></div></div></section>
        <section className="staff-section" id="reports"><div className="workflow-note"><span>▥</span><div><strong>Operational reports</strong><p>Daily sales, payment reconciliation, and admission summaries will be available here.</p></div></div></section>
        <footer className="staff-footer">Artist Playground · Internal staff workspace</footer>
      </main>

      <style>{`
        .staff-workspace{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr);background:#090a0c;color:#f4f5f7;font-family:Inter,Arial,sans-serif}
        .staff-sidebar{position:sticky;top:0;height:100vh;min-height:620px;background:#0e1013;border-right:1px solid #252a31;padding:1.35rem 1rem;display:flex;flex-direction:column}
        .staff-brand{display:flex;align-items:center;gap:.75rem;padding:.35rem .5rem 2.3rem;color:#f2f4f6;text-decoration:none;font-size:.68rem;font-weight:800;letter-spacing:.08em}
        .staff-brand small{display:block;color:#7f8995;font-size:.6rem;letter-spacing:.13em;margin-top:.35rem}
        .brand-symbol{display:grid;place-items:center;width:39px;height:39px;border:1px solid #00a8d6;border-radius:10px;color:#f5e900;font-size:.9rem}
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
        .cash-sale-form{display:grid;gap:.55rem}.cash-sale-form label{display:block;color:#cbd1d9;font-size:.72rem;margin:.35rem 0 .1rem}.cash-sale-form input,.cash-sale-form select{width:100%;min-width:0;background:#090c10;border:1px solid #39414b;border-radius:7px;padding:.75rem .8rem;color:#f4f5f7;font:inherit;font-size:.78rem}.cash-sale-two-col{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.cash-sale-two-col>div{min-width:0}.attendee-heading{display:flex;align-items:center;justify-content:space-between;margin-top:.5rem}.attendee-heading strong{font-size:.8rem}.attendee-row{position:relative;padding:.7rem;background:#0c0f13;border:1px solid #252b33;border-radius:8px}.remove-attendee{align-self:end;background:transparent;border:0;color:#f19aa4;font-size:.68rem;cursor:pointer;padding:.6rem}.cash-sale-total{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #2b3038;padding-top:1rem;margin-top:.5rem}.cash-sale-total span{color:#aeb7c1;font-size:.8rem}.cash-sale-total strong{font-size:1.2rem}.sale-receipt{margin-top:1rem;padding:1rem;border:1px solid #245a3c;background:#10251b;border-radius:8px}.sale-receipt h3{font-size:1.2rem;margin:.4rem 0}.sale-receipt p{font-size:.75rem;color:#a8e8c2}.booking-lookup-panel{background:#111419;border:1px solid #282e36;border-radius:10px;padding:1.2rem}
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
        .staff-loading{min-height:55vh;display:grid;place-items:center;background:#080808;color:#aaa}
        @media(max-width:1150px){.work-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.staff-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.cash-sale-two-col{grid-template-columns:1fr}.booking-search-row{flex-direction:column}.booking-facts{grid-template-columns:1fr}.staff-workspace{grid-template-columns:1fr}.staff-sidebar{position:static;height:auto;min-height:0;padding:1rem}.staff-brand{padding-bottom:1rem}.staff-nav-label,.staff-sidebar-bottom{display:none}.staff-sidebar{display:block}.staff-nav-item{display:inline-flex;margin-right:.2rem;padding:.55rem}.staff-main{padding:1.3rem 1rem}.staff-welcome{padding:1.3rem}.welcome-mark{font-size:5rem;padding:0}.work-grid{grid-template-columns:1fr}.staff-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
    </div>
  );
}
