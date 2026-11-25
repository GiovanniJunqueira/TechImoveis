"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContexto } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { apagarArquivo } from "@/lib/arquivos";
import type { EstadoForm } from "@/app/(auth)/actions";

// Cadastro e edição de clientes, vendas e recebimentos de comissão.
// O RLS já isola por tenant; os filtros por tenant_id aqui são uma segunda barreira.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const opcional = (form: FormData, campo: string) => texto(form, campo) || null;
const dataValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const um = <T extends string>(v: string, permitidos: readonly T[], padrao: T): T => (permitidos.includes(v as T) ? (v as T) : padrao);
/** Escapa curingas do ILIKE para comparar o nome exato. */
const exato = (nome: string) => nome.replace(/[%_\\]/g, (c) => `\\${c}`);
/** Só deixa voltar para rotas internas do app. */
const destinoInterno = (v: string) => (v.startsWith("/") && !v.startsWith("//") ? v : null);

const FORMAS = ["pix", "ted", "boleto", "dinheiro", "cheque", "outro"] as const;
const PAGADORES = ["cliente", "construtora", "imobiliaria", "outro"] as const;

// ------------------------------------------------------------
// Clientes
// ------------------------------------------------------------

function lerCliente(form: FormData) {
  const nome = texto(form, "nome");
  const cpf = texto(form, "cpf").replace(/\D/g, "") || null;
  const email = opcional(form, "email");
  const nascimento = opcional(form, "data_nascimento");
  if (nome.length < 2) return { erro: "Informe o nome do cliente." } as const;
  if (cpf && cpf.length !== 11) return { erro: "O CPF precisa ter 11 dígitos." } as const;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erro: "E-mail inválido." } as const;
  if (nascimento && !dataValida(nascimento)) return { erro: "Data de nascimento inválida." } as const;
  return {
    dados: { nome, cpf, email, telefone: opcional(form, "telefone"), data_nascimento: nascimento, observacoes: opcional(form, "observacoes") },
  } as const;
}

export async function criarCliente(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const lido = lerCliente(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ tenant_id: tenant.id, ...lido.dados })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível salvar o cliente. Tente de novo." };

  revalidatePath("/", "layout");
  const voltar = destinoInterno(texto(form, "voltar"));
  redirect(voltar ? `${voltar}${voltar.includes("?") ? "&" : "?"}cliente=${data.id}` : `/clientes/${data.id}`);
}

