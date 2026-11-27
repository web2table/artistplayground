import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Events | Artist Playground",
  description: "Events, performances, workshops, and announcements from Artist Playground.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
