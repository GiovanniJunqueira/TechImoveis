// Resumo da proposta para o CLIENTE: imóvel, entrada com a construtora, financiamento e total.
// Componente de servidor e sem acesso ao banco: recebe os dados prontos, para poder ser usado
// também no futuro portal do cliente. NUNCA recebe nem mostra comissão ou recebimentos.

import { brl, dataCurta, mascaraTelefone } from "@/lib/format";
import { GRUPO_LABEL, GRUPO_SERIE, TIPO_SERIE_LABEL, intervaloTexto, totaisPorGrupo, totalPlano, valoresParcelas, type Serie } from "@/lib/plano";

export type DadosResumo = {
  proposta: boolean; // ainda é proposta (e não venda fechada)
  cliente: string | null;
  imovel: string | null;
  unidade: string | null;
  construtora: string | null;
  valorVenda: number;
  dataVenda: string;
  banco: string | null;
  series: Serie[];
  corretor: { nome: string; creci: string | null; telefone: string | null };
  empresa: string;
};

const pct = (parte: number, todo: number) => (todo > 0 ? `${String(Math.round((parte / todo) * 1000) / 10).replace(".", ",")}%` : "");

/** Valor das parcelas regulares e, se diferente, o da 1ª (que leva a sobra de centavos). */
function valoresDe(s: Serie) {
  const v = valoresParcelas(s.valor_total_centavos, s.quantidade);
  const regular = v[v.length - 1];
  return { regular, primeira: v[0] !== regular ? v[0] : null };
}

const nomeSerie = (s: Serie) => s.descricao || TIPO_SERIE_LABEL[s.tipo];
const frequencia = (s: Serie) => (s.quantidade > 1 ? intervaloTexto(s.intervalo_meses) : "Parcela única");
const imovelTexto = (d: DadosResumo) => [d.imovel, d.unidade && `unidade ${d.unidade}`].filter(Boolean).join(", ");

function Info({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">{rotulo}</div>
      <div className="mt-0.5 text-[15px] font-medium break-words text-neutral-900">{valor}</div>
    </div>
  );
}