export async function atualizarCliente(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const lido = lerCliente(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("clientes").update(lido.dados).eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível salvar o cliente. Tente de novo." };

  revalidatePath("/", "layout");
  redirect(`/clientes/${id}`);
}

export async function excluirCliente(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { count } = await supabase.from("vendas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("cliente_id", id);
  if (count) return { erro: "Este cliente tem vendas. Exclua as vendas antes." };
  const { error } = await supabase.from("clientes").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir o cliente." };
  revalidatePath("/", "layout");
  redirect("/clientes");
}

// ------------------------------------------------------------
// Vendas
// ------------------------------------------------------------

type Supabase = Awaited<ReturnType<typeof getContexto>>["supabase"];

/** Acha pelo nome (sem diferenciar maiúsculas) ou cria. Devolve o id, ou null se o nome estiver vazio. */
async function acharOuCriar(supabase: Supabase, tabela: "construtoras" | "imobiliarias", tenantId: string, nome: string | null) {
  if (!nome) return null;
  const { data: existente } = await supabase.from(tabela).select("id").eq("tenant_id", tenantId).ilike("nome", exato(nome)).limit(1).maybeSingle();
  if (existente) return existente.id;
  const { data, error } = await supabase.from(tabela).insert({ tenant_id: tenantId, nome }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function acharOuCriarEmpreendimento(supabase: Supabase, tenantId: string, nome: string | null, construtoraId: string | null) {
  if (!nome) return null;
  const { data: existente } = await supabase
    .from("empreendimentos")
    .select("id, construtora_id")
    .eq("tenant_id", tenantId)
    .ilike("nome", exato(nome))
    .limit(1)
    .maybeSingle();
  if (existente) {
    if (!existente.construtora_id && construtoraId) {
      await supabase.from("empreendimentos").update({ construtora_id: construtoraId }).eq("id", existente.id);
    }
    return existente.id;
  }
  const { data, error } = await supabase
    .from("empreendimentos")
    .insert({ tenant_id: tenantId, nome, construtora_id: construtoraId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Valida os campos da venda (sem tocar no banco). */
function lerVenda(form: FormData) {
  const clienteSel = texto(form, "cliente_id");
  const clienteNovo = texto(form, "cliente_nome");
  const tipo = um(texto(form, "tipo"), ["lancamento", "pronto", "revenda"] as const, "lancamento");
  const status = um(texto(form, "status"), ["fechada", "proposta", "distrato"] as const, "fechada");
  const dataVenda = texto(form, "data_venda");
  const valorVenda = Number(texto(form, "valor_venda")) || 0;
  const pctTexto = texto(form, "comissao_pct").replace(",", ".");
  const pct = pctTexto ? Number(pctTexto) : null;
  const comissao = Number(texto(form, "comissao")) || 0;

  if (!clienteSel || (clienteSel === "novo" && clienteNovo.length < 2)) return { erro: "Escolha o cliente ou informe o nome do novo cliente." } as const;
  if (!dataValida(dataVenda)) return { erro: "Informe a data da venda." } as const;
  if (valorVenda <= 0) return { erro: "Informe o valor da venda." } as const;
  if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) return { erro: "Percentual de comissão inválido." } as const;

  return { clienteSel, clienteNovo, tipo, status, dataVenda, valorVenda, pct, comissao } as const;
}

/** Resolve cliente novo, construtora, empreendimento e imobiliária; devolve as colunas da venda. */
async function montarVenda(supabase: Supabase, tenantId: string, form: FormData, v: Exclude<ReturnType<typeof lerVenda>, { erro: string }>) {
  let clienteId = v.clienteSel;
  if (v.clienteSel === "novo") {
    const { data, error } = await supabase.from("clientes").insert({ tenant_id: tenantId, nome: v.clienteNovo }).select("id").single();
    if (error) throw error;
    clienteId = data.id;
  }
  const construtoraId = await acharOuCriar(supabase, "construtoras", tenantId, opcional(form, "construtora"));
  const imobiliariaId = await acharOuCriar(supabase, "imobiliarias", tenantId, opcional(form, "imobiliaria"));
  const imovel = opcional(form, "empreendimento");
  // Lançamento: o imóvel é um empreendimento cadastrado. Pronto/revenda: só a descrição.
  const lancamento = v.tipo === "lancamento";
  const empreendimentoId = lancamento ? await acharOuCriarEmpreendimento(supabase, tenantId, imovel, construtoraId) : null;

  return {
    cliente_id: clienteId,
    tipo: v.tipo,
    status: v.status,
    data_venda: v.dataVenda,
    valor_venda_centavos: v.valorVenda,
    construtora_id: construtoraId,
    empreendimento_id: empreendimentoId,
    imovel_descricao: lancamento ? null : imovel,
    imobiliaria_id: imobiliariaId,
    unidade: opcional(form, "unidade"),
    comissao_percentual: v.pct,
    comissao_centavos: v.comissao,
    observacoes: opcional(form, "observacoes"),
  };
}

export async function criarVenda(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const v = lerVenda(form);
  if ("erro" in v) return { erro: v.erro };
  const pagadorTipo = um(texto(form, "pagador_tipo"), PAGADORES, "cliente");
  const dataPrevista = texto(form, "data_prevista");
  const recebida = form.get("recebida") === "on";
  const dataRecebida = texto(form, "data_recebida");
  if (v.comissao > 0 && !dataValida(dataPrevista)) return { erro: "Informe quando a comissão deve ser paga." };
  if (v.comissao > 0 && recebida && !dataValida(dataRecebida)) return { erro: "Informe quando a comissão foi recebida." };

  const { supabase, tenant } = await getContexto();
  let vendaId: string;
  try {
    const colunas = await montarVenda(supabase, tenant.id, form, v);
    const { data, error } = await supabase.from("vendas").insert({ tenant_id: tenant.id, ...colunas }).select("id").single();
    if (error) throw error;
    vendaId = data.id;
  } catch {
    return { erro: "Não foi possível salvar a venda. Tente de novo." };
  }

  if (v.comissao > 0) {
    const { error } = await supabase.from("recebimentos").insert({
      tenant_id: tenant.id,
      venda_id: vendaId,
      pagador_tipo: pagadorTipo,
      pagador_nome: opcional(form, "pagador_nome"),
      valor_previsto_centavos: v.comissao,
      data_prevista: dataPrevista,
      ...(recebida ? { data_recebida: dataRecebida, valor_recebido_centavos: v.comissao, forma: um(texto(form, "forma"), FORMAS, "pix") } : {}),
    });
    if (error) {
      // Sem transação pela API: desfaz a venda para não ficar pela metade.
      await supabase.from("vendas").delete().eq("id", vendaId);
      return { erro: "Não foi possível salvar a comissão da venda. Tente de novo." };
    }
  }

  revalidatePath("/", "layout");
  redirect(`/vendas/${vendaId}`);
}

export async function atualizarVenda(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const v = lerVenda(form);
  if ("erro" in v) return { erro: v.erro };

  const { supabase, tenant } = await getContexto();
  try {
    const colunas = await montarVenda(supabase, tenant.id, form, v);
    const { error } = await supabase.from("vendas").update(colunas).eq("tenant_id", tenant.id).eq("id", id);
    if (error) throw error;

    // Caso comum: uma única parcela de comissão ainda não recebida acompanha o novo valor.
    const { data: recs } = await supabase.from("recebimentos").select("id, data_recebida").eq("tenant_id", tenant.id).eq("venda_id", id);
    if (recs?.length === 1 && !recs[0].data_recebida) {
      if (v.comissao > 0) await supabase.from("recebimentos").update({ valor_previsto_centavos: v.comissao }).eq("id", recs[0].id);
      else await supabase.from("recebimentos").delete().eq("id", recs[0].id);
    }
  } catch {
    return { erro: "Não foi possível salvar a venda. Tente de novo." };
  }

  revalidatePath("/", "layout");
  redirect(`/vendas/${id}`);
}

export async function excluirVenda(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("vendas").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir a venda." };
  revalidatePath("/", "layout");
  redirect("/vendas");
}

// ------------------------------------------------------------
// Recebimentos de comissão
// ------------------------------------------------------------

export async function marcarRecebido(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const data = texto(form, "data_recebida") || hojeISO();
  if (!dataValida(data)) return { erro: "Data inválida." };
  const { supabase, tenant } = await getContexto();
  const { data: rec } = await supabase.from("recebimentos").select("valor_previsto_centavos").eq("tenant_id", tenant.id).eq("id", id).single();
  if (!rec) return { erro: "Recebimento não encontrado." };
  const valor = Number(texto(form, "valor_recebido")) || rec.valor_previsto_centavos;
  const { error } = await supabase
    .from("recebimentos")
    .update({ data_recebida: data, valor_recebido_centavos: valor, forma: um(texto(form, "forma"), FORMAS, "pix") })
    .eq("tenant_id", tenant.id)
    .eq("id", id);
  if (error) return { erro: "Não foi possível marcar como recebido." };
  revalidatePath("/", "layout");
  return { aviso: "Recebimento registrado." };
}

export async function desfazerRecebido(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase
    .from("recebimentos")
    .update({ data_recebida: null, valor_recebido_centavos: null, forma: null })
    .eq("tenant_id", tenant.id)
    .eq("id", id);
  if (error) return { erro: "Não foi possível desfazer." };
  revalidatePath("/", "layout");
  return {};
}

export async function excluirRecebimento(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("recebimentos").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir a parcela." };
  revalidatePath("/", "layout");
  return {};
}

export async function adicionarRecebimento(vendaId: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const valor = Number(texto(form, "valor")) || 0;
  const data = texto(form, "data_prevista");
  if (valor <= 0) return { erro: "Informe o valor da parcela." };
  if (!dataValida(data)) return { erro: "Informe a previsão de pagamento." };
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("recebimentos").insert({
    tenant_id: tenant.id,
    venda_id: vendaId,
    pagador_tipo: um(texto(form, "pagador_tipo"), PAGADORES, "cliente"),
    pagador_nome: opcional(form, "pagador_nome"),
    valor_previsto_centavos: valor,
    data_prevista: data,
  });
  if (error) return { erro: "Não foi possível adicionar a parcela." };
  revalidatePath("/", "layout");
  return { aviso: "Parcela adicionada." };
}

// ------------------------------------------------------------
// Documentos
// ------------------------------------------------------------

export async function excluirDocumento(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { data: doc } = await supabase.from("documentos").select("cliente_id, chave_arquivo").eq("tenant_id", tenant.id).eq("id", id).maybeSingle();
  if (!doc) return { erro: "Documento não encontrado." };
  const { error } = await supabase.from("documentos").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir o documento." };
  // Se o arquivo não apagar agora, o registro já saiu; a limpeza de órfãos pode ser feita depois.
  await apagarArquivo(doc.chave_arquivo).catch((e) => console.error(e));
  revalidatePath(`/clientes/${doc.cliente_id}`);
  return {};
}
