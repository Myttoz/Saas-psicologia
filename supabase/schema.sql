-- ============================================================================
-- Banco online do sistema de atendimentos (Supabase / PostgreSQL)
-- Rode este arquivo uma vez no SQL Editor do Supabase. Pode ser rodado de novo
-- sem apagar dados: as políticas são recriadas, as tabelas permanecem.
-- Cada pessoa logada enxerga SOMENTE os próprios dados (RLS ligada).
-- ============================================================================

create extension if not exists pgcrypto;

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

-- ---------- 4. Portal do paciente ----------
-- O profissional continua vendo só o próprio JSON em public.dados.
-- O paciente NUNCA lê essa tabela: ele acessa só estas tabelas pequenas,
-- ligadas ao paciente por id (nunca por nome).

create table if not exists public.portal_pacientes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references auth.users(id) on delete cascade,
  paciente_id text not null,
  nome text not null default '',
  email text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (profissional_id, paciente_id)
);

comment on table public.portal_pacientes is
  'Vínculo entre a conta da psicóloga e o id do paciente usado no sistema. Nunca use nome como chave.';

create index if not exists portal_pacientes_profissional_idx
  on public.portal_pacientes (profissional_id);

alter table public.portal_pacientes enable row level security;

drop policy if exists "Profissional lê seus pacientes do portal" on public.portal_pacientes;
drop policy if exists "Profissional cria paciente do portal" on public.portal_pacientes;
drop policy if exists "Profissional edita paciente do portal" on public.portal_pacientes;
drop policy if exists "Profissional remove paciente do portal" on public.portal_pacientes;
drop policy if exists "Paciente lê o próprio vínculo" on public.portal_pacientes;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_pacientes;

create policy "Profissional lê seus pacientes do portal"
  on public.portal_pacientes for select to authenticated
  using (auth.uid() = profissional_id);

create policy "Profissional cria paciente do portal"
  on public.portal_pacientes for insert to authenticated
  with check (auth.uid() = profissional_id);

create policy "Profissional edita paciente do portal"
  on public.portal_pacientes for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy "Profissional remove paciente do portal"
  on public.portal_pacientes for delete to authenticated
  using (auth.uid() = profissional_id);

create policy "Exige segundo fator quando ativado"
  on public.portal_pacientes as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, insert, update, delete on public.portal_pacientes to authenticated;
revoke all on public.portal_pacientes from anon, public;

-- ---------- 4.1 Convites ----------
-- O site envia o link mágico pelo Supabase Auth. Esta tabela só guarda
-- para qual paciente o e-mail convidado está sendo liberado.

create table if not exists public.portal_convites (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references auth.users(id) on delete cascade,
  paciente_portal_id uuid not null references public.portal_pacientes(id) on delete cascade,
  email text not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '2 days'),
  aceito_em timestamptz
);

comment on table public.portal_convites is
  'Convite por e-mail. O paciente não lê esta tabela diretamente; quem aceita é a função portal_aceitar_convite.';

create index if not exists portal_convites_email_idx on public.portal_convites (lower(email));
create index if not exists portal_convites_profissional_idx on public.portal_convites (profissional_id);

alter table public.portal_convites enable row level security;

drop policy if exists "Profissional lê convites" on public.portal_convites;
drop policy if exists "Profissional cria convite" on public.portal_convites;
drop policy if exists "Profissional atualiza convite" on public.portal_convites;
drop policy if exists "Profissional apaga convite" on public.portal_convites;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_convites;

create policy "Profissional lê convites"
  on public.portal_convites for select to authenticated
  using (auth.uid() = profissional_id);

create policy "Profissional cria convite"
  on public.portal_convites for insert to authenticated
  with check (auth.uid() = profissional_id);

create policy "Profissional atualiza convite"
  on public.portal_convites for update to authenticated
  using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy "Profissional apaga convite"
  on public.portal_convites for delete to authenticated
  using (auth.uid() = profissional_id);

create policy "Exige segundo fator quando ativado"
  on public.portal_convites as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, insert, update, delete on public.portal_convites to authenticated;
revoke all on public.portal_convites from anon, public;

-- ---------- 4.2 Acessos já aceitos ----------

