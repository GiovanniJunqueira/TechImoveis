import { PageHeader, VoltarLink } from "@/components/ui";
import { opcoesVenda } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { VendaForm } from "./venda-form";

export default async function NovaVendaPage({ searchParams }: PageProps<"/vendas/nova">) {
  const [{ cliente }, opcoes] = await Promise.all([searchParams, opcoesVenda()]);
  const clienteInicial = typeof cliente === "string" && opcoes.clientes.some((c) => c.id === cliente) ? cliente : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href="/vendas">Vendas</VoltarLink>
      <PageHeader title="Nova venda" />
      <VendaForm opcoes={opcoes} clienteInicial={clienteInicial} hoje={hojeISO()} />
    </div>
  );
}
