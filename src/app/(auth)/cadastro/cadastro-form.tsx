"use client";

import { useActionState } from "react";
import { cadastrar, type EstadoForm } from "../actions";
import { Field, FieldGroup, FormMessage, SubmitButton } from "@/components/form";

export function CadastroForm() {
  const [estado, acao] = useActionState<EstadoForm, FormData>(cadastrar, {});
  if (estado.aviso) return <FormMessage aviso={estado.aviso} />;
  return (
    <form action={acao} className="flex flex-col gap-4">
      <FieldGroup>
        <Field label="Seu nome" name="nome" autoComplete="name" required defaultValue={estado.valores?.nome} />
        <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={estado.valores?.email} />
        <Field label="Senha (mínimo 8 caracteres)" name="senha" type="password" autoComplete="new-password" minLength={8} required />
      </FieldGroup>
      <FormMessage erro={estado.erro} />
      <SubmitButton pendingLabel="Criando conta…">Criar conta</SubmitButton>
    </form>
  );
}
