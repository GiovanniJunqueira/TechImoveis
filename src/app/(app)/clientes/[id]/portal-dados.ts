import "server-only";
import { getContexto } from "@/lib/dal";

export type LinkPortalAtivo = { id: string; criado_em: string; expira_em: string; ultimo_acesso: string | null };

/** Link do portal em vigor para o cliente (não revogado, não vencido, o mais recente). */
export async function linkPortalAtivo(clienteId: string): Promise<LinkPortalAtivo | null> {
  const { supabase, tenant } = await getContexto();
  const { data } = await supabase
    .from("links_portal")
    .select("id, criado_em, expira_em, ultimo_acesso")
    .eq("tenant_id", tenant.id)
    .eq("cliente_id", clienteId)
    .is("revogado_em", null)
    .gt("expira_em", new Date().toISOString())
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
