import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getContexto } from "@/lib/dal";
import { mesmaConstrutora, type RegrasModelo, type SerieModelo } from "@/lib/plano";

// Construtoras do tenant e os modelos de plano de pagamento de cada uma.
// Modelos do sistema (tenant_id nulo) valem para todos e se ligam à construtora pelo nome.

const uuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Sem acento, minúsculo e sem espaços sobrando: "Construtora São José " -> "construtora sao jose". */
export const normalizarNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export type ModeloResumo = {
  id: string;
  nome: string;
  descricao: string | null;
  series: SerieModelo[];
  regras: RegrasModelo;
  sistema: boolean;
  atualizadoEm: string;
};

type LinhaModelo = { id: string; nome: string; descricao: string | null; series: unknown; regras: unknown; tenant_id: string | null; atualizado_em: string };
const paraResumo = (m: LinhaModelo): ModeloResumo => ({
  id: m.id,
  nome: m.nome,
  descricao: m.descricao,
  series: Array.isArray(m.series) ? (m.series as SerieModelo[]) : [],
  regras: (m.regras && typeof m.regras === "object" ? m.regras : {}) as RegrasModelo,
  sistema: m.tenant_id == null,
  atualizadoEm: m.atualizado_em,
});

/** Nomes (normalizados) das construtoras que têm modelo do sistema, com a quantidade. */
const modelosSistemaPorNome = cache(async () => {
  const { supabase } = await getContexto();
  const { data, error } = await supabase.from("modelos_pagamento").select("construtora_nome").is("tenant_id", null);
  if (error) throw error;
  const mapa = new Map<string, number>();
  for (const m of data) {
    if (!m.construtora_nome) continue;
    const k = normalizarNome(m.construtora_nome);
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return mapa;
});

export type ConstrutoraLista = { id: string; nome: string; cnpj: string | null; modelos: number };

export const listarConstrutoras = cache(async (): Promise<ConstrutoraLista[]> => {
  const { supabase, tenant } = await getContexto();
  const [{ data, error }, sistema] = await Promise.all([
    supabase.from("construtoras").select("id, nome, cnpj, modelos_pagamento(count)").eq("tenant_id", tenant.id).order("nome"),
    modelosSistemaPorNome(),
  ]);
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    nome: c.nome,
    cnpj: c.cnpj,
    modelos: (c.modelos_pagamento[0]?.count ?? 0) + [...sistema].reduce((t, [k, n]) => t + (mesmaConstrutora(k, c.nome) ? n : 0), 0),
  }));
});

/** Construtora do tenant com os modelos dela e os do sistema com o mesmo nome. 404 se não existir. */
export const obterConstrutora = cache(async (id: string) => {
  if (!uuid(id)) notFound();
  const { supabase, tenant } = await getContexto();
  const { data: c, error } = await supabase
    .from("construtoras")
    .select("id, nome, cnpj, contato, criado_em, vendas(count)")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!c) notFound();

  const campos = "id, nome, descricao, series, regras, tenant_id, atualizado_em, construtora_nome";
  const [proprios, sistema] = await Promise.all([
    supabase.from("modelos_pagamento").select(campos).eq("tenant_id", tenant.id).eq("construtora_id", id).order("nome"),
    supabase.from("modelos_pagamento").select(campos).is("tenant_id", null).order("nome"),
  ]);
  if (proprios.error) throw proprios.error;
  if (sistema.error) throw sistema.error;

  const { vendas, ...dados } = c;
  return {
    ...dados,
    vendas: vendas[0]?.count ?? 0,
    modelos: proprios.data.map(paraResumo),
    modelosSistema: sistema.data.filter((m) => m.construtora_nome && mesmaConstrutora(m.construtora_nome, c.nome)).map(paraResumo),
  };
});
export type ConstrutoraCompleta = Awaited<ReturnType<typeof obterConstrutora>>;

/** Modelo da construtora: do tenant (ligado a ela) ou do sistema (pelo nome). 404 se não for dela. */
export const obterModelo = cache(async (construtoraId: string, modeloId: string) => {
  if (!uuid(modeloId)) notFound();
  const c = await obterConstrutora(construtoraId);
  const modelo = c.modelos.find((m) => m.id === modeloId) ?? c.modelosSistema.find((m) => m.id === modeloId);
  if (!modelo) notFound();
  return { construtora: c, modelo };
});
