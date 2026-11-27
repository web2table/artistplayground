import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/auth/staff';
import { signInStaff } from './actions';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function StaffLoginPage({ searchParams }: LoginPageProps) {
  const staff = await getCurrentStaff();
  if (staff) redirect(staff.role === 'system_admin' ? '/admin' : '/staff');

  const params = await searchParams;
  const message = params.error === 'missing'
    ? 'Enter your email and password.'
    : params.error === 'unauthorized'
      ? 'This account is not authorized for staff access. Contact your system administrator.'
      : params.error === 'invalid'
        ? 'Unable to sign in with those credentials.'
        : null;

  return (
    <section className="staff-auth">
      <div className="staff-auth-panel">
        <p className="staff-auth-eyebrow">ARTIST PLAYGROUND</p>
        <h1>Staff sign in</h1>
        <p className="staff-auth-copy">Authorized personnel only.</p>
        {message && <p className="staff-auth-error" role="alert">{message}</p>}
        <form action={signInStaff} className="staff-auth-form">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Sign in</button>
        </form>
        <Link className="staff-auth-back" href="/">← Back to website</Link>
      </div>
      <style>{`
        .staff-auth{min-height:65vh;display:grid;place-items:center;padding:3rem 1.25rem;background:#000;color:#fff}
        .staff-auth-panel{width:min(100%,28rem);padding:2rem;border:1px solid #333;border-radius:1rem;background:#101010}
        .staff-auth-eyebrow{color:#00a8d6;letter-spacing:.15em;font-size:.75rem;font-weight:800}
        .staff-auth-panel h1{margin:.6rem 0;font-family:Manrope,sans-serif;font-size:2rem}
        .staff-auth-copy{color:#aaa;margin-bottom:1.5rem}
        .staff-auth-error{padding:.75rem;border:1px solid #8b3333;border-radius:.5rem;color:#ffb5b5;font-size:.9rem}
        .staff-auth-form{display:grid;gap:.55rem}
        .staff-auth-form label{margin-top:.65rem;font-size:.9rem}
        .staff-auth-form input{width:100%;padding:.8rem;border:1px solid #444;border-radius:.45rem;background:#080808;color:#fff;font:inherit}
        .staff-auth-form input:focus{outline:2px solid #00a8d6;outline-offset:2px}
        .staff-auth-form button{margin-top:1rem;padding:.85rem;border:0;border-radius:.45rem;background:#f5e900;color:#000;font:inherit;font-weight:800;cursor:pointer}
        .staff-auth-back{display:inline-block;margin-top:1.5rem;color:#aaa;text-decoration:none;font-size:.9rem}
        .staff-auth-back:hover{color:#f5e900}
      `}</style>
    </section>
  );
}