create table if not exists public.portal_acessos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paciente_portal_id uuid not null references public.portal_pacientes(id) on delete cascade,
  criado_em timestamptz not null default now()
);

comment on table public.portal_acessos is
  'Depois do link mágico, liga a conta do paciente ao id do paciente. Um usuário, um paciente.';

create index if not exists portal_acessos_paciente_idx
  on public.portal_acessos (paciente_portal_id);

-- Helper security definer: evita recursão de RLS entre portal_pacientes e portal_acessos.
create or replace function public.portal_eh_profissional(ppid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portal_pacientes
    where id = ppid and profissional_id = auth.uid()
  );
$$;

revoke all on function public.portal_eh_profissional(uuid) from public, anon;
grant execute on function public.portal_eh_profissional(uuid) to authenticated;

alter table public.portal_acessos enable row level security;

drop policy if exists "Paciente lê o próprio acesso" on public.portal_acessos;
drop policy if exists "Profissional lê acessos dos seus pacientes" on public.portal_acessos;
drop policy if exists "Profissional revoga acesso" on public.portal_acessos;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_acessos;

create policy "Paciente lê o próprio acesso"
  on public.portal_acessos for select to authenticated
  using (auth.uid() = user_id);

create policy "Profissional lê acessos dos seus pacientes"
  on public.portal_acessos for select to authenticated
  using (public.portal_eh_profissional(paciente_portal_id));

create policy "Profissional revoga acesso"
  on public.portal_acessos for delete to authenticated
  using (public.portal_eh_profissional(paciente_portal_id));

create policy "Exige segundo fator quando ativado"
  on public.portal_acessos as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, delete on public.portal_acessos to authenticated;
revoke all on public.portal_acessos from anon, public;

-- Só agora a tabela de acessos existe: é segura para o paciente ler o vínculo.
drop policy if exists "Paciente lê o próprio vínculo" on public.portal_pacientes;
create policy "Paciente lê o próprio vínculo"
  on public.portal_pacientes for select to authenticated
  using (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_pacientes.id
    )
  );

-- ---------- 4.3 Recados ----------
-- A psicóloga inicia; o paciente responde. Nunca vira chat em tempo real.

create table if not exists public.portal_recados (
  id uuid primary key default gen_random_uuid(),
  paciente_portal_id uuid not null references public.portal_pacientes(id) on delete cascade,
  autor text not null check (autor in ('profissional', 'paciente')),
  texto text not null check (char_length(texto) between 1 and 2000),
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);

comment on table public.portal_recados is
  'Mensagens entre psicóloga e paciente. O paciente só pode escrever como paciente.';

create index if not exists portal_recados_paciente_idx
  on public.portal_recados (paciente_portal_id, criado_em desc);

alter table public.portal_recados enable row level security;

drop policy if exists "Profissional lê recados" on public.portal_recados;
drop policy if exists "Profissional escreve recado" on public.portal_recados;
drop policy if exists "Paciente lê recados" on public.portal_recados;
drop policy if exists "Paciente responde recado" on public.portal_recados;
drop policy if exists "Marca recado como lido" on public.portal_recados;
drop policy if exists "Profissional marca recado como lido" on public.portal_recados;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_recados;

create policy "Profissional lê recados"
  on public.portal_recados for select to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recados.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Profissional escreve recado"
  on public.portal_recados for insert to authenticated
  with check (
    autor = 'profissional'
    and exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recados.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Paciente lê recados"
  on public.portal_recados for select to authenticated
  using (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_recados.paciente_portal_id
    )
  );

create policy "Paciente responde recado"
  on public.portal_recados for insert to authenticated
  with check (
    autor = 'paciente'
    and exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_recados.paciente_portal_id
    )
  );

create policy "Marca recado como lido"
  on public.portal_recados for update to authenticated
  using (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_recados.paciente_portal_id
    )
  )
  with check (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_recados.paciente_portal_id
    )
  );

-- A psicóloga também precisa poder marcar a resposta da paciente como lida.
create policy "Profissional marca recado como lido"
  on public.portal_recados for update to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recados.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recados.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Exige segundo fator quando ativado"
  on public.portal_recados as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, insert on public.portal_recados to authenticated;
grant update (lido_em) on public.portal_recados to authenticated;
revoke all on public.portal_recados from anon, public;

