"use client";

import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { salvarModeloConstrutora } from "../../actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import { LixeiraConfirmar } from "@/components/botao-excluir";
import { Field, FieldGroup, FormMessage, FormSemReset, MoneyField, Segmented, SelectField, SubmitButton, TextAreaField, Toggle } from "@/components/form";
import { cn } from "@/components/ui";
import { GRUPO_LABEL, GRUPO_SERIE, INTERVALOS, PADRAO_SERIE, TIPOS_POR_GRUPO, TIPO_SERIE_LABEL, type GrupoSerie, type SerieModelo, type TipoSerie } from "@/lib/plano";
import { pctTexto, resumoSerieModelo } from "../../resumo";

type Modo = "pct" | "fixo" | "aberto";

type Linha = {
  key: string;
  tipo: TipoSerie;
  descricao: string;
  quantidade: string;
  modo: Modo;
  percentual: string; // como digitado, com vírgula
  valor: number; // centavos por parcela
  intervalo: string;
  prazo: string; // meses após a venda
  semData: boolean;
};

const GRUPOS: GrupoSerie[] = ["entrada", "banco"];
const MODOS = [
  { value: "pct", label: "% do imóvel" },
  { value: "fixo", label: "Valor fixo" },
  { value: "aberto", label: "Em aberto" },
];
/** Meses entre a venda e o 1º vencimento, sugeridos por tipo (null = sem data). */
const PRAZO_PADRAO: Record<TipoSerie, number | null> = {
  ato: 0,
  sinal: 0,
  mensal: 1,
  intercalada: 6,
  anual: 12,
  chaves: null,
  financiamento: null,
  fgts: null,
  subsidio: null,
  outro: 0,
};

const novaChave = () => Math.random().toString(36).slice(2);
const numeroPct = (v: string) => (v ? Number(v.replace(",", ".")) : NaN);
const inteiro = (v: string, padrao: number) => (/^\d+$/.test(v) ? Number(v) : padrao);

function linhaPadrao(tipo: TipoSerie): Linha {
  const prazo = PRAZO_PADRAO[tipo];
  return {
    key: novaChave(),
    tipo,
    descricao: "",
    quantidade: String(PADRAO_SERIE[tipo].quantidade),
    modo: GRUPO_SERIE[tipo] === "banco" ? "aberto" : "pct",
    percentual: "",
    valor: 0,
    intervalo: String(PADRAO_SERIE[tipo].intervalo || 1),
    prazo: prazo == null ? "" : String(prazo),
    semData: prazo == null,
  };
}

function paraLinha(s: SerieModelo): Linha {
  return {
    key: novaChave(),
    tipo: s.tipo,
    descricao: s.descricao ?? "",
    quantidade: String(s.quantidade),
    modo: s.percentual != null ? "pct" : s.valor_parcela_centavos ? "fixo" : "aberto",
    percentual: s.percentual != null ? String(s.percentual).replace(".", ",") : "",
    valor: s.valor_parcela_centavos ?? 0,
    intervalo: String(s.intervalo_meses || PADRAO_SERIE[s.tipo].intervalo || 1),
    prazo: s.defasagem_meses == null ? "" : String(s.defasagem_meses),
    semData: s.defasagem_meses == null,
  };
}

/** Linha do editor -> série do modelo. Valores inválidos seguem como estão para o servidor recusar com a mensagem certa. */
function paraSerie(l: Linha): SerieModelo {
  const quantidade = inteiro(l.quantidade, 0);
  return {
    tipo: l.tipo,
    descricao: l.descricao.trim() || null,
    quantidade,
    percentual: l.modo === "pct" ? (Number.isFinite(numeroPct(l.percentual)) ? numeroPct(l.percentual) : 0) : null,
    valor_parcela_centavos: l.modo === "fixo" ? l.valor : null,
    intervalo_meses: quantidade > 1 ? inteiro(l.intervalo, 1) : 0,
    defasagem_meses: l.semData ? null : inteiro(l.prazo, -1),
  };
}

const somaPct = (linhas: Linha[]) => linhas.reduce((t, l) => t + (l.modo === "pct" && Number.isFinite(numeroPct(l.percentual)) ? numeroPct(l.percentual) : 0), 0);

const botaoIcone = "grid size-9 shrink-0 place-items-center rounded-full text-accent transition active:bg-surface-3 disabled:text-label-3";
const botaoPilula =
  "flex h-9 items-center gap-1.5 self-start rounded-full bg-surface-2 px-3.5 text-[14px] font-medium text-accent transition active:scale-[0.97]";

