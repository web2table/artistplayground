import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StaffRole = 'staff' | 'system_admin';

export async function getCurrentStaff() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== 'string') return null;

  const { data: profile, error } = await supabase
    .from('staff_profiles')
    .select('user_id, display_name, role, active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !profile || !profile.active) return null;
  if (profile.role !== 'staff' && profile.role !== 'system_admin') return null;

  return {
    id: profile.user_id as string,
    displayName: profile.display_name as string | null,
    role: profile.role as StaffRole,
  };
}

export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) redirect('/staff/login');
  return staff;
}

export async function requireSystemAdmin() {
  const staff = await requireStaff();
  if (staff.role !== 'system_admin') redirect('/staff');
  return staff;
}
