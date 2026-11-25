"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, FilePlus2, History, LayoutTemplate, Plus, Trash2, Wand2 } from "lucide-react";
import { salvarPlano } from "../../../plano-actions";
import type { EstadoForm } from "@/app/(auth)/actions";
import type { Modelo } from "@/lib/dal";
import { Field, FormMessage, FormSemReset, MoneyField, SelectField, SubmitButton } from "@/components/form";
import { Badge, Card, Chevron, cn } from "@/components/ui";
import { Expande } from "@/components/expande";
import { brl, plural } from "@/lib/format";
import {
  BANCOS,
  GRUPO_LABEL,
  GRUPO_SERIE,
  INTERVALOS,
  PADRAO_SERIE,
  TIPOS_POR_GRUPO,
  TIPO_SERIE_LABEL,
  financiamentoLiquido,
  maximoParcela,
  modeloParaSeries,
  reaisInteiros,
  type GrupoSerie,
  type LinhaPlano,
  type Serie,
  type TipoSerie,
} from "@/lib/plano";

/** Linha em edição. A quantidade fica como texto para dar para apagar e digitar de novo. */
type Linha = {
  chave: string;
  tipo: TipoSerie;
  descricao: string;
  quantidade: string;
  valor: number; // de cada parcela, em centavos
  vencimento: string; // "" = sem data
  intervalo: number;
  emAberto: boolean; // veio do modelo sem valor: o corretor precisa digitar
  tetoRenda: number | null; // máx. de cada parcela em % da renda
  tetoImovel: number | null; // máx. da série em % do imóvel
  completa: boolean; // fica com a diferença ao "completar"
};

let seq = 0;
const novaChave = () => `l${++seq}`;
const qtdDe = (l: Linha) => Math.max(Number(l.quantidade) || 0, 0);
const totalDe = (l: Linha) => l.valor * qtdDe(l);
const pct = (parte: number, todo: number) => (todo > 0 ? `${String(Math.round((parte / todo) * 1000) / 10).replace(".", ",")}%` : "");
const pctModelo = (m: Modelo) => m.series.reduce((s, x) => s + (x.percentual ?? 0), 0);

function linhaNova(tipo: TipoSerie, hoje: string, valor = 0): Linha {
  const padrao = PADRAO_SERIE[tipo];
  const semData = GRUPO_SERIE[tipo] === "banco" || tipo === "chaves";
  return {
    chave: novaChave(),
    tipo,
    descricao: "",
    quantidade: String(padrao.quantidade),
    valor,
    vencimento: semData && padrao.quantidade === 1 ? "" : hoje,
    intervalo: padrao.intervalo || 1,
    emAberto: false,
    tetoRenda: null,
    tetoImovel: null,
    completa: false,
  };
}

const deSeries = (series: Serie[]): Linha[] =>
  series.map((s) => ({
    chave: novaChave(),
    tipo: s.tipo,
    descricao: s.descricao ?? "",
    quantidade: String(s.quantidade),
    valor: Math.round(s.valor_total_centavos / s.quantidade),
    vencimento: s.primeiro_vencimento ?? "",
    intervalo: s.intervalo_meses || PADRAO_SERIE[s.tipo].intervalo || 1,
    emAberto: false,
    tetoRenda: s.teto_renda_percentual ?? null,
    tetoImovel: s.teto_imovel_percentual ?? null,
    completa: false,
  }));

function deModelo(m: Modelo, valorVenda: number, dataVenda: string, renda: number | null): Linha[] {
  return modeloParaSeries(m.series, valorVenda, dataVenda, renda).map((s, i) => {
    const origem = m.series[i];
    return {
      chave: novaChave(),
      tipo: s.tipo,
      descricao: s.descricao ?? "",
      quantidade: String(s.quantidade),
      valor: s.quantidade ? Math.round(s.valor_total_centavos / s.quantidade) : 0,
      vencimento: s.primeiro_vencimento ?? "",
      intervalo: s.intervalo_meses || PADRAO_SERIE[s.tipo].intervalo || 1,
      emAberto: origem.percentual == null && !origem.valor_parcela_centavos,
      tetoRenda: origem.teto_renda_percentual ?? null,
      tetoImovel: origem.teto_imovel_percentual ?? null,
      completa: origem.completa === true,
    };
  });
}

