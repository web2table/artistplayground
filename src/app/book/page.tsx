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
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchaserName, setPurchaserName] = useState('');
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [attendees, setAttendees] = useState<Attendee[]>([{ full_name: '', birth_date: '' }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  useEffect(() => {
    if (!paymentNotice) return;
    const timeout = window.setTimeout(() => setPaymentNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [paymentNotice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'return') setPaymentNotice('Payment submitted. We are verifying it securely. Your tickets will be emailed after confirmation.');
    if (payment === 'cancelled') setPaymentNotice('Checkout was cancelled. No tickets have been issued. You can try again whenever you are ready.');
    if (payment) { params.delete('payment'); params.delete('reference'); const query = params.toString(); window.history.replaceState({}, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash); }
  }, []);

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
      {paymentNotice && <div className="payment-toast" role="status" aria-live="polite">{paymentNotice}</div>}
      {loading ? <div className="empty"><h2>Loading available performances…</h2><p>Checking current schedules and ticket availability.</p></div> : performances.length === 0 ? <div className="empty"><h2>Tickets are not on sale yet.</h2><p>There are no published performances with available ticket categories right now. Please check again soon or follow Artist Playground on social media for announcements.</p></div> : !showBookingForm ? <div className="booking-list">
        <div className="booking-show-grid">
          {performances.map(item => {
            const available = item.categories.filter(cat => cat.remaining > 0);
            const startingPrice = available.length ? Math.min(...available.map(cat => cat.price)) : null;
            return <article className="booking-show-card" key={item.id}>
              {item.poster_url ? <img className="booking-show-poster" src={item.poster_url} alt={item.production_title + ' poster'} /> : <div className="booking-show-poster booking-show-poster-placeholder" aria-label="No production poster uploaded"><span>ARTIST<br/>PLAYGROUND</span></div>}
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
          {performance && <div className="selected-show-summary">
            <div className="selected-show-topline"><span className="selected-show-mark">AP</span><span className="selected-show-label">YOUR SELECTED PERFORMANCE</span><span className="selected-show-live">LIVE SHOW</span></div>
            <h2>{performance.production_title}</h2>
            <div className="selected-show-details">
              <div className="selected-show-detail"><span className="selected-show-icon" aria-hidden="true">◷</span><div><small>DATE &amp; TIME</small><p>{dateTime(performance.starts_at)}</p></div></div>
              <div className="selected-show-detail"><span className="selected-show-icon" aria-hidden="true">⌖</span><div><small>VENUE</small><p>{performance.venue_name}{performance.venue_address ? ' · ' + performance.venue_address : ''}</p></div></div>
            </div>
          </div>}
          <div className="step"><span>01</span><div><h2>Select tickets</h2><p>Ticket availability updates as bookings are confirmed.</p></div></div>
          <label id="category-label">Ticket category</label>
          <div className="category-picker" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCategoryMenuOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setCategoryMenuOpen(false); }}>
            <button type="button" className={`category-picker-trigger ${categoryMenuOpen ? 'is-open' : ''}`} aria-labelledby="category-label" aria-haspopup="listbox" aria-expanded={categoryMenuOpen} onClick={() => setCategoryMenuOpen(open => !open)}>
              <span>{category ? `${category.name} · ${money(category.price)} · ${category.remaining} left` : 'Choose a ticket category'}</span>
              <span className="category-picker-chevron" aria-hidden="true">⌄</span>
            </button>
            {categoryMenuOpen && <div className="category-picker-options" role="listbox" aria-labelledby="category-label">
              {categories.map(item => <button type="button" role="option" aria-selected={item.id === selectedCategory} key={item.id} disabled={item.remaining < 1} className={`category-picker-option ${item.id === selectedCategory ? 'is-selected' : ''}`} onClick={() => { setSelectedCategory(item.id); setQuantity(1); setCategoryMenuOpen(false); }}>
                <span>{item.name}</span><span>{money(item.price)}</span><small>{item.remaining} left</small>
              </button>)}
            </div>}
          </div>
          <div className="step"><span>02</span><div><h2>Purchaser details</h2><p>Your booking confirmation and all tickets will be sent to this email.</p></div></div>
          <label htmlFor="purchaser">Full name</label>
          <input id="purchaser" autoComplete="name" value={purchaserName} onChange={event => setPurchaserName(event.target.value)} required minLength={2} />
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={purchaserEmail} onChange={event => setPurchaserEmail(event.target.value)} required />
          <div className="step"><span>03</span><div><h2>Attendee details</h2><p>Enter each ticket holder’s name and birthday.</p></div></div>
          {attendees.map((person, index) => <div className="attendee" key={index}>
            <div className="attendee-heading">
              <h3>Ticket {index + 1}</h3>
              {index > 0 && <button type="button" className="remove-ticket" aria-label={'Remove ticket ' + (index + 1)} onClick={() => { setAttendees(current => current.filter((_, i) => i !== index)); setQuantity(current => Math.max(1, current - 1)); }}>Remove</button>}
            </div>
            <label htmlFor={'attendee-name-' + index}>Attendee full name</label>
            <input id={'attendee-name-' + index} value={person.full_name} onChange={event => setAttendees(current => current.map((item, i) => i === index ? { ...item, full_name: event.target.value } : item))} required minLength={2} />
            <label htmlFor={'attendee-birthday-' + index}>Birthday</label>
            <input id={'attendee-birthday-' + index} type="date" max={new Date().toISOString().slice(0, 10)} value={person.birth_date} onChange={event => setAttendees(current => current.map((item, i) => i === index ? { ...item, birth_date: event.target.value } : item))} required />
          </div>)}
          <div className="add-ticket-row">
            <button type="button" className="add-ticket" onClick={() => setQuantity(current => Math.min(maxQuantity, current + 1))} disabled={quantity >= maxQuantity}>
              <span aria-hidden="true">＋</span> Add another ticket
            </button>
            <span className="ticket-count">{quantity} of {maxQuantity} tickets selected</span>
          </div>
          {message && <p className="message" role="alert">{message}</p>}
          </form>
        </div>
        <aside className="order-summary"><p className="eyebrow">YOUR ORDER</p><h2>Booking summary</h2><div className="summary-line"><span>Tickets</span><strong>{quantity}</strong></div><div className="summary-line"><span>Category</span><strong>{category?.name || '—'}</strong></div><div className="summary-line"><span>Price each</span><strong>{money(category?.price || 0)}</strong></div><div className="summary-total"><span>Ticket subtotal</span><strong>{money(subtotal)}</strong></div><p>Review your order, then continue to secure payment.</p><button className="checkout" type="submit" form="booking-details-form" disabled={!canSubmit || submitting}>{submitting ? 'Preparing secure checkout…' : 'Continue to payment · ' + money(subtotal)}</button><p className="fine-print">Your tickets are issued only after payment is verified. Any payment method fees are shown by the payment provider before confirmation.</p></aside>
      </div>}
    </section>
    <style jsx>{`
      .payment-toast{position:fixed;z-index:1000;top:1.25rem;left:50%;transform:translateX(-50%);width:min(calc(100% - 2rem),520px);padding:1rem 1.15rem;border:1px solid #3d4650;border-left:3px solid #00c8f5;border-radius:10px;background:rgba(12,15,19,.97);box-shadow:0 14px 38px rgba(0,0,0,.38);color:#f5e900;font-size:.82rem;line-height:1.5;animation:payment-toast-in .2s ease-out}
      @keyframes payment-toast-in{from{opacity:0;translate:0 -8px}to{opacity:1;translate:0 0}}
      @media(prefers-reduced-motion:reduce){.payment-toast{animation:none}}
      .category-picker{position:relative;width:100%;z-index:20}
      .category-picker-trigger{display:flex;align-items:center;justify-content:space-between;gap:.8rem;width:100%;min-height:48px;padding:.8rem .9rem;border:1px solid #39434e;border-radius:9px;background:#11161c;color:#f2f6f8;text-align:left;font:inherit;font-size:.88rem;cursor:pointer}
      .category-picker-trigger:hover,.category-picker-trigger.is-open{border-color:#00c8f5;box-shadow:0 0 0 2px rgba(0,200,245,.1)}
      .category-picker-trigger>span:first-child{min-width:0;overflow-wrap:anywhere}
      .category-picker-chevron{flex:0 0 auto;color:#62d7f5;font-size:1.15rem;transition:transform .15s}.category-picker-trigger.is-open .category-picker-chevron{transform:rotate(180deg)}
      .category-picker-options{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:100;max-height:240px;overflow-y:auto;padding:.35rem;border:1px solid #39434e;border-radius:9px;background:#10151b;box-shadow:0 14px 30px rgba(0,0,0,.55)}
      .category-picker-option{display:flex;align-items:center;gap:.55rem;width:100%;padding:.75rem .7rem;border:0;border-radius:6px;background:transparent;color:#eef3f6;text-align:left;font:inherit;font-size:.82rem;cursor:pointer}
      .category-picker-option:hover,.category-picker-option:focus-visible{outline:none;background:#1b303a}
      .category-picker-option.is-selected{background:#12313b;color:#70e2ff}
      .category-picker-option>span:first-child{font-weight:700}.category-picker-option>span:nth-child(2){margin-left:auto;white-space:nowrap;color:#f5e900}.category-picker-option small{color:#a2adb7;white-space:nowrap}
      .category-picker-option:disabled{opacity:.4;cursor:not-allowed}
      .selected-show-summary{margin:0 0 1.5rem;padding:1.2rem 1.25rem 1.1rem;border:1px solid #303030;border-left:3px solid #fff000;border-radius:10px;background:#080808;box-shadow:0 8px 24px rgba(0,0,0,.18)}
      .selected-show-topline{display:flex;align-items:center;gap:.65rem;margin-bottom:.85rem}
      .selected-show-mark{display:grid;place-items:center;width:30px;height:30px;border:1px solid #00bce8;border-radius:7px;color:#00c8f5;font-size:.65rem;font-weight:900;letter-spacing:-.04em}
      .selected-show-label{color:#00c8f5;font-size:.65rem;font-weight:900;letter-spacing:.16em}
      .selected-show-live{margin-left:auto;padding:.28rem .5rem;border:1px solid #5b5600;border-radius:4px;color:#fff080;font-size:.57rem;font-weight:800;letter-spacing:.1em;white-space:nowrap}
      .selected-show-summary h2{margin:0 0 1rem;color:#fff;font-size:clamp(1.2rem,2vw,1.45rem);font-weight:850;letter-spacing:-.035em;line-height:1.2}
      .selected-show-details{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid #292929;padding-top:.85rem}
      .selected-show-detail{display:flex;align-items:center;gap:.65rem;min-width:0;padding:.2rem .8rem .2rem 0}
      .selected-show-detail+.selected-show-detail{padding-left:.9rem;border-left:1px solid #292929}
      .selected-show-icon{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border:1px solid #17414b;border-radius:7px;color:#00c8f5;font-size:1.05rem}
      .selected-show-detail small{display:block;margin-bottom:.2rem;color:#858585;font-size:.57rem;font-weight:800;letter-spacing:.12em}
      .selected-show-detail p{margin:0;color:#dedede;font-size:.76rem;line-height:1.45;overflow-wrap:anywhere}
      @media(max-width:600px){.selected-show-summary{padding:1rem}.selected-show-details{grid-template-columns:1fr;gap:.7rem}.selected-show-detail{padding:.1rem 0}.selected-show-detail+.selected-show-detail{padding: .7rem 0 0;border-left:0;border-top:1px solid #292929}.selected-show-live{font-size:.53rem}.selected-show-label{font-size:.58rem}}
      .attendee-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem}
      .attendee-heading h3{margin:0}
      .attendee-heading .remove-ticket{margin:0;flex:0 0 auto}
      .add-ticket-row{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap;margin:1rem 0 1.25rem}
      .add-ticket,.remove-ticket{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border:1px solid #3b4650;border-radius:8px;background:#141a20;color:#eaf8fc;padding:.7rem .95rem;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer}
      .add-ticket{border-color:#087b99;color:#68dafa}
      .add-ticket:hover:not(:disabled){background:#102832;border-color:#00bce8}
      .add-ticket:disabled{opacity:.4;cursor:not-allowed}
      .remove-ticket{margin-top:.85rem;background:transparent;border-color:#684047;color:#f0aab2;padding:.5rem .7rem}
      .remove-ticket:hover{background:#2a171b}
      .ticket-count{font-size:.72rem;color:#929ba6}
      .ticket-quantity{display:flex;align-items:center;gap:.7rem;width:max-content;min-width:210px;padding:.35rem;background:#090a0c;border:1px solid #3a3a3a;border-radius:10px}
      .quantity-button{display:grid;place-items:center;width:42px;height:42px;border:1px solid #3a3a3a;border-radius:8px;background:#17191d;color:#fff;font-size:1.35rem;line-height:1;cursor:pointer;transition:background .15s,border-color .15s}
      .quantity-button:hover:not(:disabled){background:#263039;border-color:#00bce8}
      .quantity-button:disabled{opacity:.35;cursor:not-allowed}
      .quantity-value{flex:1;min-width:82px;text-align:center;color:#fff;font-size:.9rem;font-weight:700;font-variant-numeric:tabular-nums}
      .booking-list{max-width:1120px;margin:0 auto;padding:2rem 1.25rem 4rem}
      .booking-list-heading{margin-bottom:1.5rem}.booking-list-heading h1{font-size:2rem;margin:.35rem 0}.booking-list-heading>p:last-child{color:#9aa4b2;font-size:.9rem}
      .booking-show-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1.1rem}
      .booking-show-card{display:flex;align-items:stretch;overflow:hidden;border:1px solid #292929;border-radius:14px;background:#111;min-height:260px}
      .booking-show-poster{flex:0 0 220px;width:220px;height:auto;min-height:260px;object-fit:contain;display:block;background:#080808}
      .booking-show-poster-placeholder{display:grid;place-items:center;color:#00c8f5;text-align:center;font-size:.9rem;font-weight:900;letter-spacing:.16em;line-height:1.5;background:linear-gradient(145deg,#191919,#050505)}
      .booking-show-content{display:flex;flex:1;min-width:0;flex-direction:column;justify-content:center;padding:1.2rem}
      .booking-show-bottom{margin-top:auto}
      .booking-show-content{padding:1.2rem}.booking-show-content h2{font-size:1.25rem;margin:.35rem 0 .7rem}
      .booking-show-date,.booking-show-venue{font-size:.86rem;color:#d4d4d4;margin:.35rem 0}
      .booking-show-description{font-size:.82rem;color:#929292;line-height:1.55;margin-top:.8rem}
      .booking-show-bottom{display:flex;justify-content:space-between;align-items:center;gap:1rem;border-top:1px solid #2b2b2b;margin-top:1.1rem;padding-top:1rem}
      .booking-show-bottom div{display:grid;gap:.25rem}.booking-show-bottom span{font-size:.7rem;color:#9b9b9b}.booking-show-bottom strong{font-size:1.1rem;color:#fff000}
      .booking-show-bottom button,.booking-back{background:#fff000;color:#080808;border:0;border-radius:8px;padding:.75rem 1rem;font-weight:800;cursor:pointer}
      .booking-show-bottom button:disabled{opacity:.45;cursor:not-allowed}.booking-back{margin-bottom:1rem;background:transparent;color:#fff;border:1px solid #444}
      @media(max-width:600px){.booking-list{padding:1.2rem .9rem 3rem}.booking-show-card{flex-direction:column}.booking-show-poster{flex:0 0 auto;width:100%;height:260px;min-height:260px;object-fit:contain}.booking-show-content{padding:1rem}}
    `}</style>
  </div>;



}
