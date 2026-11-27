'use server';

import { redirect } from 'next/navigation';
import { requireSystemAdmin } from '@/lib/auth/staff';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function inviteStaff(formData: FormData) {
  await requireSystemAdmin();

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('display_name') ?? '').trim();
  const role = String(formData.get('role') ?? 'staff');

  if (!email || !displayName || !['staff', 'system_admin'].includes(role)) {
    redirect('/admin?invite=invalid');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.functions.invoke('provision-staff', {
    body: { email, display_name: displayName, role },
  });

  if (error || !data?.ok) {
    redirect('/admin?invite=failed');
  }

  redirect('/admin?invite=sent');
}
