-- ============================================================================
-- Banco online do sistema de atendimentos (Supabase / PostgreSQL)
-- Rode este arquivo uma vez no SQL Editor do Supabase.
-- Cada pessoa logada enxerga SOMENTE os próprios dados (RLS ligada).
-- ============================================================================

create table if not exists public.dados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  conteudo jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

comment on table public.dados is
  'Uma linha por profissional, com pacientes, lançamentos, evoluções e recibo em JSON.';

alter table public.dados enable row level security;

-- Remove Policies antigas para poder rodar o arquivo mais de uma vez
drop policy if exists "Leitura pelo dono" on public.dados;
drop policy if exists "Inserção pelo dono" on public.dados;
drop policy if exists "Atualização pelo dono" on public.dados;
drop policy if exists "Exclusão pelo dono" on public.dados;

create policy "Leitura pelo dono"
  on public.dados for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Inserção pelo dono"
  on public.dados for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Atualização pelo dono"
  on public.dados for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Exclusão pelo dono"
  on public.dados for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.dados to authenticated;

-- Defesa em profundidade: nem anon nem o público em geral acessam a tabela,
-- mesmo que alguma permissão padrão do Supabase apareça no futuro.
revoke all on public.dados from anon, public;
alter default privileges in schema public revoke all on tables from anon;

-- Evita que uma conta envie um JSON gigante e estoure o armazenamento.
alter table public.dados drop constraint if exists dados_conteudo_tamanho;
alter table public.dados add constraint dados_conteudo_tamanho
  check (pg_column_size(conteudo) < 5 * 1024 * 1024);

-- Fim. Para criar a pessoa que vai entrar no sistema:
-- Authentication -> Users -> Add user -> informe e-mail e senha.
