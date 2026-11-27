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

  return <>
    <section className="booking-wrap">
      {loading ? <div className="empty"><h2>Loading available performances…</h2><p>Checking current schedules and ticket availability.</p></div> : performances.length === 0 ? <div className="empty"><h2>Tickets are not on sale yet.</h2><p>There are no published performances with available ticket categories right now. Please check again soon or follow Artist Playground on social media for announcements.</p></div> : <div className="booking-grid">
        <form className="booking-form" onSubmit={startCheckout}>
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
          <label htmlFor="quantity">Number of tickets</label>
          <select id="quantity" value={quantity} onChange={event => setQuantity(Number(event.target.value))}>
            {Array.from({ length: maxQuantity }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} {index === 0 ? 'ticket' : 'tickets'}</option>)}
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
          </div>)}
          {message && <p className="message" role="alert">{message}</p>}
          <button className="checkout" type="submit" disabled={!canSubmit || submitting}>{submitting ? 'Preparing secure checkout…' : 'Continue to payment · ' + money(subtotal)}</button>
          <p className="fine-print">Your tickets are issued only after payment is verified. Payment method fees, if any, are shown by the payment provider before you confirm payment.</p>
        </form>
        <aside className="order-summary"><p className="eyebrow">YOUR ORDER</p><h2>Booking summary</h2><div className="summary-line"><span>Tickets</span><strong>{quantity}</strong></div><div className="summary-line"><span>Category</span><strong>{category?.name || '—'}</strong></div><div className="summary-line"><span>Price each</span><strong>{money(category?.price || 0)}</strong></div><div className="summary-total"><span>Ticket subtotal</span><strong>{money(subtotal)}</strong></div><p>Online payment is completed through the secure payment checkout. Your booking is not confirmed until payment verification succeeds.</p></aside>
      </div>}
    </section>
    <style jsx>{`
      .eyebrow{color:var(--ap-blue);letter-spacing:.16em;font-size:var(--ap-size-eyebrow);font-weight:800}
      .booking-wrap{padding:1.5rem 5vw 5rem}.booking-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,.7fr);gap:1.2rem;align-items:start;max-width:1100px;margin:auto}
      .booking-form,.order-summary{background:#101010;border:1px solid var(--ap-border);border-radius:1rem;padding:clamp(1.2rem,3vw,2rem)}
      .step{display:flex;gap:1rem;align-items:flex-start;margin:1.2rem 0 1rem}.step>span{display:grid;place-items:center;flex:0 0 2.2rem;height:2.2rem;border:1px solid var(--ap-blue);border-radius:50%;color:var(--ap-blue);font-size:.75rem;font-weight:800}.step h2{font-size:var(--ap-size-card);margin:0}.step p{color:var(--ap-muted);font-size:.82rem;margin:.3rem 0 0}
      .booking-form label{display:block;color:#d5d5d5;font-size:.8rem;margin:.85rem 0 .4rem}.booking-form input,.booking-form select{width:100%;padding:.85rem;background:#080808;border:1px solid #393939;border-radius:.5rem;color:white;font:inherit;font-size:.9rem}.performance-info{display:grid;gap:.35rem;padding:1rem;margin:1rem 0;background:#171717;border-left:3px solid var(--ap-yellow);font-size:.82rem}.performance-info span,.performance-info p{color:var(--ap-muted);margin:0;line-height:1.5}.attendee{padding:1rem;margin:1rem 0;border:1px solid #303030;border-radius:.7rem}.attendee h3{font-size:1rem;margin:0 0 .5rem}.checkout{width:100%;margin-top:1rem;padding:1rem;border:0;border-radius:.55rem;background:var(--ap-yellow);color:#080808;font-weight:800;cursor:pointer}.checkout:disabled{opacity:.45;cursor:not-allowed}.fine-print,.order-summary>p:last-child{font-size:.72rem;color:var(--ap-muted);line-height:1.6}.message{color:#ffd36a;font-size:.82rem}.order-summary{position:sticky;top:1rem}.order-summary h2{font-size:1.4rem;margin:.5rem 0 1.5rem}.summary-line,.summary-total{display:flex;justify-content:space-between;gap:1rem;padding:.8rem 0;border-bottom:1px solid #303030;font-size:.82rem}.summary-line span,.summary-total span{color:var(--ap-muted)}.summary-total{margin-top:.5rem;border:0;font-size:1rem}.summary-total strong{color:var(--ap-yellow);font-size:1.2rem}.empty{max-width:850px;margin:2rem auto;padding:3rem 1.5rem;border:1px dashed var(--ap-border);border-radius:1rem;text-align:center}.empty h2{font-size:1.4rem}.empty p{max-width:42rem;margin:auto;color:var(--ap-muted);line-height:1.7}
      @media(max-width:800px){.booking-grid{grid-template-columns:1fr}.order-summary{position:static;grid-row:1}}
    `}</style>
  </>;
}
