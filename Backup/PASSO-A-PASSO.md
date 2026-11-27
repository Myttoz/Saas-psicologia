# Backup do SaaS de Psicologia

Duas formas, complementares:

1. **Manual**, no computador: `scripts/backup-banco.sh` → salva em `Backup/`.
2. **Automático**, no GitHub: todo domingo às 07:00 de Brasília, em um repositório privado.

## Diferenças em relação ao tutorial do app de finanças

- Use um repositório **novo e privado**, por exemplo `psicologia-backup`. Não misture com
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
para a pasta privada do Drive. O `pg_dump` do sistema já precisa ser da versão 17.

## Backup automático no GitHub

1. Crie o repositório **privado** `psicologia-backup` em https://github.com/new.
2. No Supabase: **Connect → Session pooler** → copie a connection string e troque a senha.
   Se a senha tiver caracteres especiais, codifique na URL (`@` → `%40`, `#` → `%23`).
3. No GitHub, no repo `psicologia-backup`:
   **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `SUPABASE_DB_URL`
   - Value: a connection string do passo 2
4. Copie o arquivo deste projeto `Backup/backup-semanal.yml` para
   `.github/workflows/backup.yml` no repo privado (via GitHub, criando o arquivo).
5. Aba **Actions** → workflow **Backup Supabase - semanal (Psicologia)** →
   **Run workflow**. Após cerca de 1 minuto o run deve ficar verde e aparecer
   `backups/backup-AAAA-MM-DD.dump` com tamanho maior que zero.
6. Pronto: toda domingo às 07:00 (Brasília) ele roda sozinho. Isso também ajuda o
   plano Free, que pausa o projeto após 1 semana sem acesso.
7. Para levar ao Drive: baixe o `.dump` mais recente do repo privado, salve na pasta
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
