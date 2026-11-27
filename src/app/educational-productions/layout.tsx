import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Educational Productions | Artist Playground",
  description: "Explore educational theater adaptations of Filipino literary works for school audiences.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
