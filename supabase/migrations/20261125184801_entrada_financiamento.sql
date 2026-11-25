-- Tech Imóveis: entrada (com a construtora) separada do financiamento (com o banco),
-- e modelos de plano de pagamento por construtora, inclusive modelos do sistema.
--
-- Na planta, o cliente paga a ENTRADA parcelada direto à construtora (ato, mensais,
-- intercaladas, chaves...) e o resto vem do BANCO (financiamento, FGTS, subsídio).
-- O grupo de cada série é derivado do tipo (ver src/lib/plano.ts).

alter type public.tipo_serie add value if not exists 'ato' before 'sinal';
alter type public.tipo_serie add value if not exists 'fgts' after 'financiamento';
alter type public.tipo_serie add value if not exists 'subsidio' after 'fgts';

-- Banco do financiamento da venda (ex.: Caixa)
alter table public.vendas add column banco_financiamento text;

-- Modelos: descrição das regras da construtora e modelos do sistema (tenant_id nulo,
-- visíveis a todos, ligados à construtora pelo nome).
alter table public.modelos_pagamento
  alter column tenant_id drop not null,
  add column descricao text,
  add column construtora_nome text,
  add column atualizado_em timestamptz not null default now(),
  add constraint modelos_sistema_por_nome check (tenant_id is not null or (construtora_id is null and construtora_nome is not null));

create trigger tocar before update on public.modelos_pagamento for each row execute function private.tocar_atualizado_em();

drop policy modelos_pagamento_tenant on public.modelos_pagamento;
create policy modelos_ler on public.modelos_pagamento for select to authenticated
  using (tenant_id is null or (select private.e_membro(tenant_id)));
create policy modelos_inserir on public.modelos_pagamento for insert to authenticated
  with check (tenant_id is not null and (select private.e_membro(tenant_id)));
create policy modelos_editar on public.modelos_pagamento for update to authenticated
  using (tenant_id is not null and (select private.e_membro(tenant_id)))
  with check (tenant_id is not null and (select private.e_membro(tenant_id)));
create policy modelos_excluir on public.modelos_pagamento for delete to authenticated
  using (tenant_id is not null and (select private.e_membro(tenant_id)));
