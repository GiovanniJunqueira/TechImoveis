import { Plus } from "lucide-react";
import { VendasPorAno } from "@/components/vendas-por-ano";
import { EstadoVazio } from "@/components/estado-vazio";
import { Card, Money, PageHeader, PrimaryButton, SENSIVEL, heroNumber } from "@/components/ui";
import { OcultarValores } from "@/components/ocultar-valores";
import { listarVendas } from "@/lib/dal";
import { agruparPorAno, hojeISO } from "@/lib/vendas";
import { brlInt, plural } from "@/lib/format";

export default async function VendasPage() {
  const vendas = await listarVendas();
  const anos = agruparPorAno(vendas);
  const total = anos.reduce((s, a) => s + a.comissao, 0);
  const vgv = anos.reduce((s, a) => s + a.vgv, 0);

  return (
    <>
      <PageHeader title="Vendas" subtitle="Suas comissões, por ano, mês e cliente." action={<OcultarValores />} />

      {vendas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma venda ainda" texto="Cadastre sua primeira venda para acompanhar comissões por ano, mês e cliente." />
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

      <PrimaryButton href="/vendas/nova" className="mt-6">
        <Plus className="size-5" /> Nova venda
      </PrimaryButton>
    </>
  );
}
