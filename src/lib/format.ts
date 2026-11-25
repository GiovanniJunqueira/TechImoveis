const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompactFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Valores sempre em centavos (inteiro). */
export const brl = (cents: number) => brlFmt.format(cents / 100);
const brlIntFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
/** Sem centavos, para totais grandes. */
export const brlInt = (cents: number) => brlIntFmt.format(Math.round(cents / 100));
export const brlCompact = (cents: number) => brlCompactFmt.format(cents / 100);

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MONTHS_SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

/** "2026-08-14" -> "14 de ago." */
export function dayLabel(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTHS_SHORT[m - 1]}`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
