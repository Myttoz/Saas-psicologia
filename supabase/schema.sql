-- ============================================================================
-- Banco online do sistema de atendimentos (Supabase / PostgreSQL)
-- Rode este arquivo uma vez no SQL Editor do Supabase. Pode ser rodado de novo
-- sem apagar dados: as políticas são recriadas, as tabelas permanecem.
-- Cada pessoa logada enxerga SOMENTE os próprios dados (RLS ligada).
-- ============================================================================

-- ---------- 1. Dados do sistema ----------

create table if not exists public.dados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  conteudo jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

comment on table public.dados is
  'Uma linha por profissional, com pacientes, lançamentos, evoluções cifradas e recibo em JSON.';

alter table public.dados enable row level security;

-- Remove políticas antigas para poder rodar o arquivo mais de uma vez
drop policy if exists "Leitura pelo dono" on public.dados;
drop policy if exists "Inserção pelo dono" on public.dados;
drop policy if exists "Atualização pelo dono" on public.dados;
drop policy if exists "Exclusão pelo dono" on public.dados;
drop policy if exists "Exige segundo fator quando ativado" on public.dados;

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

-- ---------- 2. Trilha de acesso (auditoria) ----------

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  acao text not null check (char_length(acao) <= 120),
  detalhe text not null default '' check (char_length(detalhe) <= 300)
);

comment on table public.auditoria is
  'Registros de acesso ao prontuário. Só é permitido ler e inserir; nunca editar ou apagar pela internet.';

create index if not exists auditoria_user_criado_idx
  on public.auditoria (user_id, criado_em desc);

alter table public.auditoria enable row level security;

drop policy if exists "Ler a própria trilha" on public.auditoria;
drop policy if exists "Registrar na própria trilha" on public.auditoria;
drop policy if exists "Exige segundo fator quando ativado" on public.auditoria;

create policy "Ler a própria trilha"
  on public.auditoria for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Registrar na própria trilha"
  on public.auditoria for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.auditoria to authenticated;
revoke all on public.auditoria from anon, public;

-- ---------- 3. Exigir o 2º fator em contas que ativaram MFA ----------
-- Quem não ativou continua entrando só com senha. Quem ativou precisa ter
-- feito o desafio do aplicativo (aal2) para ler ou gravar dados e trilha.

create or replace function public.usuario_tem_mfa(uid uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.mfa_factors
    where user_id = uid
      and status = 'verified'
      and factor_type in ('totp', 'phone')
  );
$$;

comment on function public.usuario_tem_mfa(uuid) is
  'Informa se a conta ativou um segundo fator. Função security definer: o navegador não precisa de acesso à tabela auth.mfa_factors.';

revoke all on function public.usuario_tem_mfa(uuid) from public, anon;
grant execute on function public.usuario_tem_mfa(uuid) to authenticated;

create policy "Exige segundo fator quando ativado"
  on public.dados as restrictive
  to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

create policy "Exige segundo fator quando ativado"
  on public.auditoria as restrictive
  to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

-- Fim. Para criar a pessoa que vai entrar no sistema:
-- Authentication -> Users -> Add user -> informe e-mail e senha.
