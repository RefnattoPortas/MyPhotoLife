'use client';

import { useState } from 'react';
import { Camera, Calendar, User, Mail, Image as ImageIcon, MapPin, Instagram, Twitter } from 'lucide-react';

const albums = [
  { id: 1, title: 'Casamento no Campo', image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop', category: 'Casamentos' },
  { id: 2, title: 'Retratos Urbanos', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop', category: 'Retratos' },
  { id: 3, title: 'Ensaio Gestante', image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop', category: 'Ensaios' },
  { id: 4, title: 'Editorial de Moda', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800&auto=format&fit=crop', category: 'Moda' },
  { id: 5, title: 'Luzes da Cidade', image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=800&auto=format&fit=crop', category: 'Urbano' },
  { id: 6, title: 'Natureza Selvagem', image: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?q=80&w=800&auto=format&fit=crop', category: 'Natureza' },
];

const schedule = [
  { id: 1, date: '15 Out 2026', title: 'Casamento Ana & Paulo', location: 'São Paulo, SP', status: 'Confirmado' },
  { id: 2, date: '22 Out 2026', title: 'Ensaio Editorial Revista X', location: 'Rio de Janeiro, RJ', status: 'Confirmado' },
  { id: 3, date: '05 Nov 2026', title: 'Mini Wedding Praia', location: 'Florianópolis, SC', status: 'Vagas Encerradas' },
  { id: 4, date: '12-20 Nov 2026', title: 'Temporada de Ensaios Europa', location: 'Paris & Lisboa', status: 'Agenda Aberta' },
];

export default function PortfolioPlatform() {
  const [activeTab, setActiveTab] = useState('albums');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Hero Section */}
      <header className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=1920&auto=format&fit=crop" 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center px-6">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4 drop-shadow-md">
            Gabriel Lens
          </h1>
          <p className="text-xl md:text-2xl text-zinc-200 font-light max-w-2xl mx-auto">
            Capturando a essência de momentos efêmeros. Fotógrafo especializado em casamentos e retratos.
          </p>
        </div>
      </header>

      {/* Sticky Navigation / Tabs */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-center md:justify-start gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'albums', label: 'Álbuns', icon: ImageIcon },
            { id: 'about', label: 'Quem Sou', icon: User },
            { id: 'schedule', label: 'Agenda', icon: Calendar },
            { id: 'contact', label: 'Contato', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-16 min-h-[50vh]">
        {/* TAB: ALBUMS */}
        {activeTab === 'albums' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-bold tracking-tight">Meus Trabalhos</h2>
              <p className="text-zinc-500 mt-2">Explore algumas das minhas histórias favoritas contadas através de lentes.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => (
                <div key={album.id} className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/5] bg-zinc-200">
                  <img
                    src={album.image}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                      {album.category}
                    </span>
                    <h3 className="text-xl font-medium text-white">{album.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ABOUT ME */}
        {activeTab === 'about' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=800&auto=format&fit=crop"
                  alt="Gabriel Lens"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-4xl font-bold tracking-tight mb-6">Olá, eu sou o Gabriel.</h2>
                <div className="space-y-4 text-zinc-600 leading-relaxed text-lg">
                  <p>
                    Com mais de 10 anos de experiência, minha paixão é transformar momentos que duram apenas um segundo em memórias que duram uma vida inteira.
                  </p>
                  <p>
                    Acredito que a fotografia vai além do técnico; trata-se de conexão, sensibilidade e a capacidade de enxergar a beleza na vulnerabilidade e na alegria pura.
                  </p>
                  <p>
                    Baseado em São Paulo, mas sempre com a mala pronta para fotografar onde a história nos levar.
                  </p>
                </div>
                <div className="mt-8 flex gap-4">
                  <button className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-full hover:bg-zinc-800 transition-colors">
                    <Instagram size={20} /> Instagram
                  </button>
                  <button className="flex items-center gap-2 bg-zinc-200 text-zinc-900 px-6 py-3 rounded-full hover:bg-zinc-300 transition-colors">
                    <Twitter size={20} /> Twitter
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Agenda 2026</h2>
              <p className="text-zinc-500 mt-2">Confira meus próximos destinos e disponibilidade.</p>
            </div>
            
            <div className="space-y-4">
              {schedule.map((event) => (
                <div key={event.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-300 transition-colors">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">{event.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {event.date}</span>
                      <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase self-start sm:self-center ${
                    event.status === 'Agenda Aberta' ? 'bg-green-100 text-green-700' :
                    event.status === 'Confirmado' ? 'bg-zinc-100 text-zinc-700' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {event.status}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center p-8 bg-zinc-900 text-white rounded-3xl">
              <h3 className="text-2xl font-bold mb-3">Deseja me levar para sua cidade?</h3>
              <p className="text-zinc-400 mb-6 max-w-lg mx-auto">Entre em contato para organizarmos uma temporada de ensaios na sua região.</p>
              <button className="bg-white text-zinc-900 px-8 py-3 rounded-full font-medium hover:bg-zinc-100 transition-colors">
                Solicitar Orçamento
              </button>
            </div>
          </div>
        )}

        {/* TAB: CONTACT */}
        {activeTab === 'contact' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Vamos Conversar</h2>
              <p className="text-zinc-500 mt-2">Preencha o formulário abaixo ou me envie um e-mail direto.</p>
            </div>

            <form className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Nome Completo</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">E-mail</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900" placeholder="seu@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Tipo de Evento</label>
                <select className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white">
                  <option>Casamento</option>
                  <option>Ensaio Casal</option>
                  <option>Retrato Individual</option>
                  <option>Evento Corporativo</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Mensagem</label>
                <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none" placeholder="Conte-me um pouco sobre o que você deseja..."></textarea>
              </div>
              <button type="button" className="w-full bg-zinc-900 text-white font-medium py-4 rounded-xl hover:bg-zinc-800 transition-colors">
                Enviar Mensagem
              </button>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white py-10 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-xl">
            <Camera className="text-zinc-900" /> MyPhotoLife
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 Gabriel Lens. Desenvolvido com MyPhotoLife.
          </p>
        </div>
      </footer>
    </div>
  );
}
