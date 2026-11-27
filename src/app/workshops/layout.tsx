import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Workshops | Artist Playground",
  description: "Workshop areas offered by Artist Playground, including performance, storytelling, character work, and creative theater activities.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
