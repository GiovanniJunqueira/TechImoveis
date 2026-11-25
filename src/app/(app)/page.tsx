import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { Badge, Card, Chevron, Money, PageHeader, PrimaryButton, SecondaryButton, SectionTitle, SENSIVEL, cn, heroNumber } from "@/components/ui";
import { OcultarValores } from "@/components/ocultar-valores";
import { EstadoVazio } from "@/components/estado-vazio";
import { getContexto, listarVendas } from "@/lib/dal";
import { hojeISO, resumoFinanceiro } from "@/lib/vendas";
import { MONTHS, brl, brlCompact, dayLabel, plural } from "@/lib/format";

export default async function InicioPage() {
  const [{ perfil }, vendas] = await Promise.all([getContexto(), listarVendas()]);
  const hoje = hojeISO();
  const [ano, mes] = hoje.split("-").map(Number);
  const r = resumoFinanceiro(vendas, ano);
  const doMes = vendas.filter((x) => x.data.startsWith(hoje.slice(0, 7)));
  const comissaoMes = doMes.reduce((s, x) => s + x.comissao, 0);
  const primeiroNome = perfil.nome.split(" ")[0];

  return (
    <>
      <PageHeader title={primeiroNome ? `Olá, ${primeiroNome}` : "Início"} subtitle={`${MONTHS[mes - 1]} de ${ano}`} action={<OcultarValores />} />

      {vendas.length === 0 ? (
        <EstadoVazio
          titulo="Bem-vindo ao Tech Imóveis"
          texto="Aqui você vai ver quanto recebeu, quanto tem a receber e suas vendas do mês. Comece cadastrando uma venda."
        />
      ) : (
        <>
          {/* Destaque: o único elemento com brilho, na cor do corretor */}
          <Card className="relative overflow-hidden px-6 pt-6 pb-7">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-accent opacity-25 blur-[80px]" />
            <div className="relative">
              <div className="text-[15px] text-label-2">Comissão recebida em {ano}</div>
              <Money cents={r.recebido} whole className={`mt-2 ${heroNumber}`} />
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5">
                <div>
                  <div className="text-[13px] text-label-2">A receber</div>
                  <div className={cn(SENSIVEL, "mt-0.5 text-[19px] font-semibold text-pending tabular-nums")}>{brl(r.aReceber)}</div>
                </div>
                <div>
                  <div className="text-[13px] text-label-2">Vendas no ano</div>
                  <div className="mt-0.5 text-[19px] font-semibold tabular-nums">{r.vendasAno}</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Card className="px-5 py-4">
              <div className="text-[13px] text-label-2">Neste mês</div>
              <Money cents={comissaoMes} signed className="mt-0.5 block text-[19px] font-semibold" />
              <div className="text-[13px] text-label-2">{plural(doMes.length, "venda", "vendas")}</div>
            </Card>
            <Card className="px-5 py-4">
              <div className="text-[13px] text-label-2">VGV no ano</div>
              <div className={cn(SENSIVEL, "mt-0.5 text-[19px] font-semibold tabular-nums")}>{brlCompact(r.vgvAno)}</div>
              <div className="text-[13px] text-label-2">valor vendido</div>
            </Card>
          </div>

          {r.pendentes.length > 0 && (
            <>
              <SectionTitle action={<Link href="/financeiro" className="text-[15px] text-accent">Ver tudo</Link>}>
                Próximos recebimentos
              </SectionTitle>
              <Card className="divide-y divide-separator overflow-hidden">
                {r.pendentes.slice(0, 5).map((x) => (
                  <Link key={x.id} href={`/vendas/${x.id}`} className="flex items-center gap-3 py-3.5 pr-3 pl-5 transition active:bg-surface-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{x.cliente}</div>
                      <div className="text-[13px] text-label-2">
                        {x.previsao ? `${x.statusComissao === "atrasada" ? "Venceu em" : "Previsto para"} ${dayLabel(x.previsao)}` : "Sem data prevista"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(SENSIVEL, "text-[16px] font-semibold tabular-nums")}>{brl(x.comissao)}</span>
                      {x.statusComissao === "atrasada" ? <Badge tone="negative">Atrasada</Badge> : <Badge tone="pending">A receber</Badge>}
                    </div>
                    <Chevron />
                  </Link>
                ))}
              </Card>
            </>
          )}
        </>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <PrimaryButton href="/vendas/nova">
          <Plus className="size-5" /> Nova venda
        </PrimaryButton>
        <SecondaryButton href="/clientes/novo">
          <UserPlus className="size-5" /> Novo cliente
        </SecondaryButton>
      </div>
    </>
  );
}
