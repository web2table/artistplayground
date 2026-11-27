import type { Metadata } from 'next';
import '../styles/global.css';
import Header from '../components/header/Header';
import Footer from '../components/footer/Footer';
import AuthHashHandler from '../components/auth/AuthHashHandler';

export const metadata: Metadata = {
  title: 'Artist Playground',
  description: 'A space for talent at every stage.',
  icons: {
    icon: 'https://raw.githubusercontent.com/web2table/artistplayground/main/ap.jpg',
    apple: 'https://raw.githubusercontent.com/web2table/artistplayground/main/ap.jpg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthHashHandler />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
