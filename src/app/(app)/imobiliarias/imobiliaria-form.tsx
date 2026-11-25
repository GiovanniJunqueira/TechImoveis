"use client";

import { useActionState } from "react";
import { atualizarImobiliaria, criarImobiliaria } from "./actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, SubmitButton, TextAreaField } from "@/components/form";

export type ImobiliariaInicial = { id: string; nome: string; contato: string | null };

/** Cadastro de imobiliária parceira; com `inicial`, edita a existente. */
export function ImobiliariaForm({ inicial }: { inicial?: ImobiliariaInicial }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(inicial ? atualizarImobiliaria.bind(null, inicial.id) : criarImobiliaria, {});
  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <FieldGroup>
        <Field label="Nome" name="nome" autoComplete="off" required autoFocus={!inicial} placeholder="Ex.: Imobiliária Centro" defaultValue={inicial?.nome} />
        <TextAreaField
          label="Contato (opcional)"
          name="contato"
          rows={2}
          placeholder="Ex.: Carlos, gerente, (11) 90000-0000"
          defaultValue={inicial?.contato ?? undefined}
        />
      </FieldGroup>

      <div className="mt-4 flex flex-col gap-3">
        <FormMessage erro={estado.erro} aviso={estado.aviso} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          {inicial ? "Salvar dados" : "Salvar imobiliária"}
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
