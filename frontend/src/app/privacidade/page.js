import Link from 'next/link';

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-xl font-bold tracking-tight">MyPhotoLife</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc prose-sm max-w-none">
        <h1>Política de Privacidade</h1>
        <p className="text-zinc-500">Última atualização: Julho de 2026</p>

        <h2>1. Dados Coletados</h2>
        <p>Coletamos as seguintes informações pessoais:</p>
        <ul>
          <li>Nome completo</li>
          <li>Endereço de email</li>
          <li>Fotografias e conteúdo enviado pelo usuário</li>
          <li>Dados de navegação (cookies, páginas acessadas)</li>
          <li>Informações de pagamento (processadas por gateway terceiro)</li>
        </ul>

        <h2>2. Finalidade do Tratamento</h2>
        <p>Seus dados são utilizados para:</p>
        <ul>
          <li>Criação e manutenção da sua conta</li>
          <li>Hospedagem e exibição do seu portfólio</li>
          <li>Processamento de vendas e transações</li>
          <li>Comunicações relacionadas ao serviço</li>
          <li>Melhorias na plataforma</li>
        </ul>

        <h2>3. Base Legal</h2>
        <p>O tratamento de dados pessoais é realizado com base no seu consentimento (art. 7º, I, LGPD) e na execução do contrato de serviços (art. 7º, V, LGPD).</p>

        <h2>4. Compartilhamento com Terceiros</h2>
        <p>Podemos compartilhar seus dados com:</p>
        <ul>
          <li>Processadores de pagamento (gateway Pix)</li>
          <li>Serviços de armazenamento em nuvem (Cloudflare R2)</li>
          <li>Provedores de infraestrutura (Vercel)</li>
        </ul>

        <h2>5. Cookies</h2>
        <p>Utilizamos cookies essenciais para autenticação e segurança. Não utilizamos cookies de rastreamento ou publicidade sem seu consentimento explícito.</p>

        <h2>6. Armazenamento e Exclusão</h2>
        <p>Seus dados são armazenados enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, todos os dados associados serão removidos em até 30 dias.</p>

        <h2>7. Direitos do Titular</h2>
        <p>Você pode solicitar a qualquer momento: acesso, correção, exclusão, portabilidade e revogação do consentimento de seus dados pessoais através do email de contato.</p>

        <h2>8. Segurança</h2>
        <p>Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia, controle de acesso e monitoramento contínuo.</p>

        <p className="text-zinc-400 text-xs mt-12">
          Pendência: Razão social, CNPJ e endereço jurídico precisam ser fornecidos pelo responsável pelo produto. Esta política deve ser revisada por um profissional qualificado para adequação à LGPD.
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
