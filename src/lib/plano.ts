// Plano de pagamento do cliente: séries de parcelas e o cronograma calculado a partir delas.
// Sem dependências de servidor: usado tanto nas páginas quanto nos formulários.

export const TIPOS_SERIE = ["ato", "sinal", "mensal", "intercalada", "anual", "chaves", "financiamento", "fgts", "subsidio", "outro"] as const;
export type TipoSerie = (typeof TIPOS_SERIE)[number];

export const TIPO_SERIE_LABEL: Record<TipoSerie, string> = {
  ato: "Ato",
  sinal: "Sinal",
  mensal: "Mensais",
  intercalada: "Intercaladas",
  anual: "Anuais",
  chaves: "Chaves",
  financiamento: "Financiamento",
  fgts: "FGTS",
  subsidio: "Subsídio",
  outro: "Outro",
};

/**
 * Na planta, a ENTRADA é parcelada direto com a construtora; o resto vem do BANCO
 * (financiamento, FGTS e subsídio, liberados pela Caixa ou outro banco).
 */
export type GrupoSerie = "entrada" | "banco";
export const GRUPO_SERIE: Record<TipoSerie, GrupoSerie> = {
  ato: "entrada",
  sinal: "entrada",
  mensal: "entrada",
  intercalada: "entrada",
  anual: "entrada",
  chaves: "entrada",
  outro: "entrada",
  financiamento: "banco",
  fgts: "banco",
  subsidio: "banco",
};
export const GRUPO_LABEL: Record<GrupoSerie, string> = { entrada: "Entrada com a construtora", banco: "Financiamento bancário" };
export const TIPOS_POR_GRUPO: Record<GrupoSerie, TipoSerie[]> = {
  entrada: TIPOS_SERIE.filter((t) => GRUPO_SERIE[t] === "entrada"),
  banco: TIPOS_SERIE.filter((t) => GRUPO_SERIE[t] === "banco"),
};

/** Intervalo padrão (em meses) e quantidade sugerida de cada tipo de série. */
export const PADRAO_SERIE: Record<TipoSerie, { intervalo: number; quantidade: number }> = {
  ato: { intervalo: 1, quantidade: 1 },
  sinal: { intervalo: 0, quantidade: 1 },
  mensal: { intervalo: 1, quantidade: 36 },
  intercalada: { intervalo: 6, quantidade: 6 },
  anual: { intervalo: 12, quantidade: 3 },
  chaves: { intervalo: 0, quantidade: 1 },
  financiamento: { intervalo: 0, quantidade: 1 },
  fgts: { intervalo: 0, quantidade: 1 },
  subsidio: { intervalo: 0, quantidade: 1 },
  outro: { intervalo: 0, quantidade: 1 },
};

export const INTERVALOS = [
  { value: "1", label: "Todo mês" },
  { value: "2", label: "A cada 2 meses" },
  { value: "3", label: "A cada 3 meses" },
  { value: "4", label: "A cada 4 meses" },
  { value: "6", label: "A cada 6 meses" },
  { value: "12", label: "Todo ano" },
];

export type Serie = {
  id: string;
  tipo: TipoSerie;
  descricao: string | null;
  quantidade: number;
  valor_total_centavos: number;
  primeiro_vencimento: string | null;
  intervalo_meses: number;
  teto_renda_percentual?: number | null; // máximo de CADA parcela, em % da renda
  teto_imovel_percentual?: number | null; // máximo da SÉRIE inteira, em % do imóvel
};

/**
 * Série de um modelo de construtora: a estrutura do plano (tipo, quantidade, prazos).
 * O valor pode vir de um percentual do imóvel, de um valor fixo por parcela, ou ficar
 * em aberto (null nos dois) para o corretor digitar na proposta.
 */
export type SerieModelo = {
  tipo: TipoSerie;
  descricao: string | null;
  quantidade: number;
  percentual: number | null; // % do valor da venda que a série soma
  valor_parcela_centavos?: number | null; // valor fixo de cada parcela
  intervalo_meses: number;
  defasagem_meses: number | null; // meses entre a venda e o 1º vencimento (null = sem data)
  mes_fixo?: number | null; // 1-12: vence sempre neste mês (ex.: anuais em dezembro)
  teto_renda_percentual?: number | null;
  teto_imovel_percentual?: number | null;
  completa?: boolean; // linha que fecha a conta (fica com a diferença para o valor da venda)
};

/** Regras do modelo inteiro (ex.: Vibra desconta 1,5% do financiamento para o INCC). */
export type RegrasModelo = {
  desconto_financiamento_percentual?: number | null;
  parcela_pos_entrega_percentual_renda?: number | null;
};

/**
 * Valor máximo de cada parcela pelos tetos da série (renda e/ou imóvel), em centavos.
 * Nulo se a série não tem teto ou se falta a renda para calcular.
 */
export function maximoParcela(
  s: { quantidade: number; teto_renda_percentual?: number | null; teto_imovel_percentual?: number | null },
  renda: number | null,
  valorVenda: number,
) {
  const limites: number[] = [];
  if (s.teto_renda_percentual && renda) limites.push(Math.round((renda * s.teto_renda_percentual) / 100));
  if (s.teto_imovel_percentual && s.quantidade > 0) limites.push(Math.floor((valorVenda * s.teto_imovel_percentual) / 100 / s.quantidade));
  return limites.length ? Math.min(...limites) : null;
}

