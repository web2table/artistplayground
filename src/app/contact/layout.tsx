import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact | Artist Playground",
  description: "Get in touch with Artist Playground about educational theater, productions, workshops, and creative collaborations.",
};

export default function RouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
