import { UserPlus } from "lucide-react";
import { PageHeader, PrimaryButton } from "@/components/ui";
import { EstadoVazio } from "@/components/estado-vazio";
import { listarClientes } from "@/lib/dal";
import { plural } from "@/lib/format";
import { ListaClientes } from "./lista-clientes";

export default async function ClientesPage() {
  const clientes = await listarClientes();

  return (
    <>
      <PageHeader title="Clientes" subtitle={plural(clientes.length, "cliente", "clientes")} />

      {clientes.length === 0 ? (
        <EstadoVazio titulo="Nenhum cliente ainda" texto="Cadastre seus clientes para guardar documentos e acompanhar cada venda." />
      ) : (
        <ListaClientes clientes={clientes} />
      )}

      <PrimaryButton href="/clientes/novo" className="mt-6">
        <UserPlus className="size-5" /> Novo cliente
      </PrimaryButton>
    </>
  );
}
