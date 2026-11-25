// Textos de resumo dos modelos de plano (sem dependências de servidor).
import { brl } from "@/lib/format";
import { GRUPO_SERIE, INTERVALOS, type SerieModelo } from "@/lib/plano";

export const pctTexto = (n: number) => `${String(Math.round(n * 100) / 100).replace(".", ",")}%`;

export function mascaraCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function intervaloTexto(meses: number) {
  return INTERVALOS.find((i) => Number(i.value) === meses)?.label.toLowerCase() ?? (meses > 0 ? `a cada ${meses} meses` : "");
}

export function prazoTexto(defasagem: number | null) {
  if (defasagem == null) return "sem data definida";
  if (defasagem === 0) return "na assinatura";
  return defasagem === 1 ? "1 mês após a venda" : `${defasagem} meses após a venda`;
}

/** Ex.: "36x, 10% do imóvel, todo mês, 1º vencimento 1 mês após a venda". */
export function resumoSerieModelo(s: SerieModelo) {
  const partes: string[] = [];
  if (s.quantidade > 1) partes.push(`${s.quantidade}x`);
  if (s.percentual != null) partes.push(`${pctTexto(s.percentual)} do imóvel`);
  else if (s.valor_parcela_centavos) partes.push(s.quantidade > 1 ? `de ${brl(s.valor_parcela_centavos)}` : brl(s.valor_parcela_centavos));
  else if (s.teto_renda_percentual || s.teto_imovel_percentual)
    partes.push(
      `até ${[s.teto_renda_percentual && `${pctTexto(s.teto_renda_percentual)} da renda por parcela`, s.teto_imovel_percentual && `${pctTexto(s.teto_imovel_percentual)} do imóvel no total`].filter(Boolean).join(" e ")}`,
    );
  else partes.push("valor em aberto");
  if (s.quantidade > 1 && s.intervalo_meses > 0) partes.push(intervaloTexto(s.intervalo_meses));
  partes.push(s.quantidade > 1 && s.defasagem_meses != null ? `1º vencimento ${prazoTexto(s.defasagem_meses)}` : prazoTexto(s.defasagem_meses));
  if (s.mes_fixo) partes.push(`sempre em ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][s.mes_fixo - 1]}`);
  if (s.completa) partes.push("fecha a conta");
  return partes.join(", ").replace(/^(\d+x), de/, "$1 de");
}

/** Percentual do imóvel em cada grupo (só as séries em %). */
export function percentuaisPorGrupo(series: SerieModelo[]) {
  const t = { entrada: 0, banco: 0 };
  for (const s of series) if (s.percentual != null) t[GRUPO_SERIE[s.tipo]] += s.percentual;
  return t;
}

export function resumoModelo(series: SerieModelo[]) {
  const p = percentuaisPorGrupo(series);
  const partes = [`${series.length} ${series.length === 1 ? "item" : "itens"}`];
  if (p.entrada) partes.push(`entrada ${pctTexto(p.entrada)}`);
  if (p.banco) partes.push(`banco ${pctTexto(p.banco)}`);
  return partes.join(" · ");
}
