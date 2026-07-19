# MyPhotoLife — Backup Plan

## 1. Banco de Dados (MySQL)

### Backup Automático Diário
```bash
# Script: scripts/backup-db.sh
#!/bin/bash
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR=/backups
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

mkdir -p $BACKUP_DIR
mysqldump -u $DB_USER -p$DB_PASSWORD \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  $DB_NAME | gzip > $BACKUP_DIR/myphotolife_$TIMESTAMP.sql.gz

# Remover backups mais antigos que 30 dias
find $BACKUP_DIR -name "myphotolife_*.sql.gz" -mtime +30 -delete
```

### Cron (execução diária às 03:00)
```cron
0 3 * * * /path/to/scripts/backup-db.sh
```

### Verificação de Integridade
```bash
# Testar se o backup é válido
gunzip -c /backups/myphotolife_*.sql.gz | mysql -u $DB_USER -p$DB_PASSWORD myphotolife_test
echo "Backup restaurado com sucesso em ambiente de teste"
```

## 2. Arquivos (Storage S3)

### Backup de Configuração
- Buckets S3 (originals + optimized) são gerenciados pelo provedor
- Habilitar versionamento nos buckets para proteção contra deleção acidental
- Configurar replicação cross-region (se disponível)

### Sincronização para Backup
```bash
# Sincronizar buckets para storage secundário uma vez por semana
aws s3 sync s3://myphotolife-originals s3://backup-myphotolife-originals --delete
aws s3 sync s3://myphotolife-optimized s3://backup-myphotolife-optimized --delete
```

## 3. Código Fonte

- Git (GitHub/GitLab) — backups automáticos
- Tags de release para cada deploy
- Branch `main` protegida contra push direto

## 4. Configuração

- `.env.production` — backup criptografado no gerenciador de senhas (Bitwarden/1Password)
- Certificados SSL — backup em `/etc/letsencrypt/backup/`
- Configuração do servidor (Nginx, PM2) — versionada no repositório `infra/`

## 5. Teste de Restore

Realizar teste de restore completo **a cada 3 meses**:
1. Provisionar servidor de staging limpo
2. Restaurar backup mais recente do banco
3. Restaurar arquivos do S3
4. Verificar que a aplicação funciona completamente
5. Documentar tempo total de restore

## 6. Retenção

| Tipo | Frequência | Retenção |
|------|-----------|----------|
| Banco (completo) | Diário | 30 dias |
| Banco (semanal) | Semanal | 6 meses |
| Banco (mensal) | Mensal | 1 ano |
| Arquivos S3 | Semanal | 3 meses |
| Código (git) | Contínuo | Permanente |
| Config | Por alteração | Permanente |
