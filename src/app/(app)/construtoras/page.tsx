import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { Card, Chevron, PageHeader, PrimaryButton, VoltarLink } from "@/components/ui";
import { listarConstrutoras } from "@/lib/construtoras";
import { plural } from "@/lib/format";
import { mascaraCnpj } from "./resumo";

export const metadata: Metadata = { title: "Construtoras · Tech Imóveis" };

export default async function ConstrutorasPage() {
  const construtoras = await listarConstrutoras();

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/ajustes">Ajustes</VoltarLink>
      <PageHeader title="Construtoras" subtitle="Cadastre como cada construtora parcela a entrada e o que vai para o banco." />

      {construtoras.length === 0 ? (
        <Card className="px-6 py-8 text-center">
          <div className="text-[20px] font-semibold">Nenhuma construtora ainda</div>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-label-2">
            Cadastre as construtoras com que você trabalha e os planos de pagamento de cada uma, para montar propostas em segundos.
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-separator overflow-hidden">
          {construtoras.map((c) => (
            <Link key={c.id} href={`/construtoras/${c.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-3 md:px-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-label-2">
                <Building2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-medium">{c.nome}</div>
                <div className="truncate text-[13px] text-label-2">
                  {c.modelos > 0 ? plural(c.modelos, "plano de pagamento", "planos de pagamento") : "Nenhum plano de pagamento"}
                  {c.cnpj && ` · ${mascaraCnpj(c.cnpj)}`}
                </div>
              </div>
              <Chevron />
            </Link>
          ))}
        </Card>
      )}

      <PrimaryButton href="/construtoras/nova" className="mt-6">
        <Plus className="size-5" /> Nova construtora
      </PrimaryButton>
    </div>
  );
}
