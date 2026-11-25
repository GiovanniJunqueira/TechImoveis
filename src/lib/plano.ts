// Plano de pagamento do cliente: séries de parcelas e o cronograma calculado a partir delas.
// Sem dependências de servidor: usado tanto nas páginas quanto nos formulários.

export const TIPOS_SERIE = ["sinal", "mensal", "intercalada", "anual", "chaves", "financiamento", "outro"] as const;
export type TipoSerie = (typeof TIPOS_SERIE)[number];

export const TIPO_SERIE_LABEL: Record<TipoSerie, string> = {
  sinal: "Sinal",
  mensal: "Mensais",
  intercalada: "Intercaladas",
  anual: "Anuais",
  chaves: "Chaves",
  financiamento: "Financiamento",
  outro: "Outro",
};

/** Intervalo padrão (em meses) e quantidade sugerida de cada tipo de série. */
export const PADRAO_SERIE: Record<TipoSerie, { intervalo: number; quantidade: number }> = {
  sinal: { intervalo: 0, quantidade: 1 },
  mensal: { intervalo: 1, quantidade: 36 },
  intercalada: { intervalo: 6, quantidade: 6 },
  anual: { intervalo: 12, quantidade: 3 },
  chaves: { intervalo: 0, quantidade: 1 },
  financiamento: { intervalo: 0, quantidade: 1 },
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
};

/** Série de um modelo: proporções em vez de valores e datas. */
export type SerieModelo = {
  tipo: TipoSerie;
  descricao: string | null;
  quantidade: number;
  percentual: number; // % do valor da venda que a série soma
  intervalo_meses: number;
  defasagem_meses: number | null; // meses entre a venda e o 1º vencimento (null = sem data)
};

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
    percentual: Math.round((s.valor_total_centavos / valorVenda) * 1_000_000) / 10_000,
    intervalo_meses: s.intervalo_meses,
    defasagem_meses: s.primeiro_vencimento ? Math.max(mesesEntre(dataVenda, s.primeiro_vencimento), 0) : null,
  }));
}

/** Aplica um modelo a uma venda: valores pelo percentual, datas a partir da data da venda. */
export function modeloParaSeries(modelo: SerieModelo[], valorVenda: number, dataVenda: string) {
  const series = modelo.map((m, ordem) => ({
    tipo: m.tipo,
    descricao: m.descricao,
    quantidade: m.quantidade,
    valor_total_centavos: Math.round((valorVenda * m.percentual) / 100),
    primeiro_vencimento: m.defasagem_meses == null ? null : somarMeses(dataVenda, m.defasagem_meses),
    intervalo_meses: m.intervalo_meses,
    ordem,
  }));
  // Modelo que fecha 100%: a sobra do arredondamento vai para a última série, para o plano bater com a venda.
  const pct = modelo.reduce((s, m) => s + m.percentual, 0);
  if (series.length && Math.abs(pct - 100) < 0.01) series[series.length - 1].valor_total_centavos += valorVenda - totalPlano(series);
  return series.filter((s) => s.valor_total_centavos > 0);
}
