'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Category = { id: string; name: string; price: number; remaining: number };
type Performance = { id: string; starts_at: string; venue_name: string; venue_address: string | null; production_title: string; production_slug: string; description: string | null; poster_url: string | null; categories: Category[] };
type Attendee = { full_name: string; birth_date: string };

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const dateTime = (value: string) => new Date(value).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' });

export default function BookTicketsPage() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [selectedPerformance, setSelectedPerformance] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [attendees, setAttendees] = useState<Attendee[]>([{ full_name: '', birth_date: '' }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.functions.invoke('public-ticket-catalog', { body: {} });
        if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Ticket availability is temporarily unavailable.');
        if (active) {
          const rows = (data.performances || []) as Performance[];
          setPerformances(rows);
          if (rows[0]) {
            setSelectedPerformance(rows[0].id);
            const first = rows[0].categories?.[0];
            if (first) setSelectedCategory(first.id);
          }
        }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : 'Unable to load performances right now.');
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  const performance = performances.find(item => item.id === selectedPerformance);
  const categories = performance?.categories || [];
  const category = categories.find(item => item.id === selectedCategory);
  const maxQuantity = Math.max(1, Math.min(10, category?.remaining || 1));
  const subtotal = (category?.price || 0) * quantity;

  useEffect(() => {
    setQuantity(current => Math.min(current, maxQuantity));
    setAttendees(current => Array.from({ length: quantity }, (_, index) => current[index] || { full_name: '', birth_date: '' }));
  }, [quantity, maxQuantity]);

  const canSubmit = useMemo(() => !!performance && !!category && quantity > 0 && quantity <= category.remaining && purchaserName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(purchaserEmail) && attendees.length === quantity && attendees.every(person => person.full_name.trim().length > 1 && !!person.birth_date), [performance, category, quantity, purchaserName, purchaserEmail, attendees]);

  async function startCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('public-ticket-checkout', {
        body: {
          performance_id: selectedPerformance,
          ticket_category_id: selectedCategory,
          quantity,
          purchaser_name: purchaserName.trim(),
          purchaser_email: purchaserEmail.trim(),
          attendees: attendees.map(person => ({ full_name: person.full_name.trim(), birth_date: person.birth_date })),
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Checkout could not be started. Please try again.');
      if (!data.checkout_url) throw new Error('Checkout link was not returned. Please contact Artist Playground.');
      window.location.assign(data.checkout_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start checkout. Please try again.');
    } finally { setSubmitting(false); }
  }

  return <div className="ap-page ap-page-book">
    <section className="booking-wrap">
      {loading ? <div className="empty"><h2>Loading available performances…</h2><p>Checking current schedules and ticket availability.</p></div> : performances.length === 0 ? <div className="empty"><h2>Tickets are not on sale yet.</h2><p>There are no published performances with available ticket categories right now. Please check again soon or follow Artist Playground on social media for announcements.</p></div> : !showBookingForm ? <div className="booking-list">
        <div className="booking-show-grid">
          {performances.map(item => {
            const available = item.categories.filter(cat => cat.remaining > 0);
            const startingPrice = available.length ? Math.min(...available.map(cat => cat.price)) : null;
            return <article className="booking-show-card" key={item.id}>
              {item.poster_url && <img className="booking-show-poster" src={item.poster_url} alt={item.production_title} />}
              <div className="booking-show-content">
                <p className="eyebrow">UPCOMING PERFORMANCE</p>
                <h2>{item.production_title}</h2>
                <p className="booking-show-date">{dateTime(item.starts_at)}</p>
                <p className="booking-show-venue">{item.venue_name}{item.venue_address ? ' · ' + item.venue_address : ''}</p>
                {item.description && <p className="booking-show-description">{item.description}</p>}
                <div className="booking-show-bottom">
                  <div><span>Tickets from</span><strong>{startingPrice === null ? 'Sold out' : money(startingPrice)}</strong></div>
                  <button type="button" disabled={startingPrice === null} onClick={() => { setSelectedPerformance(item.id); setSelectedCategory(available[0]?.id || ''); setQuantity(1); setShowBookingForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Book Tickets</button>
                </div>
              </div>
            </article>;
          })}
        </div>
      </div> : <div className="booking-grid">
        <div className="booking-form">
          <button className="booking-back" type="button" onClick={() => setShowBookingForm(false)} aria-label="Back to shows" title="Back to shows">←</button>
          <form id="booking-details-form" onSubmit={startCheckout}>
          <div className="step"><span>01</span><div><h2>Choose a performance</h2><p>Select the show date you want to attend.</p></div></div>
          <label htmlFor="performance">Performance</label>
          <select id="performance" value={selectedPerformance} onChange={event => { const next = performances.find(item => item.id === event.target.value); setSelectedPerformance(event.target.value); setSelectedCategory(next?.categories?.[0]?.id || ''); setQuantity(1); }}>
            {performances.map(item => <option value={item.id} key={item.id}>{item.production_title} · {dateTime(item.starts_at)}</option>)}
          </select>
          {performance && <div className="performance-info"><strong>{performance.production_title}</strong><span>{dateTime(performance.starts_at)}</span><span>{performance.venue_name}{performance.venue_address ? ' · ' + performance.venue_address : ''}</span>{performance.description && <p>{performance.description}</p>}</div>}
          <div className="step"><span>02</span><div><h2>Select tickets</h2><p>Ticket availability updates as bookings are confirmed.</p></div></div>
          <label htmlFor="category">Ticket category</label>
          <select id="category" value={selectedCategory} onChange={event => { setSelectedCategory(event.target.value); setQuantity(1); }}>
            {categories.map(item => <option key={item.id} value={item.id} disabled={item.remaining < 1}>{item.name} · {money(item.price)} · {item.remaining} left</option>)}
          </select>
          <div className="step"><span>03</span><div><h2>Purchaser details</h2><p>Your booking confirmation and all tickets will be sent to this email.</p></div></div>
          <label htmlFor="purchaser">Full name</label>
          <input id="purchaser" autoComplete="name" value={purchaserName} onChange={event => setPurchaserName(event.target.value)} required minLength={2} />
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={purchaserEmail} onChange={event => setPurchaserEmail(event.target.value)} required />
          <div className="step"><span>04</span><div><h2>Attendee details</h2><p>Enter each ticket holder’s name and birthday.</p></div></div>
          {attendees.map((person, index) => <div className="attendee" key={index}>
            <h3>Ticket {index + 1}</h3>
            <label htmlFor={'attendee-name-' + index}>Attendee full name</label>
            <input id={'attendee-name-' + index} value={person.full_name} onChange={event => setAttendees(current => current.map((item, i) => i === index ? { ...item, full_name: event.target.value } : item))} required minLength={2} />
            <label htmlFor={'attendee-birthday-' + index}>Birthday</label>
            <input id={'attendee-birthday-' + index} type="date" max={new Date().toISOString().slice(0, 10)} value={person.birth_date} onChange={event => setAttendees(current => current.map((item, i) => i === index ? { ...item, birth_date: event.target.value } : item))} required />
          </div>
            {index === 0 && <>
              <label>Number of tickets</label>
              <div className="ticket-quantity" role="group" aria-label="Number of tickets">
                <button type="button" className="quantity-button" aria-label="Decrease tickets" onClick={() => setQuantity(current => Math.max(1, current - 1))} disabled={quantity <= 1}>−</button>
                <output className="quantity-value" aria-live="polite">{quantity} {quantity === 1 ? 'ticket' : 'tickets'}</output>
                <button type="button" className="quantity-button" aria-label="Increase tickets" onClick={() => setQuantity(current => Math.min(maxQuantity, current + 1))} disabled={quantity >= maxQuantity}>＋</button>
              </div>
            </>}
          </div>)}
          {message && <p className="message" role="alert">
          </form>
        </div>
        <aside className="order-summary"><p className="eyebrow">YOUR ORDER</p><h2>Booking summary</h2><div className="summary-line"><span>Tickets</span><strong>{quantity}</strong></div><div className="summary-line"><span>Category</span><strong>{category?.name || '—'}</strong></div><div className="summary-line"><span>Price each</span><strong>{money(category?.price || 0)}</strong></div><div className="summary-total"><span>Ticket subtotal</span><strong>{money(subtotal)}</strong></div><p>Review your order, then continue to secure payment.</p><button className="checkout" type="submit" form="booking-details-form" disabled={!canSubmit || submitting}>{submitting ? 'Preparing secure checkout…' : 'Continue to payment · ' + money(subtotal)}</button><p className="fine-print">Your tickets are issued only after payment is verified. Any payment method fees are shown by the payment provider before confirmation.</p></aside>
      </div>}
    </section>
    <style jsx>{`
      .ticket-quantity{display:flex;align-items:center;gap:.7rem;width:max-content;min-width:210px;padding:.35rem;background:#090a0c;border:1px solid #3a3a3a;border-radius:10px}
      .quantity-button{display:grid;place-items:center;width:42px;height:42px;border:1px solid #3a3a3a;border-radius:8px;background:#17191d;color:#fff;font-size:1.35rem;line-height:1;cursor:pointer;transition:background .15s,border-color .15s}
      .quantity-button:hover:not(:disabled){background:#263039;border-color:#00bce8}
      .quantity-button:disabled{opacity:.35;cursor:not-allowed}
      .quantity-value{flex:1;min-width:82px;text-align:center;color:#fff;font-size:.9rem;font-weight:700;font-variant-numeric:tabular-nums}
      .booking-list{max-width:1120px;margin:0 auto;padding:2rem 1.25rem 4rem}
      .booking-list-heading{margin-bottom:1.5rem}.booking-list-heading h1{font-size:2rem;margin:.35rem 0}.booking-list-heading>p:last-child{color:#9aa4b2;font-size:.9rem}
      .booking-show-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1.1rem}
      .booking-show-card{overflow:hidden;border:1px solid #292929;border-radius:14px;background:#111}
      .booking-show-poster{width:100%;height:230px;object-fit:cover;display:block}
      .booking-show-content{padding:1.2rem}.booking-show-content h2{font-size:1.25rem;margin:.35rem 0 .7rem}
      .booking-show-date,.booking-show-venue{font-size:.86rem;color:#d4d4d4;margin:.35rem 0}
      .booking-show-description{font-size:.82rem;color:#929292;line-height:1.55;margin-top:.8rem}
      .booking-show-bottom{display:flex;justify-content:space-between;align-items:center;gap:1rem;border-top:1px solid #2b2b2b;margin-top:1.1rem;padding-top:1rem}
      .booking-show-bottom div{display:grid;gap:.25rem}.booking-show-bottom span{font-size:.7rem;color:#9b9b9b}.booking-show-bottom strong{font-size:1.1rem;color:#fff000}
      .booking-show-bottom button,.booking-back{background:#fff000;color:#080808;border:0;border-radius:8px;padding:.75rem 1rem;font-weight:800;cursor:pointer}
      .booking-show-bottom button:disabled{opacity:.45;cursor:not-allowed}.booking-back{margin-bottom:1rem;background:transparent;color:#fff;border:1px solid #444}
      @media(max-width:600px){.booking-list{padding:1.2rem .9rem 3rem}.booking-show-poster{height:190px}}
    `}</style>
  </div>;



}
