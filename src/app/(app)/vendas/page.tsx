import Link from "next/link";
import { Plus } from "lucide-react";
import { LinhaProposta, VendasPorAno } from "@/components/vendas-por-ano";
import { EstadoVazio } from "@/components/estado-vazio";
import { Card, Money, PageHeader, PrimaryButton, SENSIVEL, SectionTitle, heroNumber } from "@/components/ui";
import { OcultarValores } from "@/components/ocultar-valores";
import { listarPropostas, listarVendas } from "@/lib/dal";
import { agruparPorAno, hojeISO } from "@/lib/vendas";
import { brlInt, plural } from "@/lib/format";

export default async function VendasPage() {
  const [vendas, propostas] = await Promise.all([listarVendas(), listarPropostas()]);
  const anos = agruparPorAno(vendas);
  const total = anos.reduce((s, a) => s + a.comissao, 0);
  const vgv = anos.reduce((s, a) => s + a.vgv, 0);

  return (
    <>
      <PageHeader title="Vendas" subtitle="Suas comissões, por ano, mês e cliente." action={<OcultarValores />} />

      <PrimaryButton href="/vendas/nova" className="mb-6">
        <Plus className="size-5" /> Nova proposta
      </PrimaryButton>

      {propostas.length > 0 && (
        <>
          <SectionTitle>{propostas.length === 1 ? "Proposta em andamento" : "Propostas em andamento"}</SectionTitle>
          <div className="mb-8 flex flex-col gap-2">
            {propostas.map((p) => (
              <LinhaProposta key={p.id} proposta={p} />
            ))}
          </div>
        </>
      )}

      {vendas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma venda fechada ainda" texto="Faça a proposta com o cliente e, quando ele fechar, toque em Fechar venda para registrar a sua comissão." />
      ) : (
        <>
          <Card className="mb-3 px-6 py-6">
            <div className="text-[15px] text-label-2">Comissão total</div>
            <Money cents={total} signed whole className={`mt-2 ${heroNumber}`} />
            <div className="mt-3 text-[15px] text-label-2">
              {plural(vendas.length, "venda", "vendas")}, <span className={SENSIVEL}>{brlInt(vgv)}</span> vendidos
            </div>
          </Card>
          <VendasPorAno anos={anos} hoje={hojeISO()} />
        </>
      )}

      <Link href="/vendas/nova?status=fechada" className="mt-6 block py-2 text-center text-[15px] text-accent">
        Registrar uma venda já fechada
      </Link>
    </>
  );
}
