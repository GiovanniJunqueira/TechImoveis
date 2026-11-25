"use client";

import { useActionState } from "react";
import { atualizarCliente, criarCliente } from "../../cadastro-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, GroupLabel, SubmitButton, TextAreaField } from "@/components/form";
import { mascaraCpf, mascaraTelefone } from "@/lib/format";

export type ClienteInicial = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
};

/** Cadastro de cliente; com `inicial`, edita o cliente existente. */
export function ClienteForm({ voltar, inicial }: { voltar?: string; inicial?: ClienteInicial }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(inicial ? atualizarCliente.bind(null, inicial.id) : criarCliente, {});
  return (
    <FormSemReset acao={acao} className="flex flex-col">
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <FieldGroup>
        <Field label="Nome completo" name="nome" autoComplete="off" required autoFocus={!inicial} defaultValue={inicial?.nome} />
      </FieldGroup>

      <GroupLabel>Contato</GroupLabel>
      <FieldGroup>
        <Field
          label="Telefone / WhatsApp"
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 90000-0000"
          defaultValue={inicial?.telefone ? mascaraTelefone(inicial.telefone) : undefined}
          onChange={(e) => (e.currentTarget.value = mascaraTelefone(e.currentTarget.value))}
        />
        <Field label="E-mail" name="email" type="email" inputMode="email" placeholder="cliente@email.com" defaultValue={inicial?.email ?? undefined} />
      </FieldGroup>

      <GroupLabel>Documentos</GroupLabel>
      <FieldGroup>
        <Field
          label="CPF"
          name="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          defaultValue={inicial?.cpf ? mascaraCpf(inicial.cpf) : undefined}
          onChange={(e) => (e.currentTarget.value = mascaraCpf(e.currentTarget.value))}
        />
        <Field
          label="Data de nascimento"
          name="data_nascimento"
          type="date"
          className="[color-scheme:dark]"
          defaultValue={inicial?.data_nascimento ?? undefined}
        />
      </FieldGroup>

      <GroupLabel>Observações</GroupLabel>
      <FieldGroup>
        <TextAreaField
          label="Anotações sobre o cliente"
          name="observacoes"
          placeholder="Ex.: prefere contato à noite"
          defaultValue={inicial?.observacoes ?? undefined}
        />
      </FieldGroup>

      <div className="mt-6 flex flex-col gap-3">
        <FormMessage erro={estado.erro} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          {inicial ? "Salvar alterações" : "Salvar cliente"}
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
