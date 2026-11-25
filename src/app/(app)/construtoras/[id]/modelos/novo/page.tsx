import type { Metadata } from "next";
import { PageHeader, VoltarLink } from "@/components/ui";
import { obterConstrutora } from "@/lib/construtoras";
import { ModeloEditor } from "../modelo-editor";

export const metadata: Metadata = { title: "Novo plano de pagamento · Tech Imóveis" };

export default async function NovoModeloPage({ params }: PageProps<"/construtoras/[id]/modelos/novo">) {
  const { id } = await params;
  const c = await obterConstrutora(id);

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={`/construtoras/${c.id}`}>{c.nome}</VoltarLink>
      <PageHeader
        title="Novo plano"
        subtitle={`Como a ${c.nome} divide a entrada e o que fica para o banco. Deixe em aberto o que muda a cada proposta.`}
      />
      <ModeloEditor construtoraId={c.id} />
    </div>
  );
}
