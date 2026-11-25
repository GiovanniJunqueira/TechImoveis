// Tipos e cálculos de vendas usados pelas telas (sem acesso ao banco).

export type StatusComissao = "recebida" | "a_receber" | "atrasada";

export type Venda = {
  id: string;
  cliente: string;
  clienteId: string;
  empreendimento: string;
  construtora: string;
  unidade: string;
  tipo: "Lançamento" | "Pronto" | "Revenda";
  data: string; // ISO yyyy-mm-dd
  valorVenda: number; // centavos
  comissao: number; // centavos
  statusComissao: StatusComissao;
  pagador: string;
  previsao?: string; // ISO, quando a receber
  recebidoEm?: string; // ISO, quando recebida
};

/** Data de hoje no fuso de São Paulo, em ISO (yyyy-mm-dd). */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export type GrupoMes = { mes: number; vendas: Venda[]; comissao: number; vgv: number };
export type GrupoAno = { ano: number; meses: GrupoMes[]; comissao: number; vgv: number; qtd: number };

const soma = (xs: Venda[], k: "comissao" | "valorVenda") => xs.reduce((s, x) => s + x[k], 0);

export function agruparPorAno(vendas: Venda[]): GrupoAno[] {
  const anos = new Map<number, Map<number, Venda[]>>();
  for (const venda of vendas) {
    const [a, m] = venda.data.split("-").map(Number);
    if (!anos.has(a)) anos.set(a, new Map());
    const meses = anos.get(a)!;
    if (!meses.has(m)) meses.set(m, []);
    meses.get(m)!.push(venda);
  }
  return [...anos.entries()]
    .sort(([a], [b]) => b - a)
    .map(([ano, meses]) => {
      const grupos = [...meses.entries()]
        .sort(([a], [b]) => b - a)
        .map(([mes, vs]) => ({
          mes,
          vendas: [...vs].sort((x, y) => y.data.localeCompare(x.data)),
          comissao: soma(vs, "comissao"),
          vgv: soma(vs, "valorVenda"),
        }));
      const todas = grupos.flatMap((g) => g.vendas);
      return { ano, meses: grupos, comissao: soma(todas, "comissao"), vgv: soma(todas, "valorVenda"), qtd: todas.length };
    });
}

export function resumoFinanceiro(vendas: Venda[], ano: number) {
  const doAno = vendas.filter((x) => x.data.startsWith(String(ano)));
  const recebido = vendas
    .filter((x) => x.statusComissao === "recebida" && x.recebidoEm?.startsWith(String(ano)))
    .reduce((s, x) => s + x.comissao, 0);
  const aReceber = vendas.filter((x) => x.statusComissao !== "recebida" && x.comissao > 0);
  return {
    recebido,
    aReceber: aReceber.reduce((s, x) => s + x.comissao, 0),
    atrasado: aReceber.filter((x) => x.statusComissao === "atrasada").reduce((s, x) => s + x.comissao, 0),
    vgvAno: doAno.reduce((s, x) => s + x.valorVenda, 0),
    vendasAno: doAno.length,
    pendentes: [...aReceber].sort((a, b) => (a.previsao ?? "9").localeCompare(b.previsao ?? "9")),
  };
}