const paraEnvio = (l: Linha): LinhaPlano => ({
  tipo: l.tipo,
  descricao: l.descricao.trim() || null,
  quantidade: Number(l.quantidade) || 0,
  valor_parcela_centavos: l.valor,
  primeiro_vencimento: l.vencimento || null,
  intervalo_meses: qtdDe(l) > 1 ? l.intervalo : 0,
  teto_renda_percentual: l.tetoRenda,
  teto_imovel_percentual: l.tetoImovel,
});

const pctTexto = (n: number) => `${String(n).replace(".", ",")}%`;

/** Teto da linha: "máx. R$ 2.126,26 por parcela (28% da renda)" e se o valor passou dele. */
function tetoDe(l: Linha, renda: number, valorVenda: number) {
  if (!l.tetoRenda && !l.tetoImovel) return null;
  const maximo = maximoParcela({ quantidade: qtdDe(l), teto_renda_percentual: l.tetoRenda, teto_imovel_percentual: l.tetoImovel }, renda || null, valorVenda);
  const regras = [l.tetoRenda && `${pctTexto(l.tetoRenda)} da renda`, l.tetoImovel && `${pctTexto(l.tetoImovel)} do imóvel no total`].filter(Boolean).join(" ou ");
  return { maximo, regras, acima: maximo != null && l.valor > maximo, faltaRenda: !!l.tetoRenda && !renda };
}

