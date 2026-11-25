"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getContexto } from "@/lib/dal";
import { hashToken, novoToken, urlPortal, VALIDADE_PADRAO_DIAS } from "@/lib/portal";
import type { EstadoForm } from "@/app/(auth)/actions";

// Portal do cliente, lado do corretor: gerar/revogar o link e revisar documentos enviados pelo cliente.
// O RLS já isola por tenant; os filtros por tenant_id aqui são uma segunda barreira.

const DIA_MS = 86_400_000;
const MAX_DIAS = 180;

/** Domínio da requisição atual (atrás de proxy usa x-forwarded-*). */
async function origemAtual() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return h.get("origin") ?? "";
}

/**
 * Gera um novo link do portal e revoga os anteriores (só um ativo por cliente).
 * O token cru só existe nesta resposta; o banco guarda apenas o hash.
 */
export async function gerarLinkPortal(clienteId: string, dias: number = VALIDADE_PADRAO_DIAS): Promise<EstadoForm & { url?: string }> {
  const { supabase, tenant, userId } = await getContexto();
  const { data: cliente } = await supabase.from("clientes").select("id, cpf, data_nascimento").eq("tenant_id", tenant.id).eq("id", clienteId).maybeSingle();
  if (!cliente) return { erro: "Cliente não encontrado." };
  if ((cliente.cpf?.replace(/\D/g, "").length ?? 0) < 4 && !cliente.data_nascimento) {
    return { erro: "Cadastre o CPF ou a data de nascimento do cliente para gerar o link." };
  }

  const agora = new Date();
  const { error: erroRevogar } = await supabase
    .from("links_portal")
    .update({ revogado_em: agora.toISOString() })
    .eq("tenant_id", tenant.id)
    .eq("cliente_id", clienteId)
    .is("revogado_em", null);
  if (erroRevogar) return { erro: "Não foi possível gerar o link. Tente de novo." };

  // Folga de 1 min no limite de 180 dias (o banco compara com o próprio relógio).
  const n = Number.isFinite(dias) ? Math.max(1, Math.round(dias)) : VALIDADE_PADRAO_DIAS;
  const validade = Math.min(n * DIA_MS, MAX_DIAS * DIA_MS - 60_000);
  const token = novoToken();
  const { error } = await supabase.from("links_portal").insert({
    tenant_id: tenant.id,
    cliente_id: clienteId,
    token_hash: hashToken(token),
    criado_por: userId,
    expira_em: new Date(agora.getTime() + validade).toISOString(),
  });
  if (error) return { erro: "Não foi possível gerar o link. Tente de novo." };

  revalidatePath(`/clientes/${clienteId}`);
  return { url: urlPortal(await origemAtual(), token) };
}

export async function revogarLinkPortal(linkId: string): Promise<EstadoForm> {
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("links_portal")
    .update({ revogado_em: new Date().toISOString() })
    .eq("tenant_id", tenant.id)
    .eq("id", linkId)
    .is("revogado_em", null)
    .select("cliente_id")
    .maybeSingle();
  if (error) return { erro: "Não foi possível revogar o link." };
  if (data) revalidatePath(`/clientes/${data.cliente_id}`);
  return {};
}

/** Aprova ou recusa um documento (os enviados pelo cliente chegam como "pendente"). */
export async function definirStatusDocumento(documentoId: string, status: "ok" | "recusado"): Promise<EstadoForm> {
  if (status !== "ok" && status !== "recusado") return { erro: "Status inválido." };
  const { supabase, tenant } = await getContexto();
  const { data, error } = await supabase
    .from("documentos")
    .update({ status })
    .eq("tenant_id", tenant.id)
    .eq("id", documentoId)
    .select("cliente_id")
    .maybeSingle();
  if (error) return { erro: "Não foi possível atualizar o documento." };
  if (!data) return { erro: "Documento não encontrado." };
  revalidatePath(`/clientes/${data.cliente_id}`);
  return {};
}
