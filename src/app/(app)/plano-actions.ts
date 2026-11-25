"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/dal";
import { PADRAO_SERIE, TIPOS_SERIE, modeloParaSeries, seriesParaModelo, type SerieModelo, type TipoSerie } from "@/lib/plano";
import type { EstadoForm } from "@/app/(auth)/actions";

// Plano de pagamento do cliente (séries) e modelos por construtora.
// O RLS já isola por tenant; os filtros por tenant_id aqui são uma segunda barreira.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const dataValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const inteiro = (v: string) => (/^\d+$/.test(v) ? Number(v) : NaN);

async function vendaDoTenant(vendaId: string) {
  const ctx = await getContexto();
  const { data: venda } = await ctx.supabase
    .from("vendas")
    .select("id, valor_venda_centavos, data_venda, construtora_id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("id", vendaId)
    .maybeSingle();
  return { ...ctx, venda };
}

export async function adicionarSerie(vendaId: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const tipo = texto(form, "tipo") as TipoSerie;
  if (!TIPOS_SERIE.includes(tipo)) return { erro: "Escolha o tipo da parcela." };
  const quantidade = inteiro(texto(form, "quantidade") || "1");
  if (!(quantidade >= 1 && quantidade <= 600)) return { erro: "Quantidade de parcelas inválida (1 a 600)." };
  const valorParcela = Number(texto(form, "valor_parcela")) || 0;
  if (valorParcela <= 0) return { erro: "Informe o valor." };
  const vencimento = texto(form, "primeiro_vencimento");
  if (vencimento && !dataValida(vencimento)) return { erro: "Data de vencimento inválida." };
  if (!vencimento && quantidade > 1) return { erro: "Informe o primeiro vencimento." };
  const intervalo = quantidade > 1 ? inteiro(texto(form, "intervalo_meses") || String(PADRAO_SERIE[tipo].intervalo || 1)) : 0;
  if (!(intervalo >= 0 && intervalo <= 60)) return { erro: "Intervalo inválido." };

  const { supabase, tenant, venda } = await vendaDoTenant(vendaId);
  if (!venda) return { erro: "Venda não encontrada." };
  const { count } = await supabase.from("plano_series").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("venda_id", vendaId);
  const { error } = await supabase.from("plano_series").insert({
    tenant_id: tenant.id,
    venda_id: vendaId,
    tipo,
    descricao: texto(form, "descricao") || null,
    quantidade,
    valor_total_centavos: valorParcela * quantidade,
    primeiro_vencimento: vencimento || null,
    intervalo_meses: intervalo,
    ordem: count ?? 0,
  });
  if (error) return { erro: "Não foi possível adicionar ao plano." };
  revalidatePath(`/vendas/${vendaId}`);
  return { aviso: "Adicionado ao plano." };
}

export async function excluirSerie(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { data } = await supabase.from("plano_series").delete().eq("tenant_id", tenant.id).eq("id", id).select("venda_id").maybeSingle();
  if (!data) return { erro: "Não foi possível excluir." };
  revalidatePath(`/vendas/${data.venda_id}`);
  return {};
}

/** Troca o plano da venda pelo do modelo. Insere o novo antes de apagar o antigo, para não perder nada se falhar. */
export async function aplicarModelo(vendaId: string, modeloId: string): Promise<EstadoForm> {
  const { supabase, tenant, venda } = await vendaDoTenant(vendaId);
  if (!venda) return { erro: "Venda não encontrada." };
  const { data: modelo } = await supabase.from("modelos_pagamento").select("series").eq("tenant_id", tenant.id).eq("id", modeloId).maybeSingle();
  if (!modelo) return { erro: "Modelo não encontrado." };

  const { data: antigas } = await supabase.from("plano_series").select("id").eq("tenant_id", tenant.id).eq("venda_id", vendaId);
  const novas = modeloParaSeries(modelo.series as unknown as SerieModelo[], venda.valor_venda_centavos, venda.data_venda);
  if (!novas.length) return { erro: "O modelo está vazio." };
  const { error } = await supabase.from("plano_series").insert(novas.map((s) => ({ ...s, tenant_id: tenant.id, venda_id: vendaId })));
  if (error) return { erro: "Não foi possível aplicar o modelo." };
  if (antigas?.length) {
    await supabase
      .from("plano_series")
      .delete()
      .eq("tenant_id", tenant.id)
      .in(
        "id",
        antigas.map((a) => a.id),
      );
  }
  revalidatePath(`/vendas/${vendaId}`);
  return { aviso: "Modelo aplicado." };
}

/** Salva o plano atual da venda como modelo da construtora dela (em percentuais do valor). */
export async function salvarModelo(vendaId: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = texto(form, "nome");
  if (!nome) return { erro: "Dê um nome ao modelo." };
  const { supabase, tenant, venda } = await vendaDoTenant(vendaId);
  if (!venda) return { erro: "Venda não encontrada." };
  const { data: series } = await supabase
    .from("plano_series")
    .select("id, tipo, descricao, quantidade, valor_total_centavos, primeiro_vencimento, intervalo_meses")
    .eq("tenant_id", tenant.id)
    .eq("venda_id", vendaId)
    .order("ordem");
  if (!series?.length) return { erro: "O plano está vazio." };
  const { error } = await supabase.from("modelos_pagamento").insert({
    tenant_id: tenant.id,
    construtora_id: venda.construtora_id,
    nome,
    series: seriesParaModelo(series, venda.valor_venda_centavos, venda.data_venda),
  });
  if (error) return { erro: "Não foi possível salvar o modelo." };
  revalidatePath(`/vendas/${vendaId}`);
  return { aviso: "Modelo salvo." };
}

export async function excluirModelo(id: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("modelos_pagamento").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir o modelo." };
  revalidatePath("/", "layout");
  return {};
}
