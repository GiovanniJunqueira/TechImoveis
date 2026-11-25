"use client";

import { useActionState } from "react";
import { atualizarEmpreendimento, criarEmpreendimento } from "./actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, SelectField, SubmitButton } from "@/components/form";

export type EmpreendimentoInicial = {
  id: string;
  nome: string;
  construtora_id: string | null;
  cidade: string | null;
  endereco: string | null;
  previsao_entrega: string | null;
};

/** Cadastro de empreendimento; com `inicial`, edita o existente. */
export function EmpreendimentoForm({
  inicial,
  construtoras,
  construtoraPadrao,
}: {
  inicial?: EmpreendimentoInicial;
  construtoras: { id: string; nome: string }[];
  construtoraPadrao?: string;
}) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(
    inicial ? atualizarEmpreendimento.bind(null, inicial.id) : criarEmpreendimento,
    {},
  );
  const opcoes = [{ value: "", label: construtoras.length ? "Sem construtora" : "Nenhuma construtora cadastrada" }, ...construtoras.map((c) => ({ value: c.id, label: c.nome }))];

  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <FieldGroup>
        <Field label="Nome" name="nome" autoComplete="off" required autoFocus={!inicial} placeholder="Ex.: Residencial Jardins" defaultValue={inicial?.nome} />
        <SelectField
          label="Construtora (opcional)"
          name="construtora_id"
          options={opcoes}
          defaultValue={inicial ? (inicial.construtora_id ?? "") : (construtoraPadrao ?? "")}
        />
        <Field label="Cidade (opcional)" name="cidade" autoComplete="off" placeholder="Ex.: Campinas" defaultValue={inicial?.cidade ?? undefined} />
        <Field label="Endereço (opcional)" name="endereco" autoComplete="off" placeholder="Rua, número, bairro" defaultValue={inicial?.endereco ?? undefined} />
        <Field
          label="Previsão de entrega (opcional)"
          name="previsao_entrega"
          type="month"
          defaultValue={inicial?.previsao_entrega?.slice(0, 7) ?? undefined}
          className="min-h-[26px] [color-scheme:dark]"
        />
      </FieldGroup>

      <div className="mt-4 flex flex-col gap-3">
        <FormMessage erro={estado.erro} aviso={estado.aviso} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          {inicial ? "Salvar dados" : "Salvar empreendimento"}
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
