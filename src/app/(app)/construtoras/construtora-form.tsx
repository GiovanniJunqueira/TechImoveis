"use client";

import { useActionState } from "react";
import { atualizarConstrutora, criarConstrutora } from "./actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, SubmitButton, TextAreaField } from "@/components/form";
import { mascaraCnpj } from "./resumo";

export type ConstrutoraInicial = { id: string; nome: string; cnpj: string | null; contato: string | null };

/** Cadastro de construtora; com `inicial`, edita a existente. */
export function ConstrutoraForm({ inicial }: { inicial?: ConstrutoraInicial }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(inicial ? atualizarConstrutora.bind(null, inicial.id) : criarConstrutora, {});
  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <FieldGroup>
        <Field label="Nome" name="nome" autoComplete="off" required autoFocus={!inicial} placeholder="Ex.: Construtora Horizonte" defaultValue={inicial?.nome} />
        <Field
          label="CNPJ (opcional)"
          name="cnpj"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          defaultValue={inicial?.cnpj ? mascaraCnpj(inicial.cnpj) : undefined}
          onChange={(e) => (e.currentTarget.value = mascaraCnpj(e.currentTarget.value))}
        />
        <TextAreaField
          label="Contato (opcional)"
          name="contato"
          rows={2}
          placeholder="Ex.: Mariana, comercial, (11) 90000-0000"
          defaultValue={inicial?.contato ?? undefined}
        />
      </FieldGroup>

      <div className="mt-4 flex flex-col gap-3">
        <FormMessage erro={estado.erro} aviso={estado.aviso} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          {inicial ? "Salvar dados" : "Salvar construtora"}
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