/** Arredonda para baixo em reais inteiros (como as tabelas das construtoras). */
export const reaisInteiros = (centavos: number) => Math.floor(centavos / 100) * 100;

/** Financiamento líquido: aprovado pelo banco menos o desconto (ex.: 1,5% do INCC). */
export const financiamentoLiquido = (aprovado: number, descontoPct: number | null | undefined) =>
  Math.round(aprovado * (1 - (descontoPct ?? 0) / 100));

/** 1º vencimento de uma série do modelo: data da venda + defasagem, empurrada para o mês fixo. */
function vencimentoModelo(m: SerieModelo, dataVenda: string) {
  if (m.defasagem_meses == null) return null;
  const base = somarMeses(dataVenda, m.defasagem_meses);
  if (!m.mes_fixo) return base;
  const mes = Number(base.slice(5, 7));
  return somarMeses(base, (m.mes_fixo - mes + 12) % 12);
}

/** Soma por grupo (entrada x banco). */
export function totaisPorGrupo(series: Pick<Serie, "tipo" | "valor_total_centavos">[]) {
  const t = { entrada: 0, banco: 0 };
  for (const s of series) t[GRUPO_SERIE[s.tipo]] += s.valor_total_centavos;
  return t;
}

export type Parcela = { serieId: string; tipo: TipoSerie; numero: number; de: number; valor: number; vencimento: string | null };

/** Soma meses a uma data ISO, mantendo o dia (ou o último dia do mês, se não existir). */
export function somarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

