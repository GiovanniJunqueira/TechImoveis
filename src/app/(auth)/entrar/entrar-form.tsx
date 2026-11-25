"use client";

import { useActionState } from "react";
import { entrar, type EstadoForm } from "../actions";
import { Field, FieldGroup, FormMessage, SubmitButton } from "@/components/form";

export function EntrarForm({ next }: { next: string }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(entrar, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={estado.valores?.email} />
        <Field label="Senha" name="senha" type="password" autoComplete="current-password" required />
      </FieldGroup>
      <FormMessage erro={estado.erro} />
      <SubmitButton pendingLabel="Entrando…">Entrar</SubmitButton>
    </form>
  );
}
