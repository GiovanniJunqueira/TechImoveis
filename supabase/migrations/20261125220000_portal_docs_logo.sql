-- Tech Imóveis: documentos liberados para o cliente no portal + logo da empresa.
--
-- O corretor marca documentos dele (ex.: o contrato) como "visível no portal". O cliente vê
-- esses e os que ele mesmo enviou. O download também passa por função security definer
-- (portal_documento), que confere a sessão antes de devolver a chave do arquivo.

alter table public.documentos add column visivel_cliente boolean not null default false;

-- ------------------------------------------------------------
-- Tela de entrada: agora com o logo da empresa.
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
    'logo_url', t.logo_url,
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
-- Tudo o que o cliente vê. Documentos: os que ele enviou + os liberados pelo corretor.
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
    'logo_url', t.logo_url,
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
        'tamanho_bytes', d.tamanho_bytes, 'criado_em', d.criado_em,
        'enviado_por', d.enviado_por, 'visivel', d.visivel_cliente
      ) order by d.criado_em desc)
      from public.documentos d
      where d.tenant_id = l.tenant_id and d.cliente_id = l.cliente_id
        and (d.enviado_por = 'cliente' or d.visivel_cliente)
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
-- Abrir/baixar um documento no portal: devolve a chave só se a sessão vale e o documento
-- é do mesmo cliente e foi enviado por ele ou liberado pelo corretor.
-- ------------------------------------------------------------
create or replace function public.portal_documento(p_link text, p_sessao text, p_documento uuid)
returns table (nome text, mime text, chave_arquivo text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.links_portal;
begin
  select * into l from private.portal_sessao(p_link, p_sessao);
  if l.id is null then return; end if;
  return query
    select d.nome, d.mime, d.chave_arquivo
    from public.documentos d
    where d.id = p_documento and d.tenant_id = l.tenant_id and d.cliente_id = l.cliente_id
      and (d.visivel_cliente or d.enviado_por = 'cliente');
end;
$$;

revoke all on function public.portal_documento(text, text, uuid) from public;
grant execute on function public.portal_documento(text, text, uuid) to anon, authenticated;