-- ---------- 4.4 Recibos guardados ----------
-- Cópia do PDF emitido no app da Receita. O site não emite nem valida.

create table if not exists public.portal_recibos (
  id uuid primary key default gen_random_uuid(),
  paciente_portal_id uuid not null references public.portal_pacientes(id) on delete cascade,
  nome text not null default 'recibo.pdf',
  numero text not null default '',
  codigo text not null default '',
  conteudo_base64 text not null check (char_length(conteudo_base64) < 4 * 1024 * 1024),
  criado_em timestamptz not null default now()
);

comment on table public.portal_recibos is
  'Cópia do recibo oficial emitido no app Receita Federal, com número/código para conferência.';

create index if not exists portal_recibos_paciente_idx
  on public.portal_recibos (paciente_portal_id, criado_em desc);

alter table public.portal_recibos enable row level security;

drop policy if exists "Profissional lê recibos do portal" on public.portal_recibos;
drop policy if exists "Profissional guarda recibo" on public.portal_recibos;
drop policy if exists "Profissional remove recibo" on public.portal_recibos;
drop policy if exists "Paciente lê seus recibos" on public.portal_recibos;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_recibos;

create policy "Profissional lê recibos do portal"
  on public.portal_recibos for select to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recibos.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Profissional guarda recibo"
  on public.portal_recibos for insert to authenticated
  with check (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recibos.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Profissional remove recibo"
  on public.portal_recibos for delete to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_recibos.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Paciente lê seus recibos"
  on public.portal_recibos for select to authenticated
  using (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_recibos.paciente_portal_id
    )
  );

create policy "Exige segundo fator quando ativado"
  on public.portal_recibos as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, insert, delete on public.portal_recibos to authenticated;
revoke all on public.portal_recibos from anon, public;

-- ---------- 4.5 Próximas sessões ----------

create table if not exists public.portal_sessoes (
  id uuid primary key default gen_random_uuid(),
  paciente_portal_id uuid not null references public.portal_pacientes(id) on delete cascade,
  data_inicio timestamptz not null,
  descricao text not null default '',
  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  criado_em timestamptz not null default now()
);

comment on table public.portal_sessoes is
  'Só as sessões do paciente vinculado. A agenda completa da psicóloga continua apenas no JSON dela.';

create index if not exists portal_sessoes_paciente_idx
  on public.portal_sessoes (paciente_portal_id, data_inicio);

alter table public.portal_sessoes enable row level security;

drop policy if exists "Profissional lê sessões do portal" on public.portal_sessoes;
drop policy if exists "Profissional cria sessão no portal" on public.portal_sessoes;
drop policy if exists "Profissional edita sessão no portal" on public.portal_sessoes;
drop policy if exists "Profissional remove sessão do portal" on public.portal_sessoes;
drop policy if exists "Paciente vê só suas sessões" on public.portal_sessoes;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_sessoes;

create policy "Profissional lê sessões do portal"
  on public.portal_sessoes for select to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_sessoes.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Profissional cria sessão no portal"
  on public.portal_sessoes for insert to authenticated
  with check (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_sessoes.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Profissional edita sessão no portal"
  on public.portal_sessoes for update to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_sessoes.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_sessoes.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Profissional remove sessão do portal"
  on public.portal_sessoes for delete to authenticated
  using (
    exists (
      select 1 from public.portal_pacientes p
      where p.id = portal_sessoes.paciente_portal_id
        and p.profissional_id = auth.uid()
    )
  );

create policy "Paciente vê só suas sessões"
  on public.portal_sessoes for select to authenticated
  using (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_sessoes.paciente_portal_id
    )
  );

create policy "Exige segundo fator quando ativado"
  on public.portal_sessoes as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, insert, update, delete on public.portal_sessoes to authenticated;
revoke all on public.portal_sessoes from anon, public;

-- ---------- 4.6 Aceite do convite ----------
-- Roda no banco (security definer) para o navegador não precisar de permissão
-- de leitura da tabela de convites. Usa o e-mail que vem no próprio token do
-- link mágico; o paciente não escolhe qual paciente quer vincular.

