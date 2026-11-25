import { FolderOpen, Search, UserPlus } from "lucide-react";
import { Badge, Card, Chevron, PageHeader, PrimaryButton } from "@/components/ui";
import { EstadoVazio } from "@/components/estado-vazio";
import { listarClientes } from "@/lib/dal";
import { plural } from "@/lib/format";

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

export default async function ClientesPage() {
  const clientes = await listarClientes();

  return (
    <>
      <PageHeader title="Clientes" subtitle={plural(clientes.length, "cliente", "clientes")} />

      {clientes.length === 0 ? (
        <EstadoVazio titulo="Nenhum cliente ainda" texto="Cadastre seus clientes para guardar documentos e acompanhar cada venda." />
      ) : (
        <>
          <label className="mb-4 flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-label-2">
            <Search className="size-[18px]" />
            <input
              placeholder="Buscar por nome, CPF ou telefone"
              className="flex-1 bg-transparent text-[17px] text-label outline-none placeholder:text-label-3"
            />
          </label>

          <Card className="divide-y divide-separator overflow-hidden">
            {clientes.map((c) => (
              <button key={c.id} type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-3 md:px-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-[15px] font-semibold">
                  {iniciais(c.nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-medium">{c.nome}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-label-2">
                    <FolderOpen className="size-3.5" />
                    {plural(c.documentos, "documento", "documentos")}, {plural(c.vendas, "venda", "vendas")}
                  </div>
                </div>
                {c.pendentes > 0 && <Badge tone="pending">Doc. novo</Badge>}
                <Chevron />
              </button>
            ))}
          </Card>
        </>
      )}

      <PrimaryButton className="mt-6">
        <UserPlus className="size-5" /> Novo cliente
      </PrimaryButton>
    </>
  );
}
