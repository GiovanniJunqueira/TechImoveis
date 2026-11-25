"use client";

import { useActionState } from "react";
import { salvarPerfil } from "../actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, SubmitButton } from "@/components/form";

type Perfil = { nome: string; creci: string | null; telefone: string | null };

export function PerfilForm({ perfil, email }: { perfil: Perfil; email: string }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarPerfil, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <FieldGroup>
        <Field label="Nome" name="nome" autoComplete="name" required defaultValue={perfil.nome} />
        <Field label="CRECI" name="creci" placeholder="000000-F" defaultValue={perfil.creci ?? ""} />
        <Field label="Telefone" name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 90000-0000" defaultValue={perfil.telefone ?? ""} />
        <Field label="E-mail" value={email} readOnly className="text-label-2" />
      </FieldGroup>
      <FormMessage erro={estado.erro} aviso={estado.aviso} />
      <SubmitButton pendingLabel="Salvando…">Salvar perfil</SubmitButton>
    </form>
  );
}
