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
  const [maintenanceResolved, setMaintenanceResolved] = useState(false);
  const isStaffArea = ['/admin', '/staff', '/auth'].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );

  useEffect(() => {
    if (isStaffArea) return;
    let active = true;
    const check = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.functions.invoke('maintenance-control', { body: { action: 'status' } });
        if (active && !error && data?.ok) {
          setMaintenance({ enabled: data.enabled === true, message: data.message || '' });
        }
      } catch {
        // If the status service is unavailable, let the public site load after the check completes.
      } finally {
        if (active) setMaintenanceResolved(true);
      }
    };
    setMaintenanceResolved(false);
    void check();
    const interval = window.setInterval(() => { void check(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [isStaffArea]);

  if (isStaffArea) return <main>{children}</main>;
  if (!maintenanceResolved) {
    return <main aria-busy="true" aria-label="Checking website availability" className="ap-maintenance-checking" />;
  }
  if (maintenance?.enabled) return <MaintenanceScreen message={maintenance.message} />;

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <style jsx global>{`
        .ap-maintenance-checking {
          position: fixed;
          inset: 0;
          z-index: 99998;
          min-height: 100vh;
          min-height: 100dvh;
          background: #080808;
        }
      `}</style>
    </>
  );
}
