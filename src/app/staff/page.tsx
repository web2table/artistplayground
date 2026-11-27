'use client';

import { useEffect, useState } from 'react';
import { appPath, createSupabaseBrowserClient } from '@/lib/supabase/browser';

type StaffProfile = { display_name: string; role: 'staff' | 'system_admin'; active: boolean };

const workAreas = [
  { href: '#sales', icon: '₱', title: 'Daily sales', description: 'Review today’s box-office and online sales.', tag: 'SALES' },
  { href: '#bookings', icon: '▤', title: 'Bookings', description: 'Find bookings and review ticket details.', tag: 'BOOKING DESK' },
  { href: '#payments', icon: '₱', title: 'Payment desk', description: 'Confirm cash payments and review payment status.', tag: 'PAYMENTS' },
  { href: '#refunds', icon: '↺', title: 'Refund requests', description: 'Review booking refund requests and their status.', tag: 'REFUNDS' },
  { href: '#scanner', icon: '▦', title: 'Ticket scanner', description: 'Scan QR tickets or look up a ticket reference.', tag: 'ADMISSION' },
  { href: '#reports', icon: '▥', title: 'Operational reports', description: 'View sales, admissions, and daily activity reports.', tag: 'REPORTS' },
];

export default function StaffDashboardPage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        <section className="staff-section" id="bookings"><div className="section-heading"><div><h2>Operations</h2><p>Choose the task you need to handle.</p></div></div>
          <div className="work-grid">{workAreas.map(area => <a key={area.tag} className="work-card" href={area.href}><span className="work-icon">{area.icon}</span><span className="work-tag">{area.tag}</span><h3>{area.title}</h3><p>{area.description}</p><span className="work-arrow">Open workspace ↗</span></a>)}</div>
        </section>

        <section className="staff-section" id="payments"><div className="section-heading"><div><h2>Payment desk</h2><p>Cash confirmation and online payment verification will be handled in this workspace.</p></div></div><div className="workflow-note"><span>₱</span><div><strong>Payment operations</strong><p>Cash receipts will require staff confirmation. PayMongo payments will be confirmed by verified payment notifications—not by manually marking an online payment as paid.</p></div></div></section>
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
        .staff-error{background:#2a1517;border:1px solid #713237;color:#ffc0c4;padding:.8rem;border-radius:8px;margin-bottom:1rem}
        .staff-loading{min-height:55vh;display:grid;place-items:center;background:#080808;color:#aaa}
        @media(max-width:1150px){.work-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.staff-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.staff-workspace{grid-template-columns:1fr}.staff-sidebar{position:static;height:auto;min-height:0;padding:1rem}.staff-brand{padding-bottom:1rem}.staff-nav-label,.staff-sidebar-bottom{display:none}.staff-sidebar{display:block}.staff-nav-item{display:inline-flex;margin-right:.2rem;padding:.55rem}.staff-main{padding:1.3rem 1rem}.staff-welcome{padding:1.3rem}.welcome-mark{font-size:5rem;padding:0}.work-grid{grid-template-columns:1fr}.staff-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
    </div>
  );
}
