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
  da URL de conexão — nenhuma chave administrativa.
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

### Passo 2 — connection string do Supabase ✅ já feito

Supabase → **Connect** → aba **Session pooler** → copiar a URI. Ela deve estar assim
(com a senha real no lugar de `[YOUR-PASSWORD]`):

```
postgresql://postgres.wrdkbafdzjsqonyidrwv:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

Se a senha tiver caracteres especiais, codifique na URL (`@` → `%40`, `#` → `%23`).
Não use a opção "Transaction pooler".

### Passo 3 — secret `SUPABASE_DB_URL` ✅ já feito

No repo `saas-psicologia-backup`: **Settings → Secrets and variables → Actions →
New repository secret**. Nome exato: `SUPABASE_DB_URL`. Valor: a URI do passo 2.

> O GitHub **nunca mostra o valor de um secret depois de salvo**. Se você deixou
> `[YOUR-PASSWORD]` na URL, crie o secret de novo com o mesmo nome e a URL corrigida
> (ele substitui o anterior).

### Passo 4 — criar o arquivo do workflow (o que faltava)

Não existe arquivo ainda — você vai **criar** ele pelo site do GitHub:

1. Abra o repositório `saas-psicologia-backup` no GitHub.
2. No meio da página, clique em **Add file** → **Create new file**.
3. No campo **Name your file...**, digite exatamente:

   ```
   .github/workflows/backup.yml
   ```

   Não precisa criar as pastas antes: ao digitar as barras, o próprio GitHub cria
   `.github/` e `workflows/`. Se aparecer um aviso de que Pastas foram detectadas,
   está certo.
4. No campo grande de texto, apague tudo que tiver e cole o conteúdo de
   `Backup/backup-semanal.yml` deste projeto (está no fim deste tutorial).
5. Role a página até o fim. Em **Commit new file**, deixe marcado
   **Commit directly to the `main` branch** e clique em **Commit new file**.

Depois disso, a pasta `.github/workflows/` e o arquivo `backup.yml` aparecem na lista
de arquivos do repositório.

### Passo 5 — testar

1. Aba **Actions** → à esquerda, clique em **Backup Supabase - semanal (Psicologia)**.
2. Botão **Run workflow** → **Run workflow**.
3. Após cerca de 1 minuto, o run deve ficar verde. Abra o run e confira:
   - o passo "Gerar dump do banco" sem erro;
   - o passo "Salvar no repositorio";
   - no repo, a pasta `backups/` com `backup-AAAA-MM-DD.dump` (tamanho > 0).
4. Se der erro "Secret SUPABASE_DB_URL nao configurado", volte ao Passo 3.

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

## Conteúdo de `Backup/backup-semanal.yml` (copie no Passo 4)

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
      - uses: actions/checkout@v4

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
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          if [ -z "$SUPABASE_DB_URL" ]; then
            echo "::error::Secret SUPABASE_DB_URL nao configurado"
            exit 1
          fi
          mkdir -p backups
          ARQUIVO="backups/backup-$(date +'%Y-%m-%d').dump"
          /usr/lib/postgresql/17/bin/pg_dump "$SUPABASE_DB_URL" \
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