function EditorLinha({
  l,
  numero,
  grupo,
  primeira,
  ultima,
  alterar,
  mover,
  remover,
}: {
  l: Linha;
  numero: number;
  grupo: GrupoSerie;
  primeira: boolean;
  ultima: boolean;
  alterar: (mudanca: Partial<Linha>) => void;
  mover: (direcao: -1 | 1) => void;
  remover: () => void;
}) {
  const qtd = inteiro(l.quantidade, 0);
  const intervalos = INTERVALOS.some((i) => i.value === l.intervalo) ? INTERVALOS : [...INTERVALOS, { value: l.intervalo, label: `A cada ${l.intervalo} meses` }];

  return (
    <div className="flex flex-col gap-1.5">
      <FieldGroup>
        <div className="flex items-center pr-2">
          <div className="min-w-0 flex-1">
            <SelectField
              label={`Item ${numero}`}
              value={l.tipo}
              onChange={(e) => {
                const tipo = e.target.value as TipoSerie;
                const p = linhaPadrao(tipo);
                alterar({ tipo, quantidade: p.quantidade, intervalo: p.intervalo, prazo: p.prazo, semData: p.semData });
              }}
              options={TIPOS_POR_GRUPO[grupo].map((t) => ({ value: t, label: TIPO_SERIE_LABEL[t] }))}
            />
          </div>
          <button type="button" aria-label="Mover para cima" disabled={primeira} onClick={() => mover(-1)} className={botaoIcone}>
            <ChevronUp className="size-5" />
          </button>
          <button type="button" aria-label="Mover para baixo" disabled={ultima} onClick={() => mover(1)} className={botaoIcone}>
            <ChevronDown className="size-5" />
          </button>
          <LixeiraConfirmar rotulo={`Remover item ${numero}`} aoConfirmar={remover} />
        </div>
        <Field
          label="Descrição (opcional)"
          value={l.descricao}
          maxLength={120}
          placeholder={TIPO_SERIE_LABEL[l.tipo]}
          autoComplete="off"
          onChange={(e) => alterar({ descricao: e.target.value })}
        />
        <Field
          label="Quantidade de parcelas"
          inputMode="numeric"
          value={l.quantidade}
          onChange={(e) => alterar({ quantidade: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        />
        <div className="px-4 py-2.5">
          <Segmented name={`modo-${l.key}`} options={MODOS} value={l.modo} onChange={(v) => alterar({ modo: v as Modo })} />
        </div>
        {l.modo === "pct" && (
          <Field
            label={qtd > 1 ? "Percentual do imóvel (soma das parcelas)" : "Percentual do imóvel"}
            inputMode="decimal"
            placeholder="Ex.: 10"
            value={l.percentual}
            onChange={(e) =>
              alterar({
                percentual: e.target.value
                  .replace(/\./g, ",")
                  .replace(/[^\d,]/g, "")
                  .replace(/,(?=.*,)/g, "")
                  .slice(0, 8),
              })
            }
          />
        )}
        {l.modo === "fixo" && (
          <MoneyField label={qtd > 1 ? "Valor de cada parcela" : "Valor"} name={`valor-${l.key}`} value={l.valor} onChange={(valor) => alterar({ valor })} />
        )}
        {l.modo === "aberto" && <p className="px-4 py-3 text-[15px] text-label-2">O valor é digitado na proposta.</p>}
        {qtd > 1 && <SelectField label="Frequência" value={l.intervalo} onChange={(e) => alterar({ intervalo: e.target.value })} options={intervalos} />}
        <Toggle label="Sem data definida" name={`semdata-${l.key}`} checked={l.semData} onChange={(semData) => alterar({ semData, prazo: semData ? l.prazo : l.prazo || "0" })} />
        {!l.semData && (
          <Field
            label={`${qtd > 1 ? "1º vencimento" : "Vencimento"}: meses após a venda (0 = na assinatura)`}
            inputMode="numeric"
            value={l.prazo}
            onChange={(e) => alterar({ prazo: e.target.value.replace(/\D/g, "").slice(0, 3) })}
          />
        )}
      </FieldGroup>
      <p className="px-4 text-[13px] text-label-2">{qtd >= 1 ? resumoSerieModelo(paraSerie(l)) : "Informe a quantidade de parcelas."}</p>
    </div>
  );
}

/** Editor de plano de pagamento da construtora: entrada (construtora) e financiamento (banco). */
export function ModeloEditor({
  construtoraId,
  modelo,
}: {
  construtoraId: string;
  modelo?: { id: string; nome: string; descricao: string | null; series: SerieModelo[] };
}) {
  const [linhas, setLinhas] = useState<Record<GrupoSerie, Linha[]>>(() => ({
    entrada: (modelo?.series ?? []).filter((s) => GRUPO_SERIE[s.tipo] === "entrada").map(paraLinha),
    banco: (modelo?.series ?? []).filter((s) => GRUPO_SERIE[s.tipo] === "banco").map(paraLinha),
  }));
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarModeloConstrutora.bind(null, construtoraId, modelo?.id ?? null), {});

  const atualizarGrupo = (g: GrupoSerie, f: (ls: Linha[]) => Linha[]) => setLinhas((atual) => ({ ...atual, [g]: f(atual[g]) }));
  const series = [...linhas.entrada, ...linhas.banco].map(paraSerie);
  const pct = { entrada: somaPct(linhas.entrada), banco: somaPct(linhas.banco) };
  const pctTotal = pct.entrada + pct.banco;
  const temOutros = [...linhas.entrada, ...linhas.banco].some((l) => l.modo !== "pct");

  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <input type="hidden" name="series" value={JSON.stringify(series)} />
      <FieldGroup>
        <Field label="Nome do plano" name="nome" required autoComplete="off" autoFocus={!modelo} placeholder="Ex.: Tabela padrão 2026" defaultValue={modelo?.nome} />
        <TextAreaField
          label="Regras da construtora (opcional)"
          name="descricao"
          maxLength={2000}
          placeholder="Ex.: Ato em até 3x no cartão; mensais começam 30 dias após a assinatura."
          defaultValue={modelo?.descricao ?? undefined}
        />
      </FieldGroup>

      {GRUPOS.map((g) => {
        const inicio = g === "entrada" ? 0 : linhas.entrada.length;
        return (
          <section key={g} className="mt-8">
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-[20px] font-bold tracking-[-0.01em]">{GRUPO_LABEL[g]}</h2>
              {pct[g] > 0 && <span className="shrink-0 text-[15px] text-label-2 tabular-nums">{pctTexto(pct[g])} do imóvel</span>}
            </div>
            <div className="flex flex-col gap-4">
              {linhas[g].length === 0 && (
                <p className="px-1 text-[15px] text-label-2">
                  {g === "entrada"
                    ? "Ato, sinal, mensais, intercaladas, anuais e chaves pagos direto à construtora."
                    : "Financiamento, FGTS e subsídio liberados pelo banco."}
                </p>
              )}
              {linhas[g].map((l, i) => (
                <EditorLinha
                  key={l.key}
                  l={l}
                  numero={inicio + i + 1}
                  grupo={g}
                  primeira={i === 0}
                  ultima={i === linhas[g].length - 1}
                  alterar={(mudanca) => atualizarGrupo(g, (ls) => ls.map((x) => (x.key === l.key ? { ...x, ...mudanca } : x)))}
                  mover={(d) =>
                    atualizarGrupo(g, (ls) => {
                      const j = i + d;
                      if (j < 0 || j >= ls.length) return ls;
                      const copia = [...ls];
                      [copia[i], copia[j]] = [copia[j], copia[i]];
                      return copia;
                    })
                  }
                  remover={() => atualizarGrupo(g, (ls) => ls.filter((x) => x.key !== l.key))}
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  atualizarGrupo(g, (ls) => [...ls, linhaPadrao(g === "banco" ? (ls.length === 0 ? "financiamento" : "fgts") : ls.length === 0 ? "ato" : "mensal")])
                }
                className={botaoPilula}
              >
                <Plus className="size-4" /> {g === "entrada" ? "Adicionar à entrada" : "Adicionar ao financiamento"}
              </button>
            </div>
          </section>
        );
      })}

      {series.length > 0 && (
        <div className="mt-8 rounded-[18px] border border-white/[0.06] bg-surface px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] text-label-2">Total em percentual</span>
            <span className="text-[17px] font-semibold tabular-nums">{pctTexto(pctTotal)}</span>
          </div>
          <div className={cn("mt-0.5 text-[13px]", Math.abs(pctTotal - 100) < 0.005 ? "text-positive" : pctTotal > 100 ? "text-negative" : "text-label-2")}>
            {Math.abs(pctTotal - 100) < 0.005
              ? "Fecha 100% do valor do imóvel."
              : pctTotal > 100
                ? "Passa de 100% do valor do imóvel."
                : temOutros
                  ? "O restante vem dos itens com valor fixo ou em aberto."
                  : `Faltam ${pctTexto(100 - pctTotal)} para fechar o valor do imóvel.`}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <FormMessage erro={estado.erro} aviso={estado.aviso} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          {modelo ? "Salvar alterações" : "Salvar plano"}
        </SubmitButton>
      </div>
    </FormSemReset>
  );
}
