import { PageHeader, VoltarLink } from "@/components/ui";
import { obterCliente } from "@/lib/dal";
import { ClienteForm } from "../../novo/cliente-form";

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  const c = await obterCliente(id);

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={`/clientes/${c.id}`}>{c.nome.split(" ")[0]}</VoltarLink>
      <PageHeader title="Editar cliente" />
      <ClienteForm inicial={c} />
    </div>
  );
}
