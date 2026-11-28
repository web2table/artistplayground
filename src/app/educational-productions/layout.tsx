import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The Classics Now | Artist Playground",
  description: "Discover The Classics Now by Artist Playground, featuring stage adaptations of Filipino literary works.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
