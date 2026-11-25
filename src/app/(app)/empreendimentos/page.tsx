import Link from "next/link";
import type { Metadata } from "next";
import { Building, Plus, X } from "lucide-react";
import { Card, Chevron, PageHeader, PrimaryButton, VoltarLink } from "@/components/ui";
import { listarEmpreendimentos, mesEntrega, type EmpreendimentoLista } from "@/lib/empreendimentos";
import { listarConstrutoras } from "@/lib/construtoras";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Empreendimentos · Tech Imóveis" };

const ehUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function LinhaEmpreendimento({ e }: { e: EmpreendimentoLista }) {
  const detalhes = [e.cidade, e.previsaoEntrega && `Entrega ${mesEntrega(e.previsaoEntrega)}`, e.vendas > 0 && plural(e.vendas, "venda", "vendas")].filter(Boolean);
  return (
    <Link href={`/empreendimentos/${e.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-3 md:px-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-label-2">
        <Building className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-medium">{e.nome}</div>
        <div className="truncate text-[13px] text-label-2">{detalhes.length > 0 ? detalhes.join(" · ") : "Sem detalhes"}</div>
      </div>
      <Chevron />
    </Link>
  );
}

export default async function EmpreendimentosPage({ searchParams }: PageProps<"/empreendimentos">) {
  const { construtora: param } = await searchParams;
  const filtro = typeof param === "string" && ehUuid(param) ? param : undefined;
  const [empreendimentos, construtoras] = await Promise.all([listarEmpreendimentos(filtro), listarConstrutoras()]);
  const construtoraFiltro = filtro ? construtoras.find((c) => c.id === filtro) : undefined;

  // Agrupa por construtora (na ordem alfabética); os sem construtora vão por último.
  const grupos = new Map<string, { titulo: string; itens: EmpreendimentoLista[] }>();
  for (const e of empreendimentos) {
    const chave = e.construtora?.id ?? "";
    if (!grupos.has(chave)) grupos.set(chave, { titulo: e.construtora?.nome ?? "Sem construtora", itens: [] });
    grupos.get(chave)!.itens.push(e);
  }
  const ordenados = [...grupos.entries()].sort(([a, ga], [b, gb]) => (a === "" ? 1 : b === "" ? -1 : ga.titulo.localeCompare(gb.titulo, "pt-BR")));

  return (
    <div className="mx-auto max-w-2xl">
      <VoltarLink href="/ajustes">Ajustes</VoltarLink>
      <PageHeader title="Empreendimentos" subtitle="Os lançamentos que você vende, com a construtora e a previsão de entrega." />

      {filtro && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-[15px]">
          <span className="min-w-0 truncate">
            <span className="text-label-2">Construtora: </span>
            {construtoraFiltro?.nome ?? "não encontrada"}
          </span>
          <Link href="/empreendimentos" className="flex shrink-0 items-center gap-1 text-accent">
            <X className="size-4" /> Ver todos
          </Link>
        </div>
      )}

      {empreendimentos.length === 0 ? (
        <Card className="px-6 py-8 text-center">
          <div className="text-[20px] font-semibold">{filtro ? "Nenhum empreendimento desta construtora" : "Nenhum empreendimento ainda"}</div>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-label-2">
            Cadastre os lançamentos com que você trabalha. Eles também são criados sozinhos quando você registra uma venda de lançamento.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {ordenados.map(([chave, g]) => (
            <section key={chave || "sem"}>
              {!filtro && <div className="mb-1.5 px-4 text-[13px] text-label-2 uppercase">{g.titulo}</div>}
              <Card className="divide-y divide-separator overflow-hidden">
                {g.itens.map((e) => (
                  <LinhaEmpreendimento key={e.id} e={e} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}

      <PrimaryButton href={filtro && construtoraFiltro ? `/empreendimentos/nova?construtora=${filtro}` : "/empreendimentos/nova"} className="mt-6">
        <Plus className="size-5" /> Novo empreendimento
      </PrimaryButton>
    </div>
  );
}
