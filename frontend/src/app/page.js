'use client';

import Link from 'next/link';
import { Camera, Images, ShoppingBag, Palette, Layout, ArrowRight, Check, Shield, HelpCircle, Star } from 'lucide-react';

const features = [
  { icon: Layout, title: 'Portfólio Profissional', desc: 'Crie um portfólio online impressionante em minutos. Mostre seu trabalho com galerias responsivas e elegantes.' },
  { icon: ShoppingBag, title: 'Venda suas Fotos', desc: 'Monetize seu trabalho vendendo fotos digitais diretamente pelo seu portfólio. Receba por Pix.' },
  { icon: Palette, title: 'Personalização Total', desc: 'Customize cores, fontes e a aparência do seu portfólio para refletir sua identidade visual.' },
  { icon: Images, title: 'Gerenciamento de Álbuns', desc: 'Organize suas fotos em álbuns, defina capas, preços e gerencie tudo em um só lugar.' },
  { icon: Camera, title: 'Upload Inteligente', desc: 'Upload com compressão automática para WebP. Suas fotos otimizadas com qualidade visual preservada.' },
  { icon: Star, title: 'Link Exclusivo', desc: 'Cada fotógrafo recebe um link único para compartilhar.' },
];

const steps = [
  { step: '01', title: 'Crie sua Conta', desc: 'Cadastre-se gratuitamente em menos de 1 minuto.' },
  { step: '02', title: 'Personalize', desc: 'Escolha cores, fonte e monte seu portfólio do seu jeito.' },
  { step: '03', title: 'Faça Upload', desc: 'Adicione suas melhores fotos em álbuns organizados.' },
  { step: '04', title: 'Compartilhe & Venda', desc: 'Compartilhe seu link e comece a vender suas fotos.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-900 font-bold text-xl">
            <Camera className="text-zinc-900" /> MyPhotoLife
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors font-medium">
              Entrar
            </Link>
            <Link href="/register" className="text-sm bg-zinc-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-zinc-800 transition-colors">
              Criar Portfólio
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-100/40 to-zinc-50" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-zinc-900/5 text-zinc-700 text-sm px-4 py-2 rounded-full mb-8 border border-zinc-200">
            <Camera size={16} />
            Plataforma SaaS para Fotógrafos
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.08]">
            Seu portfólio{' '}
            <span className="bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">profissional</span>{' '}
            em minutos
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-2xl mx-auto font-light leading-relaxed">
            Crie, personalize e compartilhe seu portfólio de fotografia. Venda suas fotos digitais e gerencie tudo em uma plataforma feita para fotógrafos.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="bg-zinc-900 text-white px-8 py-3.5 rounded-full font-medium hover:bg-zinc-800 transition-colors text-base shadow-lg shadow-zinc-900/10 w-full sm:w-auto text-center">
              Criar meu Portfólio Grátis
            </Link>
            <Link href="/login" className="bg-white text-zinc-900 px-8 py-3.5 rounded-full font-medium hover:bg-zinc-100 transition-colors text-base border border-zinc-200 w-full sm:w-auto text-center">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Planos e Preços</h2>
            <p className="mt-4 text-zinc-500 text-lg">Comece gratuitamente e evolua conforme sua necessidade.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 rounded-2xl p-8 border border-zinc-100">
              <h3 className="text-lg font-semibold mb-2">Grátis</h3>
              <p className="text-3xl font-bold mb-4">R$ 0</p>
              <ul className="space-y-3 text-sm text-zinc-600 mb-8">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> 1 GB de armazenamento</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Até 50 fotos</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> 1 álbum</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Portfólio público</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Venda de fotos (taxa 15%)</li>
              </ul>
              <Link href="/register" className="block w-full text-center bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors text-sm">
                Começar Grátis
              </Link>
            </div>
            <div className="bg-zinc-900 text-white rounded-2xl p-8 border border-zinc-800 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">Popular</div>
              <h3 className="text-lg font-semibold mb-2">Profissional</h3>
              <p className="text-3xl font-bold mb-1">R$ 29<span className="text-lg font-normal text-zinc-400">/mês</span></p>
              <p className="text-zinc-400 text-xs mb-6">Cobrança mensal, cancele quando quiser</p>
              <ul className="space-y-3 text-sm text-zinc-300 mb-8">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> 10 GB de armazenamento</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Fotos ilimitadas</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Álbuns ilimitados</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Domínio personalizado</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Venda de fotos (taxa 8%)</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" /> Suporte prioritário</li>
              </ul>
              <Link href="/register" className="block w-full text-center bg-white text-zinc-900 py-2.5 rounded-xl font-medium hover:bg-zinc-100 transition-colors text-sm">
                Assinar Agora
              </Link>
            </div>
            <div className="bg-zinc-50 rounded-2xl p-8 border border-zinc-100">
              <h3 className="text-lg font-semibold mb-2">Premium</h3>
              <p className="text-3xl font-bold mb-1">R$ 69<span className="text-lg font-normal text-zinc-400">/mês</span></p>
              <p className="text-zinc-400 text-xs mb-6">Cobrança mensal, cancele quando quiser</p>
              <ul className="space-y-3 text-sm text-zinc-600 mb-8">
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> 50 GB de armazenamento</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Fotos ilimitadas</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Álbuns ilimitados</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Domínio personalizado</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Venda de fotos (taxa 5%)</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Suporte prioritário 24h</li>
                <li className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Analytics avançado</li>
              </ul>
              <Link href="/register" className="block w-full text-center bg-zinc-900 text-white py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors text-sm">
                Assinar Agora
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-zinc-400 mt-6">
            Taxas sobre vendas já incluem custos de processamento Pix. Planos pagos serão cobrados a partir do momento da contratação.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Tudo que você precisa</h2>
            <p className="mt-4 text-zinc-500 text-lg max-w-2xl mx-auto">Uma plataforma completa para fotógrafos profissionais gerenciarem, exibirem e venderem seu trabalho.</p>
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

      <section className="py-20 md:py-28 bg-zinc-100/50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Comece em 4 passos</h2>
            <p className="mt-4 text-zinc-500 text-lg">Simples, rápido e sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-bold">{s.step}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-zinc-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Como funciona o Pix</h2>
            <p className="mt-4 text-zinc-500 text-lg max-w-2xl mx-auto">
              As vendas são processadas via Pix com QR Code. O valor é transferido diretamente para a chave Pix cadastrada pelo fotógrafo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-zinc-700" />
              </div>
              <h3 className="font-semibold mb-1">Pagamento Seguro</h3>
              <p className="text-zinc-500 text-sm">Transações processadas com criptografia e validação de pagamento em tempo real.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-6 h-6 text-zinc-700" />
              </div>
              <h3 className="font-semibold mb-1">Repasse Automático</h3>
              <p className="text-zinc-500 text-sm">O valor da venda é repassado diretamente para sua chave Pix cadastrada.</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-6 h-6 text-zinc-700" />
              </div>
              <h3 className="font-semibold mb-1">Suporte</h3>
              <p className="text-zinc-500 text-sm">Dúvidas sobre pagamentos? Entre em contato com nosso suporte.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-zinc-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Pronto para levar seu portfólio ao próximo nível?</h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Crie seu portfólio profissional gratuitamente e comece a vender suas fotos hoje mesmo.
          </p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-zinc-900 px-8 py-3.5 rounded-full font-medium hover:bg-zinc-100 transition-colors text-base shadow-lg">
            Criar Portfólio Grátis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-black pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
                <Camera className="text-white" /> MyPhotoLife
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">Plataforma SaaS para fotógrafos profissionais.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Produto</h4>
              <div className="space-y-2 text-sm">
                <Link href="/register" className="block text-zinc-400 hover:text-white transition-colors">Criar Portfólio</Link>
                <Link href="/login" className="block text-zinc-400 hover:text-white transition-colors">Entrar</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
              <div className="space-y-2 text-sm">
                <Link href="/termos" className="block text-zinc-400 hover:text-white transition-colors">Termos de Uso</Link>
                <Link href="/privacidade" className="block text-zinc-400 hover:text-white transition-colors">Política de Privacidade</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Suporte</h4>
              <div className="space-y-2 text-sm">
                <Link href="/suporte" className="block text-zinc-400 hover:text-white transition-colors">Fale Conosco</Link>
                <a href="mailto:suporte@myphotolife.com" className="block text-zinc-400 hover:text-white transition-colors">suporte@myphotolife.com</a>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-500 text-sm">&copy; {new Date().getFullYear()} MyPhotoLife. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