create or replace function public.portal_aceitar_convite()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_convite public.portal_convites%rowtype;
begin
  v_email := nullif(lower(coalesce(auth.jwt()->>'email', '')), '');
  if v_email is null then
    raise exception 'E-mail não confirmado no link.';
  end if;

  select * into v_convite
  from public.portal_convites
  where lower(email) = v_email
    and aceito_em is null
    and expira_em > now()
  order by criado_em desc
  limit 1;

  if not found then
    raise exception 'Convite inválido ou expirado. Peça um novo convite.';
  end if;

  insert into public.portal_acessos (user_id, paciente_portal_id)
  values (auth.uid(), v_convite.paciente_portal_id)
  on conflict (user_id) do update
    set paciente_portal_id = excluded.paciente_portal_id,
        criado_em = now();

  update public.portal_convites
    set aceito_em = now()
    where id = v_convite.id;

  return v_convite.paciente_portal_id;
end;
$$;

comment on function public.portal_aceitar_convite() is
  'Liga a conta que clicou no link mágico ao paciente convidado. Nunca aceita id escolhido pelo navegador.';

revoke all on function public.portal_aceitar_convite() from public, anon;
grant execute on function public.portal_aceitar_convite() to authenticated;

-- ---------- 4.6 Consentimento e anamnese assinados ----------

create table if not exists public.portal_consentimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_portal_id uuid not null references public.portal_pacientes(id) on delete cascade,
  titulo text not null default 'Termo de consentimento'
    check (char_length(titulo) between 1 and 120),
  texto text not null check (char_length(texto) between 1 and 6000),
  assinado_em timestamptz,
  assinante_nome text not null default '' check (char_length(assinante_nome) <= 180),
  criado_em timestamptz not null default now()
);

comment on table public.portal_consentimentos is
  'Termos e anamnese enviados pela psicóloga. A paciente assina no portal com nome e data.';

create index if not exists portal_consentimentos_paciente_idx
  on public.portal_consentimentos (paciente_portal_id, criado_em desc);

alter table public.portal_consentimentos enable row level security;

drop policy if exists "Profissional lê consentimentos" on public.portal_consentimentos;
drop policy if exists "Profissional cria consentimento" on public.portal_consentimentos;
drop policy if exists "Profissional remove consentimento" on public.portal_consentimentos;
drop policy if exists "Paciente lê seus consentimentos" on public.portal_consentimentos;
drop policy if exists "Paciente assina consentimento" on public.portal_consentimentos;
drop policy if exists "Exige segundo fator quando ativado" on public.portal_consentimentos;

create policy "Profissional lê consentimentos"
  on public.portal_consentimentos for select to authenticated
  using (public.portal_eh_profissional(paciente_portal_id));

create policy "Profissional cria consentimento"
  on public.portal_consentimentos for insert to authenticated
  with check (
    public.portal_eh_profissional(paciente_portal_id) and assinado_em is null
  );

create policy "Profissional remove consentimento"
  on public.portal_consentimentos for delete to authenticated
  using (public.portal_eh_profissional(paciente_portal_id));

create policy "Paciente lê seus consentimentos"
  on public.portal_consentimentos for select to authenticated
  using (
    exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_consentimentos.paciente_portal_id
    )
  );

-- A paciente só pode preencher nome/data de uma assinatura ainda não feita.
create policy "Paciente assina consentimento"
  on public.portal_consentimentos for update to authenticated
  using (
    assinado_em is null
    and exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_consentimentos.paciente_portal_id
    )
  )
  with check (
    assinado_em is not null and char_length(assinante_nome) between 2 and 180
    and exists (
      select 1 from public.portal_acessos a
      where a.user_id = auth.uid()
        and a.paciente_portal_id = portal_consentimentos.paciente_portal_id
    )
  );

create policy "Exige segundo fator quando ativado"
  on public.portal_consentimentos as restrictive to authenticated
  using (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  )
  with check (
    not public.usuario_tem_mfa(auth.uid())
    or coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
  );

grant select, insert, delete on public.portal_consentimentos to authenticated;
grant update (assinado_em, assinante_nome) on public.portal_consentimentos to authenticated;
revoke all on public.portal_consentimentos from anon, public;

-- Fim. Para criar a conta da psicóloga:
-- Authentication -> Users -> Add user -> informe e-mail e senha.
-- Para o portal, a própria psicóloga envia o convite pelo botão no site.
