import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About | Artist Playground",
  description: "Learn about Artist Playground and its educational theater, stage productions, and workshops.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
