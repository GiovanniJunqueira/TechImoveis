// Dados de exemplo para novas contas conhecerem o sistema (nomes fictícios).

type Exemplo = {
  data: string;
  cliente: string;
  empreendimento: string;
  construtora: string | null;
  unidade: string;
  tipo: "lancamento" | "pronto" | "revenda";
  valor: number; // reais
  pct: number; // % de comissão
  previsto: string;
  recebido?: string;
};

const e = (
  data: string, cliente: string, empreendimento: string, construtora: string | null, unidade: string,
  tipo: Exemplo["tipo"], valor: number, pct: number, previsto: string, recebido?: string,
): Exemplo => ({ data, cliente, empreendimento, construtora, unidade, tipo, valor, pct, previsto, recebido });

const A = "Construtora Alvorada";
const H = "Horizonte Incorporações";
const V = "Grupo Vértice";

export const EXEMPLOS: Exemplo[] = [
  e("2026-11-18", "Mariana Couto", "Vista Parque", A, "Apto 1204, Torre B", "lancamento", 612000, 4, "2026-12-05"),
  e("2026-11-06", "Rafael e Júlia Prado", "Residencial Ipê", H, "Apto 302", "lancamento", 389000, 4, "2026-11-28"),
  e("2026-10-27", "Carlos Henrique Dias", "Vista Parque", A, "Apto 801, Torre A", "lancamento", 575000, 4, "2026-11-10"),
  e("2026-10-09", "Patrícia Lemos", "Casa Jardim Europa", null, "Casa 14", "revenda", 1180000, 5, "2026-10-30", "2026-10-30"),
  e("2026-09-24", "Bruno Siqueira", "Lumière Residence", V, "Apto 1501", "lancamento", 920000, 4, "2026-10-12", "2026-10-12"),
  e("2026-09-15", "Ana Paula Rocha", "Residencial Ipê", H, "Apto 105", "lancamento", 362000, 4, "2026-10-01", "2026-10-01"),
  e("2026-09-03", "Thiago Martins", "Edifício Aurora", null, "Apto 72", "pronto", 455000, 5, "2026-09-20", "2026-09-20"),
  e("2026-08-21", "Fernanda e Lucas Assis", "Vista Parque", A, "Apto 604, Torre B", "lancamento", 548000, 4, "2026-09-08", "2026-09-08"),
  e("2026-08-02", "Gustavo Nogueira", "Lumière Residence", V, "Apto 903", "lancamento", 870000, 4, "2026-08-25", "2026-08-25"),
  e("2026-07-12", "Juliana Freitas", "Residencial Ipê", H, "Apto 401", "lancamento", 395000, 4, "2026-07-30", "2026-07-30"),
  e("2026-06-28", "Marcos Vinícius Leal", "Edifício Aurora", null, "Apto 34", "pronto", 430000, 5, "2026-07-15", "2026-07-15"),
  e("2026-06-05", "Renata Albuquerque", "Vista Parque", A, "Apto 1102, Torre A", "lancamento", 598000, 4, "2026-06-22", "2026-06-22"),
  e("2026-04-17", "Diego Campos", "Lumière Residence", V, "Apto 702", "lancamento", 845000, 4, "2026-05-06", "2026-05-06"),
  e("2026-03-09", "Larissa Monteiro", "Residencial Ipê", H, "Apto 203", "lancamento", 371000, 4, "2026-03-27", "2026-03-27"),
  e("2026-02-14", "Eduardo e Bianca Reis", "Casa Alphaville", null, "Casa 3", "revenda", 1650000, 5, "2026-03-05", "2026-03-05"),
  e("2026-01-22", "Sofia Tavares", "Vista Parque", A, "Apto 302, Torre B", "lancamento", 541000, 4, "2026-02-10", "2026-02-10"),
  e("2025-12-11", "André Barcelos", "Lumière Residence", V, "Apto 1203", "lancamento", 905000, 4, "2025-12-29", "2025-12-29"),
  e("2025-11-04", "Camila Pacheco", "Residencial Ipê", H, "Apto 506", "lancamento", 402000, 4, "2025-11-21", "2025-11-21"),
  e("2025-10-19", "Felipe Antunes", "Edifício Aurora", null, "Apto 91", "pronto", 468000, 5, "2025-11-03", "2025-11-03"),
  e("2025-09-02", "Helena Duarte", "Vista Parque", A, "Apto 205, Torre A", "lancamento", 529000, 4, "2025-09-19", "2025-09-19"),
  e("2025-07-26", "Rodrigo e Paula Mendes", "Casa Jardim Europa", null, "Casa 8", "revenda", 1090000, 5, "2025-08-14", "2025-08-14"),
  e("2025-05-13", "Vanessa Lopes", "Lumière Residence", V, "Apto 404", "lancamento", 812000, 4, "2025-06-02", "2025-06-02"),
];
