'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header/Header';
import Footer from '@/components/footer/Footer';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const isStaffArea = ['/admin', '/staff', '/auth'].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );

  if (isStaffArea) return <main>{children}</main>;

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
