"use client";

import { useActionState, useState, useTransition } from "react";
import { BookmarkPlus, CalendarDays, LayoutTemplate, Plus } from "lucide-react";
import { LixeiraConfirmar } from "@/components/botao-excluir";
import { Expande } from "@/components/expande";
import { adicionarSerie, aplicarModelo, excluirModelo, excluirSerie, salvarModelo } from "../../plano-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { Field, FieldGroup, FormMessage, FormSemReset, MoneyField, SelectField, SubmitButton } from "@/components/form";
import { Card, Chevron, cn } from "@/components/ui";
import { brl, dataCurta, MONTHS_SHORT, plural } from "@/lib/format";
import {
  INTERVALOS,
  PADRAO_SERIE,
  TIPOS_SERIE,
  TIPO_SERIE_LABEL,
  cronograma,
  totalPlano,
  valoresParcelas,
  type Serie,
  type SerieModelo,
  type TipoSerie,
} from "@/lib/plano";

export type ModeloResumo = { id: string; nome: string; construtora: string | null; daConstrutora: boolean; series: SerieModelo[] };

const mesAno = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${a}`;
};
const intervaloTexto = (meses: number) =>
  meses === 1 ? "todo mês" : meses === 12 ? "todo ano" : meses > 0 ? `a cada ${meses} meses` : "";

const botaoPilula =
  "flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[14px] font-medium text-accent transition active:scale-[0.97] disabled:opacity-60";

function resumoSerie(s: Serie) {
  // A sobra de centavos fica na 1ª parcela; o resumo mostra o valor das demais.
  const valores = valoresParcelas(s.valor_total_centavos, s.quantidade);
  const regular = valores[valores.length - 1];
  if (s.quantidade === 1) return s.primeiro_vencimento ? `Vence em ${dataCurta(s.primeiro_vencimento)}` : "Parcela única, sem data definida";
  const valor = `${s.quantidade}x de ${brl(regular)}`;
  if (!s.primeiro_vencimento) return valor;
  return `${valor}, a partir de ${mesAno(s.primeiro_vencimento)}, ${intervaloTexto(s.intervalo_meses)}`;
}

function LinhaSerie({ s }: { s: Serie }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className={cn("flex items-center gap-3 py-3 pr-2 pl-4 md:pl-5", pendente && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[16px] font-medium">{s.descricao || TIPO_SERIE_LABEL[s.tipo]}</span>
          <span className="shrink-0 text-[16px] tabular-nums">{brl(s.valor_total_centavos)}</span>
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

function NovaSerie({ vendaId, hoje, falta, aoConcluir }: { vendaId: string; hoje: string; falta: number; aoConcluir: () => void }) {
  const [tipo, setTipo] = useState<TipoSerie>("sinal");
  const [quantidade, setQuantidade] = useState("1");
  const [valor, setValor] = useState(0);
  const qtd = Math.max(Number(quantidade) || 1, 1);
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(async (s, f) => {
    const res = await adicionarSerie(vendaId, s, f);
    if (!res.erro) aoConcluir();
    return res;
  }, {});

  return (
    <FormSemReset acao={acao} className="mt-3 flex flex-col gap-3">
      <FieldGroup>
        <SelectField
          label="Tipo"
          name="tipo"
          value={tipo}
          onChange={(e) => {
            const t = e.target.value as TipoSerie;
            setTipo(t);
            setQuantidade(String(PADRAO_SERIE[t].quantidade));
          }}
          options={TIPOS_SERIE.map((t) => ({ value: t, label: TIPO_SERIE_LABEL[t] }))}
        />
        <Field label="Descrição (opcional)" name="descricao" placeholder={TIPO_SERIE_LABEL[tipo]} autoComplete="off" />
        <Field
          label="Quantidade de parcelas"
          name="quantidade"
          inputMode="numeric"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, "").slice(0, 3))}
        />
        <MoneyField label={qtd > 1 ? "Valor de cada parcela" : "Valor"} name="valor_parcela" required value={valor} onChange={setValor} />
        <Field
          key={`venc-${tipo === "financiamento"}`}
          label={qtd > 1 ? "Primeiro vencimento" : "Vencimento (opcional)"}
          name="primeiro_vencimento"
          type="date"
          required={qtd > 1}
          defaultValue={tipo === "financiamento" ? undefined : hoje}
          className="[color-scheme:dark]"
        />
        {qtd > 1 && (
          <SelectField
            key={tipo}
            label="Frequência"
            name="intervalo_meses"
            defaultValue={String(PADRAO_SERIE[tipo].intervalo || 1)}
            options={INTERVALOS}
          />
        )}
      </FieldGroup>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-label-2">
        <span>{qtd > 1 && valor > 0 ? `Total: ${brl(valor * qtd)}` : null}</span>
        {falta > 0 && (
          <button type="button" onClick={() => setValor(Math.floor(falta / qtd))} className="font-medium text-accent">
            Usar o que falta ({brl(falta)})
          </button>
        )}
      </div>
      <FormMessage erro={estado.erro} />
      <SubmitButton pendingLabel="Salvando…" pending={salvando}>
        Adicionar ao plano
      </SubmitButton>
    </FormSemReset>
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
            <span className="tabular-nums">{brl(ps.reduce((s, p) => s + p.valor, 0))}</span>
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
                <span className="shrink-0 text-[15px] tabular-nums">{brl(p.valor)}</span>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

function UsarModelo({ vendaId, modelos, temPlano }: { vendaId: string; modelos: ModeloResumo[]; temPlano: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [confirmar, setConfirmar] = useState<string>();
  const [erro, setErro] = useState<string>();
  return (
    <Card className="divide-y divide-separator overflow-hidden">
      {modelos.map((m) => {
        const armado = confirmar === m.id;
        const pct = m.series.reduce((s, x) => s + (x.percentual ?? 0), 0);
        return (
          <div key={m.id} className="flex items-center gap-3 py-2.5 pr-2 pl-4 md:pl-5">
            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                if (temPlano && !armado) return setConfirmar(m.id);
                setConfirmar(undefined);
                iniciar(async () => {
                  const r = await aplicarModelo(vendaId, m.id);
                  setErro(r.erro);
                });
              }}
              className="min-w-0 flex-1 text-left disabled:opacity-60"
            >
              <div className={cn("truncate text-[16px]", armado ? "font-semibold text-pending" : "text-accent")}>
                {armado ? `Substituir o plano por "${m.nome}"?` : m.nome}
              </div>
              <div className="truncate text-[13px] text-label-2">
                {[m.construtora, plural(m.series.length, "item", "itens"), `${String(Math.round(pct * 100) / 100).replace(".", ",")}% da venda`]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </button>
            <LixeiraConfirmar rotulo={`Excluir modelo ${m.nome}`} pendente={pendente} aoConfirmar={() => iniciar(async () => void (await excluirModelo(m.id)))} />
          </div>
        );
      })}
      {erro && <p className="px-4 py-2 text-[13px] text-negative">{erro}</p>}
    </Card>
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

type Painel = "adicionar" | "modelos" | "salvar" | "cronograma" | null;

/** Plano de pagamento do cliente: séries, total x valor da venda, cronograma e modelos por construtora. */
export function Plano({
  vendaId,
  valorVenda,
  series,
  modelos,
  construtora,
  hoje,
}: {
  vendaId: string;
  valorVenda: number;
  series: Serie[];
  modelos: ModeloResumo[];
  construtora: string | null;
  hoje: string;
}) {
  const [painel, setPainel] = useState<Painel>(null);
  const alternar = (p: Painel) => setPainel((atual) => (atual === p ? null : p));
  const total = totalPlano(series);
  const diferenca = valorVenda - total;
  const qtdParcelas = series.reduce((s, x) => s + x.quantidade, 0);
  const proxima = cronograma(series).find((p) => p.vencimento && p.vencimento >= hoje);

  return (
    <>
      {series.length > 0 ? (
        <Card className="divide-y divide-separator overflow-hidden">
          {series.map((s) => (
            <LinhaSerie key={s.id} s={s} />
          ))}
          <div className="px-4 py-3 md:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-label-2">Total do plano</span>
              <span className="text-[17px] font-semibold tabular-nums">{brl(total)}</span>
            </div>
            <div className={cn("mt-0.5 text-[13px]", diferenca === 0 ? "text-positive" : "text-pending")}>
              {diferenca === 0
                ? "Fecha com o valor da venda."
                : diferenca > 0
                  ? `Faltam ${brl(diferenca)} para o valor da venda (${brl(valorVenda)}).`
                  : `Passa ${brl(-diferenca)} do valor da venda (${brl(valorVenda)}).`}
            </div>
            {proxima && (
              <div className="mt-0.5 text-[13px] text-label-2">
                Próximo vencimento: {TIPO_SERIE_LABEL[proxima.tipo]} de {brl(proxima.valor)} em {dataCurta(proxima.vencimento!)}.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="px-5 py-5 text-[15px] text-label-2">
          Monte como o cliente vai pagar o imóvel: sinal, mensais, intercaladas, chaves e financiamento.
          {modelos.length > 0 && " Ou comece por um modelo salvo."}
        </Card>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => alternar("adicionar")} className={botaoPilula}>
          <Plus className="size-4" /> {painel === "adicionar" ? "Cancelar" : "Adicionar"}
        </button>
        {series.length > 0 && (
          <button type="button" onClick={() => alternar("cronograma")} className={botaoPilula}>
            <CalendarDays className="size-4" /> {plural(qtdParcelas, "parcela", "parcelas")}
            <Chevron open={painel === "cronograma"} />
          </button>
        )}
        {modelos.length > 0 && (
          <button type="button" onClick={() => alternar("modelos")} className={botaoPilula}>
            <LayoutTemplate className="size-4" /> Usar modelo
          </button>
        )}
        {series.length > 0 && (
          <button type="button" onClick={() => alternar("salvar")} className={botaoPilula}>
            <BookmarkPlus className="size-4" /> Salvar como modelo
          </button>
        )}
      </div>

      <Expande aberto={painel === "adicionar"}>
        <NovaSerie vendaId={vendaId} hoje={hoje} falta={Math.max(diferenca, 0)} aoConcluir={() => setPainel(null)} />
      </Expande>
      <Expande aberto={painel === "cronograma"}>
        <Cronograma series={series} hoje={hoje} />
      </Expande>
      <Expande aberto={painel === "modelos"}>
        <div className="mt-3">
          <UsarModelo vendaId={vendaId} modelos={modelos} temPlano={series.length > 0} />
        </div>
      </Expande>
      <Expande aberto={painel === "salvar"}>
        <SalvarModelo vendaId={vendaId} sugestao={construtora ? `Padrão ${construtora}` : "Meu plano padrão"} aoConcluir={() => setPainel(null)} />
      </Expande>
    </>
  );
}
