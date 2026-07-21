import Link from 'next/link';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold tracking-tight">MyPhotoLife</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc prose-sm max-w-none">
        <h1>Termos de Uso</h1>
        <p className="text-zinc-500">Última atualização: Julho de 2026</p>

        <h2>1. Aceitação dos Termos</h2>
        <p>Ao criar uma conta e utilizar a plataforma MyPhotoLife, você declara ter lido, compreendido e aceitado todos os termos e condições descritos neste documento.</p>

        <h2>2. Serviços Oferecidos</h2>
        <p>O MyPhotoLife é uma plataforma SaaS que permite a fotógrafos profissionais criarem portfólios online, gerenciarem álbuns de fotos e venderem conteúdo digital.</p>

        <h2>3. Conta do Usuário</h2>
        <p>Você é responsável por manter a confidencialidade de suas credenciais de acesso. Qualquer atividade realizada em sua conta é de sua inteira responsabilidade.</p>

        <h2>4. Upload e Conteúdo</h2>
        <p>Ao fazer upload de fotografias, você declara ser o titular dos direitos autorais ou possuir autorização para publicá-las. Você é o único responsável pelo conteúdo que publica.</p>

        <h2>5. Vendas e Transações</h2>
        <p>As vendas realizadas através da plataforma são transações diretas entre o fotógrafo e o comprador. O MyPhotoLife atua como intermediário tecnológico e não se responsabiliza por disputas entre as partes.</p>

        <h2>6. Limitação de Responsabilidade</h2>
        <p>O MyPhotoLife não se responsabiliza por danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso ou da impossibilidade de uso da plataforma.</p>

        <h2>7. Alterações dos Termos</h2>
        <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas aos usuários registrados.</p>

        <h2>8. Lei Aplicável</h2>
        <p>Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca do usuário.</p>

        <p className="text-zinc-400 text-xs mt-12">
          Pendência: Razão social, CNPJ e endereço jurídico precisam ser fornecidos pelo responsável pelo produto.
        </p>
      </main>
      <footer className="border-t border-zinc-200 py-8 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-center text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} MyPhotoLife
        </div>
      </footer>
    </div>
  );
}
