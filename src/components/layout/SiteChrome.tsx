'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import MaintenanceScreen from '@/components/layout/MaintenanceScreen';
import Header from '@/components/header/Header';
import Footer from '@/components/footer/Footer';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const isStaffArea = ['/admin', '/staff', '/auth'].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );

  useEffect(() => {
    if (isStaffArea) return;
    let active = true;
    const check = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.functions.invoke('maintenance-control', { body: { action: 'status' } });
        if (active && data?.ok) setMaintenance({ enabled: data.enabled === true, message: data.message || '' });
      } catch { /* Keep the public site available if the status service is temporarily unreachable. */ }
    };
    void check();
    const interval = window.setInterval(() => { void check(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [isStaffArea]);

  if (isStaffArea) return <main>{children}</main>;
  if (maintenance?.enabled) return <MaintenanceScreen message={maintenance.message} />;

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
