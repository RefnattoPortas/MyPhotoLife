import './globals.css';
import { APP_NAME, APP_TAGLINE, getAppUrl } from '@/lib/app-url';

const appUrl = getAppUrl();

export const metadata = {
  title: `${APP_NAME} - ${APP_TAGLINE}`,
  description: 'Plataforma SaaS para fotógrafos gerenciarem portfólios e venderem conteúdo digital.',
  metadataBase: new URL(appUrl),
  openGraph: {
    title: `${APP_NAME} - ${APP_TAGLINE}`,
    description: 'Plataforma SaaS para fotógrafos gerenciarem portfólios e venderem conteúdo digital.',
    url: appUrl,
    siteName: APP_NAME,
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} - ${APP_TAGLINE}`,
    description: 'Plataforma SaaS para fotógrafos gerenciarem portfólios e venderem conteúdo digital.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: appUrl },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
