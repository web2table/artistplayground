import { requireSystemAdmin } from '@/lib/auth/staff';

export default async function AdminDashboardPage() {
  const staff = await requireSystemAdmin();

  return (
    <section style={{ padding: '2.5rem 5vw', color: '#fff', background: '#080808', minHeight: '55vh' }}>
      <p style={{ color: '#00a8d6', letterSpacing: '.15em', fontSize: '.75rem', fontWeight: 800 }}>SYSTEM ADMINISTRATION</p>
      <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem,5vw,3rem)' }}>System Admin</h1>
      <p style={{ color: '#aaa' }}>Signed in as {staff.displayName || staff.id}. Staff provisioning and system settings will be added here.</p>
    </section>
  );
}
