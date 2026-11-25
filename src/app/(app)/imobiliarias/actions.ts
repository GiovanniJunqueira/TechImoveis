"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContexto } from "@/lib/dal";
import type { EstadoForm } from "@/app/(auth)/actions";

// Imobiliárias e corretoras parceiras. O RLS já isola por tenant; os filtros por tenant_id aqui são uma segunda barreira.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
/** Escapa curingas do ILIKE para comparar o nome exato. */
const exato = (nome: string) => nome.replace(/[%_\\]/g, (c) => `\\${c}`);

type Supabase = Awaited<ReturnType<typeof getContexto>>["supabase"];

function lerImobiliaria(form: FormData) {
  const nome = texto(form, "nome").replace(/\s+/g, " ");
  const contato = texto(form, "contato") || null;
  if (nome.length < 2) return { erro: "Informe o nome da imobiliária." } as const;
  if (nome.length > 120) return { erro: "Nome muito longo." } as const;
  if (contato && contato.length > 300) return { erro: "Contato muito longo." } as const;
  return { dados: { nome, contato } } as const;
}

/** Já existe outra imobiliária com esse nome no tenant? (as vendas acham a imobiliária pelo nome) */
async function nomeEmUso(supabase: Supabase, tenantId: string, nome: string, exceto?: string) {
  let q = supabase.from("imobiliarias").select("id").eq("tenant_id", tenantId).ilike("nome", exato(nome)).limit(1);
  if (exceto) q = q.neq("id", exceto);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

export async function criarImobiliaria(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const lido = lerImobiliaria(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  if (await nomeEmUso(supabase, tenant.id, lido.dados.nome)) return { erro: "Já existe uma imobiliária com esse nome." };
  const { data, error } = await supabase
    .from("imobiliarias")
    .insert({ tenant_id: tenant.id, ...lido.dados })
    .select("id")
    .single();
  if (error) return { erro: "Não foi possível salvar a imobiliária. Tente de novo." };

  revalidatePath("/", "layout");
  redirect(`/imobiliarias/${data.id}`);
}

export async function atualizarImobiliaria(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!uuid(id)) return { erro: "Imobiliária não encontrada." };
  const lido = lerImobiliaria(form);
  if ("erro" in lido) return { erro: lido.erro };

  const { supabase, tenant } = await getContexto();
  if (await nomeEmUso(supabase, tenant.id, lido.dados.nome, id)) return { erro: "Já existe outra imobiliária com esse nome." };
  const { data, error } = await supabase.from("imobiliarias").update(lido.dados).eq("tenant_id", tenant.id).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { erro: "Não foi possível salvar a imobiliária. Tente de novo." };

  revalidatePath("/", "layout");
  return { aviso: "Dados salvos." };
}

/** As vendas ligadas a ela ficam sem imobiliária (SET NULL). */
export async function excluirImobiliaria(id: string): Promise<EstadoForm> {
  if (!uuid(id)) return { erro: "Imobiliária não encontrada." };
  const { supabase, tenant } = await getContexto();
  const { error } = await supabase.from("imobiliarias").delete().eq("tenant_id", tenant.id).eq("id", id);
  if (error) return { erro: "Não foi possível excluir a imobiliária." };
  revalidatePath("/", "layout");
  redirect("/imobiliarias");
}
