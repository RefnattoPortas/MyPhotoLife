import Link from 'next/link';
import { Mail, MessageCircle, BookOpen } from 'lucide-react';

const channels = [
  {
    icon: Mail,
    title: 'Email',
    desc: 'Envie um email para nossa equipe de suporte.',
    action: 'suporte@myphotolife.com',
    href: 'mailto:suporte@myphotolife.com',
  },
  {
    icon: BookOpen,
    title: 'Central de Ajuda',
    desc: 'Consulte nossa documentação e FAQs.',
    action: 'Ver guias',
    href: '#',
  },
  {
    icon: MessageCircle,
    title: 'Redes Sociais',
    desc: 'Acompanhe novidades e atualizações.',
    action: '@myphotolife',
    href: '#',
  },
];

export default function SuportePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold tracking-tight">MyPhotoLife</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Fale conosco</h1>
        <p className="text-zinc-500 mb-12">Estamos aqui para ajudar.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {channels.map((ch) => {
            const Icon = ch.icon;
            return (
              <div key={ch.title} className="bg-white rounded-2xl p-6 border border-zinc-100">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-zinc-700" />
                </div>
                <h2 className="font-semibold mb-1">{ch.title}</h2>
                <p className="text-sm text-zinc-500 mb-4">{ch.desc}</p>
                <a href={ch.href} className="text-sm text-zinc-900 underline font-medium">{ch.action}</a>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-zinc-900 text-white rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Precisa de ajuda com sua conta?</h2>
          <p className="text-zinc-400 text-sm mb-6">Nossa equipe responde em até 24 horas úteis.</p>
          <a
            href="mailto:suporte@myphotolife.com"
            className="inline-flex items-center gap-2 bg-white text-zinc-900 px-6 py-2.5 rounded-full font-medium hover:bg-zinc-100 transition-colors text-sm"
          >
            <Mail size={16} /> Enviar email
          </a>
        </div>
      </main>

      <footer className="border-t border-zinc-200 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} MyPhotoLife
        </div>
      </footer>
    </div>
  );
}
