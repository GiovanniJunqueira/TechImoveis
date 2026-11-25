"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContexto } from "@/lib/dal";
import type { EstadoForm } from "@/app/(auth)/actions";

// Cadastro de clientes e vendas.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const opcional = (form: FormData, campo: string) => texto(form, campo) || null;
const dataValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const um = <T extends string>(v: string, permitidos: readonly T[], padrao: T): T => (permitidos.includes(v as T) ? (v as T) : padrao);
/** Escapa curingas do ILIKE para comparar o nome exato. */
const exato = (nome: string) => nome.replace(/[%_\\]/g, (c) => `\\${c}`);

/** Só deixa voltar para rotas internas do app. */
const destinoInterno = (v: string) => (v.startsWith("/") && !v.startsWith("//") ? v : null);

export async function criarCliente(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = texto(form, "nome");
  const cpf = texto(form, "cpf").replace(/\D/g, "") || null;
  const email = opcional(form, "email");
  const nascimento = opcional(form, "data_nascimento");
  if (nome.length < 2) return { erro: "Informe o nome do cliente." };
  if (cpf && cpf.length !== 11) return { erro: "O CPF precisa ter 11 dígitos." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erro: "E-mail inválido." };
  if (nascimento && !dataValida(nascimento)) return { erro: "Data de nascimento inválida." };

  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      tenant_id: tenant.id,
      nome,
      cpf,
      email,
      telefone: opcional(form, "telefone"),
      data_nascimento: nascimento,
      observacoes: opcional(form, "observacoes"),
    })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível salvar o cliente. Tente de novo." };

  revalidatePath("/", "layout");
  const voltar = destinoInterno(texto(form, "voltar"));
  redirect(voltar ? `${voltar}${voltar.includes("?") ? "&" : "?"}cliente=${data.id}` : "/clientes");
}

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

export async function criarVenda(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const clienteSel = texto(form, "cliente_id");
  const clienteNovo = texto(form, "cliente_nome");
  const tipo = um(texto(form, "tipo"), ["lancamento", "pronto", "revenda"] as const, "lancamento");
  const status = um(texto(form, "status"), ["fechada", "proposta"] as const, "fechada");
  const dataVenda = texto(form, "data_venda");
  const valorVenda = Number(texto(form, "valor_venda")) || 0;
  const pctTexto = texto(form, "comissao_pct").replace(",", ".");
  const pct = pctTexto ? Number(pctTexto) : null;
  const comissao = Number(texto(form, "comissao")) || 0;
  const pagadorTipo = um(texto(form, "pagador_tipo"), ["cliente", "construtora", "imobiliaria", "outro"] as const, "cliente");
  const dataPrevista = texto(form, "data_prevista");
  const recebida = form.get("recebida") === "on";
  const dataRecebida = texto(form, "data_recebida");
  const forma = um(texto(form, "forma"), ["pix", "ted", "boleto", "dinheiro", "cheque", "outro"] as const, "pix");

  if (!clienteSel || (clienteSel === "novo" && clienteNovo.length < 2)) return { erro: "Escolha o cliente ou informe o nome do novo cliente." };
  if (!dataValida(dataVenda)) return { erro: "Informe a data da venda." };
  if (valorVenda <= 0) return { erro: "Informe o valor da venda." };
  if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) return { erro: "Percentual de comissão inválido." };
  if (comissao > 0 && !dataValida(dataPrevista)) return { erro: "Informe quando a comissão deve ser paga." };
  if (comissao > 0 && recebida && !dataValida(dataRecebida)) return { erro: "Informe quando a comissão foi recebida." };

  const { supabase, tenant } = await getContexto();
  let vendaId: string;
  try {
    let clienteId = clienteSel;
    if (clienteSel === "novo") {
      const { data, error } = await supabase.from("clientes").insert({ tenant_id: tenant.id, nome: clienteNovo }).select("id").single();
      if (error) throw error;
      clienteId = data.id;
    }
    const construtoraId = await acharOuCriar(supabase, "construtoras", tenant.id, opcional(form, "construtora"));
    const imobiliariaId = await acharOuCriar(supabase, "imobiliarias", tenant.id, opcional(form, "imobiliaria"));
    const imovel = opcional(form, "empreendimento");
    // Lançamento: o imóvel é um empreendimento cadastrado. Pronto/revenda: só a descrição.
    const empreendimentoId = tipo === "lancamento" ? await acharOuCriarEmpreendimento(supabase, tenant.id, imovel, construtoraId) : null;

    const { data: venda, error } = await supabase
      .from("vendas")
      .insert({
        tenant_id: tenant.id,
        cliente_id: clienteId,
        tipo,
        status,
        data_venda: dataVenda,
        valor_venda_centavos: valorVenda,
        construtora_id: construtoraId,
        empreendimento_id: empreendimentoId,
        imovel_descricao: tipo === "lancamento" ? null : imovel,
        imobiliaria_id: imobiliariaId,
        unidade: opcional(form, "unidade"),
        comissao_percentual: pct,
        comissao_centavos: comissao,
        observacoes: opcional(form, "observacoes"),
      })
      .select("id")
      .single();
    if (error) throw error;
    vendaId = venda.id;
  } catch {
    return { erro: "Não foi possível salvar a venda. Tente de novo." };
  }

  if (comissao > 0) {
    const { error } = await supabase.from("recebimentos").insert({
      tenant_id: tenant.id,
      venda_id: vendaId,
      pagador_tipo: pagadorTipo,
      pagador_nome: opcional(form, "pagador_nome"),
      valor_previsto_centavos: comissao,
      data_prevista: dataPrevista,
      ...(recebida ? { data_recebida: dataRecebida, valor_recebido_centavos: comissao, forma } : {}),
    });
    if (error) {
      // Sem transação pela API: desfaz a venda para não ficar pela metade.
      await supabase.from("vendas").delete().eq("id", vendaId);
      return { erro: "Não foi possível salvar a comissão da venda. Tente de novo." };
    }
  }

  revalidatePath("/", "layout");
  redirect("/vendas");
}
