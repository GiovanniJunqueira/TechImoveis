import { PageHeader, VoltarLink } from "@/components/ui";
import { opcoesVenda } from "@/lib/dal";
import { hojeISO } from "@/lib/vendas";
import { VendaForm } from "./venda-form";

export default async function NovaVendaPage({ searchParams }: PageProps<"/vendas/nova">) {
  const [{ cliente, status }, opcoes] = await Promise.all([searchParams, opcoesVenda()]);
  const fechada = status === "fechada";
  const clienteInicial = typeof cliente === "string" && opcoes.clientes.some((c) => c.id === cliente) ? cliente : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <VoltarLink href="/vendas">Vendas</VoltarLink>
      <PageHeader title={fechada ? "Venda fechada" : "Nova proposta"} subtitle={fechada ? undefined : "Só dados do imóvel e do cliente. A comissão você registra ao fechar a venda."} />
      <VendaForm opcoes={opcoes} clienteInicial={clienteInicial} hoje={hojeISO()} statusInicial={fechada ? "fechada" : "proposta"} />
    </div>
  );
}
