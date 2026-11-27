'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function setStaffPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirm_password') ?? '');

  if (password.length < 10) redirect('/staff/set-password?error=short');
  if (password !== confirmPassword) redirect('/staff/set-password?error=mismatch');

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== 'string') {
    redirect('/staff/login?error=invalid');
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/staff/set-password?error=failed');

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, active')
    .eq('user_id', claimsData.claims.sub)
    .maybeSingle();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect('/staff/login?error=unauthorized');
  }

  redirect(profile.role === 'system_admin' ? '/admin' : '/staff');
}
