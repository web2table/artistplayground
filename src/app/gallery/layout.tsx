import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Gallery | Artist Playground",
  description: "A glimpse into performances, workshops, rehearsals, and creative moments at Artist Playground.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
