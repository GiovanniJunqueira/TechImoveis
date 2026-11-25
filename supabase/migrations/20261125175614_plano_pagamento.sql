-- Tech Imóveis: plano de pagamento do cliente (Fase 2)
-- O plano é guardado em séries (ex.: "36 mensais de R$ 1.200 a partir de jan/2027");
-- o cronograma parcela a parcela é calculado a partir delas.
-- Modelos por construtora guardam a mesma estrutura em percentuais do valor da venda.

create type public.tipo_serie as enum ('sinal', 'mensal', 'intercalada', 'anual', 'chaves', 'financiamento', 'outro');

create table public.plano_series (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  venda_id uuid not null,
  tipo public.tipo_serie not null,
  descricao text,
  quantidade int not null default 1 check (quantidade between 1 and 600),
  valor_total_centavos bigint not null check (valor_total_centavos > 0),
  primeiro_vencimento date,
  intervalo_meses int not null default 0 check (intervalo_meses between 0 and 60),
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  foreign key (tenant_id, venda_id) references public.vendas (tenant_id, id) on delete cascade
);
create index plano_series_venda_idx on public.plano_series (tenant_id, venda_id, ordem);

create table public.modelos_pagamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  construtora_id uuid,
  nome text not null check (length(trim(nome)) > 0),
  -- [{tipo, descricao, quantidade, percentual, intervalo_meses, defasagem_meses}]
  series jsonb not null default '[]' check (jsonb_typeof(series) = 'array'),
  criado_em timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, construtora_id) references public.construtoras (tenant_id, id) on delete cascade
);
create index modelos_pagamento_construtora_idx on public.modelos_pagamento (tenant_id, construtora_id);

alter table public.plano_series enable row level security;
alter table public.modelos_pagamento enable row level security;

create policy plano_series_tenant on public.plano_series for all to authenticated
  using ((select private.e_membro(tenant_id)))
  with check ((select private.e_membro(tenant_id)));
create policy modelos_pagamento_tenant on public.modelos_pagamento for all to authenticated
  using ((select private.e_membro(tenant_id)))
  with check ((select private.e_membro(tenant_id)));

revoke all on public.plano_series, public.modelos_pagamento from anon;
grant select, insert, update, delete on public.plano_series, public.modelos_pagamento to authenticated;
