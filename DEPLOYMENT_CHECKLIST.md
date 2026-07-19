# MyPhotoLife — Deployment Checklist

## Pré-implantação

### Código
- [ ] `npm run lint` limpo no backend e frontend
- [ ] `npm test` passando no backend (0 falhas)
- [ ] `npm run build` passando no frontend
- [ ] `npm run deps:audit` sem vulnerabilidades críticas/altas
- [ ] `npm run migrate` executado com sucesso contra staging DB
- [ ] Revisão de código concluída (PR aprovado)

### Variáveis de Ambiente (produção)
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` — mínimo 64 caracteres aleatórios
- [ ] `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — acesso ao banco de produção
- [ ] `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` — credenciais S3
- [ ] `STORAGE_BUCKET_ORIGINALS`, `STORAGE_BUCKET_OPTIMIZED` — buckets de produção
- [ ] `STORAGE_PUBLIC_URL` — URL do CDN
- [ ] `PIX_GATEWAY_URL`, `PIX_GATEWAY_API_KEY` — gateway de pagamento
- [ ] `PIX_GATEWAY_WEBHOOK_SECRET` — segredo para validação de webhooks
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — servidor SMTP
- [ ] `CORS_ORIGIN` — URL do frontend de produção
- [ ] `NEXT_PUBLIC_SITE_URL` — URL do site

### Segurança
- [ ] `.env` não versionado (confirmar `.gitignore`)
- [ ] Nenhuma secret no código-fonte
- [ ] Backup do banco de produção recente
- [ ] Webhook secret configurado no gateway de pagamento
- [ ] Rate limiting ativo (100 req/min global, 5 req/min auth)
- [ ] CSRF protection ativa

### Banco de Dados
- [ ] Backup completo do banco atual (via `mysqldump`)
- [ ] Migrações revisadas e testadas em staging
- [ ] Plano de rollback documentado
- [ ] Conexão com SSL/TLS (se exigido pelo provider)

### DNS / Domínio
- [ ] Registro A/AAAA apontando para o servidor
- [ ] Certificado SSL ativo (Let's Encrypt / Cloudflare)
- [ ] CDN configurado (Cloudflare R2 ou similar)

## Implantação

### Passos
1. [ ] Executar `npm run clean-install` no servidor
2. [ ] Configurar `.env` com valores de produção
3. [ ] Executar `npm run migrate` para aplicar migrações pendentes
4. [ ] Iniciar backend: `npm start --prefix backend`
5. [ ] Verificar health: `curl {URL}/api/health` → `{"status":"ok"}`
6. [ ] Construir frontend: `npm run build --prefix frontend`
7. [ ] Iniciar frontend: `npm start --prefix frontend`
8. [ ] Verificar página inicial carrega sem erros no console

### Smoke Tests (pós-implantação)
- [ ] Homepage carrega (200)
- [ ] Portfólio de teste carrega
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Criar álbum
- [ ] Upload de foto
- [ ] Criar evento na agenda
- [ ] Finalizar pedido de teste
- [ ] Webhook de pagamento (simulado)
- [ ] Logout funciona

## Pós-implantação
- [ ] Monitoramento ativo (logs, erros 5xx)
- [ ] Backup automático configurado (diário)
- [ ] Health check endpoint monitorado (UptimeRobot ou similar)
- [ ] Release tag criada no git (`git tag v{X.Y.Z}`)
- [ ] Changelog atualizado
