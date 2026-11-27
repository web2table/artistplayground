import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Theater Productions | Artist Playground",
  description: "Information about Artist Playground theater productions, educational stage works, and collaborations.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
