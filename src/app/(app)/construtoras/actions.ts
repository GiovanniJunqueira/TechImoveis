"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContexto } from "@/lib/dal";
import { TIPOS_SERIE, type SerieModelo, type TipoSerie } from "@/lib/plano";
import type { EstadoForm } from "@/app/(auth)/actions";

// Construtoras e modelos de plano de pagamento (entrada com a construtora + financiamento).
// O RLS já isola por tenant; os filtros por tenant_id aqui são uma segunda barreira.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
/** Escapa curingas do ILIKE para comparar o nome exato. */
const exato = (nome: string) => nome.replace(/[%_\\]/g, (c) => `\\${c}`);
const normalizarNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const LIMITE_SERIES = 100;

// ------------------------------------------------------------
// Construtoras
// ------------------------------------------------------------

function lerConstrutora(form: FormData) {
  const nome = texto(form, "nome").replace(/\s+/g, " ");
  const cnpj = texto(form, "cnpj").replace(/\D/g, "") || null;
  const contato = texto(form, "contato") || null;
  if (nome.length < 2) return { erro: "Informe o nome da construtora." } as const;
  if (nome.length > 120) return { erro: "Nome muito longo." } as const;
  if (cnpj && cnpj.length !== 14) return { erro: "O CNPJ precisa ter 14 dígitos." } as const;
  if (contato && contato.length > 300) return { erro: "Contato muito longo." } as const;
  return { dados: { nome, cnpj, contato } } as const;
}

type Supabase = Awaited<ReturnType<typeof getContexto>>["supabase"];

