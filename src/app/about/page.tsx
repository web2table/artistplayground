'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AboutRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return <main aria-label="Redirecting to Artist Playground" className="ap-page" />;
}
