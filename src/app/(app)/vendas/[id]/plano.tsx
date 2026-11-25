"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { BookmarkPlus, CalendarDays, FileText, Landmark, Pencil, Plus } from "lucide-react";
import { LixeiraConfirmar } from "@/components/botao-excluir";
import { Expande } from "@/components/expande";
import { excluirSerie, salvarBanco, salvarModelo } from "../../plano-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, SubmitButton } from "@/components/form";
import { Card, Chevron, cn } from "@/components/ui";
import { brl, dataCurta, MONTHS_SHORT, plural } from "@/lib/format";
import {
  BANCOS,
  GRUPO_LABEL,
  GRUPO_SERIE,
  TIPO_SERIE_LABEL,
  cronograma,
  intervaloTexto,
  totaisPorGrupo,
  totalPlano,
  valoresParcelas,
  type GrupoSerie,
  type Serie,
} from "@/lib/plano";

const mesAno = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${a}`;
};

const pct = (parte: number, todo: number) => (todo > 0 ? `${String(Math.round((parte / todo) * 1000) / 10).replace(".", ",")}%` : "");

const botaoPilula =
  "flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[14px] font-medium text-accent transition active:scale-[0.97] disabled:opacity-60";

function resumoSerie(s: Serie) {
  // A sobra de centavos fica na 1ª parcela; o resumo mostra o valor das demais.
  const valores = valoresParcelas(s.valor_total_centavos, s.quantidade);
  const regular = valores[valores.length - 1];
  if (s.quantidade === 1) return s.primeiro_vencimento ? `Vence em ${dataCurta(s.primeiro_vencimento)}` : "Parcela única, sem data definida";
  const valor = (
    <>
      {s.quantidade}x de <span className="sensivel">{brl(regular)}</span>
    </>
  );
  if (!s.primeiro_vencimento) return valor;
  return (
    <>
      {valor}, a partir de {mesAno(s.primeiro_vencimento)}, {intervaloTexto(s.intervalo_meses)}
    </>
  );
}

function LinhaSerie({ s }: { s: Serie }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className={cn("flex items-center gap-3 py-3 pr-2 pl-4 md:pl-5", pendente && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[16px] font-medium">{s.descricao || TIPO_SERIE_LABEL[s.tipo]}</span>
          <span className="sensivel shrink-0 text-[16px] tabular-nums">{brl(s.valor_total_centavos)}</span>
        </div>
        <div className="text-[13px] text-label-2">
          {s.descricao && `${TIPO_SERIE_LABEL[s.tipo]}. `}
          {resumoSerie(s)}
        </div>
      </div>
      <LixeiraConfirmar rotulo={`Excluir ${TIPO_SERIE_LABEL[s.tipo]}`} pendente={pendente} aoConfirmar={() => iniciar(async () => void (await excluirSerie(s.id)))} />
    </div>
  );
}

/** Banco do financiamento editável ali mesmo, com sugestões. */
function BancoInline({ vendaId, banco }: { vendaId: string; banco: string | null }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(banco ?? "");
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const salvar = () =>
    iniciar(async () => {
      const r = await salvarBanco(vendaId, valor);
      setErro(r.erro);
      if (!r.erro) setEditando(false);
    });

  if (!editando)
    return (
      <button type="button" onClick={() => setEditando(true)} className="flex items-center gap-1.5 text-[14px] text-accent">
        <Landmark className="size-4" />
        {banco || "Informar banco"}
        <Pencil className="size-3.5 opacity-70" />
      </button>
    );
  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          list="bancos-sugestoes"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar();
            if (e.key === "Escape") setEditando(false);
          }}
          placeholder="Ex.: Caixa"
          aria-label="Banco do financiamento"
          className="h-9 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-[15px] outline-none placeholder:text-label-3"
        />
        <button type="button" disabled={pendente} onClick={salvar} className="h-9 rounded-full bg-accent px-4 text-[14px] font-semibold text-white disabled:opacity-60">
          {pendente ? "…" : "Salvar"}
        </button>
      </div>
      <datalist id="bancos-sugestoes">
        {BANCOS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <div className="flex flex-wrap gap-1.5">
        {BANCOS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setValor(b)}
            className={cn("rounded-full px-3 py-1 text-[13px]", valor === b ? "bg-accent/20 text-accent" : "bg-surface-2 text-label-2")}
          >
            {b}
          </button>
        ))}
      </div>
      {erro && <p className="text-[13px] text-negative">{erro}</p>}
    </div>
  );
}

function Bloco({
  grupo,
  series,
  subtotal,
  valorVenda,
  extra,
}: {
  grupo: GrupoSerie;
  series: Serie[];
  subtotal: number;
  valorVenda: number;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="divide-y divide-separator overflow-hidden">
      <div className="px-4 py-3 md:px-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold tracking-wide text-label-2 uppercase">{GRUPO_LABEL[grupo]}</span>
          {subtotal > 0 && <span className="sensivel text-[13px] text-label-2 tabular-nums">{pct(subtotal, valorVenda)} da venda</span>}
        </div>
        {extra}
      </div>
      {series.length > 0 ? (
        series.map((s) => <LinhaSerie key={s.id} s={s} />)
      ) : (
        <div className="px-4 py-3 text-[15px] text-label-3 md:px-5">{grupo === "banco" ? "Sem valores do banco." : "Sem parcelas de entrada."}</div>
      )}
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 md:px-5">
        <span className="text-[15px] text-label-2">Subtotal</span>
        <span className="sensivel text-[16px] font-semibold tabular-nums">{brl(subtotal)}</span>
      </div>
    </Card>
  );
}

function Cronograma({ series, hoje }: { series: Serie[]; hoje: string }) {
  const parcelas = cronograma(series);
  const anos = new Map<string, typeof parcelas>();
  for (const p of parcelas) {
    const chave = p.vencimento?.slice(0, 4) ?? "Sem data";
    anos.set(chave, [...(anos.get(chave) ?? []), p]);
  }
  return (
    <div className="mt-3 flex flex-col gap-4">
      {[...anos].map(([ano, ps]) => (
        <div key={ano}>
          <div className="mb-1.5 flex justify-between px-4 text-[13px] text-label-2 uppercase">
            <span>{ano}</span>
            <span className="sensivel tabular-nums">{brl(ps.reduce((s, p) => s + p.valor, 0))}</span>
          </div>
          <Card className="divide-y divide-separator overflow-hidden">
            {ps.map((p) => (
              <div
                key={`${p.serieId}-${p.numero}`}
                className={cn("flex items-center justify-between gap-3 px-4 py-2.5 md:px-5", p.vencimento && p.vencimento < hoje && "text-label-2")}
              >
                <div className="min-w-0">
                  <div className="text-[15px]">
                    {TIPO_SERIE_LABEL[p.tipo]}
                    {p.de > 1 && <span className="text-label-2"> {p.numero}/{p.de}</span>}
                  </div>
                  <div className="text-[13px] text-label-2">{p.vencimento ? dataCurta(p.vencimento) : "Sem data definida"}</div>
                </div>
                <span className="sensivel shrink-0 text-[15px] tabular-nums">{brl(p.valor)}</span>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function SalvarModelo({ vendaId, sugestao, aoConcluir }: { vendaId: string; sugestao: string; aoConcluir: () => void }) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(async (s, f) => {
    const res = await salvarModelo(vendaId, s, f);
    if (!res.erro) aoConcluir();
    return res;
  }, {});
  return (
    <FormSemReset acao={acao} className="mt-3 flex flex-col gap-3">
      <FieldGroup>
        <Field label="Nome do modelo" name="nome" required defaultValue={sugestao} autoComplete="off" />
      </FieldGroup>
      <p className="px-1 text-[13px] text-label-2">
        O modelo guarda as proporções e os prazos deste plano. Na próxima venda, os valores são recalculados pelo preço do imóvel.
      </p>
      <FormMessage erro={estado.erro} />
      <SubmitButton pendingLabel="Salvando…" pending={salvando}>
        Salvar modelo
      </SubmitButton>
    </FormSemReset>
  );
}

type Painel = "salvar" | "cronograma" | null;

/** Plano de pagamento do cliente: entrada com a construtora, financiamento bancário, total x venda e cronograma. */
export function Plano({
  vendaId,
  valorVenda,
  series,
  banco,
  construtora,
  hoje,
}: {
  vendaId: string;
  valorVenda: number;
  series: Serie[];
  banco: string | null;
  construtora: string | null;
  hoje: string;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  const alternar = (p: Painel) => setPainel((atual) => (atual === p ? null : p));
  const total = totalPlano(series);
  const grupos = totaisPorGrupo(series);
  const diferenca = valorVenda - total;
  const qtdParcelas = series.reduce((s, x) => s + x.quantidade, 0);
  const proxima = cronograma(series).find((p) => p.vencimento && p.vencimento >= hoje);
  const linkEditor = `/vendas/${vendaId}/plano`;

  if (series.length === 0)
    return (
      <Card className="px-5 py-5">
        <p className="text-[15px] text-label-2">
          Monte como o cliente vai pagar o imóvel: a entrada parcelada com a construtora (ato, mensais, intercaladas, chaves) e o que vem do banco
          (financiamento, FGTS, subsídio). Comece pelo modelo da construtora.
        </p>
        <Link
          href={linkEditor}
          className="mt-4 flex h-11 items-center justify-center gap-1.5 rounded-full bg-accent text-[16px] font-semibold text-white transition active:scale-[0.98]"
        >
          <Plus className="size-4" /> Montar plano
        </Link>
      </Card>
    );

  return (
    <>
      <div className="flex flex-col gap-3">
        {(["entrada", "banco"] as const).map((g) => (
          <Bloco
            key={g}
            grupo={g}
            series={series.filter((s) => GRUPO_SERIE[s.tipo] === g)}
            subtotal={grupos[g]}
            valorVenda={valorVenda}
            extra={g === "banco" ? <div className="mt-1.5"><BancoInline vendaId={vendaId} banco={banco} /></div> : undefined}
          />
        ))}

        <Card className="px-4 py-3 md:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] text-label-2">Total do plano</span>
            <span className="sensivel text-[17px] font-semibold tabular-nums">{brl(total)}</span>
          </div>
          <div className={cn("mt-0.5 text-[13px]", diferenca === 0 ? "text-positive" : "text-pending")}>
            {diferenca === 0 ? (
              "Fecha com o valor da venda."
            ) : diferenca > 0 ? (
              <>
                Faltam <span className="sensivel">{brl(diferenca)}</span> para o valor da venda (<span className="sensivel">{brl(valorVenda)}</span>).
              </>
            ) : (
              <>
                Passa <span className="sensivel">{brl(-diferenca)}</span> do valor da venda (<span className="sensivel">{brl(valorVenda)}</span>).
              </>
            )}
          </div>
          {proxima && (
            <div className="mt-0.5 text-[13px] text-label-2">
              Próximo vencimento: {TIPO_SERIE_LABEL[proxima.tipo]} de <span className="sensivel">{brl(proxima.valor)}</span> em {dataCurta(proxima.vencimento!)}.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={linkEditor} className={botaoPilula}>
          <Pencil className="size-4" /> Editar plano
        </Link>
        <Link href={`/vendas/${vendaId}/resumo`} className={botaoPilula}>
          <FileText className="size-4" /> Resumo para o cliente
        </Link>
        <button type="button" onClick={() => alternar("cronograma")} className={botaoPilula}>
          <CalendarDays className="size-4" /> {plural(qtdParcelas, "parcela", "parcelas")}
          <Chevron open={painel === "cronograma"} />
        </button>
        <button type="button" onClick={() => alternar("salvar")} className={botaoPilula}>
          <BookmarkPlus className="size-4" /> Salvar como modelo
        </button>
      </div>

      <Expande aberto={painel === "cronograma"}>
        <Cronograma series={series} hoje={hoje} />
      </Expande>
      <Expande aberto={painel === "salvar"}>
        <SalvarModelo vendaId={vendaId} sugestao={construtora ? `Padrão ${construtora}` : "Meu plano padrão"} aoConcluir={() => setPainel(null)} />
      </Expande>
    </>
  );
}
