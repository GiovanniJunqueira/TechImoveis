import Link from "next/link";
import { Badge, Card, Chevron, Money, PageHeader, SectionTitle } from "@/components/ui";
import { EstadoVazio } from "@/components/estado-vazio";
import { listarVendas } from "@/lib/dal";
import { hojeISO, resumoFinanceiro } from "@/lib/vendas";
import { brl, dayLabel } from "@/lib/format";

export default async function FinanceiroPage() {
  const vendas = await listarVendas();
  const ano = Number(hojeISO().slice(0, 4));
  const r = resumoFinanceiro(vendas, ano);
  const recebidas = vendas
    .filter((x) => x.statusComissao === "recebida" && x.recebidoEm)
    .sort((a, b) => b.recebidoEm!.localeCompare(a.recebidoEm!))
    .slice(0, 8);

  return (
    <>
      <PageHeader title="Financeiro" subtitle="O que você já recebeu e o que ainda vai entrar. Toque numa comissão para marcar como recebida." />

      {vendas.length === 0 ? (
        <EstadoVazio titulo="Nada por aqui ainda" texto="Quando você cadastrar vendas, as comissões a receber e recebidas aparecem aqui." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="px-5 py-4">
              <div className="text-[13px] text-label-2">Recebido em {ano}</div>
              <Money cents={r.recebido} className="mt-0.5 block text-[22px] font-bold text-positive" />
            </Card>
            <Card className="px-5 py-4">
              <div className="text-[13px] text-label-2">A receber</div>
              <div className="mt-0.5 text-[22px] font-bold text-pending tabular-nums">{brl(r.aReceber)}</div>
              {r.atrasado > 0 && <div className="text-[13px] text-negative">{brl(r.atrasado)} em atraso</div>}
            </Card>
          </div>

          {r.pendentes.length > 0 && (
            <>
              <SectionTitle>A receber</SectionTitle>
              <Card className="divide-y divide-separator overflow-hidden">
                {r.pendentes.map((x) => (
                  <Link key={x.id} href={`/vendas/${x.id}`} className="flex items-center gap-3 py-3.5 pr-3 pl-5 transition active:bg-surface-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{x.cliente}</div>
                      <div className="text-[13px] text-label-2">
                        Pago por: {x.pagador}.{" "}
                        {x.previsao ? `${x.statusComissao === "atrasada" ? "Venceu em" : "Previsto para"} ${dayLabel(x.previsao)}` : "Sem data prevista"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[16px] font-semibold tabular-nums">{brl(x.comissao)}</span>
                      {x.statusComissao === "atrasada" ? <Badge tone="negative">Atrasada</Badge> : <Badge tone="pending">A receber</Badge>}
                    </div>
                    <Chevron />
                  </Link>
                ))}
              </Card>
            </>
          )}

          {recebidas.length > 0 && (
            <>
              <SectionTitle>Recebidos recentemente</SectionTitle>
              <Card className="divide-y divide-separator overflow-hidden">
                {recebidas.map((x) => (
                  <Link key={x.id} href={`/vendas/${x.id}`} className="flex items-center gap-3 py-3.5 pr-3 pl-5 transition active:bg-surface-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{x.cliente}</div>
                      <div className="text-[13px] text-label-2">
                        Recebido em {dayLabel(x.recebidoEm!)} de {x.recebidoEm!.slice(0, 4)}, de {x.pagador.toLowerCase()}
                      </div>
                    </div>
                    <Money cents={x.comissao} signed className="text-[16px] font-semibold" />
                    <Chevron />
                  </Link>
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}
