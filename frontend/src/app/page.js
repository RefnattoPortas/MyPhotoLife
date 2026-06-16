'use client';

import Link from 'next/link';
import { Camera, Images, ShoppingBag, Palette, Layout, ArrowRight, Check, Star } from 'lucide-react';

const features = [
  { icon: Layout, title: 'Portfólio Profissional', desc: 'Crie um portfólio online impressionante em minutos. Mostre seu trabalho com galerias responsivas e elegantes.' },
  { icon: ShoppingBag, title: 'Venda suas Fotos', desc: 'Monetize seu trabalho vendendo fotos digitais diretamente pelo seu portfólio. Receba por Pix.' },
  { icon: Palette, title: 'Personalização Total', desc: 'Customize cores, fontes e a aparência do seu portfólio para refletir sua identidade visual.' },
  { icon: Images, title: 'Gerenciamento de Álbuns', desc: 'Organize suas fotos em álbuns, defina capas, preços e gerencie tudo em um só lugar.' },
  { icon: Camera, title: 'Upload Inteligente', desc: 'Upload com compressão automática para WebP. Suas fotos otimizadas sem perder qualidade.' },
  { icon: Star, title: 'Link Exclusivo', desc: 'Cada fotógrafo recebe um link único para compartilhar: myphotolife.com/seu-nome.' },
];

const steps = [
  { step: '01', title: 'Crie sua Conta', desc: 'Cadastre-se gratuitamente em menos de 1 minuto.' },
  { step: '02', title: 'Personalize', desc: 'Escolha cores, fonte e monte seu portfólio do seu jeito.' },
  { step: '03', title: 'Faça Upload', desc: 'Adicione suas melhores fotos em álbuns organizados.' },
  { step: '04', title: 'Compartilhe & Venda', desc: 'Compartilhe seu link e comece a vender suas fotos.' },
];

const testimonials = [
  { name: 'Ana Silva', role: 'Fotógrafa de Casamentos', text: 'MyPhotoLife transformou a forma como apresento meu trabalho. Meus clientes amam a experiência.' },
  { name: 'Carlos Oliveira', role: 'Fotógrafo de Retratos', text: 'Finalmente uma plataforma que entende as necessidades de um fotógrafo profissional.' },
  { name: 'Julia Costa', role: 'Fotógrafa de Eventos', text: 'Vender fotos digitais nunca foi tão fácil. O painel é muito intuitivo.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-900 font-bold text-xl">
            <Camera className="text-zinc-900" /> MyPhotoLife
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors font-medium"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm bg-zinc-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-zinc-800 transition-colors"
            >
              Criar Portfólio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-100/40 to-zinc-50" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-900/5 text-zinc-700 text-sm px-4 py-2 rounded-full mb-8 border border-zinc-200">
            <Camera size={16} />
            Plataforma SaaS para Fotógrafos
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.08]">
            Seu portfólio{' '}
            <span className="bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
              profissional
            </span>{' '}
            em minutos
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto font-light leading-relaxed">
            Crie, personalize e compartilhe seu portfólio de fotografia. 
            Venda suas fotos digitais e gerencie tudo em uma plataforma feita para fotógrafos.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-zinc-900 text-white px-8 py-3.5 rounded-full font-medium hover:bg-zinc-800 transition-colors text-base shadow-lg shadow-zinc-900/10 w-full sm:w-auto text-center"
            >
              Criar meu Portfólio Gratuito
            </Link>
            <Link
              href="/login"
              className="bg-white text-zinc-900 px-8 py-3.5 rounded-full font-medium hover:bg-zinc-100 transition-colors text-base border border-zinc-200 w-full sm:w-auto text-center"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Tudo que você precisa</h2>
            <p className="mt-4 text-zinc-500 text-lg max-w-2xl mx-auto">
              Uma plataforma completa para fotógrafos profissionais gerenciarem, exibirem e venderem seu trabalho.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl p-6 md:p-8 border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-zinc-700" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 md:py-28 bg-zinc-100/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Comece em 4 passos</h2>
            <p className="mt-4 text-zinc-500 text-lg">Simples, rápido e sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-zinc-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">O que dizem os fotógrafos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-zinc-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-zinc-900 text-zinc-900" />
                  ))}
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-zinc-400 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-zinc-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Pronto para levar seu portfólio ao próximo nível?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Crie seu portfólio profissional gratuitamente e comece a vender suas fotos hoje mesmo.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-zinc-900 px-8 py-3.5 rounded-full font-medium hover:bg-zinc-100 transition-colors text-base shadow-lg"
          >
            Criar Portfólio Grátis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-xl">
            <Camera className="text-zinc-900" /> MyPhotoLife
          </div>
          <p className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} MyPhotoLife. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
