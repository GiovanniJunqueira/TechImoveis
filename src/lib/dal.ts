import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, type StatusComissao, type Venda } from "@/lib/vendas";
import { mesmaConstrutora, normalizarNome, type RegrasModelo, type SerieModelo } from "@/lib/plano";

/** Usuário logado, perfil e tenant. Redireciona para /entrar se não houver sessão. */
export const getContexto = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar");

  const [{ data: perfil }, { data: membro }] = await Promise.all([
    supabase.from("perfis").select("nome, creci, telefone").eq("user_id", userId).single(),
    supabase
      .from("membros_tenant")
      .select("papel, tenant:tenants(id, nome, cor_destaque, logo_url)")
      .eq("user_id", userId)
      .order("criado_em")
      .limit(1)
      .single(),
  ]);

  if (!membro?.tenant) redirect("/entrar?erro=sem-conta");

  return {
    supabase,
    userId,
    email: (data?.claims?.email as string | undefined) ?? "",
    perfil: perfil ?? { nome: "", creci: null, telefone: null },
    papel: membro.papel,
    tenant: membro.tenant,
  };
});

const TIPO_LABEL = { lancamento: "Lançamento", pronto: "Pronto", revenda: "Revenda" } as const;
const PAGADOR_LABEL = { cliente: "Cliente", construtora: "Construtora", imobiliaria: "Imobiliária", outro: "Outro" } as const;

export const listarVendas = cache(async (): Promise<Venda[]> => {
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("vendas")
    .select(
      `id, tipo, unidade, imovel_descricao, valor_venda_centavos, data_venda, comissao_centavos,
       cliente:clientes(id, nome),
       empreendimento:empreendimentos(nome),
       construtora:construtoras(nome),
       recebimentos(pagador_tipo, pagador_nome, valor_previsto_centavos, data_prevista, data_recebida)`,
    )
    .eq("tenant_id", tenant.id)
    .neq("status", "distrato")
    .order("data_venda", { ascending: false });
  if (error) throw error;

  const hoje = hojeISO();
  return data.map((v) => {
    const pendentes = v.recebimentos.filter((r) => !r.data_recebida).sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));
    const recebidos = v.recebimentos.filter((r) => r.data_recebida).sort((a, b) => b.data_recebida!.localeCompare(a.data_recebida!));
    let status: StatusComissao = "a_receber";
    if (v.recebimentos.length > 0 && pendentes.length === 0) status = "recebida";
    else if (pendentes[0] && pendentes[0].data_prevista < hoje) status = "atrasada";
    const ref = pendentes[0] ?? recebidos[0];

    return {
      id: v.id,
      cliente: v.cliente?.nome ?? "—",
      clienteId: v.cliente?.id ?? "",
      empreendimento: v.empreendimento?.nome ?? v.imovel_descricao ?? "Imóvel",
      construtora: v.construtora?.nome ?? "—",
      unidade: v.unidade ?? "—",
      tipo: TIPO_LABEL[v.tipo],
      data: v.data_venda,
      valorVenda: v.valor_venda_centavos,
      comissao: v.comissao_centavos,
      statusComissao: status,
      pagador: ref ? (ref.pagador_nome ?? PAGADOR_LABEL[ref.pagador_tipo]) : "Cliente",
      previsao: pendentes[0]?.data_prevista,
      recebidoEm: status === "recebida" ? recebidos[0]?.data_recebida ?? undefined : undefined,
    };
  });
});

export type ClienteLista = { id: string; nome: string; telefone: string | null; cpf: string | null; documentos: number; pendentes: number; vendas: number };

export const listarClientes = cache(async (): Promise<ClienteLista[]> => {
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone, cpf, vendas(count), documentos(status)")
    .eq("tenant_id", tenant.id)
    .order("nome");
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    cpf: c.cpf,
    vendas: c.vendas[0]?.count ?? 0,
    documentos: c.documentos.length,
    pendentes: c.documentos.filter((d) => d.status === "pendente").length,
  }));
});

/** Listas para o formulário de nova venda. */
export const opcoesVenda = cache(async () => {
  const { supabase, tenant } = await getContexto();
  const [clientes, construtoras, empreendimentos, imobiliarias] = await Promise.all([
    supabase.from("clientes").select("id, nome").eq("tenant_id", tenant.id).order("nome"),
    supabase.from("construtoras").select("nome").eq("tenant_id", tenant.id).order("nome"),
    supabase.from("empreendimentos").select("nome, construtora:construtoras(nome)").eq("tenant_id", tenant.id).order("nome"),
    supabase.from("imobiliarias").select("nome").eq("tenant_id", tenant.id).order("nome"),
  ]);
  for (const r of [clientes, construtoras, empreendimentos, imobiliarias]) if (r.error) throw r.error;
  return {
    clientes: clientes.data!,
    construtoras: construtoras.data!.map((c) => c.nome),
    empreendimentos: empreendimentos.data!.map((e) => ({ nome: e.nome, construtora: e.construtora?.nome ?? null })),
    imobiliarias: imobiliarias.data!.map((i) => i.nome),
  };
});

const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Ficha completa do cliente, com vendas e documentos. 404 se não existir no tenant. */
export const obterCliente = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const { supabase, tenant } = await getContexto();
  const [{ data: cliente }, vendas, { data: documentos }] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, cpf, email, telefone, data_nascimento, observacoes, criado_em")
      .eq("tenant_id", tenant.id)
      .eq("id", id)
      .maybeSingle(),
    listarVendas(),
    supabase
      .from("documentos")
      .select("id, nome, pasta, status, enviado_por, visivel_cliente, criado_em, mime, tamanho_bytes")
      .eq("tenant_id", tenant.id)
      .eq("cliente_id", id)
      .order("criado_em", { ascending: false }),
  ]);
  if (!cliente) notFound();
  return { ...cliente, vendas: vendas.filter((v) => v.clienteId === id), documentos: documentos ?? [] };
});

