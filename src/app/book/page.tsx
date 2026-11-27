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

  return <div className="ap-page ap-page-book">
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
    
  </div>;
}
