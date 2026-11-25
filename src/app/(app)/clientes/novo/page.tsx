import { PageHeader, VoltarLink } from "@/components/ui";
import { ClienteForm } from "./cliente-form";

export default async function NovoClientePage({ searchParams }: PageProps<"/clientes/novo">) {
  const { voltar } = await searchParams;
  const destino = typeof voltar === "string" && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href={destino ?? "/clientes"}>{destino ? "Voltar" : "Clientes"}</VoltarLink>
      <PageHeader title="Novo cliente" subtitle="Só o nome é obrigatório. O resto dá para completar depois." />
      <ClienteForm voltar={destino} />
    </div>
  );
}
