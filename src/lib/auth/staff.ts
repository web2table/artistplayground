import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StaffRole = 'staff' | 'system_admin';

export async function getCurrentStaff() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== 'string') return null;

  const { data, error } = await supabase.rpc('get_my_staff_profile');
  if (error || !data?.length) return null;

  const profile = data[0];
  if (profile.user_id !== userId || !profile.active) return null;
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
