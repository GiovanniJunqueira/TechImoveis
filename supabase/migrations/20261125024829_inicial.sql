-- Tech Imóveis: estrutura inicial (Fase 1)
-- Multitenância: toda tabela de negócio tem tenant_id e é protegida por RLS.
-- Valores em dinheiro sempre em centavos (bigint).

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ============================================================
-- Tenants e membros
-- ============================================================

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor_destaque text not null default '#0a84ff' check (cor_destaque ~ '^#[0-9a-fA-F]{6}$'),
  logo_url text,
  plano text not null default 'gratis',
  criado_em timestamptz not null default now()
);

create type public.papel_membro as enum ('dono', 'corretor', 'gestor');

create table public.membros_tenant (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_membro not null default 'dono',
  criado_em timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index membros_tenant_user_idx on public.membros_tenant (user_id);

create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  creci text,
  telefone text,
  foto_url text,
  atualizado_em timestamptz not null default now()
);

-- O usuário é membro deste tenant? (consulta interna, fora do schema exposto)
create or replace function private.e_membro(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros_tenant m
    where m.tenant_id = p_tenant and m.user_id = (select auth.uid())
  );
$$;

-- Tenant padrão do usuário logado (usado como default de tenant_id)
create or replace function private.tenant_atual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.tenant_id from public.membros_tenant m
  where m.user_id = (select auth.uid())
  order by m.criado_em
  limit 1;
$$;

revoke execute on function private.e_membro(uuid), private.tenant_atual() from public, anon;
grant execute on function private.e_membro(uuid), private.tenant_atual() to authenticated;

-- Ao criar conta: cria perfil, tenant e vínculo de dono
create or replace function private.ao_criar_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid;
  v_nome text := coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1));
begin
  insert into public.perfis (user_id, nome) values (new.id, v_nome);
  insert into public.tenants (nome) values (v_nome) returning id into v_tenant;
  insert into public.membros_tenant (tenant_id, user_id, papel) values (v_tenant, new.id, 'dono');
  return new;
end;
$$;
revoke execute on function private.ao_criar_usuario() from public, anon, authenticated;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function private.ao_criar_usuario();

-- atualizado_em automático
create or replace function private.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ============================================================
-- Cadastros
-- ============================================================

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  cpf text,
  rg text,
  email text,
  telefone text,
  data_nascimento date,
  estado_civil text,
  profissao text,
  renda_centavos bigint check (renda_centavos >= 0),
  endereco jsonb,
  origem text,
  tags text[] not null default '{}',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, id)
);
create index clientes_tenant_nome_idx on public.clientes (tenant_id, nome);

create table public.construtoras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  cnpj text,
  contato text,
  criado_em timestamptz not null default now(),
  unique (tenant_id, id)
);
create index construtoras_tenant_idx on public.construtoras (tenant_id);

create table public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  construtora_id uuid,
  nome text not null check (length(trim(nome)) > 0),
  cidade text,
  endereco text,
  previsao_entrega date,
  criado_em timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, construtora_id) references public.construtoras (tenant_id, id) on delete set null (construtora_id)
);
create index empreendimentos_tenant_idx on public.empreendimentos (tenant_id);
create index empreendimentos_construtora_idx on public.empreendimentos (tenant_id, construtora_id);

-- Imobiliária / corretora parceira
create table public.imobiliarias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  contato text,
  criado_em timestamptz not null default now(),
  unique (tenant_id, id)
);
create index imobiliarias_tenant_idx on public.imobiliarias (tenant_id);

-- ============================================================
-- Vendas e comissões
-- ============================================================

create type public.tipo_venda as enum ('lancamento', 'pronto', 'revenda');
create type public.status_venda as enum ('proposta', 'fechada', 'distrato');

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  tipo public.tipo_venda not null default 'lancamento',
  construtora_id uuid,
  empreendimento_id uuid,
  imobiliaria_id uuid,
  imovel_descricao text,          -- usado quando não há empreendimento cadastrado (revenda, pronto)
  unidade text,
  valor_venda_centavos bigint not null check (valor_venda_centavos > 0),
  data_venda date not null default current_date,
  status public.status_venda not null default 'fechada',
  comissao_percentual numeric(5, 2) check (comissao_percentual between 0 and 100),
  comissao_centavos bigint not null default 0 check (comissao_centavos >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, cliente_id) references public.clientes (tenant_id, id) on delete restrict,
  foreign key (tenant_id, construtora_id) references public.construtoras (tenant_id, id) on delete set null (construtora_id),
  foreign key (tenant_id, empreendimento_id) references public.empreendimentos (tenant_id, id) on delete set null (empreendimento_id),
  foreign key (tenant_id, imobiliaria_id) references public.imobiliarias (tenant_id, id) on delete set null (imobiliaria_id)
);
create index vendas_tenant_data_idx on public.vendas (tenant_id, data_venda desc);
create index vendas_cliente_idx on public.vendas (tenant_id, cliente_id);
create index vendas_construtora_idx on public.vendas (tenant_id, construtora_id);
create index vendas_empreendimento_idx on public.vendas (tenant_id, empreendimento_id);
create index vendas_imobiliaria_idx on public.vendas (tenant_id, imobiliaria_id);

