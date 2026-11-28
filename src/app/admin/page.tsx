'use client';

import { useCallback, useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type StaffRecord = {
  user_id: string;
  display_name: string;
  email: string;
  role: 'staff' | 'system_admin';
  active: boolean;
  email_confirmed: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

export default function AdminDashboardPage() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('success');
  const [activeSection, setActiveSection] = useState<'overview' | 'productions' | 'payments' | 'email' | 'monitoring' | 'security' | 'staff'>('overview');
  type AdminCategory = { id: string; name: string; price: number; allocation: number; reserved_count: number; sold_count: number; active: boolean };
  type AdminPerformance = { id: string; starts_at: string; venue_name: string; capacity: number; status: string; ticket_categories: AdminCategory[] };
  type AdminProduction = { id: string; slug: string; title: string; description: string | null; status: string; performances: AdminPerformance[] };
  const [productions, setProductions] = useState<AdminProduction[]>([]);
  const [productionsLoading, setProductionsLoading] = useState(false);
  const [productionsError, setProductionsError] = useState('');
  type RelatedBooking = { booking_reference?: string; purchaser_name?: string };
  type PaymentRow = { id: string; booking_id: string; method: string; provider: string; amount: number; currency: string; status: string; verified_at: string | null; failure_reason: string | null; created_at: string; bookings: RelatedBooking | null };
  type EmailRow = { id: string; booking_id: string; recipient_email: string; provider: string; attempt_number: number; status: string; error_message: string | null; sent_at: string | null; created_at: string; bookings: Pick<RelatedBooking, 'booking_reference'> | null };
  type WebhookRow = { event_id: string; event_type: string; livemode: boolean; processed_at: string };
  type AuditRow = { id: number; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string };
  type ScanRow = { id: string; scan_result: string; scanned_at: string; device_label: string | null; tickets: { ticket_reference: string; attendees: { full_name: string } | null } | null };
  type SystemSignals = { active_staff_accounts: number; pending_payments: number; failed_or_bounced_emails: number; recent_ticket_scans: number; denied_entries: number };
  const [operations, setOperations] = useState<{payments:PaymentRow[];payment_counts_recent:Record<string,number>;email_deliveries:EmailRow[];email_counts_recent:Record<string,number>;webhook_events:WebhookRow[];audit_logs:AuditRow[];ticket_scans:ScanRow[];system_signals:SystemSignals} | null>(null);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operationsError, setOperationsError] = useState('');
  const [overview, setOverview] = useState<{metrics:{active_productions:number;upcoming_performances:number;tickets_issued:number;pending_bookings:number;paid_revenue:number};upcoming:{id:string;title:string;starts_at:string;venue_name:string;remaining:number}[];recent_bookings:{booking_reference:string;purchaser_name:string;status:string;total_amount:number;currency:string;created_at:string}[]}|null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true); setOverviewError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('staff-overview', { body: {} });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unable to load overview.');
      setOverview(data);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : 'Unable to load overview.');
    } finally { setOverviewLoading(false); }
  }, []);

  const loadProductions = useCallback(async () => {
    setProductionsLoading(true); setProductionsError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('manage-productions', { body: { action: 'list' } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unable to load productions.');
      setProductions(data.productions as AdminProduction[]);
    } catch (error) {
      setProductionsError(error instanceof Error ? error.message : 'Unable to load productions.');
    } finally { setProductionsLoading(false); }
  }, []);

  const loadOperations = useCallback(async () => {
    setOperationsLoading(true); setOperationsError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('system-admin-overview', { body: {} });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unable to load system operations.');
      setOperations(data);
    } catch (error) {
      setOperationsError(error instanceof Error ? error.message : 'Unable to load system operations.');
    } finally { setOperationsLoading(false); }
  }, []);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice(message); setNoticeType(type);
  };

  const loadStaff = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'list' } });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unable to load staff accounts.');
    setStaff(data.staff as StaffRecord[]);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.replace(appPath('/staff/login/')); return; }
        const { data: profile, error } = await supabase.from('staff_profiles')
          .select('display_name, role, active').eq('user_id', user.id).maybeSingle();
        if (error || !profile?.active || profile.role !== 'system_admin') {
          await supabase.auth.signOut();
          window.location.replace(appPath('/staff/login/?error=unauthorized'));
          return;
        }
        if (active) {
          setStaffName(profile.display_name || user.email || 'System Admin');
          await Promise.all([loadStaff(), loadOverview(), loadOperations()]);
        }
      } catch (error) {
        if (active) notify(error instanceof Error ? error.message : 'Unable to load the staff workspace.', 'error');
      } finally { if (active) setLoading(false); }
    }
    void initialize();
    return () => { active = false; };
  }, [loadStaff, loadOverview, loadOperations]);

  async function inviteStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setInviteBusy(true); setNotice('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const display_name = String(form.get('display_name') ?? '').trim();
    const role = String(form.get('role') ?? 'staff');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('provision-staff', { body: { email, display_name, role } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Invitation failed.');
      notify(`Invitation sent to ${email}.`);
      (event.currentTarget as HTMLFormElement).reset();
      await loadStaff();
    } catch (error) { notify(error instanceof Error ? error.message : 'Invitation failed.', 'error'); }
    finally { setInviteBusy(false); }
  }

  async function updateStaff(member: StaffRecord, changes: { role?: string; active?: boolean }) {
    setBusyId(member.user_id); setNotice('');
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'update', user_id: member.user_id, ...changes },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Unable to update staff account.');
      notify(`${member.display_name}'s account was updated.`);
      await loadStaff();
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to update staff account.', 'error'); }
    finally { setBusyId(''); }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace(appPath('/staff/login/'));
  }

  const activeCount = staff.filter((member) => member.active).length;
  const pendingCount = staff.filter((member) => member.active && !member.email_confirmed).length;

  return (
    <div className="staff-admin">
      <aside className="admin-sidebar">
        <div className="sidebar-brand"><span className="brand-mark">AP</span><span>ARTIST PLAYGROUND<small>TICKETING ADMIN</small></span></div>
        <p className="sidebar-label">WORKSPACE</p>
        <button type="button" className={`sidebar-link ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}><span>▦</span> Overview</button>
        <button type="button" className={`sidebar-link ${activeSection === 'productions' ? 'active' : ''}`} onClick={() => { setActiveSection('productions'); void loadProductions(); }}><span>▣</span> Production management</button>
        <button type="button" className={`sidebar-link ${activeSection === 'payments' ? 'active' : ''}`} onClick={() => setActiveSection('payments')}><span>₱</span> Payment monitoring</button>
        <button type="button" className={`sidebar-link ${activeSection === 'email' ? 'active' : ''}`} onClick={() => setActiveSection('email')}><span>✉</span> Email delivery</button>
        <button type="button" className={`sidebar-link ${activeSection === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveSection('monitoring')}><span>⌁</span> System monitoring</button>
        <button type="button" className={`sidebar-link ${activeSection === 'security' ? 'active' : ''}`} onClick={() => { setActiveSection('security'); void Promise.all([loadStaff(), loadOperations()]); }}><span>♧</span> Security & access</button>
        <button type="button" className={`sidebar-link ${activeSection === 'staff' ? 'active' : ''}`} onClick={() => setActiveSection('staff')}><span>♙</span> Staff management</button>
        <div className="sidebar-bottom">
          <div className="signed-user"><span className="user-avatar">SA</span><span>{staffName || 'System Admin'}<small>System Admin</small></span></div>
          <button type="button" className="signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className="admin-main" id="staff">
        <header className="page-top"><div><p className="eyebrow">SYSTEM ADMINISTRATION</p><h1>{activeSection === 'overview' ? 'Overview' : activeSection === 'productions' ? 'Production management' : activeSection === 'payments' ? 'Payment monitoring' : activeSection === 'email' ? 'Email delivery' : activeSection === 'monitoring' ? 'System monitoring' : activeSection === 'security' ? 'Security & access' : 'Staff management'}</h1><p className="muted">{activeSection === 'overview' ? 'Monitor ticketing operations across Artist Playground.' : activeSection === 'productions' ? 'Review productions, scheduled performances and ticket inventory.' : activeSection === 'payments' ? 'Review PayMongo and cash payment records and webhook activity.' : activeSection === 'email' ? 'Monitor ticket email delivery attempts and failures.' : activeSection === 'monitoring' ? 'Review operational signals, ticket scans and recent administrative activity.' : activeSection === 'security' ? 'Review account access, administrator assignments and recorded access changes.' : 'Manage staff access and invitations for Artist Playground.'}</p></div><span className="admin-chip">SYSTEM ADMIN</span></header>

        {notice && <div className={noticeType === 'success' ? 'notice success' : 'notice error'} role="status">{notice}</div>}

        {activeSection === 'overview' && <section className="admin-overview">
          <div className="overview-heading"><div><h2>Operations snapshot</h2><p className="muted">Live data from the ticketing system.</p></div><button type="button" className="outline-button" onClick={() => void loadOverview()}>Refresh overview</button></div>
          {overviewLoading && !overview ? <div className="empty-state">Loading system overview…</div> : overviewError ? <div className="notice error" role="alert">{overviewError}</div> : overview && <>
            <section className="stats">
              <article className="stat-card"><span>Active productions</span><strong>{overview.metrics.active_productions}</strong><small>Published productions</small></article>
              <article className="stat-card"><span>Upcoming performances</span><strong>{overview.metrics.upcoming_performances}</strong><small>Scheduled performances</small></article>
              <article className="stat-card"><span>Tickets issued / redeemed</span><strong>{overview.metrics.tickets_issued}</strong><small>Ticket records in circulation</small></article>
              <article className="stat-card"><span>Pending bookings</span><strong>{overview.metrics.pending_bookings}</strong><small>Awaiting payment</small></article>
              <article className="stat-card"><span>Paid revenue</span><strong>₱{overview.metrics.paid_revenue.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><small>Recorded paid payments</small></article>
            </section>
            <section className="panel overview-panel"><div className="panel-heading"><div><h2>Upcoming performances</h2><p className="muted">Scheduled published productions.</p></div></div>
              {overview.upcoming.length ? overview.upcoming.map(item => <div className="overview-row" key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.starts_at).toLocaleString()} · {item.venue_name}</small></div><span>{item.remaining} seats remaining</span></div>) : <div className="empty-state">No upcoming performances.</div>}
            </section>
            <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent bookings</h2><p className="muted">Latest customer booking activity.</p></div></div>
              {overview.recent_bookings.length ? overview.recent_bookings.map(item => <div className="overview-row" key={item.booking_reference}><div><strong>{item.purchaser_name}</strong><small>{item.booking_reference} · {new Date(item.created_at).toLocaleString()}</small></div><span>{item.status} · {item.currency} {Number(item.total_amount).toLocaleString()}</span></div>) : <div className="empty-state">No bookings recorded yet.</div>}
            </section>
          </>}
        </section>}

        {activeSection === 'productions' && <section className="admin-overview">
          <div className="overview-heading"><div><h2>Productions and ticket inventory</h2><p className="muted">Central read-only view of shows, schedules, venues and category allocations.</p></div><button type="button" className="outline-button" disabled={productionsLoading} onClick={() => void loadProductions()}>{productionsLoading ? 'Refreshing…' : 'Refresh productions'}</button></div>
          {productionsLoading && !productions.length ? <div className="empty-state">Loading productions…</div> : productionsError ? <div className="notice error" role="alert">{productionsError}</div> : productions.length ? productions.map(show => <section className="panel overview-panel" key={show.id}>
            <div className="panel-heading"><div><h2>{show.title}</h2><p className="muted">{show.slug} · {show.status} · {show.performances.length} performance(s)</p></div><span className={`status ${show.status === 'published' ? 'active' : show.status === 'archived' ? 'inactive' : 'pending'}`}>{show.status}</span></div>
            {show.description && <p className="muted">{show.description}</p>}
            {show.performances.length ? show.performances.map(perf => {
              const allocated = perf.ticket_categories.reduce((sum, cat) => sum + cat.allocation, 0);
              const sold = perf.ticket_categories.reduce((sum, cat) => sum + cat.sold_count, 0);
              const reserved = perf.ticket_categories.reduce((sum, cat) => sum + cat.reserved_count, 0);
              return <div className="production-admin-performance" key={perf.id}>
                <div className="overview-row"><div><strong>{new Date(perf.starts_at).toLocaleString()} · {perf.venue_name}</strong><small>Capacity {perf.capacity} · {allocated} allocated · {sold} sold · {reserved} reserved</small></div><span className={`status ${perf.status === 'scheduled' ? 'active' : 'pending'}`}>{perf.status}</span></div>
                {perf.ticket_categories.length ? <div className="table-wrap"><table><thead><tr><th>CATEGORY</th><th>PRICE</th><th>ALLOCATION</th><th>SOLD</th><th>RESERVED</th><th>AVAILABILITY</th><th>STATUS</th></tr></thead><tbody>{perf.ticket_categories.map(cat => <tr key={cat.id}><td><strong>{cat.name}</strong></td><td>₱{Number(cat.price).toLocaleString('en-PH',{minimumFractionDigits:2})}</td><td>{cat.allocation}</td><td>{cat.sold_count}</td><td>{cat.reserved_count}</td><td>{Math.max(0,cat.allocation-cat.sold_count-cat.reserved_count)}</td><td><span className={`status ${cat.active ? 'active' : 'inactive'}`}>{cat.active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table></div> : <div className="empty-state">No ticket categories configured.</div>}
              </div>;
            }) : <div className="empty-state">No performances scheduled for this production.</div>}
          </section>) : <div className="empty-state">No productions found.</div>}
        </section>}

        {(activeSection === 'payments' || activeSection === 'email') && <section className="admin-overview">
          <div className="overview-heading"><div><h2>{activeSection === 'payments' ? 'Payment activity' : 'Ticket email activity'}</h2><p className="muted">Operational records from the production database.</p></div><button type="button" className="outline-button" disabled={operationsLoading} onClick={() => void loadOperations()}>{operationsLoading ? 'Refreshing…' : 'Refresh data'}</button></div>
          {operationsLoading && !operations ? <div className="empty-state">Loading operational records…</div> : operationsError ? <div className="notice error" role="alert">{operationsError}</div> : operations && <>
            {activeSection === 'payments' ? <>
              <section className="stats">
                {Object.entries(operations.payment_counts_recent).map(([status,count]) => <article className="stat-card" key={status}><span>{status.replaceAll('_',' ')}</span><strong>{count}</strong><small>Latest 12 payment records</small></article>)}
              </section>
              <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent payments</h2><p className="muted">Payment method, provider reference and verification state.</p></div></div>
                {operations.payments.length ? <div className="table-wrap"><table><thead><tr><th>BOOKING</th><th>CUSTOMER</th><th>METHOD / PROVIDER</th><th>AMOUNT</th><th>STATUS</th><th>VERIFIED</th><th>CREATED</th></tr></thead><tbody>{operations.payments.map(row => <tr key={row.id}><td>{row.bookings?.booking_reference || row.booking_id}</td><td>{row.bookings?.purchaser_name || '—'}</td><td>{row.method} / {row.provider}</td><td>{row.currency} {Number(row.amount).toLocaleString()}</td><td><span className={`status ${row.status === 'paid' ? 'active' : row.status === 'failed' ? 'inactive' : 'pending'}`}>{row.status}</span>{row.failure_reason && <small>{row.failure_reason}</small>}</td><td>{row.verified_at ? new Date(row.verified_at).toLocaleString() : '—'}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="empty-state">No payment records found.</div>}
              </section>
              <section className="panel overview-panel"><div className="panel-heading"><div><h2>PayMongo webhook events</h2><p className="muted">Most recently processed payment notifications.</p></div></div>
                {operations.webhook_events.length ? operations.webhook_events.map(row => <div className="overview-row" key={row.event_id}><div><strong>{row.event_type}</strong><small>{row.event_id}</small></div><span>{row.livemode ? 'Live mode' : 'Test mode'} · {new Date(row.processed_at).toLocaleString()}</span></div>) : <div className="empty-state">No webhook events recorded.</div>}
              </section>
            </> : <>
              <section className="stats">
                {Object.entries(operations.email_counts_recent).map(([status,count]) => <article className="stat-card" key={status}><span>{status.replaceAll('_',' ')}</span><strong>{count}</strong><small>Latest 12 delivery attempts</small></article>)}
              </section>
              <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent email deliveries</h2><p className="muted">Delivery status from the email provider callback and send process.</p></div></div>
                {operations.email_deliveries.length ? <div className="table-wrap"><table><thead><tr><th>BOOKING</th><th>RECIPIENT</th><th>PROVIDER</th><th>ATTEMPT</th><th>STATUS</th><th>SENT</th><th>CREATED</th></tr></thead><tbody>{operations.email_deliveries.map(row => <tr key={row.id}><td>{row.bookings?.booking_reference || row.booking_id}</td><td>{row.recipient_email}</td><td>{row.provider}</td><td>{row.attempt_number}</td><td><span className={`status ${row.status === 'delivered' || row.status === 'sent' ? 'active' : row.status === 'failed' || row.status === 'bounced' ? 'inactive' : 'pending'}`}>{row.status}</span>{row.error_message && <small>{row.error_message}</small>}</td><td>{row.sent_at ? new Date(row.sent_at).toLocaleString() : '—'}</td><td>{new Date(row.created_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <div className="empty-state">No email delivery records found.</div>}
              </section>
            </>}
            <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent administrative activity</h2><p className="muted">Audit log entries from the last 30 days.</p></div></div>
              {operations.audit_logs.length ? operations.audit_logs.map(row => <div className="overview-row" key={row.id}><div><strong>{row.action} · {row.entity_type}</strong><small>{row.entity_id || 'No entity reference'} · {JSON.stringify(row.details || {})}</small></div><span>{new Date(row.created_at).toLocaleString()}</span></div>) : <div className="empty-state">No audit activity recorded in the last 30 days.</div>}
            </section>
          </>}
        </section>}

        {activeSection === 'monitoring' && <section className="admin-overview">
          <div className="overview-heading"><div><h2>Operational health</h2><p className="muted">Database-backed signals, refreshed on demand. These are not live infrastructure probes.</p></div><button type="button" className="outline-button" disabled={operationsLoading} onClick={() => void loadOperations()}>{operationsLoading ? 'Refreshing…' : 'Refresh monitoring'}</button></div>
          {operationsLoading && !operations ? <div className="empty-state">Loading system signals…</div> : operationsError ? <div className="notice error" role="alert">{operationsError}</div> : operations && <>
            <section className="stats">
              <article className="stat-card"><span>Active staff accounts</span><strong>{operations.system_signals.active_staff_accounts}</strong><small>Enabled staff profiles</small></article>
              <article className="stat-card"><span>Pending payments</span><strong>{operations.system_signals.pending_payments}</strong><small>Awaiting verification</small></article>
              <article className="stat-card"><span>Failed / bounced emails</span><strong>{operations.system_signals.failed_or_bounced_emails}</strong><small>Recorded delivery failures</small></article>
              <article className="stat-card"><span>Recent ticket scans</span><strong>{operations.system_signals.recent_ticket_scans}</strong><small>Latest 20 scan records</small></article>
              <article className="stat-card"><span>Denied entries</span><strong>{operations.system_signals.denied_entries}</strong><small>Within latest 20 scans</small></article>
            </section>
            <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent ticket scan activity</h2><p className="muted">Accepted, denied and other recorded scan outcomes.</p></div></div>
              {operations.ticket_scans.length ? operations.ticket_scans.map(row => <div className="overview-row" key={row.id}><div><strong>{row.tickets?.attendees?.full_name || 'Attendee unavailable'} · {row.tickets?.ticket_reference || 'Ticket unavailable'}</strong><small>{row.device_label || 'Unlabelled device'}</small></div><span><span className={`status ${row.scan_result === 'accepted' ? 'active' : row.scan_result === 'denied' ? 'inactive' : 'pending'}`}>{row.scan_result}</span> · {new Date(row.scanned_at).toLocaleString()}</span></div>) : <div className="empty-state">No ticket scans recorded yet.</div>}
            </section>
            <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent webhook processing</h2><p className="muted">Latest PayMongo events received and recorded.</p></div></div>
              {operations.webhook_events.length ? operations.webhook_events.map(row => <div className="overview-row" key={row.event_id}><div><strong>{row.event_type}</strong><small>{row.event_id}</small></div><span>{row.livemode ? 'Live mode' : 'Test mode'} · {new Date(row.processed_at).toLocaleString()}</span></div>) : <div className="empty-state">No webhook events recorded.</div>}
            </section>
            <section className="panel overview-panel"><div className="panel-heading"><div><h2>Administrative audit trail</h2><p className="muted">Actions recorded during the last 30 days.</p></div></div>
              {operations.audit_logs.length ? operations.audit_logs.map(row => <div className="overview-row" key={row.id}><div><strong>{row.action} · {row.entity_type}</strong><small>{row.entity_id || 'No entity reference'} · {JSON.stringify(row.details || {})}</small></div><span>{new Date(row.created_at).toLocaleString()}</span></div>) : <div className="empty-state">No audit activity recorded in the last 30 days.</div>}
            </section>
          </>}
        </section>}

        {activeSection === 'security' && <section className="admin-overview">
          <div className="overview-heading"><div><h2>Access control review</h2><p className="muted">Account status and role assignments from the staff directory.</p></div><button type="button" className="outline-button" disabled={loading || operationsLoading} onClick={() => void Promise.all([loadStaff(), loadOperations()])}>Refresh access data</button></div>
          <section className="stats">
            <article className="stat-card"><span>Active accounts</span><strong>{staff.filter(member => member.active).length}</strong><small>Currently enabled profiles</small></article>
            <article className="stat-card"><span>System administrators</span><strong>{staff.filter(member => member.active && member.role === 'system_admin').length}</strong><small>Active admin role assignments</small></article>
            <article className="stat-card"><span>Pending invitations</span><strong>{staff.filter(member => member.active && !member.email_confirmed).length}</strong><small>Awaiting email confirmation</small></article>
          </section>
          <section className="panel overview-panel"><div className="panel-heading"><div><h2>Account access directory</h2><p className="muted">Use Staff Management to change roles or deactivate an account.</p></div></div>
            {loading ? <div className="empty-state">Loading account directory…</div> : staff.length ? <div className="table-wrap"><table><thead><tr><th>ACCOUNT</th><th>ROLE</th><th>EMAIL STATUS</th><th>ACCESS</th><th>CREATED</th></tr></thead><tbody>{staff.map(member => <tr key={member.user_id}><td><strong>{member.display_name}</strong><small>{member.email}</small></td><td>{member.role === 'system_admin' ? 'System Admin' : 'Staff'}</td><td><span className={`status ${member.email_confirmed ? 'active' : 'pending'}`}>{member.email_confirmed ? 'Confirmed' : 'Pending'}</span></td><td><span className={`status ${member.active ? 'active' : 'inactive'}`}>{member.active ? 'Active' : 'Deactivated'}</span></td><td>{new Date(member.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="empty-state">No staff profiles found.</div>}
            <p className="table-note">The system requires at least one active System Admin. Role and account changes are performed through the protected Staff Management workflow.</p>
          </section>
          <section className="panel overview-panel"><div className="panel-heading"><div><h2>Recent access-related audit events</h2><p className="muted">Audit records from the last 30 days. Only events actually written to the audit log appear here.</p></div></div>
            {operationsLoading && !operations ? <div className="empty-state">Loading audit events…</div> : operationsError ? <div className="notice error" role="alert">{operationsError}</div> : operations && operations.audit_logs.filter(row => /staff|role|access|admin|invitation|account/i.test(row.action + ' ' + row.entity_type)).length ? operations.audit_logs.filter(row => /staff|role|access|admin|invitation|account/i.test(row.action + ' ' + row.entity_type)).map(row => <div className="overview-row" key={row.id}><div><strong>{row.action} · {row.entity_type}</strong><small>{row.entity_id || 'No entity reference'} · {JSON.stringify(row.details || {})}</small></div><span>{new Date(row.created_at).toLocaleString()}</span></div>) : <div className="empty-state">No access-related audit events found in the available 30-day audit window.</div>}
          </section>
        </section>}

        {activeSection === 'staff' && <>
        <section className="stats">
          <article className="stat-card"><span>Total accounts</span><strong>{staff.length}</strong><small>Registered staff profiles</small></article>
          <article className="stat-card"><span>Active accounts</span><strong>{activeCount}</strong><small>Can access staff tools</small></article>
          <article className="stat-card"><span>Pending invitations</span><strong>{pendingCount}</strong><small>Awaiting first confirmation</small></article>
        </section>

        <section className="content-grid">
          <div className="panel staff-panel">
            <div className="panel-heading"><div><h2>Staff accounts</h2><p className="muted">Review account status and access roles.</p></div><button type="button" className="outline-button" onClick={() => { setLoading(true); void loadStaff().catch(e => notify(e.message, 'error')).finally(() => setLoading(false)); }}>Refresh</button></div>
            {loading ? <div className="empty-state">Loading staff accounts…</div> : staff.length === 0 ? <div className="empty-state">No staff accounts found.</div> : (
              <div className="table-wrap"><table><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>STATUS</th><th>LAST SIGN IN</th><th>ACCESS</th></tr></thead><tbody>
                {staff.map(member => <tr key={member.user_id}>
                  <td><strong>{member.display_name}</strong><small>{member.email}</small></td>
                  <td><select aria-label={`Role for ${member.display_name}`} value={member.role} disabled={busyId === member.user_id} onChange={e => void updateStaff(member, { role: e.target.value })}><option value="staff">Staff</option><option value="system_admin">System Admin</option></select></td>
                  <td><span className={`status ${!member.active ? 'inactive' : member.email_confirmed ? 'active' : 'pending'}`}>{!member.active ? 'Inactive' : member.email_confirmed ? 'Active' : 'Invitation pending'}</span></td>
                  <td>{member.last_sign_in_at ? new Date(member.last_sign_in_at).toLocaleDateString() : '—'}</td>
                  <td><button type="button" className={member.active ? 'text-action danger' : 'text-action'} disabled={busyId === member.user_id} onClick={() => void updateStaff(member, { active: !member.active })}>{busyId === member.user_id ? 'Saving…' : member.active ? 'Deactivate' : 'Activate'}</button></td>
                </tr>)}
              </tbody></table></div>
            )}
            <p className="table-note">Deactivated accounts cannot access staff operations. At least one active System Admin must remain.</p>
          </div>

          <section className="panel invite-panel">
            <div className="panel-heading"><div><h2>Invite a team member</h2><p className="muted">Send a secure account invitation.</p></div><span className="invite-icon">＋</span></div>
            <form onSubmit={inviteStaff} className="invite-form">
              <label htmlFor="display_name">Full name</label><input id="display_name" name="display_name" type="text" maxLength={120} placeholder="Enter full name" required />
              <label htmlFor="email">Email address</label><input id="email" name="email" type="email" maxLength={254} placeholder="name@example.com" required />
              <label htmlFor="role">Account role</label><select id="role" name="role" defaultValue="staff"><option value="staff">Staff</option><option value="system_admin">System Admin</option></select>
              <button className="primary-button" type="submit" disabled={inviteBusy}>{inviteBusy ? 'Sending invitation…' : 'Send invitation'}</button>
            </form>
            <div className="invite-help"><strong>Invitation process</strong><p>The team member receives an email link to set their password. Accounts remain pending until the email invitation is accepted.</p></div>
          </section>
        </section>
        </>}
      </main>

      <style>{`
        .staff-admin{min-height:100vh;background:#090a0c;color:#f5f6f8;display:grid;grid-template-columns:248px minmax(0,1fr);font-family:Inter,Arial,sans-serif}
        .admin-sidebar{background:#0e1013;border-right:1px solid #25282e;padding:1.5rem 1rem;display:flex;flex-direction:column;min-height:100vh;position:sticky;top:0;height:100vh}
        .sidebar-brand{display:flex;align-items:center;gap:.75rem;padding:.4rem .5rem 2.2rem;font-size:.72rem;font-weight:800;letter-spacing:.08em}
        .sidebar-brand small,.signed-user small{display:block;color:#818894;font-size:.65rem;letter-spacing:.12em;margin-top:.3rem}
        .brand-mark{display:grid;place-items:center;width:38px;height:38px;border:1px solid #00a8d6;border-radius:10px;color:#f5e900;font-weight:900;font-size:.9rem}
        .sidebar-label{padding:0 .65rem;color:#737b87;font-size:.65rem;letter-spacing:.16em;font-weight:800}
        .sidebar-link{display:flex;align-items:center;gap:.7rem;width:100%;padding:.8rem .75rem;border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;color:#e5e7eb;font:inherit;font-size:.85rem;cursor:pointer}
        .sidebar-link.active{background:#19242b;color:#55d5f5;border:1px solid #174052}
        .sidebar-bottom{margin-top:auto;border-top:1px solid #25282e;padding-top:1rem}
        .signed-user{display:flex;align-items:center;gap:.65rem;font-size:.8rem;font-weight:700;padding:.5rem}
        .user-avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#24313a;color:#7ee1ff;font-size:.7rem}
        .signout{margin-top:.8rem;width:100%;padding:.65rem;border:1px solid #343942;border-radius:7px;background:#171a1f;color:#d8dce2;cursor:pointer}
        .admin-main{padding:2.4rem clamp(1.25rem,3vw,3rem);min-width:0}
        .page-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.8rem}
        .eyebrow{color:#00b8e6;letter-spacing:.16em;font-size:.68rem;font-weight:800;margin:0 0 .6rem}
        .page-top h1{font-size:clamp(1.8rem,3vw,2.4rem);margin:0;letter-spacing:-.04em}
        .muted{color:#929aa6;font-size:.82rem;line-height:1.55;margin:.45rem 0 0}
        .admin-chip{font-size:.65rem;letter-spacing:.12em;color:#f5e900;border:1px solid #514d17;padding:.5rem .7rem;border-radius:99px}
        .notice{padding:.85rem 1rem;border-radius:8px;margin-bottom:1.2rem;font-size:.85rem}.notice.success{background:#10251b;border:1px solid #245a3c;color:#a8e8c2}.notice.error{background:#2a1517;border:1px solid #713237;color:#ffc0c4}
        .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-bottom:1.2rem}
        .stat-card,.panel{background:#111419;border:1px solid #282d35;border-radius:12px}
        .stat-card{padding:1.1rem 1.2rem}.stat-card span,.stat-card small{display:block;color:#9ba3ae;font-size:.76rem}.stat-card strong{display:block;font-size:1.8rem;margin:.35rem 0}.stat-card small{font-size:.68rem;color:#727b87}
        .content-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:1.2rem;align-items:start}
        .overview-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1rem}.overview-heading h2{font-size:1rem;margin:0}.overview-panel{margin-top:1rem}.production-admin-performance{border-top:1px solid #282d35;margin-top:1rem;padding-top:.4rem}.production-admin-performance table{min-width:720px}.overview-row{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.9rem 0;border-top:1px solid #282d35;font-size:.75rem}.overview-row>div{display:grid;gap:.3rem;min-width:0}.overview-row strong{color:#f4f5f7}.overview-row small,.overview-row>span{color:#929aa6;font-size:.68rem}.overview-row>span{text-align:right}
        .panel{padding:1.2rem;min-width:0}.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;margin-bottom:1.2rem}.panel-heading h2{font-size:1rem;margin:0}.outline-button{background:transparent;border:1px solid #39414b;color:#e3e7ec;border-radius:7px;padding:.55rem .8rem;cursor:pointer;font-size:.75rem}
        .table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:680px;text-align:left}th{color:#7f8996;font-size:.62rem;letter-spacing:.1em;font-weight:700;padding:.75rem .65rem;border-bottom:1px solid #2b3038}td{padding:.9rem .65rem;border-bottom:1px solid #242932;font-size:.76rem;color:#cbd1d9}td strong,td small{display:block}td strong{color:#f4f5f7;font-size:.78rem}td small{color:#828c99;margin-top:.3rem;font-size:.68rem}td select{background:#171b21;border:1px solid #343b45;color:#e8ebef;padding:.45rem;border-radius:6px;font-size:.72rem}
        .status{display:inline-block;border-radius:99px;padding:.35rem .55rem;font-size:.65rem;white-space:nowrap}.status.active{background:#123323;color:#8de0ad}.status.pending{background:#382d13;color:#f2d27b}.status.inactive{background:#30252a;color:#e4a5b1}
        .text-action{background:none;border:0;color:#69d3f2;font-size:.72rem;cursor:pointer}.text-action.danger{color:#f19aa4}.text-action:disabled{opacity:.5;cursor:wait}.table-note{color:#727c89;font-size:.68rem;line-height:1.5;margin:1rem 0 0}
        .invite-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:#18313a;color:#68d7f5;font-size:1.3rem}
        .invite-form{display:grid;gap:.55rem}.invite-form label{font-size:.72rem;color:#cbd1d9;margin-top:.45rem}.invite-form input,.invite-form select{width:100%;padding:.75rem .8rem;background:#0b0e12;border:1px solid #343b45;border-radius:7px;color:#f4f6f8;font:inherit;font-size:.78rem}.invite-form input::placeholder{color:#66707d}.primary-button{margin-top:.7rem;padding:.8rem;border:0;border-radius:7px;background:#f5e900;color:#080808;font-weight:800;cursor:pointer}.primary-button:disabled{opacity:.65;cursor:wait}
        .invite-help{border-top:1px solid #2b3038;margin-top:1.3rem;padding-top:1rem}.invite-help strong{font-size:.75rem}.invite-help p{color:#858e9b;font-size:.7rem;line-height:1.55;margin:.45rem 0 0}.empty-state{padding:2rem 1rem;text-align:center;color:#929aa6;font-size:.8rem}
        @media(max-width:1150px){.content-grid{grid-template-columns:1fr}.invite-panel{max-width:none}}
        @media(max-width:760px){.staff-admin{grid-template-columns:1fr}.admin-sidebar{position:static;height:auto;min-height:0;padding:1rem}.sidebar-brand{padding-bottom:1rem}.sidebar-label,.sidebar-bottom{display:none}.stats{grid-template-columns:1fr}.admin-main{padding:1.5rem 1rem}.page-top{align-items:flex-start}.overview-heading{align-items:flex-start;flex-direction:column}.overview-row{align-items:flex-start;flex-direction:column}.overview-row>span{text-align:left}}
      `}</style>
    </div>
  );
}
