"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { FolderOpen, Search, X } from "lucide-react";
import { Badge, Card, Chevron } from "@/components/ui";
import type { ClienteLista } from "@/lib/dal";
import { iniciais, plural } from "@/lib/format";

/** Sem acento e minúsculo, para a busca achar "José" digitando "jose". */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListaClientes({ clientes }: { clientes: ClienteLista[] }) {
  const [busca, setBusca] = useState("");
  const termo = useDeferredValue(busca.trim());

  const t = normalizar(termo);
  const digitos = termo.replace(/\D/g, "");
  const filtrados = termo
    ? clientes.filter(
        (c) =>
          normalizar(c.nome).includes(t) ||
          (digitos.length >= 3 && (c.cpf?.includes(digitos) || c.telefone?.replace(/\D/g, "").includes(digitos))),
      )
    : clientes;

  return (
    <>
      <label className="mb-4 flex h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-label-2">
        <Search className="size-[18px] shrink-0" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone"
          className="min-w-0 flex-1 bg-transparent text-[17px] text-label outline-none placeholder:text-label-3 [&::-webkit-search-cancel-button]:hidden"
        />
        {busca && (
          <button type="button" aria-label="Limpar busca" onClick={() => setBusca("")} className="grid size-5 place-items-center rounded-full bg-label-3 text-surface">
            <X className="size-3.5" strokeWidth={3} />
          </button>
        )}
      </label>

      {filtrados.length === 0 ? (
        <Card className="px-5 py-6 text-center text-[15px] text-label-2">Nenhum cliente encontrado para “{termo}”.</Card>
      ) : (
        <Card className="divide-y divide-separator overflow-hidden">
          {filtrados.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-3 md:px-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-3 text-[15px] font-semibold">{iniciais(c.nome)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-medium">{c.nome}</div>
                <div className="flex items-center gap-1.5 text-[13px] text-label-2">
                  <FolderOpen className="size-3.5" />
                  {plural(c.documentos, "documento", "documentos")}, {plural(c.vendas, "venda", "vendas")}
                </div>
              </div>
              {c.pendentes > 0 && <Badge tone="pending">Doc. novo</Badge>}
              <Chevron />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