create type public.pagador_tipo as enum ('cliente', 'construtora', 'imobiliaria', 'outro');
create type public.forma_pagamento as enum ('pix', 'ted', 'boleto', 'dinheiro', 'cheque', 'outro');

-- Cada parcela de comissão (uma venda pode ter uma ou várias)
create table public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  venda_id uuid not null,
  pagador_tipo public.pagador_tipo not null default 'cliente',
  pagador_nome text,
  valor_previsto_centavos bigint not null check (valor_previsto_centavos > 0),
  data_prevista date not null,
  valor_recebido_centavos bigint check (valor_recebido_centavos >= 0),
  data_recebida date,
  forma public.forma_pagamento,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  foreign key (tenant_id, venda_id) references public.vendas (tenant_id, id) on delete cascade,
  check ((data_recebida is null) = (valor_recebido_centavos is null))
);
create index recebimentos_venda_idx on public.recebimentos (tenant_id, venda_id);
create index recebimentos_pendentes_idx on public.recebimentos (tenant_id, data_prevista) where data_recebida is null;

-- ============================================================
-- Documentos (arquivos ficam no Cloudflare R2; aqui só os metadados)
-- ============================================================

create type public.origem_documento as enum ('corretor', 'cliente');
create type public.status_documento as enum ('ok', 'pendente', 'recusado');

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  venda_id uuid,
  pasta text not null default 'Geral',
  nome text not null,
  chave_arquivo text not null unique,
  mime text,
  tamanho_bytes bigint check (tamanho_bytes >= 0),
  enviado_por public.origem_documento not null default 'corretor',
  status public.status_documento not null default 'ok',
  criado_em timestamptz not null default now(),
  foreign key (tenant_id, cliente_id) references public.clientes (tenant_id, id) on delete cascade,
  foreign key (tenant_id, venda_id) references public.vendas (tenant_id, id) on delete set null (venda_id)
);
create index documentos_cliente_idx on public.documentos (tenant_id, cliente_id, pasta);
create index documentos_venda_idx on public.documentos (tenant_id, venda_id);

-- ============================================================
-- Triggers de atualizado_em
-- ============================================================

create trigger tocar before update on public.perfis for each row execute function private.tocar_atualizado_em();
create trigger tocar before update on public.clientes for each row execute function private.tocar_atualizado_em();
create trigger tocar before update on public.vendas for each row execute function private.tocar_atualizado_em();
create trigger tocar before update on public.recebimentos for each row execute function private.tocar_atualizado_em();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.tenants enable row level security;
alter table public.membros_tenant enable row level security;
alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.construtoras enable row level security;
alter table public.empreendimentos enable row level security;
alter table public.imobiliarias enable row level security;
alter table public.vendas enable row level security;
alter table public.recebimentos enable row level security;
alter table public.documentos enable row level security;

-- Tenants: membros leem; só o dono altera (nome, cor, logo)
create policy tenants_ler on public.tenants for select to authenticated
  using ((select private.e_membro(id)));
create policy tenants_editar on public.tenants for update to authenticated
  using (exists (select 1 from public.membros_tenant m where m.tenant_id = tenants.id and m.user_id = (select auth.uid()) and m.papel = 'dono'))
  with check (exists (select 1 from public.membros_tenant m where m.tenant_id = tenants.id and m.user_id = (select auth.uid()) and m.papel = 'dono'));

-- Membros: cada um vê os vínculos dos próprios tenants (gestão de equipe vem depois)
create policy membros_ler on public.membros_tenant for select to authenticated
  using ((select private.e_membro(tenant_id)));

-- Perfis: o próprio usuário lê e edita o seu
create policy perfis_ler on public.perfis for select to authenticated
  using ((select auth.uid()) = user_id);
create policy perfis_editar on public.perfis for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Tabelas de negócio: acesso total apenas dentro do próprio tenant
do $$
declare t text;
begin
  foreach t in array array['clientes', 'construtoras', 'empreendimentos', 'imobiliarias', 'vendas', 'recebimentos', 'documentos']
  loop
    execute format(
      'create policy %1$s_tenant on public.%1$I for all to authenticated
         using ((select private.e_membro(tenant_id)))
         with check ((select private.e_membro(tenant_id)))',
      t
    );
  end loop;
end $$;

-- ============================================================
-- Permissões da API (sem acesso anônimo)
-- ============================================================

revoke all on all tables in schema public from anon;
grant select, update on public.tenants, public.perfis to authenticated;
grant select on public.membros_tenant to authenticated;
grant select, insert, update, delete on
  public.clientes, public.construtoras, public.empreendimentos, public.imobiliarias,
  public.vendas, public.recebimentos, public.documentos
to authenticated;
