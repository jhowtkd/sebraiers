import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-provider';

export const metadata: Metadata = {
  title: {
    default: 'SEBRAEIERS',
    template: '%s · SEBRAEIERS',
  },
  description:
    'Plataforma interna do SEBRAE Goiás pra colaboradores engajarem com as redes sociais oficiais.',
  applicationName: 'SEBRAEIERS',
  authors: [{ name: 'SEBRAE Goiás' }],
  icons: {
    icon: '/logo-icon.svg',
    apple: '/logo-icon.svg',
  },
  openGraph: {
    title: 'SEBRAEIERS',
    description: 'Engaje com as redes do SEBRAE Goiás e dispute o ranking interno.',
    siteName: 'SEBRAEIERS',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#2A4FDA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}