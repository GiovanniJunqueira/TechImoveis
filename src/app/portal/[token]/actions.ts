"use server";

import { redirect } from "next/navigation";
import { entrarPortal, sairPortal } from "@/lib/portal";

export type EstadoEntrada = { erro?: string } | undefined;

const MENSAGENS = {
  errado: "Não confere. Confira e tente de novo.",
  bloqueado: "Muitas tentativas. Tente de novo em 15 minutos.",
  invalido: "Link inválido ou expirado. Peça um novo link ao seu corretor.",
} as const;

/** Confere CPF (4 dígitos) ou nascimento (DDMMAAAA) e abre a sessão do portal. */
export async function entrar(token: string, _: EstadoEntrada, form: FormData): Promise<EstadoEntrada> {
  const resposta = String(form.get("resposta") ?? "").replace(/\D/g, "").slice(0, 8);
  if (!resposta) return { erro: "Preencha o campo para continuar." };
  const r = await entrarPortal(token, resposta);
  if (r !== "ok") return { erro: MENSAGENS[r] ?? MENSAGENS.invalido };
  redirect(`/portal/${encodeURIComponent(token)}`);
}

export async function sair(token: string) {
  await sairPortal();
  redirect(`/portal/${encodeURIComponent(token)}`);
}
