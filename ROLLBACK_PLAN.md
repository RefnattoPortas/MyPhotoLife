# MyPhotoLife — Rollback Plan

## 1. Rollback de Código

### Via git revert (recomendado)
```bash
# Identificar o hash do último deploy estável
git log --oneline -5

# Reverter o(s) commit(s) problemático(s)
git revert <HASH_DO_COMMIT_PROBLEMA>

# Reaplicar migrações necessárias
cd backend && npm run migrate

# Reconstruir e reiniciar
cd .. && npm run build && pm2 restart all
```

### Via git checkout (emergência)
```bash
# Checkout direto para a tag estável anterior
git checkout tags/v{X.Y.Z-1}

# Reinstalar dependências
npm run clean-install

# Reaplicar migrações (do zero, se necessário)
cd backend && npm run migrate

# Reconstruir e reiniciar
cd .. && npm run build && pm2 restart all
```

## 2. Rollback de Banco de Dados

### Migração com problema
Cada migração tem seu script de reversão correspondente:

```sql
-- Reverter migration 007 (soft delete + audit_log)
DROP TABLE IF EXISTS audit_log;
ALTER TABLE albums DROP COLUMN deleted_by, DROP COLUMN deleted_at;
ALTER TABLE media_files DROP COLUMN deleted_by, DROP COLUMN deleted_at;
ALTER TABLE schedule DROP COLUMN deleted_by, DROP COLUMN deleted_at;

-- Reverter migration 006 (contact_email)
ALTER TABLE tenants DROP COLUMN contact_email;
```

### Restore completo do banco
```bash
# Backup automático diário salvo em /backups/
# Nome do arquivo: myphotolife_YYYY-MM-DD_HHmmss.sql

# Restaurar backup mais recente
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /backups/myphotolife_$(date -d "1 day ago" +%Y-%m-%d)*.sql

# Reaplicar migrações posteriores ao backup
cd backend && npm run migrate
```

## 3. Rollback de Configuração

### Variáveis de ambiente
```bash
# Manter versão anterior do .env
cp .env .env.problematic
cp .env.backup .env
pm2 restart all
```

### Certificado SSL
```bash
# Se novo certificado falhar, restaurar versão anterior
certbot renew --force-renewal
# ou restaurar manualmente os arquivos de /etc/letsencrypt/backup/
```

## 4. Procedimento de Emergência (5 minutos)

Se a aplicação estiver completamente fora do ar:

```bash
# 1. Parar instâncias atuais
pm2 stop all

# 2. Restaurar última tag estável
git checkout tags/v{X.Y.Z-1}

# 3. Reinstalar
npm run clean-install

# 4. Restaurar banco (último backup válido)
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < /backups/ultimo_backup_valido.sql

# 5. Reconstruir e iniciar
npm run build
pm2 start all

# 6. Verificar health
curl https://myphotolife.com/api/health
```

## 5. Comunicação

- [ ] Notificar equipe no canal #deploy
- [ ] Abrir incidente no sistema de tracking
- [ ] Documentar causa raiz no post-mortem
- [ ] Atualizar runbook com aprendizados

## 6. Teste de Rollback

Antes de cada deploy em produção, realizar:
1. Deploy em staging
2. Executar script de rollback
3. Verificar que staging volta a funcionar
4. Documentar tempo total de rollback
