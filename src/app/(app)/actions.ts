"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/dal";
import { EXEMPLOS } from "@/lib/exemplos";
import type { EstadoForm } from "@/app/(auth)/actions";

export async function salvarCor(cor: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) return { erro: "Cor inválida." };
  const { supabase, tenant, papel } = await getContexto();
  if (papel !== "dono") return { erro: "Só o dono da conta pode mudar a cor." };
  const { error } = await supabase.from("tenants").update({ cor_destaque: cor.toLowerCase() }).eq("id", tenant.id);
  if (error) return { erro: "Não foi possível salvar a cor." };
  revalidatePath("/", "layout");
  return {};
}

export async function salvarPerfil(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  const creci = String(form.get("creci") ?? "").trim() || null;
  const telefone = String(form.get("telefone") ?? "").trim() || null;
  if (nome.length < 2) return { erro: "Informe seu nome." };

  const { supabase, userId } = await getContexto();
  const { error } = await supabase.from("perfis").update({ nome, creci, telefone }).eq("user_id", userId);
  if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/", "layout");
  return { aviso: "Perfil salvo." };
}

/** Preenche a conta com vendas de exemplo, para conhecer o sistema. */
export async function carregarExemplos() {
  const { supabase, tenant } = await getContexto();
  const { count } = await supabase.from("vendas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
  if (count) return { erro: "Sua conta já tem vendas." };

  const nomesConstrutoras = [...new Set(EXEMPLOS.map((e) => e.construtora).filter(Boolean))] as string[];
  const { data: construtoras, error: e1 } = await supabase
    .from("construtoras")
    .insert(nomesConstrutoras.map((nome) => ({ nome, tenant_id: tenant.id })))
    .select("id, nome");
  if (e1) return { erro: e1.message };
  const idConstrutora = new Map(construtoras.map((c) => [c.nome, c.id]));

  const emps = [...new Map(EXEMPLOS.map((e) => [e.empreendimento, e.construtora])).entries()];
  const { data: empreendimentos, error: e2 } = await supabase
    .from("empreendimentos")
    .insert(emps.map(([nome, c]) => ({ nome, tenant_id: tenant.id, construtora_id: c ? idConstrutora.get(c) : null })))
    .select("id, nome");
  if (e2) return { erro: e2.message };
  const idEmp = new Map(empreendimentos.map((x) => [x.nome, x.id]));

  const nomesClientes = [...new Set(EXEMPLOS.map((e) => e.cliente))];
  const { data: clientes, error: e3 } = await supabase
    .from("clientes")
    .insert(nomesClientes.map((nome) => ({ nome, tenant_id: tenant.id })))
    .select("id, nome");
  if (e3) return { erro: e3.message };
  const idCliente = new Map(clientes.map((c) => [c.nome, c.id]));

  const { data: vendas, error: e4 } = await supabase
    .from("vendas")
    .insert(
      EXEMPLOS.map((e) => ({
        tenant_id: tenant.id,
        cliente_id: idCliente.get(e.cliente)!,
        tipo: e.tipo,
        construtora_id: e.construtora ? idConstrutora.get(e.construtora) : null,
        empreendimento_id: idEmp.get(e.empreendimento),
        unidade: e.unidade,
        valor_venda_centavos: e.valor * 100,
        data_venda: e.data,
        comissao_percentual: e.pct,
        comissao_centavos: Math.round(e.valor * e.pct),
      })),
    )
    .select("id");
  if (e4) return { erro: e4.message };

  const { error: e5 } = await supabase.from("recebimentos").insert(
    EXEMPLOS.map((e, i) => {
      const valor = Math.round(e.valor * e.pct);
      return {
        tenant_id: tenant.id,
        venda_id: vendas[i].id,
        pagador_tipo: "cliente" as const,
        valor_previsto_centavos: valor,
        data_prevista: e.previsto,
        ...(e.recebido ? { data_recebida: e.recebido, valor_recebido_centavos: valor, forma: "pix" as const } : {}),
      };
    }),
  );
  if (e5) return { erro: e5.message };

  revalidatePath("/", "layout");
  return {};
}
