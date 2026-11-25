-- Tech Imóveis: portal do cliente (link sem senha).
--
-- O corretor gera um link com token aleatório longo. Só o HASH (sha256, hex) fica no banco.
-- Ao abrir, o cliente confirma os 4 últimos dígitos do CPF (ou a data de nascimento, se
-- não houver CPF). Acertou: o servidor cria uma sessão curta (também só o hash fica aqui).
-- Errou 5 vezes: o link trava por 15 minutos.
--
-- O visitante do portal é ANÔNIMO para o Supabase: ele não lê tabela nenhuma. Tudo passa
-- pelas funções portal_* abaixo (security definer), que conferem link + sessão e devolvem
-- só o que o cliente pode ver: nunca comissão, recebimentos ou dados de outros clientes.

create table public.links_portal (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default private.tenant_atual() references public.tenants (id) on delete cascade,
  cliente_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  criado_por uuid references auth.users (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  revogado_em timestamptz,
  ultimo_acesso timestamptz,
  falhas int not null default 0,
  bloqueado_ate timestamptz,
  foreign key (tenant_id, cliente_id) references public.clientes (tenant_id, id) on delete cascade,
  check (expira_em > criado_em and expira_em <= criado_em + interval '180 days')
);
create index links_portal_cliente_idx on public.links_portal (tenant_id, cliente_id);

create table public.sessoes_portal (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  link_id uuid not null references public.links_portal (id) on delete cascade,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null
);
create index sessoes_portal_link_idx on public.sessoes_portal (link_id);

alter table public.links_portal enable row level security;
alter table public.sessoes_portal enable row level security;

-- Corretor: vê e gerencia os links do próprio tenant (revogar = update de revogado_em).
create policy links_portal_tenant on public.links_portal for all to authenticated
  using ((select private.e_membro(tenant_id)))
  with check ((select private.e_membro(tenant_id)));
grant select, insert, update, delete on public.links_portal to authenticated;
-- sessoes_portal: sem política e sem grant. Só as funções abaixo mexem nela.

-- ------------------------------------------------------------
-- Link válido (não revogado, não expirado). Interna.
-- ------------------------------------------------------------
create or replace function private.portal_link(p_link text)
returns public.links_portal
language sql
stable
security definer
set search_path = ''
as $$
  select l.* from public.links_portal l
  where l.token_hash = p_link and l.revogado_em is null and l.expira_em > now();
$$;

-- Sessão válida e do mesmo link. Interna.
create or replace function private.portal_sessao(p_link text, p_sessao text)
returns public.links_portal
language sql
stable
security definer
set search_path = ''
as $$
  select l.* from public.links_portal l
  join public.sessoes_portal s on s.link_id = l.id
  where l.token_hash = p_link and s.token_hash = p_sessao
    and l.revogado_em is null and l.expira_em > now() and s.expira_em > now();
$$;

revoke all on function private.portal_link(text), private.portal_sessao(text, text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- O que mostrar na tela de entrada (antes de confirmar o CPF).
-- Nulo se o link não vale. Não revela o nome do cliente.
-- ------------------------------------------------------------
create or replace function public.portal_info(p_link text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.links_portal;
  r jsonb;
begin
  select * into l from private.portal_link(p_link);
  if l.id is null then return null; end if;
  select jsonb_build_object(
    'empresa', t.nome,
    'cor', t.cor_destaque,
    'corretor', coalesce(nullif(p.nome, ''), t.nome),
    'pergunta', case when length(regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g')) >= 4 then 'cpf'
                     when c.data_nascimento is not null then 'nascimento'
                     else 'nenhuma' end,
    'bloqueado', coalesce(l.bloqueado_ate > now(), false)
  ) into r
  from public.tenants t
  join public.clientes c on c.tenant_id = t.id and c.id = l.cliente_id
  left join public.perfis p on p.user_id = l.criado_por
  where t.id = l.tenant_id;
  return r;
end;
$$;

-- ------------------------------------------------------------
-- Confere a resposta e, se certa, grava a sessão (hash gerado pelo servidor).
-- Retorna 'ok' | 'invalido' | 'bloqueado' | 'errado'.
-- ------------------------------------------------------------
create or replace function public.portal_entrar(p_link text, p_resposta text, p_sessao text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.links_portal;
  c public.clientes;
  cpf text;
  resposta text := regexp_replace(coalesce(p_resposta, ''), '\D', '', 'g');
  certo boolean;
begin
  if p_sessao !~ '^[0-9a-f]{64}$' then return 'invalido'; end if;
  select * into l from public.links_portal
    where token_hash = p_link and revogado_em is null and expira_em > now()
    for update;
  if l.id is null then return 'invalido'; end if;
  if l.bloqueado_ate > now() then return 'bloqueado'; end if;

  select * into c from public.clientes where tenant_id = l.tenant_id and id = l.cliente_id;
  cpf := regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g');
  if length(cpf) >= 4 then
    certo := length(resposta) = 4 and right(cpf, 4) = resposta;
  elsif c.data_nascimento is not null then
    certo := resposta = to_char(c.data_nascimento, 'DDMMYYYY');
  else
    return 'invalido';
  end if;

  if not certo then
    update public.links_portal
      set falhas = falhas + 1,
          bloqueado_ate = case when falhas + 1 >= 5 then now() + interval '15 minutes' else bloqueado_ate end
      where id = l.id;
    return case when l.falhas + 1 >= 5 then 'bloqueado' else 'errado' end;
  end if;

  update public.links_portal set falhas = 0, bloqueado_ate = null, ultimo_acesso = now() where id = l.id;
  delete from public.sessoes_portal where link_id = l.id and expira_em <= now();
  insert into public.sessoes_portal (token_hash, link_id, expira_em)
    values (p_sessao, l.id, least(now() + interval '12 hours', l.expira_em));
  return 'ok';
end;
$$;

-- ------------------------------------------------------------
-- Tudo o que o cliente vê no portal. Nulo se a sessão não vale.
-- ------------------------------------------------------------
create or replace function public.portal_dados(p_link text, p_sessao text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.links_portal;
  r jsonb;
begin
  select * into l from private.portal_sessao(p_link, p_sessao);
  if l.id is null then return null; end if;

  select jsonb_build_object(
    'empresa', t.nome,
    'cor', t.cor_destaque,
    'expira_em', l.expira_em,
    'cliente', jsonb_build_object('nome', c.nome),
    'corretor', jsonb_build_object('nome', coalesce(p.nome, ''), 'creci', p.creci, 'telefone', p.telefone),
    'vendas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'status', v.status,
        'unidade', v.unidade,
        'imovel', coalesce(e.nome, v.imovel_descricao),
        'construtora', co.nome,
        'valor_venda_centavos', v.valor_venda_centavos,
        'data_venda', v.data_venda,
        'banco', v.banco_financiamento,
        'series', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', s.id, 'tipo', s.tipo, 'descricao', s.descricao, 'quantidade', s.quantidade,
            'valor_total_centavos', s.valor_total_centavos, 'primeiro_vencimento', s.primeiro_vencimento,
            'intervalo_meses', s.intervalo_meses
          ) order by s.ordem, s.criado_em)
          from public.plano_series s where s.tenant_id = v.tenant_id and s.venda_id = v.id
        ), '[]'::jsonb)
      ) order by v.data_venda desc)
      from public.vendas v
      left join public.empreendimentos e on e.id = v.empreendimento_id
      left join public.construtoras co on co.id = v.construtora_id
      where v.tenant_id = l.tenant_id and v.cliente_id = l.cliente_id and v.status <> 'distrato'
    ), '[]'::jsonb),
    'documentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id, 'nome', d.nome, 'pasta', d.pasta, 'status', d.status,
        'tamanho_bytes', d.tamanho_bytes, 'criado_em', d.criado_em
      ) order by d.criado_em desc)
      from public.documentos d
      where d.tenant_id = l.tenant_id and d.cliente_id = l.cliente_id and d.enviado_por = 'cliente'
    ), '[]'::jsonb)
  ) into r
  from public.tenants t
  join public.clientes c on c.tenant_id = t.id and c.id = l.cliente_id
  left join public.perfis p on p.user_id = l.criado_por
  where t.id = l.tenant_id;
  return r;
