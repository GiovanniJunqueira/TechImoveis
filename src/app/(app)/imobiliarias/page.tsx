import Link from "next/link";
import type { Metadata } from "next";
import { Handshake, Plus } from "lucide-react";
import { Card, Chevron, PageHeader, PrimaryButton, VoltarLink } from "@/components/ui";
import { listarImobiliarias } from "@/lib/imobiliarias";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Imobiliárias parceiras · Tech Imóveis" };

export default async function ImobiliariasPage() {
  const imobiliarias = await listarImobiliarias();

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/ajustes">Ajustes</VoltarLink>
      <PageHeader title="Imobiliárias parceiras" subtitle="Imobiliárias e corretoras com quem você divide vendas e comissões." />

      {imobiliarias.length === 0 ? (
        <Card className="px-6 py-8 text-center">
          <div className="text-[20px] font-semibold">Nenhuma imobiliária ainda</div>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-label-2">
            Cadastre as parceiras com o contato de quem atende. Elas também são criadas sozinhas quando você informa a imobiliária numa venda.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-separator overflow-hidden">
          {imobiliarias.map((i) => (
            <Link key={i.id} href={`/imobiliarias/${i.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-3 md:px-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-label-2">
                <Handshake className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-medium">{i.nome}</div>
                <div className="truncate text-[13px] text-label-2">
                  {i.vendas > 0 ? plural(i.vendas, "venda", "vendas") : "Nenhuma venda"}
                  {i.contato && ` · ${i.contato}`}
                </div>
              </div>
              <Chevron />
            </Link>
          ))}
        </Card>
      )}

      <PrimaryButton href="/imobiliarias/nova" className="mt-6">
        <Plus className="size-5" /> Nova imobiliária
      </PrimaryButton>
    </div>
  );
}