function EditorLinha({
  l,
  grupo,
  renda,
  valorVenda,
  aoMudar,
  aoRemover,
}: {
  l: Linha;
  grupo: GrupoSerie;
  renda: number;
  valorVenda: number;
  aoMudar: (p: Partial<Linha>) => void;
  aoRemover: () => void;
}) {
  const qtd = qtdDe(l);
  const teto = tetoDe(l, renda, valorVenda);
  const pendente = l.valor === 0;
  const destacar = pendente && l.emAberto;
  const intervalos = INTERVALOS.some((i) => i.value === String(l.intervalo))
    ? INTERVALOS
    : [...INTERVALOS, { value: String(l.intervalo), label: `A cada ${l.intervalo} meses` }];

  return (
    <div
      className={cn(
        "divide-y divide-separator overflow-hidden rounded-[18px] border border-white/[0.06] bg-surface transition-colors",
        destacar && "border-pending/70 bg-pending/[0.06]",
        teto?.acima && "border-negative/70 bg-negative/[0.06]",
      )}
    >
      <div className="flex items-center gap-2 py-2 pr-1.5 pl-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-semibold">{l.descricao.trim() || TIPO_SERIE_LABEL[l.tipo]}</span>
            {destacar && <Badge tone="pending">Preencher valor</Badge>}
            {teto?.acima && <Badge tone="negative">Acima do máximo</Badge>}
          </div>
          <div className="text-[13px] text-label-2 tabular-nums">
            {qtd > 1 && l.valor > 0 ? (
              <>
                {qtd} × <span className="sensivel">{brl(l.valor)}</span> = <span className="sensivel">{brl(totalDe(l))}</span>
              </>
            ) : l.valor > 0 ? (
              <span className="sensivel">{brl(l.valor)}</span>
            ) : (
              "Sem valor"
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={aoRemover}
          aria-label={`Remover ${TIPO_SERIE_LABEL[l.tipo]}`}
          className="grid size-9 shrink-0 place-items-center rounded-full text-label-2 transition active:bg-surface-2"
        >
          <Trash2 className="size-[18px]" />
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-separator">
        <SelectField
          label="Tipo"
          value={l.tipo}
          onChange={(e) => {
            const tipo = e.target.value as TipoSerie;
            aoMudar({ tipo, intervalo: PADRAO_SERIE[tipo].intervalo || l.intervalo || 1 });
          }}
          options={TIPOS_POR_GRUPO[grupo].map((t) => ({ value: t, label: TIPO_SERIE_LABEL[t] }))}
        />
        <Field
          label="Quantidade"
          inputMode="numeric"
          value={l.quantidade}
          onChange={(e) => aoMudar({ quantidade: e.target.value.replace(/\D/g, "").slice(0, 3) })}
        />
      </div>
      <Field label="Descrição (opcional)" value={l.descricao} placeholder={TIPO_SERIE_LABEL[l.tipo]} maxLength={80} autoComplete="off" onChange={(e) => aoMudar({ descricao: e.target.value })} />
      {/* Campo em digitação fica visível mesmo com "ocultar valores": o corretor precisa ver o que digita. */}
      <MoneyField label={qtd > 1 ? "Valor de cada parcela" : "Valor"} name="valor_parcela" value={l.valor} onChange={(valor) => aoMudar({ valor })} />
      {teto && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
          <span className={cn("tabular-nums", teto.acima ? "text-negative" : "text-label-2")}>
            {teto.maximo != null ? (
              <>
                Máx. <span className="sensivel">{brl(teto.maximo)}</span> por parcela ({teto.regras})
              </>
            ) : teto.faltaRenda ? (
              `Máx. ${teto.regras}: informe a renda`
            ) : (
              `Máx. ${teto.regras}`
            )}
          </span>
          {teto.maximo != null && l.valor !== reaisInteiros(teto.maximo) && (
            <button type="button" onClick={() => aoMudar({ valor: reaisInteiros(teto.maximo!), emAberto: false })} className="shrink-0 font-medium text-accent">
              Usar o máximo
            </button>
          )}
        </div>
      )}
      <div className={cn("grid divide-x divide-separator", qtd > 1 ? "grid-cols-2" : "grid-cols-1")}>
        <Field
          label={qtd > 1 ? "1º vencimento" : "Vencimento (opcional)"}
          type="date"
          value={l.vencimento}
          onChange={(e) => aoMudar({ vencimento: e.target.value })}
          className="min-w-0 [color-scheme:dark]"
        />
        {qtd > 1 && <SelectField label="Frequência" value={String(l.intervalo)} onChange={(e) => aoMudar({ intervalo: Number(e.target.value) })} options={intervalos} />}
      </div>
    </div>
  );
}

function FinanciamentoCampos({
  aprovado,
  desconto,
  aoMudar,
}: {
  aprovado: number;
  desconto: string;
  aoMudar: (aprovado: number, desconto: string) => void;
}) {
  const pctDesconto = Number(desconto.replace(",", ".")) || 0;
  const liquido = financiamentoLiquido(aprovado, pctDesconto);
  return (
    <div className="mb-3 divide-y divide-separator overflow-hidden rounded-[18px] border border-white/[0.06] bg-surface">
      <div className="grid grid-cols-[1fr_110px] divide-x divide-separator">
        <MoneyField label="Valor aprovado pelo banco" name="financiamento_aprovado" value={aprovado} onChange={(v) => aoMudar(v, desconto)} />
        <Field
          label="Desconto (%)"
          name="desconto_financiamento"
          inputMode="decimal"
          value={desconto}
          placeholder="0"
          onChange={(e) => aoMudar(aprovado, e.target.value.replace(/[^\d,.]/g, "").slice(0, 5))}
        />
      </div>
      {aprovado > 0 && (
        <div className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[14px]">
          <span className="text-label-2">{pctDesconto > 0 ? `Financiamento líquido (− ${pctTexto(pctDesconto)} do INCC)` : "Financiamento"}</span>
          <span className="sensivel font-semibold tabular-nums">{brl(liquido)}</span>
        </div>
      )}
    </div>
  );
}

function BancoCampo({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-surface">
        <Field label="Banco" name="banco" list="bancos-editor" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="Ex.: Caixa" maxLength={60} autoComplete="off" />
        <datalist id="bancos-editor">
          {BANCOS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-wrap gap-1.5 px-1">
        {BANCOS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => aoMudar(b)}
            className={cn("rounded-full px-3 py-1 text-[13px] transition", valor === b ? "bg-accent/20 text-accent" : "bg-surface-2 text-label-2")}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}

type Origem = { tipo: "modelo"; modelo: Modelo } | { tipo: "atual" } | { tipo: "branco" };

function Opcao({
  icone,
  titulo,
  sub,
  badge,
  armado,
  aoTocar,
}: {
  icone: React.ReactNode;
  titulo: string;
  sub?: string;
  badge?: string;
  armado: boolean;
  aoTocar: () => void;
}) {
  return (
    <button type="button" onClick={aoTocar} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-2 md:px-5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-accent">{icone}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-[16px]", armado ? "font-semibold text-pending" : "font-medium")}>
            {armado ? "Tocar de novo para substituir as linhas" : titulo}
          </span>
          {badge && <Badge tone="neutral">{badge}</Badge>}
        </div>
        {sub && <div className="line-clamp-2 text-[13px] text-label-2">{sub}</div>}
      </div>
      <Chevron />
    </button>
  );
}

function EscolherOrigem({
  modelos,
  construtora,
  temAtual,
  temLinhas,
  aoEscolher,
}: {
  modelos: Modelo[];
  construtora: string | null;
  temAtual: boolean;
  temLinhas: boolean;
  aoEscolher: (o: Origem) => void;
}) {
  const [armado, setArmado] = useState<string>();
  const escolher = (chave: string, o: Origem) => {
    if (temLinhas && armado !== chave) return setArmado(chave);
    setArmado(undefined);
    aoEscolher(o);
  };
  const daConstrutora = modelos.filter((m) => m.daConstrutora);
  const outros = modelos.filter((m) => !m.daConstrutora);

  const resumoModelo = (m: Modelo) => {
    const p = pctModelo(m);
    return [plural(m.series.length, "item", "itens"), p > 0 ? `${String(Math.round(p * 100) / 100).replace(".", ",")}% da venda` : null, m.descricao]
      .filter(Boolean)
      .join(" · ");
  };

  return (
    <div className="flex flex-col gap-3">
      {daConstrutora.length > 0 && (
        <div>
          <div className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">Modelos {construtora ? `da ${construtora}` : "da construtora"}</div>
          <Card className="divide-y divide-separator overflow-hidden">
            {daConstrutora.map((m) => (
              <Opcao key={m.id} armado={armado === m.id} icone={<Building2 className="size-[18px]" />} titulo={m.nome} sub={resumoModelo(m)} badge={m.sistema ? "Sistema" : undefined} aoTocar={() => escolher(m.id, { tipo: "modelo", modelo: m })} />
            ))}
          </Card>
        </div>
      )}
      {outros.length > 0 && (
        <div>
          <div className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">{daConstrutora.length ? "Outros modelos" : "Modelos"}</div>
          <Card className="divide-y divide-separator overflow-hidden">
            {outros.map((m) => (
              <Opcao key={m.id} armado={armado === m.id} icone={<LayoutTemplate className="size-[18px]" />} titulo={m.nome} sub={resumoModelo(m)} badge={m.sistema ? "Sistema" : m.construtora ?? undefined} aoTocar={() => escolher(m.id, { tipo: "modelo", modelo: m })} />
            ))}
          </Card>
        </div>
      )}
      <Card className="divide-y divide-separator overflow-hidden">
        {temAtual && <Opcao armado={armado === "atual"} icone={<History className="size-[18px]" />} titulo="Plano atual da venda" sub="Continuar de onde parou" aoTocar={() => escolher("atual", { tipo: "atual" })} />}
        <Opcao armado={armado === "branco"} icone={<FilePlus2 className="size-[18px]" />} titulo="Em branco" sub="Montar do zero" aoTocar={() => escolher("branco", { tipo: "branco" })} />
      </Card>
      {modelos.length === 0 && (
        <p className="px-1 text-[13px] text-label-2">
          Nenhum modelo para {construtora ?? "esta construtora"} ainda. Cadastre a estrutura da entrada em Construtoras ou salve este plano como modelo depois.
        </p>
      )}
    </div>
  );
}

/** Editor da proposta: parte de um modelo da construtora, ajusta as linhas e fecha com o valor da venda. */
export function EditorPlano({
  vendaId,
  valorVenda,
  dataVenda,
  hoje,
  banco: bancoInicial,
  construtora,
  seriesAtuais,
  modelos,
  renda: rendaInicial,
  aprovado: aprovadoInicial,
  desconto: descontoInicial,
}: {
  renda: number | null;
  aprovado: number | null;
  desconto: number | null;
  vendaId: string;
  valorVenda: number;
  dataVenda: string;
  hoje: string;
  banco: string | null;
  construtora: string | null;
  seriesAtuais: Serie[];
  modelos: Modelo[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => deSeries(seriesAtuais));
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [escolhendo, setEscolhendo] = useState(seriesAtuais.length === 0);
  const [banco, setBanco] = useState(bancoInicial ?? "");
  const [aviso, setAviso] = useState<string>();
  const [renda, setRenda] = useState(rendaInicial ?? 0);
  const [aprovado, setAprovado] = useState(aprovadoInicial ?? 0);
  const [desconto, setDesconto] = useState(descontoInicial != null ? String(descontoInicial).replace(".", ",") : "");
  const comTeto = linhas.filter((l) => l.tetoRenda || l.tetoImovel);
  const posEntrega = modelo?.regras.parcela_pos_entrega_percentual_renda;
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(salvarPlano.bind(null, vendaId), {});

  const doGrupo = (g: GrupoSerie) => linhas.filter((l) => GRUPO_SERIE[l.tipo] === g);
  const entrada = doGrupo("entrada");
  const doBanco = doGrupo("banco");
  const subtotal = { entrada: entrada.reduce((s, l) => s + totalDe(l), 0), banco: doBanco.reduce((s, l) => s + totalDe(l), 0) };
  const total = subtotal.entrada + subtotal.banco;
  const diferenca = valorVenda - total;
  const abertas = linhas.filter((l) => l.valor === 0).length;

  const mudar = (chave: string, p: Partial<Linha>) => setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...p } : l)));
  const remover = (chave: string) => setLinhas((ls) => ls.filter((l) => l.chave !== chave));
  const adicionar = (g: GrupoSerie) => setLinhas((ls) => [...ls, linhaNova(g === "entrada" ? (entrada.length ? "mensal" : "ato") : doBanco.length ? "fgts" : "financiamento", hoje)]);

  const escolher = (o: Origem) => {
    setAviso(undefined);
    if (o.tipo === "modelo") {
      setLinhas(deModelo(o.modelo, valorVenda, dataVenda, renda || null));
      setModelo(o.modelo);
      const d = o.modelo.regras.desconto_financiamento_percentual;
      if (d != null && !desconto) setDesconto(String(d).replace(".", ","));
    } else {
      setLinhas(o.tipo === "atual" ? deSeries(seriesAtuais) : []);
      setModelo(null);
    }
    setEscolhendo(false);
  };

  /** Aprovado pelo banco mudou: o financiamento do plano passa a ser o líquido (aprovado - desconto). */
  const mudarFinanciamento = (novoAprovado: number, novoDesconto: string) => {
    setAprovado(novoAprovado);
    setDesconto(novoDesconto);
    if (!novoAprovado) return;
    const liquido = financiamentoLiquido(novoAprovado, Number(novoDesconto.replace(",", ".")) || 0);
    setLinhas((ls) => {
      const fin = ls.find((l) => l.tipo === "financiamento");
      if (!fin) return [...ls, linhaNova("financiamento", hoje, liquido)];
      return ls.map((l) => (l.chave === fin.chave ? { ...l, quantidade: "1", valor: liquido, emAberto: false } : l));
    });
  };

  /** Linhas com teto vão para o máximo permitido pela renda atual. */
  const preencherMaximos = () =>
    setLinhas((ls) =>
      ls.map((l) => {
        const max = maximoParcela({ quantidade: qtdDe(l), teto_renda_percentual: l.tetoRenda, teto_imovel_percentual: l.tetoImovel }, renda || null, valorVenda);
        return max != null ? { ...l, valor: reaisInteiros(max), emAberto: false } : l;
      }),
    );

  /** Linha que fecha a conta: a marcada no modelo (ex.: 4º ato) ou, sem ela, o financiamento. */
  const alvoCompletar = linhas.find((l) => l.completa) ?? null;
  const nomeAlvo = alvoCompletar ? alvoCompletar.descricao.trim() || TIPO_SERIE_LABEL[alvoCompletar.tipo] : null;

  /** Põe na linha marcada (ou no financiamento) o que falta para fechar com o valor da venda. */
  const completar = () => {
    setAviso(undefined);
    if (alvoCompletar) {
      const qtd = Math.max(qtdDe(alvoCompletar), 1);
      const novoTotal = totalDe(alvoCompletar) + diferenca;
      if (novoTotal <= 0) return setAviso(`Mesmo zerando ${nomeAlvo}, o plano passa do valor da venda.`);
      return mudar(alvoCompletar.chave, { quantidade: String(qtd), valor: Math.round(novoTotal / qtd), emAberto: false });
    }
    const fin = linhas.find((l) => l.tipo === "financiamento");
    if (!fin) {
      if (diferenca <= 0) return setAviso("O plano já passa do valor da venda. Reduza alguma parcela.");
      return setLinhas((ls) => [...ls, linhaNova("financiamento", hoje, diferenca)]);
    }
    const qtd = Math.max(qtdDe(fin), 1);
    const novoTotal = totalDe(fin) + diferenca;
    if (novoTotal <= 0) return setAviso("Mesmo zerando o financiamento, o plano passa do valor da venda. Reduza a entrada.");
    mudar(fin.chave, { quantidade: String(qtd), valor: Math.round(novoTotal / qtd) });
  };

  const envio = JSON.stringify([...entrada, ...doBanco].map(paraEnvio));

  return (
    <FormSemReset acao={acao} className="flex flex-col">
      <input type="hidden" name="series" value={envio} />

      <button
        type="button"
        onClick={() => setEscolhendo((e) => !e)}
        className="flex items-center justify-between rounded-[22px] border border-white/[0.06] bg-surface px-4 py-3 text-left md:px-5"
      >
        <div className="min-w-0">
          <div className="text-[13px] text-label-2">Começar de</div>
          <div className="truncate text-[17px] font-medium">{modelo ? modelo.nome : linhas.length ? "Plano atual" : "Escolha um modelo"}</div>
        </div>
        <span className="flex items-center gap-1 text-[15px] text-accent">
          {escolhendo ? "Fechar" : "Trocar"}
          <Chevron open={escolhendo} />
        </span>
      </button>
      <Expande aberto={escolhendo}>
        <div className="mt-3">
          <EscolherOrigem modelos={modelos} construtora={construtora} temAtual={seriesAtuais.length > 0} temLinhas={linhas.length > 0} aoEscolher={escolher} />
        </div>
      </Expande>

      {modelo?.descricao && (
        <Card className="mt-3 border-accent/30 px-4 py-3 md:px-5">
          <div className="text-[13px] font-semibold text-accent">Regras de {modelo.nome}</div>
          <p className="mt-1 text-[14px] whitespace-pre-line text-label-2">{modelo.descricao}</p>
        </Card>
      )}

      <Card className="mt-3 divide-y divide-separator overflow-hidden">
        <MoneyField label="Renda familiar mensal" name="renda" value={renda} onChange={setRenda} />
        {comTeto.length > 0 && renda > 0 && (
          <button type="button" onClick={preencherMaximos} className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-[14px] font-medium text-accent">
            <Wand2 className="size-4" /> Preencher {plural(comTeto.length, "linha com teto", "linhas com teto")} com o máximo
          </button>
        )}
        {posEntrega != null && renda > 0 && (
          <div className="px-4 py-2.5 text-[13px] text-label-2">
            Parcela do financiamento após a entrega: até <span className="sensivel">{brl(Math.round((renda * posEntrega) / 100))}</span> ({pctTexto(posEntrega)} da renda)
          </div>
        )}
        {comTeto.length > 0 && !renda && <div className="px-4 py-2.5 text-[13px] text-pending">Informe a renda para calcular o máximo das parcelas.</div>}
      </Card>

      {(["entrada", "banco"] as const).map((g) => {
        const lista = g === "entrada" ? entrada : doBanco;
        return (
          <section key={g}>
            <div className="mt-8 mb-3 flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-[20px] font-bold tracking-[-0.01em]">{GRUPO_LABEL[g]}</h2>
              <span className="text-[15px] text-label-2 tabular-nums">
                <span className="sensivel">{brl(subtotal[g])}</span>
                {subtotal[g] > 0 && <span className="sensivel"> · {pct(subtotal[g], valorVenda)}</span>}
              </span>
            </div>
            {g === "banco" && <BancoCampo valor={banco} aoMudar={setBanco} />}
            {g === "banco" && <FinanciamentoCampos aprovado={aprovado} desconto={desconto} aoMudar={mudarFinanciamento} />}
            <div className="flex flex-col gap-3">
              {lista.map((l) => (
                <EditorLinha key={l.chave} l={l} grupo={g} renda={renda} valorVenda={valorVenda} aoMudar={(p) => mudar(l.chave, p)} aoRemover={() => remover(l.chave)} />
              ))}
              {lista.length === 0 && (
                <p className="px-1 text-[14px] text-label-3">{g === "entrada" ? "Nenhuma parcela de entrada." : "Nenhum valor do banco."}</p>
              )}
            </div>
            <button type="button" onClick={() => adicionar(g)} className="mt-3 flex items-center gap-1.5 px-1 text-[15px] font-medium text-accent">
              <Plus className="size-4" /> {g === "entrada" ? "Adicionar parcela de entrada" : "Adicionar financiamento, FGTS ou subsídio"}
            </button>
          </section>
        );
      })}

      <Card className="mt-8 divide-y divide-separator overflow-hidden">
        {(["entrada", "banco"] as const).map((g) => (
          <div key={g} className="flex items-baseline justify-between gap-3 px-4 py-2.5 md:px-5">
            <span className="text-[15px] text-label-2">{g === "entrada" ? "Entrada" : `Banco${banco.trim() ? ` (${banco.trim()})` : ""}`}</span>
            <span className="sensivel text-[16px] tabular-nums">{brl(subtotal[g])}</span>
          </div>
        ))}
        <div className="px-4 py-3 md:px-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold">Total do plano</span>
            <span className="sensivel text-[18px] font-semibold tabular-nums">{brl(total)}</span>
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
          {diferenca !== 0 && (
            <button
              type="button"
              onClick={completar}
              className="mt-3 flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[14px] font-medium text-accent transition active:scale-[0.97]"
            >
              <Wand2 className="size-4" /> {nomeAlvo ? `Completar no ${nomeAlvo}` : "Completar com o financiamento"}
            </button>
          )}
          {aviso && <p className="mt-2 text-[13px] text-negative">{aviso}</p>}
        </div>
      </Card>

      {abertas > 0 && (
        <p className="mt-3 px-1 text-[13px] text-pending">
          {abertas === 1 ? "1 linha ainda está sem valor." : `${abertas} linhas ainda estão sem valor.`} Preencha ou remova antes de salvar.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <FormMessage erro={estado.erro} aviso={estado.aviso} />
        <SubmitButton pendingLabel="Salvando…" pending={salvando}>
          Salvar plano
        </SubmitButton>
        <Link href={`/vendas/${vendaId}`} className="py-2 text-center text-[17px] text-accent">
          Cancelar
        </Link>
      </div>
    </FormSemReset>
  );
}