/** Meses inteiros de `de` até `ate` (pelo calendário, ignorando o dia). */
export function mesesEntre(de: string, ate: string) {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

/** Valor de cada parcela: divide o total e põe a sobra de centavos na primeira. */
export function valoresParcelas(total: number, quantidade: number) {
  const base = Math.floor(total / quantidade);
  return Array.from({ length: quantidade }, (_, i) => base + (i === 0 ? total - base * quantidade : 0));
}

export function cronograma(series: Serie[]): Parcela[] {
  const parcelas = series.flatMap((s) =>
    valoresParcelas(s.valor_total_centavos, s.quantidade).map((valor, i) => ({
      serieId: s.id,
      tipo: s.tipo,
      numero: i + 1,
      de: s.quantidade,
      valor,
      vencimento: s.primeiro_vencimento ? somarMeses(s.primeiro_vencimento, i * (s.intervalo_meses || 0)) : null,
    })),
  );
  // Sem data (ex.: financiamento) vai para o fim.
  return parcelas.sort((a, b) => (a.vencimento ?? "9999").localeCompare(b.vencimento ?? "9999"));
}

export function totalPlano(series: Pick<Serie, "valor_total_centavos">[]) {
  return series.reduce((s, x) => s + x.valor_total_centavos, 0);
}

/** Converte o plano de uma venda em modelo reaproveitável (percentuais e defasagens). */
export function seriesParaModelo(series: Serie[], valorVenda: number, dataVenda: string): SerieModelo[] {
  return series.map((s) => ({
    tipo: s.tipo,
    descricao: s.descricao,
    quantidade: s.quantidade,
    // Série com teto pela renda volta a ser calculada pela renda do próximo cliente, não por %.
    percentual: s.teto_renda_percentual ? null : Math.round((s.valor_total_centavos / valorVenda) * 1_000_000) / 10_000,
    intervalo_meses: s.intervalo_meses,
    defasagem_meses: s.primeiro_vencimento ? Math.max(mesesEntre(dataVenda, s.primeiro_vencimento), 0) : null,
    teto_renda_percentual: s.teto_renda_percentual ?? null,
    teto_imovel_percentual: s.teto_imovel_percentual ?? null,
  }));
}

/** Aplica um modelo a uma venda: valores pelo percentual, datas a partir da data da venda. */
export function modeloParaSeries(modelo: SerieModelo[], valorVenda: number, dataVenda: string, renda: number | null = null) {
  const series = modelo.map((m, ordem) => {
    // Série com teto e sem valor definido: já entra com o máximo permitido (em reais inteiros).
    const maximo = maximoParcela(m, renda, valorVenda);
    return {
      tipo: m.tipo,
      descricao: m.descricao,
      quantidade: m.quantidade,
      valor_total_centavos:
        m.percentual != null
          ? Math.round((valorVenda * m.percentual) / 100)
          : m.valor_parcela_centavos
            ? m.valor_parcela_centavos * m.quantidade
            : maximo != null
              ? reaisInteiros(maximo) * m.quantidade
              : 0, // em aberto: o corretor digita o valor na proposta
      primeiro_vencimento: vencimentoModelo(m, dataVenda),
      intervalo_meses: m.intervalo_meses,
      teto_renda_percentual: m.teto_renda_percentual ?? null,
      teto_imovel_percentual: m.teto_imovel_percentual ?? null,
      ordem,
    };
  });
  // Modelo que fecha 100%: a sobra do arredondamento vai para a última série, para o plano bater com a venda.
  const pct = modelo.reduce((s, m) => s + (m.percentual ?? 0), 0);
  if (series.length && modelo.every((m) => m.percentual != null) && Math.abs(pct - 100) < 0.01) series[series.length - 1].valor_total_centavos += valorVenda - totalPlano(series);
  // Séries com valor 0 continuam na lista: são as que o corretor ainda vai preencher.
  return series;
}

/** Nome comparável: sem acento, minúsculo e sem espaços sobrando (ex.: "MRV  Engenharia" = "mrv engenharia"). */
export function normalizarNome(nome: string) {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Mesma construtora pelo nome, tolerando sufixos: "Vibra" casa com "Vibra Residencial",
 * "MRV" com "MRV Engenharia". Sem acento e sem diferença de maiúsculas.
 */
export function mesmaConstrutora(a: string, b: string) {
  const x = normalizarNome(a);
  const y = normalizarNome(b);
  return x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `);
}

/** Sugestões para o banco do financiamento. */
export const BANCOS = ["Caixa", "Banco do Brasil", "Itaú", "Bradesco", "Santander"];

/** "todo mês", "a cada 6 meses", "todo ano" (vazio para parcela única). */
export function intervaloTexto(meses: number) {
  return meses === 1 ? "todo mês" : meses === 12 ? "todo ano" : meses > 0 ? `a cada ${meses} meses` : "";
}

/** Linha do editor de plano, como vai para o servidor: o valor é o de CADA parcela. */
export type LinhaPlano = {
  tipo: TipoSerie;
  descricao: string | null;
  quantidade: number;
  valor_parcela_centavos: number;
  primeiro_vencimento: string | null;
  intervalo_meses: number;
  teto_renda_percentual: number | null;
  teto_imovel_percentual: number | null;
};

const pctOpcional = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= max ? Math.round(v * 100) / 100 : null);

const dataISOValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v >= "1990-01-01" && v <= "2100-12-31";
const MAX_LINHAS = 60;
const MAX_CENTAVOS = 100_000_000_000_00; // R$ 100 bilhões: só para barrar lixo

/**
 * Valida as linhas do plano (vindas do cliente como JSON). Cada erro cita a linha,
 * para o corretor achar o que falta preencher.
 */
export function validarLinhasPlano(bruto: unknown): { erro: string } | { linhas: LinhaPlano[] } {
  if (!Array.isArray(bruto)) return { erro: "Plano inválido." };
  if (bruto.length === 0) return { erro: "Adicione ao menos uma parcela ao plano." };
  if (bruto.length > MAX_LINHAS) return { erro: `O plano pode ter no máximo ${MAX_LINHAS} linhas.` };
  const linhas: LinhaPlano[] = [];
  for (const [i, item] of bruto.entries()) {
    const l = (item ?? {}) as Record<string, unknown>;
    const tipo = l.tipo as TipoSerie;
    if (!TIPOS_SERIE.includes(tipo)) return { erro: `Linha ${i + 1}: tipo de parcela inválido.` };
    const nome = `Linha ${i + 1} (${typeof l.descricao === "string" && l.descricao.trim() ? l.descricao.trim() : TIPO_SERIE_LABEL[tipo]})`;
    const descricao = typeof l.descricao === "string" ? l.descricao.trim().slice(0, 80) || null : null;
    const quantidade = l.quantidade;
    if (typeof quantidade !== "number" || !Number.isInteger(quantidade) || quantidade < 1 || quantidade > 600)
      return { erro: `${nome}: a quantidade de parcelas deve ser de 1 a 600.` };
    const valor = l.valor_parcela_centavos;
    if (typeof valor !== "number" || !Number.isInteger(valor) || valor <= 0) return { erro: `${nome}: informe o valor da parcela.` };
    if (valor * quantidade > MAX_CENTAVOS) return { erro: `${nome}: valor alto demais.` };
    const venc = l.primeiro_vencimento;
    if (venc != null && venc !== "" && (typeof venc !== "string" || !dataISOValida(venc))) return { erro: `${nome}: data de vencimento inválida.` };
    const primeiro = typeof venc === "string" && venc ? venc : null;
    if (quantidade > 1 && !primeiro) return { erro: `${nome}: informe o primeiro vencimento.` };
    const intervalo = quantidade > 1 ? l.intervalo_meses : 0;
    if (typeof intervalo !== "number" || !Number.isInteger(intervalo) || intervalo < 0 || intervalo > 60)
      return { erro: `${nome}: frequência inválida.` };
    if (quantidade > 1 && intervalo === 0) return { erro: `${nome}: escolha a frequência das parcelas.` };
    linhas.push({
      tipo,
      descricao,
      quantidade,
      valor_parcela_centavos: valor,
      primeiro_vencimento: primeiro,
      intervalo_meses: intervalo,
      teto_renda_percentual: pctOpcional(l.teto_renda_percentual, 1000),
      teto_imovel_percentual: pctOpcional(l.teto_imovel_percentual, 100),
    });
  }
  return { linhas };
}
