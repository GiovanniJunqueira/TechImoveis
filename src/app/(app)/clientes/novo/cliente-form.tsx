"use client";

import { useActionState } from "react";
import { criarCliente } from "../../cadastro-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormSemReset, FormMessage, GroupLabel, SubmitButton, TextAreaField } from "@/components/form";

/** 12345678901 -> 123.456.789-01 enquanto digita. */
function mascaraCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

/** 11987654321 -> (11) 98765-4321 enquanto digita. */
function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/^(\d{1,2})/, "($1");
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return d.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

export function ClienteForm({ voltar }: { voltar?: string }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(criarCliente, {});
  return (
    <FormSemReset acao={acao} className="flex flex-col">
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <FieldGroup>
        <Field label="Nome completo" name="nome" autoComplete="off" required autoFocus />
      </FieldGroup>

      <GroupLabel>Contato</GroupLabel>
      <FieldGroup>
        <Field
          label="Telefone / WhatsApp"
          name="telefone"
          type="tel"
          inputMode="tel"
          placeholder="(11) 90000-0000"
          onChange={(e) => (e.currentTarget.value = mascaraTelefone(e.currentTarget.value))}
        />
        <Field label="E-mail" name="email" type="email" inputMode="email" placeholder="cliente@email.com" />
      </FieldGroup>

      <GroupLabel>Documentos</GroupLabel>
      <FieldGroup>
        <Field
          label="CPF"
          name="cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          onChange={(e) => (e.currentTarget.value = mascaraCpf(e.currentTarget.value))}
        />
        <Field label="Data de nascimento" name="data_nascimento" type="date" className="[color-scheme:dark]" />
      </FieldGroup>

      <GroupLabel>Observações</GroupLabel>
      <FieldGroup>
        <TextAreaField label="Anotações sobre o cliente" name="observacoes" placeholder="Ex.: prefere contato à noite" />
      </FieldGroup>

      <div className="mt-6 flex flex-col gap-3">
        <FormMessage erro={estado.erro} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>Salvar cliente</SubmitButton>
      </div>
    </FormSemReset>
  );
}
