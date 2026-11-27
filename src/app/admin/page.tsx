import { requireSystemAdmin } from '@/lib/auth/staff';
import { signOutStaff } from '@/app/staff/login/actions';
import { inviteStaff } from './actions';

type AdminPageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: AdminPageProps) {
  const staff = await requireSystemAdmin();
  const params = await searchParams;
  const notice = params.invite === 'sent'
    ? 'Invitation sent. The new staff member must use the email invitation to set up access.'
    : params.invite === 'failed'
      ? 'The invitation could not be completed. Check the email, Auth email settings, and function logs.'
      : params.invite === 'invalid'
        ? 'Enter a valid email, display name, and role.'
        : null;

  return (
    <section className="admin-page">
      <header className="admin-heading">
        <div>
          <p className="admin-eyebrow">SYSTEM ADMINISTRATION</p>
          <h1>System Admin</h1>
          <p className="admin-copy">Signed in as {staff.displayName || staff.id}.</p>
        </div>
        <form action={signOutStaff}><button className="admin-secondary" type="submit">Sign out</button></form>
      </header>

      <div className="admin-card">
        <h2>Invite staff member</h2>
        <p className="admin-copy">Create an account by sending an invitation. Public registration is not part of the staff workflow.</p>
        {notice && <p className={params.invite === 'sent' ? 'admin-notice' : 'admin-error'} role="status">{notice}</p>}
        <form action={inviteStaff} className="admin-form">
          <label htmlFor="display_name">Full name</label>
          <input id="display_name" name="display_name" type="text" maxLength={120} required />
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" maxLength={254} required />
          <label htmlFor="role">Account role</label>
          <select id="role" name="role" defaultValue="staff">
            <option value="staff">Staff</option>
            <option value="system_admin">System Admin</option>
          </select>
          <button className="admin-primary" type="submit">Send invitation</button>
        </form>
      </div>

      <style>{`
        .admin-page{min-height:60vh;padding:2.5rem 5vw;background:#080808;color:#fff}
        .admin-heading{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;margin-bottom:2rem}
        .admin-eyebrow{color:#00a8d6;letter-spacing:.15em;font-size:.75rem;font-weight:800}
        .admin-heading h1{font-family:Manrope,sans-serif;font-size:clamp(2rem,5vw,3rem);margin:.5rem 0}
        .admin-copy{color:#aaa;line-height:1.6}
        .admin-card{max-width:38rem;padding:1.5rem;border:1px solid #333;border-radius:.8rem;background:#101010}
        .admin-card h2{font-family:Manrope,sans-serif;font-size:1.35rem;margin:0 0 .5rem}
        .admin-form{display:grid;gap:.55rem;margin-top:1.25rem}
        .admin-form label{margin-top:.5rem;font-size:.9rem}
        .admin-form input,.admin-form select{width:100%;padding:.8rem;border:1px solid #444;border-radius:.45rem;background:#080808;color:#fff;font:inherit}
        .admin-primary,.admin-secondary{padding:.75rem 1rem;border:0;border-radius:.45rem;font:inherit;font-weight:800;cursor:pointer}
        .admin-primary{margin-top:.8rem;background:#f5e900;color:#000}
        .admin-secondary{background:#222;color:#fff;border:1px solid #444}
        .admin-notice,.admin-error{padding:.8rem;border-radius:.45rem;font-size:.9rem}
        .admin-notice{border:1px solid #276b48;color:#b9f5d0}
        .admin-error{border:1px solid #8b3333;color:#ffb5b5}
      `}</style>
    </section>
  );
}