/** Venda completa, com nomes relacionados e parcelas da comissão. 404 se não existir no tenant. */
export const obterVenda = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("vendas")
    .select(
      `id, tipo, status, unidade, construtora_id, imovel_descricao, valor_venda_centavos, data_venda, comissao_percentual, comissao_centavos, observacoes, banco_financiamento,
       renda_centavos, financiamento_aprovado_centavos, desconto_financiamento_percentual,
       cliente:clientes(id, nome, telefone, renda_centavos),
       empreendimento:empreendimentos(nome),
       construtora:construtoras(nome),
       imobiliaria:imobiliarias(nome),
       recebimentos(id, pagador_tipo, pagador_nome, valor_previsto_centavos, data_prevista, valor_recebido_centavos, data_recebida, forma),
       plano_series(id, tipo, descricao, quantidade, valor_total_centavos, primeiro_vencimento, intervalo_meses, teto_renda_percentual, teto_imovel_percentual, ordem, criado_em)`,
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return {
    ...data,
    recebimentos: [...data.recebimentos].sort((a, b) => a.data_prevista.localeCompare(b.data_prevista)),
    plano_series: [...data.plano_series].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em)),
  };
});

/**
 * Modelos de plano de pagamento: os do tenant e os do sistema (tenant_id nulo) cuja
 * construtora_nome bate com o nome da construtora da venda (sem acento e sem caixa).
 * Os da construtora informada vêm primeiro.
 */
export const listarModelos = cache(async (construtoraId: string | null, construtoraNome?: string | null) => {
  const { supabase, tenant } = await getContexto();
  const alvo = construtoraNome ? normalizarNome(construtoraNome) : null;
  const [doTenant, doSistema] = await Promise.all([
    supabase
      .from("modelos_pagamento")
      .select("id, nome, descricao, construtora_id, series, regras, construtora:construtoras(nome)")
      .eq("tenant_id", tenant.id)
      .order("nome"),
    alvo
      ? supabase.from("modelos_pagamento").select("id, nome, descricao, construtora_nome, series, regras").is("tenant_id", null).not("construtora_nome", "is", null).order("nome")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (doTenant.error) throw doTenant.error;
  if (doSistema.error) throw doSistema.error;
  const modelos = [
    ...doTenant.data.map((m) => ({
      id: m.id,
      nome: m.nome,
      descricao: m.descricao,
      construtora: m.construtora?.nome ?? null,
      daConstrutora: construtoraId != null && m.construtora_id === construtoraId,
      sistema: false,
      series: m.series as unknown as SerieModelo[],
      regras: (m.regras ?? {}) as RegrasModelo,
    })),
    ...(doSistema.data ?? [])
      .filter((m) => m.construtora_nome && alvo && mesmaConstrutora(m.construtora_nome, alvo))
      .map((m) => ({
        id: m.id,
        nome: m.nome,
        descricao: m.descricao,
        construtora: m.construtora_nome,
        daConstrutora: true,
        sistema: true,
        series: m.series as unknown as SerieModelo[],
        regras: (m.regras ?? {}) as RegrasModelo,
      })),
  ];
  // Da construtora primeiro (os do corretor antes dos do sistema); a ordem por nome se mantém.
  const peso = (m: (typeof modelos)[number]) => (m.daConstrutora ? (m.sistema ? 1 : 0) : 2);
  return modelos.sort((a, b) => peso(a) - peso(b));
});
export type Modelo = Awaited<ReturnType<typeof listarModelos>>[number];

/**
 * Só o que o cliente pode ver da venda, para o resumo da proposta: sem comissão e sem recebimentos.
 * 404 se não existir no tenant.
 */
export const obterResumoVenda = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const { supabase, tenant, perfil } = await getContexto();
  const { data, error } = await supabase
    .from("vendas")
    .select(
      `id, status, unidade, imovel_descricao, valor_venda_centavos, data_venda, banco_financiamento,
       cliente:clientes(nome),
       empreendimento:empreendimentos(nome),
       construtora:construtoras(nome),
       plano_series(id, tipo, descricao, quantidade, valor_total_centavos, primeiro_vencimento, intervalo_meses, ordem, criado_em)`,
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const series = [...data.plano_series]
    .sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em))
    .map((s) => ({
      id: s.id,
      tipo: s.tipo,
      descricao: s.descricao,
      quantidade: s.quantidade,
      valor_total_centavos: s.valor_total_centavos,
      primeiro_vencimento: s.primeiro_vencimento,
      intervalo_meses: s.intervalo_meses,
    }));
  return {
    id: data.id,
    proposta: data.status === "proposta",
    cliente: data.cliente?.nome ?? null,
    imovel: data.empreendimento?.nome ?? data.imovel_descricao,
    unidade: data.unidade,
    construtora: data.construtora?.nome ?? null,
    valorVenda: data.valor_venda_centavos,
    dataVenda: data.data_venda,
    banco: data.banco_financiamento,
    series,
    corretor: { nome: perfil.nome, creci: perfil.creci, telefone: perfil.telefone },
    empresa: tenant.nome,
  };
});

export type VendaCompleta = Awaited<ReturnType<typeof obterVenda>>;
export { TIPO_LABEL, PAGADOR_LABEL };
