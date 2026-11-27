import { requireStaff } from '@/lib/auth/staff';

export default async function StaffDashboardPage() {
  const staff = await requireStaff();

  return (
    <section style={{ padding: '2.5rem 5vw', color: '#fff', background: '#080808', minHeight: '55vh' }}>
      <p style={{ color: '#00a8d6', letterSpacing: '.15em', fontSize: '.75rem', fontWeight: 800 }}>STAFF WORKSPACE</p>
      <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem,5vw,3rem)' }}>Welcome{staff.displayName ? `, ${staff.displayName}` : ''}.</h1>
      <p style={{ color: '#aaa' }}>Your staff account is authenticated. Ticketing operations will appear here as their workflows are implemented.</p>
    </section>
  );
}
