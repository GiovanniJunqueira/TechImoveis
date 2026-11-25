"use client";

import { useActionState, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, RotateCcw } from "lucide-react";
import { LixeiraConfirmar } from "@/components/botao-excluir";
import { adicionarRecebimento, desfazerRecebido, excluirRecebimento, marcarRecebido } from "../../cadastro-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, MoneyField, Segmented, SelectField, SubmitButton } from "@/components/form";
import { Badge, Card, cn } from "@/components/ui";
import { brl, dataCurta } from "@/lib/format";

export type Recebimento = {
  id: string;
  pagador: string;
  valorPrevisto: number;
  dataPrevista: string;
  valorRecebido: number | null;
  dataRecebida: string | null;
  forma: string | null;
};

const FORMAS = [
  { value: "pix", label: "Pix" },
  { value: "ted", label: "TED / transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" },
];
const FORMA_LABEL = Object.fromEntries(FORMAS.map((f) => [f.value, f.label]));
const PAGADORES = [
  { value: "cliente", label: "Cliente" },
  { value: "construtora", label: "Construtora" },
  { value: "imobiliaria", label: "Imobiliária" },
  { value: "outro", label: "Outro" },
];

const ease = [0.32, 0.72, 0, 1] as const;
const Expande = ({ aberto, children }: { aberto: boolean; children: React.ReactNode }) => (
  <AnimatePresence initial={false}>
    {aberto && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.32, ease }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

function MarcarRecebido({ r, hoje, aoConcluir }: { r: Recebimento; hoje: string; aoConcluir: () => void }) {
  const [valor, setValor] = useState(r.valorPrevisto);
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(async (s, f) => {
    const res = await marcarRecebido(r.id, s, f);
    if (!res.erro) aoConcluir();
    return res;
  }, {});
  return (
    <FormSemReset acao={acao} className="flex flex-col gap-3 px-3 pb-3">
      <div className="rounded-[14px] bg-surface-2">
        <FieldGroup>
          <Field label="Recebido em" name="data_recebida" type="date" required defaultValue={hoje} className="[color-scheme:dark]" />
          <MoneyField label="Valor recebido" name="valor_recebido" value={valor} onChange={setValor} />
          <SelectField label="Forma" name="forma" defaultValue="pix" options={FORMAS} />
        </FieldGroup>
      </div>
      <FormMessage erro={estado.erro} />
      <SubmitButton pendingLabel="Salvando…" pending={salvando}>
        Confirmar recebimento
      </SubmitButton>
    </FormSemReset>
  );
}

function LinhaRecebimento({ r, hoje }: { r: Recebimento; hoje: string }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const recebido = Boolean(r.dataRecebida);
  const atrasado = !recebido && r.dataPrevista < hoje;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3.5 md:px-5">
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-medium">
            {recebido ? <span className="text-positive">+{brl(r.valorRecebido ?? r.valorPrevisto)}</span> : brl(r.valorPrevisto)}
          </div>
          <div className="text-[13px] text-label-2">
            {r.pagador}.{" "}
            {recebido
              ? `Recebido em ${dataCurta(r.dataRecebida!)}${r.forma ? `, ${FORMA_LABEL[r.forma] ?? r.forma}` : ""}`
              : `${atrasado ? "Venceu em" : "Previsto para"} ${dataCurta(r.dataPrevista)}`}
          </div>
        </div>
        {recebido ? <Badge tone="positive">Recebido</Badge> : atrasado ? <Badge tone="negative">Atrasado</Badge> : <Badge tone="pending">A receber</Badge>}
      </div>

      <div className="flex gap-2 px-3 pb-3">
        {recebido ? (
          <button
            type="button"
            disabled={pendente}
            onClick={() => iniciar(async () => void (await desfazerRecebido(r.id)))}
            className="flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[14px] font-medium text-label-2 transition active:scale-[0.97] disabled:opacity-60"
          >
            <RotateCcw className="size-4" /> Desfazer recebimento
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition active:scale-[0.97]",
              aberto ? "bg-surface-2 text-label-2" : "bg-positive/15 text-positive",
            )}
          >
            <Check className="size-4" /> {aberto ? "Cancelar" : "Marcar como recebido"}
          </button>
        )}
        <div className="ml-auto">
          <LixeiraConfirmar rotulo="Excluir parcela" pendente={pendente} aoConfirmar={() => iniciar(async () => void (await excluirRecebimento(r.id)))} />
        </div>
      </div>

      <Expande aberto={aberto && !recebido}>
        <MarcarRecebido r={r} hoje={hoje} aoConcluir={() => setAberto(false)} />
      </Expande>
    </div>
  );
}

function NovaParcela({ vendaId, hoje, sugestao, aoConcluir }: { vendaId: string; hoje: string; sugestao: number; aoConcluir: () => void }) {
  const [valor, setValor] = useState(sugestao);
  const [pagador, setPagador] = useState("cliente");
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(async (s, f) => {
    const res = await adicionarRecebimento(vendaId, s, f);
    if (!res.erro) aoConcluir();
    return res;
  }, {});
  return (
    <FormSemReset acao={acao} className="mt-3 flex flex-col gap-3">
      <Segmented name="pagador_tipo" options={PAGADORES} value={pagador} onChange={setPagador} />
      <FieldGroup>
        {pagador === "outro" && <Field label="Nome de quem paga" name="pagador_nome" autoComplete="off" />}
        <MoneyField label="Valor" name="valor" required value={valor} onChange={setValor} />
        <Field label="Previsão de pagamento" name="data_prevista" type="date" required defaultValue={hoje} className="[color-scheme:dark]" />
      </FieldGroup>
      <FormMessage erro={estado.erro} />
      <SubmitButton pendingLabel="Salvando…" pending={salvando}>
        Adicionar parcela
      </SubmitButton>
    </FormSemReset>
  );
}

/** Parcelas da comissão de uma venda: marcar recebido, desfazer, excluir e adicionar. */
export function Recebimentos({ vendaId, itens, comissao, hoje }: { vendaId: string; itens: Recebimento[]; comissao: number; hoje: string }) {
  const [adicionando, setAdicionando] = useState(false);
  const previsto = itens.reduce((s, r) => s + r.valorPrevisto, 0);
  const falta = Math.max(comissao - previsto, 0);

  return (
    <>
      {itens.length > 0 ? (
        <Card className="divide-y divide-separator overflow-hidden">
          {itens.map((r) => (
            <LinhaRecebimento key={r.id} r={r} hoje={hoje} />
          ))}
        </Card>
      ) : (
        <Card className="px-5 py-5 text-[15px] text-label-2">Nenhuma parcela de comissão cadastrada.</Card>
      )}

      {comissao > 0 && previsto !== comissao && (
        <p className="mt-2 px-1 text-[13px] text-pending">
          As parcelas somam {brl(previsto)}, mas a comissão da venda é {brl(comissao)}.
        </p>
      )}

      {adicionando ? (
        <NovaParcela vendaId={vendaId} hoje={hoje} sugestao={falta} aoConcluir={() => setAdicionando(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdicionando(true)}
          className="mt-3 flex items-center gap-1.5 px-1 text-[15px] font-medium text-accent"
        >
          <Plus className="size-4" /> Adicionar parcela de comissão
        </button>
      )}
    </>
  );
}
