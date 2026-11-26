"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { atualizarVenda, criarVenda } from "../../cadastro-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormSemReset, FormMessage, GroupLabel, MoneyField, Segmented, SelectField, SubmitButton, TextAreaField, Toggle } from "@/components/form";

type Opcoes = {
  clientes: { id: string; nome: string }[];
  construtoras: string[];
  empreendimentos: { nome: string; construtora: string | null }[];
  imobiliarias: string[];
};

const TIPOS = [
  { value: "lancamento", label: "Lançamento" },
  { value: "pronto", label: "Pronto" },
  { value: "revenda", label: "Revenda" },
];
const STATUS = [
  { value: "proposta", label: "Proposta" },
  { value: "fechada", label: "Venda fechada" },
];
const STATUS_EDICAO = [...STATUS, { value: "distrato", label: "Distrato" }];
// Proposta já salva: fecha pelo botão "Fechar venda" (que registra a comissão), não por aqui.
const STATUS_EDICAO_PROPOSTA = [STATUS[0], { value: "distrato", label: "Desistiu" }];

/** Valores de uma venda existente, para editar. */
export type VendaInicial = {
  id: string;
  clienteId: string;
  tipo: string;
  status: string;
  data: string;
  valor: number;
  pct: number | null;
  comissao: number;
  imovel: string;
  construtora: string;
  unidade: string;
  imobiliaria: string;
  observacoes: string;
};
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
/** 5.5 -> "5,5" */
const pctTexto = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export function VendaForm({
  opcoes,
  clienteInicial,
  hoje,
  inicial,
  statusInicial = "proposta",
}: {
  opcoes: Opcoes;
  clienteInicial?: string;
  hoje: string;
  statusInicial?: "proposta" | "fechada";
  /** Com uma venda, o formulário edita em vez de criar. As parcelas da comissão ficam no detalhe da venda. */
  inicial?: VendaInicial;
}) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(inicial ? atualizarVenda.bind(null, inicial.id) : criarVenda, {});

  const [cliente, setCliente] = useState(inicial?.clienteId ?? clienteInicial ?? (opcoes.clientes.length ? "" : "novo"));
  const [tipo, setTipo] = useState(inicial?.tipo ?? "lancamento");
  const [status, setStatus] = useState(inicial?.status ?? statusInicial);
  const [construtora, setConstrutora] = useState(inicial?.construtora ?? "");
  const [valor, setValor] = useState(inicial?.valor ?? 0);
  const [pct, setPct] = useState(inicial?.pct != null ? pctTexto(inicial.pct) : "");
  const [comissao, setComissao] = useState(inicial?.comissao ?? 0);
  const [pagador, setPagador] = useState("cliente");
  const [recebida, setRecebida] = useState(false);

  const calcular = (valorVenda: number, p: string) => {
    const n = Number(p.replace(",", "."));
    if (p && !Number.isNaN(n)) setComissao(Math.round((valorVenda * n) / 100));
  };

  const escolherEmpreendimento = (nome: string) => {
    const emp = opcoes.empreendimentos.find((e) => e.nome.toLowerCase() === nome.trim().toLowerCase());
    if (emp?.construtora && !construtora) setConstrutora(emp.construtora);
  };

  const lancamento = tipo === "lancamento";
  // Proposta é feita na frente do cliente: nada de comissão na tela.
  const proposta = status === "proposta";

  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <Segmented name="status" options={inicial ? (inicial.status === "proposta" ? STATUS_EDICAO_PROPOSTA : STATUS_EDICAO) : STATUS} value={status} onChange={setStatus} />

      <GroupLabel>Cliente</GroupLabel>
      <FieldGroup>
        <SelectField
          label="Cliente"
          name="cliente_id"
          required
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          options={[
            { value: "", label: "Escolha o cliente" },
            { value: "novo", label: "+ Novo cliente" },
            ...opcoes.clientes.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
        {cliente === "novo" && <Field label="Nome do novo cliente" name="cliente_nome" required autoFocus autoComplete="off" />}
      </FieldGroup>
      {cliente === "novo" && (
        <Link href="/clientes/novo?voltar=/vendas/nova" className="mt-2 flex items-center gap-1.5 px-4 text-[15px] text-accent">
          <UserPlus className="size-4" /> Cadastro completo (CPF, telefone…)
        </Link>
      )}

      <GroupLabel>Imóvel</GroupLabel>
      <Segmented name="tipo" options={TIPOS} value={tipo} onChange={setTipo} />
      <div className="mt-2">
        <FieldGroup>
          <Field
            label={lancamento ? "Empreendimento" : "Imóvel"}
            name="empreendimento"
            list={lancamento ? "lista-empreendimentos" : undefined}
            autoComplete="off"
            placeholder={lancamento ? "Ex.: Residencial Jardins" : "Ex.: Apto 3 dorm., Rua das Flores, 120"}
            defaultValue={inicial?.imovel}
            onChange={(e) => lancamento && escolherEmpreendimento(e.target.value)}
          />
          {tipo !== "revenda" && (
            <Field
              label="Construtora"
              name="construtora"
              list="lista-construtoras"
              autoComplete="off"
              value={construtora}
              onChange={(e) => setConstrutora(e.target.value)}
            />
          )}
          <Field label="Unidade" name="unidade" autoComplete="off" placeholder="Ex.: Torre B, apto 142" defaultValue={inicial?.unidade} />
          <Field label="Imobiliária parceira (opcional)" name="imobiliaria" list="lista-imobiliarias" autoComplete="off" defaultValue={inicial?.imobiliaria} />
        </FieldGroup>
      </div>
      <datalist id="lista-empreendimentos">
        {opcoes.empreendimentos.map((e) => (
          <option key={e.nome} value={e.nome} />
        ))}
      </datalist>
      <datalist id="lista-construtoras">
        {opcoes.construtoras.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="lista-imobiliarias">
        {opcoes.imobiliarias.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <GroupLabel>{proposta ? "Proposta" : "Venda"}</GroupLabel>
      <FieldGroup>
        <Field label={proposta ? "Data da proposta" : "Data da venda"} name="data_venda" type="date" required defaultValue={inicial?.data ?? hoje} className={dateCls} />
        <MoneyField
          label={proposta ? "Valor do imóvel" : "Valor da venda"}
          name="valor_venda"
          required
          value={valor}
          onChange={(v) => {
            setValor(v);
            calcular(v, pct);
          }}
        />
      </FieldGroup>

      {!proposta && (
        <>
      <GroupLabel>Comissão</GroupLabel>
      <FieldGroup>
        <label className="flex flex-col px-4 pt-2.5 pb-2">
          <span className="text-[12px] text-label-2">Percentual</span>
          <div className="flex items-baseline gap-1 py-0.5 text-[17px]">
            <input
              name="comissao_pct"
              inputMode="decimal"
              placeholder="0"
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

        </>
      )}

      {!proposta && comissao > 0 && !inicial && (
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

      <GroupLabel>Observações</GroupLabel>
      <FieldGroup>
        <TextAreaField label={proposta ? "Anotações (aparecem só para você)" : "Anotações sobre a venda"} name="observacoes" defaultValue={inicial?.observacoes} />
      </FieldGroup>

      <div className="mt-6 flex flex-col gap-3">
        <FormMessage erro={estado.erro} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          {inicial ? "Salvar alterações" : proposta ? "Salvar e montar o plano" : "Salvar venda"}
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
