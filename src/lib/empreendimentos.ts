import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getContexto } from "@/lib/dal";
import { MONTHS_SHORT } from "@/lib/format";

// Empreendimentos (lançamentos) do tenant, com a construtora e quantas vendas cada um tem.

const uuid =(id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** "2028-06-01" -> "jun./2028" */
export function mesEntrega(iso: string) {
  const [a, m] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]}/${a}`;
}

export type EmpreendimentoLista = {
  id: string;
  nome: string;
  cidade: string | null;
  previsaoEntrega: string | null;
  construtora: { id: string; nome: string } | null;
  vendas: number;
};

/** Lista os empreendimentos; com `construtoraId`, só os daquela construtora. */
export const listarEmpreendimentos = cache(async (construtoraId?: string): Promise<EmpreendimentoLista[]> => {
  const { supabase, tenant } = await getContexto();
  let q = supabase
    .from("empreendimentos")
    .select("id, nome, cidade, previsao_entrega, construtoras(id, nome), vendas(count)")
    .eq("tenant_id", tenant.id)
    .order("nome");
  if (construtoraId) q = q.eq("construtora_id", construtoraId);
  const { data, error } = await q;
  if (error) throw error;
  return data.map((e) => ({
    id: e.id,
    nome: e.nome,
    cidade: e.cidade,
    previsaoEntrega: e.previsao_entrega,
    construtora: e.construtoras ? { id: e.construtoras.id, nome: e.construtoras.nome } : null,
    vendas: e.vendas[0]?.count ?? 0,
  }));
});

/** Empreendimento do tenant com a quantidade de vendas. 404 se não existir. */
export const obterEmpreendimento = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const { supabase, tenant } = await getContexto();
  const { data: e, error } = await supabase
    .from("empreendimentos")
    .select("id, nome, cidade, endereco, previsao_entrega, construtora_id, construtoras(id, nome), vendas(count)")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!e) notFound();
  const { vendas, construtoras, ...dados } = e;
  return { ...dados, construtora: construtoras ? { id: construtoras.id, nome: construtoras.nome } : null, vendas: vendas[0]?.count ?? 0 };
});
export type EmpreendimentoCompleto = Awaited<ReturnType<typeof obterEmpreendimento>>;
