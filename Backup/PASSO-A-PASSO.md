# Backup do SaaS de Psicologia

Duas formas, complementares:

1. **Manual**, no computador: `scripts/backup-banco.sh` → salva em `Backup/`.
2. **Automático**, no GitHub: todo domingo às 07:00 de Brasília, no repositório privado
   `saas-psicologia-backup`.

## Diferenças em relação ao tutorial do app de finanças

- Use um repositório **novo e privado**, chamado `saas-psicologia-backup`. Não misture com
  `controle-pessoal-backup` (são dados de projetos diferentes).
- **Não use `service_role`.** Este projeto não guarda anexos no Storage: os PDFs dos
  recibos ficam **dentro do banco**, na tabela `portal_recibos`. Portanto só precisamos
  da senha do banco — nenhuma chave administrativa.
- Nunca coloque secrets no repositório público do site.

## Backup manual (sem GitHub)

Na pasta do projeto, rode:

```bash
scripts/backup-banco.sh
```

O script descobre o projeto pelo `js/config.js`, pede a senha do banco (sem mostrar na
tela) e grava `Backup/backup-supabase-AAAA-MM-DD.sql`. Depois é só copiar esse arquivo
para a pasta privada do Drive. O `pg_dump` do sistema precisa ser da versão 17.

## Backup automático no GitHub — passo a passo detalhado

### Passo 1 — repositório privado ✅ já feito

Você criou `saas-psicologia-backup`. Confira se está **Private** (cadeado).

### Passo 2 — senha do banco ✅ já conhecida

É a senha criada com o projeto Supabase. Se não souber:
Supabase → **Project Settings → Database → Reset database password**.

> ⚠️ Se você resetar a senha, o backup automático para até atualizar o secret do
> GitHub (Passo 3). A chave anon do site **não** muda.

### Passo 3 — secret `SUPABASE_DB_PASSWORD` (novo)

No repo `saas-psicologia-backup`: **Settings → Secrets and variables → Actions →
New repository secret**.

- Name exato: `SUPABASE_DB_PASSWORD`
- Value: a senha do banco **como ela é**, com espaço e caracteres especiais, sem
  codificar e sem colchetes. Exemplo: `MinhaSenha 123!@#`

> Por que mudou? O secret antigo `SUPABASE_DB_URL` exigia que a senha fosse codificada
> dentro da URL (`%20` para espaço, `%40` para `@` etc.). Com senhas que têm espaço,
> isso dava `exit 1`. Agora o workflow recebe a senha separadamente por `PGPASSWORD`
> e não tem esse problema. O secret antigo pode ficar — ele simplesmente não é usado.
>
> O GitHub nunca mostra o valor de um secret depois de salvo. Se errar, crie de novo
> com o mesmo nome para substituir.

### Passo 4 — atualizar o arquivo do workflow

No repo `saas-psicologia-backup`:

1. Abra `.github/workflows/backup.yml` (o arquivo que você criou antes).
2. Clique no lápis (**Edit**).
3. Apague **todo** o conteúdo e cole o YAML que está no fim deste arquivo.
4. Clique em **Commit changes** (direto na `main`).

> Isso também elimina o aviso "Node.js 20 is deprecated": o novo modelo usa
> `actions/checkout@v5`.

### Passo 5 — testar

1. Aba **Actions** → **Backup Supabase - semanal (Psicologia)**.
2. **Run workflow** → **Run workflow**.
3. Após cerca de 1 minuto, o run deve ficar verde. Confira:
   - passo "Gerar dump do banco" sem erro;
   - passo "Salvar no repositorio";
   - no repo, `backups/backup-AAAA-MM-DD.dump` com tamanho > 0.
4. Se aparecer "Secret SUPABASE_DB_PASSWORD nao configurado", volte ao Passo 3.

### Passo 6 — rotina

- Todo domingo às 07:00 de Brasília o workflow roda sozinho. Isso também ajuda o
  plano Free, que pausa o projeto após 1 semana sem acesso.
- Para levar ao Drive: baixe o `.dump` mais recente do repo privado, salve na pasta
  local `Backup/` e depois na pasta privada do Drive.

## Restaurando

```bash
pg_restore --clean --if-exists --no-owner --no-acl \
  -d "SUA_SUPABASE_DB_URL" backups/backup-AAAA-MM-DD.dump
```

## Observações

- O dump usa `--schema=public`: traz tabelas, funções, regras RLS e todos os dados do
  sistema. Não traz usuários de login (Auth) nem configurações do projeto — esses
  ficam no Supabase.
- O histórico do Git guarda todos os dumps. Se o repo crescer muito, apague os mais
  antigos (o histórico mantém uma cópia).
- Dumps contêm dados de pacientes: repositório privado e pasta do Drive privada, sempre.

## Conteúdo de `Backup/backup-semanal.yml` (cole no Passo 4)

```yaml
name: Backup Supabase - semanal (Psicologia)

on:
  schedule:
    - cron: '0 10 * * 0'   # domingo 10:00 UTC = 07:00 de Brasília
  workflow_dispatch:

permissions:
  contents: write

jobs:
  backup:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5

      - name: Instalar cliente PostgreSQL 17
        run: |
          sudo install -d /usr/share/postgresql-common/pgdg
          sudo curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
            -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
          echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" \
            | sudo tee /etc/apt/sources.list.d/pgdg.list
          sudo apt-get update
          sudo apt-get install -y postgresql-client-17

      - name: Gerar dump do banco
        env:
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          if [ -z "$SUPABASE_DB_PASSWORD" ]; then
            echo "::error::Secret SUPABASE_DB_PASSWORD nao configurado"
            exit 1
          fi
          mkdir -p backups
          ARQUIVO="backups/backup-$(date +'%Y-%m-%d').dump"
          PGPASSWORD="$SUPABASE_DB_PASSWORD" /usr/lib/postgresql/17/bin/pg_dump \
            --host=aws-0-sa-east-1.pooler.supabase.com \
            --port=5432 \
            --username=postgres.wrdkbafdzjsqonyidrwv \
            --dbname=postgres \
            --format=custom \
            --schema=public \
            --no-owner --no-privileges \
            --file="$ARQUIVO"
          test -s "$ARQUIVO"
          ls -lh "$ARQUIVO"

      - name: Salvar no repositorio
        run: |
          git config user.name "backup-bot"
          git config user.email "backup-bot@users.noreply.github.com"
          git add backups
          if ! git diff --cached --quiet; then
            git commit -m "backup automatico $(date +'%Y-%m-%d')"
            git push
          fi
```
