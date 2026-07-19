import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const AUDIT_EMAIL = 'audit@example.com';
const AUDIT_SLUG = 'a';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || AUDIT_EMAIL;
  const slug = args[1] || AUDIT_SLUG;
  const forceDelete = args.includes('--confirm');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    await connection.query('USE myphotolife');

    console.log('='.repeat(60));
    console.log('RELATÓRIO DE AUDITORIA — CONTA');
    console.log(`Email: ${email}`);
    console.log(`Slug: ${slug}`);
    console.log('='.repeat(60));

    const [tenants] = await connection.execute(
      'SELECT id, name, email, slug, created_at, is_active FROM tenants WHERE email = ? OR slug = ? LIMIT 1',
      [email, slug],
    );

    if (tenants.length === 0) {
      console.log('\n⚠ Conta não encontrada no banco de dados.');
      console.log('Nenhuma ação necessária.');
      return;
    }

    const tenant = tenants[0];
    console.log(`\n📋 Conta encontrada:`);
    console.log(`   ID:        ${tenant.id}`);
    console.log(`   Nome:      ${tenant.name}`);
    console.log(`   Email:     ${tenant.email}`);
    console.log(`   Slug:      ${tenant.slug}`);
    console.log(`   Ativo:     ${tenant.is_active ? 'Sim' : 'Não'}`);
    console.log(`   Criada em: ${tenant.created_at}`);

    if (tenant.email !== AUDIT_EMAIL || tenant.slug !== AUDIT_SLUG) {
      console.log(`\n⚠ ATENÇÃO: Esta conta NÃO corresponde aos identificadores de auditoria esperados.`);
      console.log(`   Esperado: email=${AUDIT_EMAIL}, slug=${AUDIT_SLUG}`);
      console.log(`   Encontrado: email=${tenant.email}, slug=${tenant.slug}`);
      if (!forceDelete) {
        console.log(`   Use --confirm apenas se tiver certeza absoluta.`);
        return;
      }
    } else {
      console.log(`\n✅ Conta confirmada como conta de auditoria.`);
    }

    console.log(`\n🔍 Verificando dados associados...`);

    const [albums] = await connection.execute(
      'SELECT COUNT(*) AS total FROM albums WHERE tenant_id = ?',
      [tenant.id],
    );
    const [media] = await connection.execute(
      'SELECT COUNT(*) AS total FROM media_files WHERE tenant_id = ?',
      [tenant.id],
    );
    const [schedule] = await connection.execute(
      'SELECT COUNT(*) AS total FROM schedule WHERE tenant_id = ?',
      [tenant.id],
    );
    const [orders] = await connection.execute(
      'SELECT COUNT(*) AS total FROM orders WHERE tenant_id = ?',
      [tenant.id],
    );
    const [users] = await connection.execute(
      'SELECT COUNT(*) AS total FROM users WHERE tenant_id = ?',
      [tenant.id],
    );

    const hasData = albums[0].total > 0 || media[0].total > 0 || schedule[0].total > 0 || orders[0].total > 0;

    console.log(`   Álbuns:       ${albums[0].total}`);
    console.log(`   Fotos:        ${media[0].total}`);
    console.log(`   Agenda:       ${schedule[0].total}`);
    console.log(`   Pedidos:      ${orders[0].total}`);
    console.log(`   Usuários:     ${users[0].total}`);

    if (!hasData && users[0].total <= 1) {
      console.log(`\nℹ Conta sem dados relevantes. Apenas o usuário principal existe.`);
    }

    if (!forceDelete) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Para remover esta conta, execute com --confirm:`);
      console.log(`  node scripts/audit-account.js ${email} ${slug} --confirm`);
      console.log(`\n⚠ ATENÇÃO: Esta operação NÃO pode ser desfeita.`);
      console.log(`   Todos os dados associados (fotos, álbuns, pedidos, agenda) serão`);
      console.log(`   excluídos permanentemente do banco de dados.`);
      console.log(`   Os arquivos no storage (S3) NÃO serão removidos por este script.`);
      return;
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🗑 INICIANDO EXCLUSÃO TRANSACIONAL...`);

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    try {
      await conn.query('USE myphotolife');
      await conn.beginTransaction();

      const [delOrders] = await conn.execute(
        'DELETE FROM orders WHERE tenant_id = ?',
        [tenant.id],
      );
      const [delSchedule] = await conn.execute(
        'DELETE FROM schedule WHERE tenant_id = ?',
        [tenant.id],
      );
      const [delMedia] = await conn.execute(
        'DELETE FROM media_files WHERE tenant_id = ?',
        [tenant.id],
      );
      const [delAlbums] = await conn.execute(
        'DELETE FROM albums WHERE tenant_id = ?',
        [tenant.id],
      );
      const [delUsers] = await conn.execute(
        'DELETE FROM users WHERE tenant_id = ?',
        [tenant.id],
      );
      const [delTenant] = await conn.execute(
        'DELETE FROM tenants WHERE id = ?',
        [tenant.id],
      );

      await conn.commit();

      console.log(`\n✅ EXCLUSÃO CONCLUÍDA COM SUCESSO`);
      console.log(`   Pedidos removidos:   ${delOrders.affectedRows}`);
      console.log(`   Agenda removidos:    ${delSchedule.affectedRows}`);
      console.log(`   Fotos removidas:     ${delMedia.affectedRows}`);
      console.log(`   Álbuns removidos:    ${delAlbums.affectedRows}`);
      console.log(`   Usuários removidos:  ${delUsers.affectedRows}`);
      console.log(`   Conta removida:      ${delTenant.affectedRows}`);
      console.log(`\nℹ Recuperação:`);
      console.log(`   A exclusão foi feita via ON DELETE CASCADE nas chaves estrangeiras.`);
      console.log(`   NÃO existe recuperação após esta operação.`);
      console.log(`   Os arquivos no S3 (fotos originais, otimizadas e thumbnails)`);
      console.log(`   precisam ser removidos manualmente se necessário.`);
    } catch (err) {
      await conn.rollback().catch(() => {});
      console.error(`\n❌ ERRO DURANTE EXCLUSÃO: ${err.message}`);
      console.log(`   A transação foi revertida. Nenhum dado foi removido.`);
      process.exit(1);
    } finally {
      await conn.end();
    }
  } catch (err) {
    console.error(`\n❌ ERRO: ${err.message}`);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
