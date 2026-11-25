"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; aviso?: string; valores?: Record<string, string> };

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Só aceita caminhos internos, para evitar redirecionamento para outro site. */
const destinoSeguro = (next: string) => (next.startsWith("/") && !next.startsWith("//") ? next : "/");

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = texto(form, "email");
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", valores: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    const msg =
      error.code === "email_not_confirmed"
        ? "Confirme seu e-mail antes de entrar. Enviamos um link para a sua caixa de entrada."
        : "E-mail ou senha incorretos.";
    return { erro: msg, valores: { email } };
  }
  redirect(destinoSeguro(texto(form, "next")));
}

export async function cadastrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = texto(form, "nome");
  const email = texto(form, "email");
  const senha = String(form.get("senha") ?? "");
  const valores = { nome, email };

  if (nome.length < 2) return { erro: "Informe seu nome.", valores };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: "Informe um e-mail válido.", valores };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres.", valores };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome }, emailRedirectTo: `${origin}/auth/confirmar` },
  });
  if (error) {
    const msg = error.code === "user_already_exists" ? "Já existe uma conta com esse e-mail." : "Não foi possível criar a conta. Tente de novo.";
    return { erro: msg, valores };
  }
  if (!data.session) {
    return { aviso: `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.` };
  }
  redirect("/");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
