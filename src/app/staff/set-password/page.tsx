import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { setStaffPassword } from './actions';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SetStaffPasswordPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || typeof claimsData?.claims?.sub !== 'string') redirect('/staff/login');

  const params = await searchParams;
  const errors: Record<string, string> = {
    short: 'Use a password with at least 10 characters.',
    mismatch: 'The passwords do not match.',
    failed: 'We could not update your password. Please try again.',
  };

  return (
    <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: '3rem 1.5rem' }}>
      <section style={{ width: '100%', maxWidth: 480, background: '#111', color: '#fff', padding: '2rem', border: '1px solid #333', borderRadius: 12 }}>
        <p style={{ color: '#00a8d6', letterSpacing: '.12em', fontSize: '.75rem' }}>ARTIST PLAYGROUND</p>
        <h1 style={{ color: '#f5e900', marginBottom: '.75rem' }}>Set your password</h1>
        <p>Choose a password to finish setting up your staff account.</p>
        {params.error && <p role="alert" style={{ color: '#ff8b8b' }}>{errors[params.error] ?? 'Something went wrong.'}</p>}
        <form action={setStaffPassword} style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
          <label style={{ display: 'grid', gap: '.4rem' }}>New password
            <input name="password" type="password" minLength={10} autoComplete="new-password" required style={{ padding: '.8rem', borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff' }} />
          </label>
          <label style={{ display: 'grid', gap: '.4rem' }}>Confirm password
            <input name="confirm_password" type="password" minLength={10} autoComplete="new-password" required style={{ padding: '.8rem', borderRadius: 6, border: '1px solid #555', background: '#222', color: '#fff' }} />
          </label>
          <button type="submit" style={{ padding: '.85rem 1rem', border: 0, borderRadius: 6, background: '#f5e900', color: '#000', fontWeight: 800, cursor: 'pointer' }}>Save password</button>
        </form>
      </section>
    </main>
  );
}
