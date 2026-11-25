import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getContexto } from "@/lib/dal";

// Imobiliárias e corretoras parceiras do tenant, com quantas vendas cada uma tem.

const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export type ImobiliariaLista = { id: string; nome: string; contato: string | null; vendas: number };

export const listarImobiliarias = cache(async (): Promise<ImobiliariaLista[]> => {
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase.from("imobiliarias").select("id, nome, contato, vendas(count)").eq("tenant_id", tenant.id).order("nome");
  if (error) throw error;
  return data.map((i) => ({ id: i.id, nome: i.nome, contato: i.contato, vendas: i.vendas[0]?.count ?? 0 }));
});

/** Imobiliária do tenant com a quantidade de vendas. 404 se não existir. */
export const obterImobiliaria = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("imobiliarias")
    .select("id, nome, contato, vendas(count)")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  const { vendas, ...dados } = data;
  return { ...dados, vendas: vendas[0]?.count ?? 0 };
});
