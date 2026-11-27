import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StaffRole = 'staff' | 'system_admin';

export async function getCurrentStaff() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;
  if (error || typeof userId !== 'string') return null;

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('id, display_name, role, is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (profileError || !profile) return null;
  if (profile.role !== 'staff' && profile.role !== 'system_admin') return null;

  return {
    id: profile.id as string,
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
