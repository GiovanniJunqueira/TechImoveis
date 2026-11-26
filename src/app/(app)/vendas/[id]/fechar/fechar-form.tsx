"use client";

import { useActionState, useState } from "react";
import { fecharVenda } from "../../../cadastro-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, GroupLabel, MoneyField, Segmented, SelectField, SubmitButton, Toggle } from "@/components/form";

const PAGADORES = [
  { value: "cliente", label: "Cliente" },
  { value: "construtora", label: "Construtora" },
  { value: "imobiliaria", label: "Imobiliária" },
  { value: "outro", label: "Outro" },
];
const FORMAS = [
  { value: "pix", label: "Pix" },
  { value: "ted", label: "TED / transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];
const dateCls = "[color-scheme:dark]";
const pctTexto = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/** Fechamento da venda: data, valor final e a comissão do corretor (que nunca aparece na proposta). */
export function FecharForm({ vendaId, valorInicial, hoje }: { vendaId: string; valorInicial: number; hoje: string }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(fecharVenda.bind(null, vendaId), {});
  const [valor, setValor] = useState(valorInicial);
  const [pct, setPct] = useState("");
  const [comissao, setComissao] = useState(0);
  const [pagador, setPagador] = useState("cliente");
  const [recebida, setRecebida] = useState(false);

  const calcular = (v: number, p: string) => {
    const n = Number(p.replace(",", "."));
    if (p && !Number.isNaN(n)) setComissao(Math.round((v * n) / 100));
  };

  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <GroupLabel>Venda</GroupLabel>
      <FieldGroup>
        <Field label="Data do fechamento" name="data_venda" type="date" required defaultValue={hoje} className={dateCls} />
        <MoneyField
          label="Valor final da venda"
          name="valor_venda"
          required
          value={valor}
          onChange={(v) => {
            setValor(v);
            calcular(v, pct);
          }}
        />
      </FieldGroup>

      <GroupLabel>Sua comissão</GroupLabel>
      <FieldGroup>
        <label className="flex flex-col px-4 pt-2.5 pb-2">
          <span className="text-[12px] text-label-2">Percentual</span>
          <div className="flex items-baseline gap-1 py-0.5 text-[17px]">
            <input
              name="comissao_pct"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={pct}
              onChange={(e) => {
                const p = e.target.value.replace(/[^\d,.]/g, "").slice(0, 6);
                setPct(p);
                calcular(valor, p);
              }}
              className="w-16 bg-transparent text-label tabular-nums outline-none placeholder:text-label-3"
            />
            <span className="text-label-2">%</span>
          </div>
        </label>
        <MoneyField
          label="Valor da comissão"
          name="comissao"
          value={comissao}
          onChange={(v) => {
            setComissao(v);
            setPct(valor > 0 && v > 0 ? pctTexto((v / valor) * 100) : "");
          }}
        />
      </FieldGroup>

      {comissao > 0 && (
        <>
          <GroupLabel>Quem paga a comissão</GroupLabel>
          <Segmented name="pagador_tipo" options={PAGADORES} value={pagador} onChange={setPagador} />
          <div className="mt-2">
            <FieldGroup>
              {pagador === "outro" && <Field label="Nome de quem paga" name="pagador_nome" autoComplete="off" />}
              <Field label="Previsão de pagamento" name="data_prevista" type="date" required defaultValue={hoje} className={dateCls} />
              <Toggle label="Já recebi" name="recebida" checked={recebida} onChange={setRecebida} />
              {recebida && (
                <>
                  <Field label="Recebido em" name="data_recebida" type="date" required defaultValue={hoje} className={dateCls} />
                  <SelectField label="Forma" name="forma" defaultValue="pix" options={FORMAS} />
                </>
              )}
            </FieldGroup>
          </div>
        </>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <FormMessage erro={estado.erro} />
        <SubmitButton pendingLabel="Fechando…" pending={salvando}>
          Fechar venda
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
