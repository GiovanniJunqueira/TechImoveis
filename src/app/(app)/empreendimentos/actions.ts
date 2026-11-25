"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContexto } from "@/lib/dal";
import type { EstadoForm } from "@/app/(auth)/actions";

// Empreendimentos (lançamentos). O RLS já isola por tenant; os filtros por tenant_id aqui são uma segunda barreira.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
/** Escapa curingas do ILIKE para comparar o nome exato. */
const exato = (nome: string) => nome.replace(/[%_\\]/g, (c) => `\\${c}`);

type Supabase = Awaited<ReturnType<typeof getContexto>>["supabase"];

function lerEmpreendimento(form: FormData) {
  const nome = texto(form, "nome").replace(/\s+/g, " ");
  const construtoraId = texto(form, "construtora_id") || null;
  const cidade = texto(form, "cidade").replace(/\s+/g, " ") || null;
  const endereco = texto(form, "endereco") || null;
  const mes = texto(form, "previsao_entrega");
  if (nome.length < 2) return { erro: "Informe o nome do empreendimento." } as const;
  if (nome.length > 120) return { erro: "Nome muito longo." } as const;
  if (construtoraId && !uuid(construtoraId)) return { erro: "Construtora inválida." } as const;
  if (cidade && cidade.length > 80) return { erro: "Cidade muito longa." } as const;
  if (endereco && endereco.length > 300) return { erro: "Endereço muito longo." } as const;
  // <input type="month"> envia "AAAA-MM"; guardamos o primeiro dia do mês.
  if (mes && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { erro: "Previsão de entrega inválida." } as const;
  return {
    dados: { nome, construtora_id: construtoraId, cidade, endereco, previsao_entrega: mes ? `${mes}-01` : null },
  } as const;
}

/** Já existe outro empreendimento com esse nome no tenant? (as vendas acham o empreendimento pelo nome) */
async function nomeEmUso(supabase: Supabase, tenantId: string, nome: string, exceto?: string) {
  let q = supabase.from("empreendimentos").select("id").eq("tenant_id", tenantId).ilike("nome", exato(nome)).limit(1);
  if (exceto) q = q.neq("id", exceto);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

/** A construtora escolhida é do tenant? */
async function construtoraValida(supabase: Supabase, tenantId: string, id: string | null) {
  if (!id) return true;
  const { data } = await supabase.from("construtoras").select("id").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  return !!data;
}

export async function criarEmpreendimento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const lido = lerEmpreendimento(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  if (!(await construtoraValida(supabase, tenant.id, lido.dados.construtora_id))) return { erro: "Construtora não encontrada." };
  if (await nomeEmUso(supabase, tenant.id, lido.dados.nome)) return { erro: "Já existe um empreendimento com esse nome." };
  const { data, error } = await supabase
    .from("empreendimentos")
    .insert({ tenant_id: tenant.id, ...lido.dados })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível salvar o empreendimento. Tente de novo." };

  revalidatePath("/", "layout");
  redirect(`/empreendimentos/${data.id}`);
}

export async function atualizarEmpreendimento(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!uuid(id)) return { erro: "Empreendimento não encontrado." };
  const lido = lerEmpreendimento(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  if (!(await construtoraValida(supabase, tenant.id, lido.dados.construtora_id))) return { erro: "Construtora não encontrada." };
  if (await nomeEmUso(supabase, tenant.id, lido.dados.nome, id)) return { erro: "Já existe outro empreendimento com esse nome." };
  const { data, error } = await supabase
    .from("empreendimentos")
    .update(lido.dados)
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { erro: "Não foi possível salvar o empreendimento. Tente de novo." };

  revalidatePath("/", "layout");
  return { aviso: "Dados salvos." };
}

/** As vendas ligadas a ele ficam sem empreendimento (SET NULL). */
export async function excluirEmpreendimento(id: string): Promise<EstadoForm> {
  if (!uuid(id)) return { erro: "Empreendimento não encontrado." };
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("empreendimentos").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir o empreendimento." };
  revalidatePath("/", "layout");
  redirect("/empreendimentos");
}