/** Já existe outra construtora com esse nome no tenant? (as vendas acham a construtora pelo nome) */
async function nomeEmUso(supabase: Supabase, tenantId: string, nome: string, exceto?: string) {
  let q = supabase.from("construtoras").select("id").eq("tenant_id", tenantId).ilike("nome", exato(nome)).limit(1);
  if (exceto) q = q.neq("id", exceto);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

export async function criarConstrutora(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const lido = lerConstrutora(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  if (await nomeEmUso(supabase, tenant.id, lido.dados.nome)) return { erro: "Já existe uma construtora com esse nome." };
  const { data, error } = await supabase
    .from("construtoras")
    .insert({ tenant_id: tenant.id, ...lido.dados })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível salvar a construtora. Tente de novo." };

  revalidatePath("/", "layout");
  redirect(`/construtoras/${data.id}`);
}

export async function atualizarConstrutora(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!uuid(id)) return { erro: "Construtora não encontrada." };
  const lido = lerConstrutora(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  if (await nomeEmUso(supabase, tenant.id, lido.dados.nome, id)) return { erro: "Já existe outra construtora com esse nome." };
  const { data, error } = await supabase.from("construtoras").update(lido.dados).eq("tenant_id", tenant.id).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { erro: "Não foi possível salvar a construtora. Tente de novo." };

  revalidatePath("/", "layout");
  return { aviso: "Dados salvos." };
}

/** Vendas ficam sem construtora (SET NULL); os modelos do tenant são apagados junto (CASCADE). */
export async function excluirConstrutora(id: string): Promise<EstadoForm> {
  if (!uuid(id)) return { erro: "Construtora não encontrada." };
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("construtoras").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir a construtora." };
  revalidatePath("/", "layout");
  redirect("/construtoras");
}

// ------------------------------------------------------------
// Modelos de plano de pagamento
// ------------------------------------------------------------

const inteiroEntre = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Valida as séries vindas do editor (JSON). Devolve as séries limpas ou a mensagem de erro. */
function lerSeries(bruto: string): { series: SerieModelo[] } | { erro: string } {
  let lista: unknown;
  try {
    lista = JSON.parse(bruto);
  } catch {
    return { erro: "Não foi possível ler as parcelas. Recarregue a página e tente de novo." };
  }
  if (!Array.isArray(lista)) return { erro: "Não foi possível ler as parcelas." };
  if (lista.length === 0) return { erro: "Adicione pelo menos uma parcela ao plano." };
  if (lista.length > LIMITE_SERIES) return { erro: `O plano pode ter no máximo ${LIMITE_SERIES} itens.` };

  const series: SerieModelo[] = [];
  for (const [i, item] of lista.entries()) {
    const n = `Item ${i + 1}`;
    if (!item || typeof item !== "object") return { erro: `${n}: dados inválidos.` };
    const s = item as Record<string, unknown>;

    const tipo = s.tipo as TipoSerie;
    if (!TIPOS_SERIE.includes(tipo)) return { erro: `${n}: escolha o tipo da parcela.` };

    const descricao = typeof s.descricao === "string" ? s.descricao.trim().slice(0, 120) || null : null;

    if (!inteiroEntre(s.quantidade, 1, 600)) return { erro: `${n}: a quantidade deve ser de 1 a 600.` };
    const quantidade = s.quantidade;

    const percentual = s.percentual ?? null;
    const valor = s.valor_parcela_centavos ?? null;
    if (percentual != null && valor != null) return { erro: `${n}: use percentual ou valor fixo, não os dois.` };
    if (percentual != null && !(typeof percentual === "number" && Number.isFinite(percentual) && percentual > 0 && percentual <= 100)) {
      return { erro: `${n}: o percentual deve ser maior que 0 e no máximo 100.` };
    }
    if (valor != null && !inteiroEntre(valor, 1, 1e13)) return { erro: `${n}: informe um valor fixo maior que zero.` };

    if (!inteiroEntre(s.intervalo_meses, 0, 60)) return { erro: `${n}: frequência inválida.` };
    const defasagem = s.defasagem_meses ?? null;
    if (defasagem != null && !inteiroEntre(defasagem, 0, 600)) return { erro: `${n}: o 1º vencimento deve ser de 0 a 600 meses após a venda.` };

    series.push({
      tipo,
      descricao,
      quantidade,
      percentual: percentual == null ? null : Math.round((percentual as number) * 10_000) / 10_000,
      valor_parcela_centavos: valor as number | null,
      intervalo_meses: quantidade > 1 ? s.intervalo_meses : 0,
      defasagem_meses: defasagem as number | null,
    });
  }

  const soma = series.reduce((t, s) => t + (s.percentual ?? 0), 0);
  if (soma > 100.0001) return { erro: `Os percentuais somam ${String(Math.round(soma * 100) / 100).replace(".", ",")}%, mais que o valor do imóvel.` };
  return { series };
}

/** Cria (modeloId nulo) ou atualiza um modelo do tenant ligado à construtora. */
export async function salvarModeloConstrutora(construtoraId: string, modeloId: string | null, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!uuid(construtoraId) || (modeloId != null && !uuid(modeloId))) return { erro: "Modelo não encontrado." };
  const nome = texto(form, "nome").replace(/\s+/g, " ");
  const descricao = texto(form, "descricao") || null;
  if (nome.length < 2) return { erro: "Dê um nome ao plano." };
  if (nome.length > 120) return { erro: "Nome muito longo." };
  if (descricao && descricao.length > 2000) return { erro: "As regras passam do limite de 2.000 caracteres." };
  const lido = lerSeries(texto(form, "series"));
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  const { data: construtora } = await supabase.from("construtoras").select("id").eq("tenant_id", tenant.id).eq("id", construtoraId).maybeSingle();
  if (!construtora) return { erro: "Construtora não encontrada." };

  const dados = { nome, descricao, series: lido.series };
  if (modeloId) {
    const { data, error } = await supabase
      .from("modelos_pagamento")
      .update(dados)
      .eq("tenant_id", tenant.id)
      .eq("construtora_id", construtoraId)
      .eq("id", modeloId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { erro: "Não foi possível salvar o plano. Tente de novo." };
    revalidatePath("/", "layout");
    return { aviso: "Plano salvo." };
  }

  const { error } = await supabase.from("modelos_pagamento").insert({ tenant_id: tenant.id, construtora_id: construtoraId, ...dados });
  if (error) return { erro: "Não foi possível salvar o plano. Tente de novo." };
  revalidatePath("/", "layout");
  redirect(`/construtoras/${construtoraId}`);
}

export async function excluirModeloConstrutora(construtoraId: string, modeloId: string): Promise<EstadoForm> {
  if (!uuid(construtoraId) || !uuid(modeloId)) return { erro: "Modelo não encontrado." };
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("modelos_pagamento")
    .delete()
    .eq("tenant_id", tenant.id)
    .eq("construtora_id", construtoraId)
    .eq("id", modeloId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { erro: "Não foi possível excluir o plano." };
  revalidatePath("/", "layout");
  redirect(`/construtoras/${construtoraId}`);
}

/** Copia um modelo do sistema para o tenant, ligado à construtora, e abre a cópia para edição. */
export async function copiarModeloSistema(construtoraId: string, modeloId: string): Promise<EstadoForm> {
  if (!uuid(construtoraId) || !uuid(modeloId)) return { erro: "Modelo não encontrado." };
  const { supabase, tenant } = await getContexto();
  const [{ data: construtora }, { data: modelo }] = await Promise.all([
    supabase.from("construtoras").select("id, nome").eq("tenant_id", tenant.id).eq("id", construtoraId).maybeSingle(),
    supabase.from("modelos_pagamento").select("nome, descricao, series, construtora_nome").is("tenant_id", null).eq("id", modeloId).maybeSingle(),
  ]);
  if (!construtora || !modelo) return { erro: "Modelo não encontrado." };
  if (!modelo.construtora_nome || normalizarNome(modelo.construtora_nome) !== normalizarNome(construtora.nome)) {
    return { erro: "Este modelo não é desta construtora." };
  }
  // Revalida as séries: o que vai para a conta do corretor passa pelas mesmas regras do editor.
  const lido = lerSeries(JSON.stringify(modelo.series));
  if ("erro" in lido) return { erro: "O modelo do sistema está com dados inválidos." };

  const { data, error } = await supabase
    .from("modelos_pagamento")
    .insert({
      tenant_id: tenant.id,
      construtora_id: construtoraId,
      nome: modelo.nome,
      descricao: modelo.descricao,
      series: lido.series,
    })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível copiar o plano." };
  revalidatePath("/", "layout");
  redirect(`/construtoras/${construtoraId}/modelos/${data.id}`);
}
