import type { Metadata } from "next";
import { obterResumoVenda } from "@/lib/dal";
import { ResumoPlano, resumoWhatsApp } from "@/components/resumo-plano";
import { AcoesResumo } from "./acoes";

export async function generateMetadata({ params }: PageProps<"/vendas/[id]/resumo">): Promise<Metadata> {
  const { id } = await params;
  const d = await obterResumoVenda(id);
  return { title: `Proposta · ${d.cliente ?? ""} · ${d.empresa}` };
}

/** Resumo da proposta para o cliente. Sem comissão e sem recebimentos (obterResumoVenda nem busca). */
export default async function ResumoPage({ params }: PageProps<"/vendas/[id]/resumo">) {
  const { id } = await params;
  const dados = await obterResumoVenda(id);
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-12 sm:pt-8 print:max-w-none print:p-0">
      <AcoesResumo vendaId={dados.id} texto={resumoWhatsApp(dados)} />
      <ResumoPlano dados={dados} />
    </main>
  );
}