/** Lista de séries: cabe no celular e imprime bem (sem tabela larga). */
function TabelaSeries({ series }: { series: Serie[] }) {
  return (
    <div className="divide-y divide-neutral-100">
      {series.map((s) => {
        const { regular, primeira } = valoresDe(s);
        const detalhes = [
          s.quantidade > 1 ? `${s.quantidade} × ${brl(regular)}` : null,
          s.primeiro_vencimento ? `${s.quantidade > 1 ? "1º venc." : "Venc."} ${dataCurta(s.primeiro_vencimento)}` : "Vencimento a definir",
          frequencia(s),
        ].filter(Boolean);
        return (
          <div key={s.id} className="py-2.5 break-inside-avoid">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-medium text-neutral-900">{nomeSerie(s)}</span>
              <span className="shrink-0 text-[15px] font-medium tabular-nums text-neutral-900">{brl(s.valor_total_centavos)}</span>
            </div>
            <div className="mt-0.5 text-[13px] text-neutral-500 tabular-nums">
              {detalhes.join(" · ")}
              {primeira != null && ` (1ª de ${brl(primeira)})`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Bloco({ titulo, subtitulo, subtotal, valorVenda, children }: { titulo: string; subtitulo?: string | null; subtotal: number; valorVenda: number; children: React.ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid">
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b-2 border-neutral-900 pb-1.5">
        <h2 className="text-[16px] font-bold text-neutral-900">
          {titulo}
          {subtitulo && <span className="font-medium text-neutral-500"> · {subtitulo}</span>}
        </h2>
        <span className="text-[12px] text-neutral-500">{pct(subtotal, valorVenda)} do imóvel</span>
      </div>
      {children}
      <div className="mt-1 flex items-baseline justify-between rounded-lg bg-neutral-100 px-3 py-2 print:bg-neutral-100">
        <span className="text-[14px] font-medium text-neutral-700">Subtotal</span>
        <span className="text-[15px] font-bold tabular-nums text-neutral-900">{brl(subtotal)}</span>
      </div>
    </section>
  );
}

/** Cartão claro, pronto para tela e impressão. */
export function ResumoPlano({ dados: d }: { dados: DadosResumo }) {
  const entrada = d.series.filter((s) => GRUPO_SERIE[s.tipo] === "entrada");
  const banco = d.series.filter((s) => GRUPO_SERIE[s.tipo] === "banco");
  const grupos = totaisPorGrupo(d.series);
  const total = totalPlano(d.series);
  const imovel = imovelTexto(d);

  return (
    <article className="rounded-[24px] bg-white p-6 text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.06)] sm:p-9 print:rounded-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-5">
        <div>
          <div className="text-[12px] font-semibold tracking-wider text-[var(--accent)] uppercase">{d.empresa}</div>
          <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">{d.proposta ? "Proposta de pagamento" : "Plano de pagamento"}</h1>
        </div>
        <div className="text-[13px] text-neutral-500 sm:text-right">
          <div>Data</div>
          <div className="text-[15px] font-medium text-neutral-900 tabular-nums">{dataCurta(d.dataVenda)}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2">
        {d.cliente && <Info rotulo="Cliente" valor={d.cliente} />}
        {imovel && <Info rotulo="Imóvel" valor={imovel} />}
        {d.construtora && <Info rotulo="Construtora" valor={d.construtora} />}
        <Info rotulo="Valor do imóvel" valor={<span className="text-[18px] font-bold tabular-nums">{brl(d.valorVenda)}</span>} />
      </div>

      {d.series.length === 0 ? (
        <p className="mt-8 rounded-lg bg-neutral-100 px-4 py-6 text-center text-[15px] text-neutral-500">O plano de pagamento ainda não foi montado.</p>
      ) : (
        <>
          {entrada.length > 0 && (
            <Bloco titulo={GRUPO_LABEL.entrada} subtitulo={d.construtora} subtotal={grupos.entrada} valorVenda={d.valorVenda}>
              <TabelaSeries series={entrada} />
            </Bloco>
          )}
          {banco.length > 0 && (
            <Bloco titulo={GRUPO_LABEL.banco} subtitulo={d.banco} subtotal={grupos.banco} valorVenda={d.valorVenda}>
              <div className="divide-y divide-neutral-100">
                {banco.map((s) => (
                  <div key={s.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[14px]">
                    <div>
                      <div className="font-medium">{nomeSerie(s)}</div>
                      {(s.quantidade > 1 || s.primeiro_vencimento) && (
                        <div className="text-[12px] text-neutral-500">
                          {s.quantidade > 1 && `${s.quantidade} × ${brl(valoresDe(s).regular)}, ${frequencia(s)}`}
                          {s.quantidade > 1 && s.primeiro_vencimento && " · "}
                          {s.primeiro_vencimento && `a partir de ${dataCurta(s.primeiro_vencimento)}`}
                        </div>
                      )}
                    </div>
                    <span className="font-medium whitespace-nowrap tabular-nums">{brl(s.valor_total_centavos)}</span>
                  </div>
                ))}
              </div>
            </Bloco>
          )}

          <div className="mt-7 flex items-baseline justify-between gap-3 rounded-xl bg-neutral-900 px-4 py-3.5 text-white print:border-2 print:border-neutral-900 print:bg-white print:text-neutral-900">
            <span className="text-[15px] font-semibold">Total</span>
            <span className="text-[20px] font-bold tabular-nums">{brl(total)}</span>
          </div>
          {total !== d.valorVenda && (
            <p className="mt-2 text-right text-[12px] text-neutral-500">Valor do imóvel: {brl(d.valorVenda)}</p>
          )}
        </>
      )}

      <footer className="mt-8 flex flex-wrap items-end justify-between gap-3 border-t border-neutral-200 pt-5 text-[13px] text-neutral-600">
        <div>
          <div className="text-[15px] font-semibold text-neutral-900">{d.corretor.nome || d.empresa}</div>
          {d.corretor.creci && <div>CRECI {d.corretor.creci}</div>}
          {d.corretor.telefone && <div className="tabular-nums">{mascaraTelefone(d.corretor.telefone)}</div>}
        </div>
        <div className="max-w-[260px] text-right text-[11px] text-neutral-400">
          Simulação sujeita à aprovação da construtora e do banco. Valores e datas podem mudar até a assinatura do contrato.
        </div>
      </footer>
    </article>
  );
}

/** O mesmo resumo em texto, com *negrito* do WhatsApp, para colar na conversa com o cliente. */
export function resumoWhatsApp(d: DadosResumo) {
  const linhas: string[] = [];
  const entrada = d.series.filter((s) => GRUPO_SERIE[s.tipo] === "entrada");
  const banco = d.series.filter((s) => GRUPO_SERIE[s.tipo] === "banco");
  const grupos = totaisPorGrupo(d.series);
  const imovel = imovelTexto(d);
  const item = (s: Serie) => {
    if (s.quantidade === 1) return `• ${nomeSerie(s)}: ${brl(s.valor_total_centavos)}${s.primeiro_vencimento ? ` em ${dataCurta(s.primeiro_vencimento)}` : ""}`;
    const { regular, primeira } = valoresDe(s);
    const extra = [frequencia(s), s.primeiro_vencimento && `a partir de ${dataCurta(s.primeiro_vencimento)}`].filter(Boolean).join(", ");
    return `• ${nomeSerie(s)}: ${s.quantidade}x de ${brl(regular)}${primeira != null ? ` (1ª de ${brl(primeira)})` : ""}${extra ? `, ${extra}` : ""} = ${brl(s.valor_total_centavos)}`;
  };

  linhas.push(`*${d.proposta ? "Proposta de pagamento" : "Plano de pagamento"}*`);
  if (d.cliente) linhas.push(`Cliente: ${d.cliente}`);
  if (imovel) linhas.push(`Imóvel: ${imovel}`);
  if (d.construtora) linhas.push(`Construtora: ${d.construtora}`);
  linhas.push(`Valor do imóvel: *${brl(d.valorVenda)}*`);
  linhas.push(`Data: ${dataCurta(d.dataVenda)}`);

  if (entrada.length) {
    linhas.push("", `*Entrada com a construtora* (${pct(grupos.entrada, d.valorVenda)})`, ...entrada.map(item), `Subtotal da entrada: *${brl(grupos.entrada)}*`);
  }
  if (banco.length) {
    linhas.push("", `*Financiamento bancário${d.banco ? ` (${d.banco})` : ""}* (${pct(grupos.banco, d.valorVenda)})`, ...banco.map(item), `Subtotal do banco: *${brl(grupos.banco)}*`);
  }
  if (d.series.length) linhas.push("", `*Total: ${brl(totalPlano(d.series))}*`);

  const corretor = [d.corretor.nome, d.corretor.creci && `CRECI ${d.corretor.creci}`, d.corretor.telefone && mascaraTelefone(d.corretor.telefone)].filter(Boolean).join(" · ");
  linhas.push("", corretor || d.empresa);
  if (corretor && d.empresa) linhas.push(d.empresa);
  linhas.push("_Simulação sujeita à aprovação da construtora e do banco._");
  return linhas.join("\n");
}
