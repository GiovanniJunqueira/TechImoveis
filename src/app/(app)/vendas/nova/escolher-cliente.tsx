"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, UserPlus, Users, X } from "lucide-react";
import { Field, FieldGroup } from "@/components/form";
import { Chevron } from "@/components/ui";

type Cliente = { id: string; nome: string };

const linha = "flex w-full items-center gap-3 px-4 py-3.5 text-left text-[17px] transition active:bg-surface-2";

/**
 * Escolha do cliente sem a lista enorme na tela: dois botões ("já cadastrado" / "novo").
 * A lista, com busca, só abre quando o corretor pede.
 */
export function EscolherCliente({ clientes, valor, aoMudar }: { clientes: Cliente[]; valor: string; aoMudar: (v: string) => void }) {
  const [lista, setLista] = useState(false);
  const [busca, setBusca] = useState("");
  const escolhido = clientes.find((c) => c.id === valor);

  const termo = busca.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const filtrados = termo
    ? clientes.filter((c) => c.nome.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(termo))
    : clientes;

  const escolher = (v: string) => {
    aoMudar(v);
    setLista(false);
    setBusca("");
  };

  return (
    <>
      <input type="hidden" name="cliente_id" value={valor} />

      {escolhido ? (
        <FieldGroup>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-label-2">Cliente</div>
              <div className="truncate text-[17px]">{escolhido.nome}</div>
            </div>
            <button type="button" onClick={() => escolher("")} className="shrink-0 text-[15px] font-medium text-accent">
              Trocar
            </button>
          </div>
        </FieldGroup>
      ) : valor === "novo" ? (
        <>
          <FieldGroup>
            <div className="flex items-end">
              <div className="flex-1">
                <Field label="Nome do novo cliente" name="cliente_nome" required autoFocus autoComplete="off" />
              </div>
              {clientes.length > 0 && (
                <button type="button" aria-label="Cancelar novo cliente" onClick={() => escolher("")} className="mr-3 mb-2.5 rounded-full p-1.5 text-label-2">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </FieldGroup>
          <Link href="/clientes/novo?voltar=/vendas/nova" className="mt-2 flex items-center gap-1.5 px-4 text-[15px] text-accent">
            <UserPlus className="size-4" /> Cadastro completo (CPF, telefone…)
          </Link>
        </>
      ) : (
        <FieldGroup>
          {clientes.length > 0 && (
            <button type="button" onClick={() => setLista((a) => !a)} className={linha} aria-expanded={lista}>
              <Users className="size-5 text-accent" />
              <span className="flex-1">Cliente já cadastrado</span>
              <Chevron open={lista} direction="down" />
            </button>
          )}
          {lista && (
            <div>
              <label className="flex items-center gap-2 px-4 py-2.5">
                <Search className="size-4 shrink-0 text-label-3" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pelo nome"
                  autoFocus
                  autoComplete="off"
                  className="w-full bg-transparent text-[17px] outline-none placeholder:text-label-3"
                />
              </label>
              <div className="max-h-[50vh] divide-y divide-separator overflow-y-auto border-t border-separator">
                {filtrados.map((c) => (
                  <button key={c.id} type="button" onClick={() => escolher(c.id)} className={linha}>
                    <span className="truncate">{c.nome}</span>
                  </button>
                ))}
                {filtrados.length === 0 && <div className="px-4 py-3.5 text-[15px] text-label-2">Nenhum cliente com esse nome.</div>}
              </div>
            </div>
          )}
          <button type="button" onClick={() => escolher("novo")} className={linha}>
            <UserPlus className="size-5 text-accent" />
            <span className="flex-1">Novo cliente</span>
          </button>
        </FieldGroup>
      )}
    </>
  );
}
