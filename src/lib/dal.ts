import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, type StatusComissao, type Venda } from "@/lib/vendas";

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
      .select("id, nome, pasta, status, enviado_por, criado_em")
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
      `id, tipo, status, unidade, imovel_descricao, valor_venda_centavos, data_venda, comissao_percentual, comissao_centavos, observacoes,
       cliente:clientes(id, nome, telefone),
       empreendimento:empreendimentos(nome),
       construtora:construtoras(nome),
       imobiliaria:imobiliarias(nome),
       recebimentos(id, pagador_tipo, pagador_nome, valor_previsto_centavos, data_prevista, valor_recebido_centavos, data_recebida, forma)`,
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return { ...data, recebimentos: [...data.recebimentos].sort((a, b) => a.data_prevista.localeCompare(b.data_prevista)) };
});

export type VendaCompleta = Awaited<ReturnType<typeof obterVenda>>;
export { TIPO_LABEL, PAGADOR_LABEL };
