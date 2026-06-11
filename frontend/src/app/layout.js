import './globals.css';

export const metadata = {
  title: 'MyPhotoLife - Portfólio Profissional para Fotógrafos',
  description: 'Plataforma SaaS para fotógrafos gerenciarem portfólios e venderem conteúdo digital.',
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
