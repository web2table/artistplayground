import { requireStaff } from '@/lib/auth/staff';
import { signOutStaff } from './login/actions';

export default async function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const staff = await requireStaff();

  return (
    <div className="staff-shell">
      <header className="staff-bar">
        <div>
          <strong>Artist Playground</strong>
          <span>Staff workspace</span>
        </div>
        <div className="staff-identity">
          <span>{staff.displayName || staff.role.replace('_', ' ')}</span>
          <form action={signOutStaff}><button type="submit">Sign out</button></form>
        </div>
      </header>
      {children}
      <style>{`
        .staff-shell{min-height:65vh;background:#080808;color:#fff}
        .staff-bar{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 5vw;border-bottom:1px solid #333}
        .staff-bar>div:first-child{display:grid;gap:.2rem}
        .staff-bar strong{font-family:Manrope,sans-serif}
        .staff-bar span{color:#aaa;font-size:.85rem}
        .staff-identity{display:flex;align-items:center;gap:1rem}
        .staff-identity button{padding:.55rem .8rem;border:1px solid #444;border-radius:.4rem;background:transparent;color:#fff;cursor:pointer}
        @media(max-width:520px){.staff-bar{align-items:flex-start;flex-direction:column}.staff-identity{width:100%;justify-content:space-between}}
      `}</style>
    </div>
  );
}
