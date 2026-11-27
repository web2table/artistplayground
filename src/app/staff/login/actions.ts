'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function signInStaff(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) redirect('/staff/login?error=missing');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect('/staff/login?error=invalid');

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== 'string') {
    await supabase.auth.signOut();
    redirect('/staff/login?error=invalid');
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('role, active')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !profile || !profile.active ||
      !['staff', 'system_admin'].includes(profile.role)) {
    await supabase.auth.signOut();
    redirect('/staff/login?error=unauthorized');
  }

  redirect(profile.role === 'system_admin' ? '/admin' : '/staff');
}

export async function signOutStaff() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/staff/login');
}