end;
$$;

-- ------------------------------------------------------------
-- Envio de documento pelo cliente. O servidor salva o arquivo e depois registra aqui.
-- portal_destino diz onde salvar (prefixo da chave); portal_registrar_documento confere
-- de novo a sessão e o prefixo, e limita o volume.
-- ------------------------------------------------------------
create or replace function public.portal_destino(p_link text, p_sessao text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.links_portal;
begin
  select * into l from private.portal_sessao(p_link, p_sessao);
  if l.id is null then return null; end if;
  return format('tenants/%s/clientes/%s/portal/', l.tenant_id, l.cliente_id);
end;
$$;

create or replace function public.portal_registrar_documento(
  p_link text, p_sessao text, p_pasta text, p_nome text, p_chave text, p_mime text, p_tamanho bigint
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.links_portal;
  novo uuid;
begin
  select * into l from private.portal_sessao(p_link, p_sessao);
  if l.id is null then raise exception 'sessao invalida'; end if;
  if left(p_chave, length(format('tenants/%s/clientes/%s/portal/', l.tenant_id, l.cliente_id)))
     <> format('tenants/%s/clientes/%s/portal/', l.tenant_id, l.cliente_id) then
    raise exception 'chave invalida';
  end if;
  if p_pasta not in ('Pessoais', 'Renda', 'Contrato', 'Outros') then raise exception 'pasta invalida'; end if;
  if (select count(*) from public.documentos
      where tenant_id = l.tenant_id and cliente_id = l.cliente_id and enviado_por = 'cliente'
        and criado_em > now() - interval '1 day') >= 40 then
    raise exception 'limite diario';
  end if;

  insert into public.documentos (tenant_id, cliente_id, pasta, nome, chave_arquivo, mime, tamanho_bytes, enviado_por, status)
    values (l.tenant_id, l.cliente_id, p_pasta, left(p_nome, 200), p_chave, p_mime, p_tamanho, 'cliente', 'pendente')
    returning id into novo;
  return novo;
end;
$$;

-- Encerra a sessão (botão "Sair").
create or replace function public.portal_sair(p_sessao text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.sessoes_portal where token_hash = p_sessao;
$$;

revoke all on function
  public.portal_info(text),
  public.portal_entrar(text, text, text),
  public.portal_dados(text, text),
  public.portal_destino(text, text),
  public.portal_registrar_documento(text, text, text, text, text, text, bigint),
  public.portal_sair(text)
from public;
grant execute on function
  public.portal_info(text),
  public.portal_entrar(text, text, text),
  public.portal_dados(text, text),
  public.portal_destino(text, text),
  public.portal_registrar_documento(text, text, text, text, text, text, bigint),
  public.portal_sair(text)
to anon, authenticated;
