"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GrupoAno, GrupoMes, Venda } from "@/lib/vendas";
import { MONTHS, brl, dayLabel, plural } from "@/lib/format";
import { Badge, Chevron, Money, cn } from "@/components/ui";

const ease = [0.32, 0.72, 0, 1] as const;

function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.38, ease }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const statusBadge: Record<Venda["statusComissao"], { label: string; tone: "positive" | "pending" | "negative" }> = {
  recebida: { label: "Recebida", tone: "positive" },
  a_receber: { label: "A receber", tone: "pending" },
  atrasada: { label: "Atrasada", tone: "negative" },
};

/** Uma venda (cliente, comissão, data, imóvel, status). Abre o detalhe da venda. */
export function LinhaVenda({ venda, mostrarCliente = true }: { venda: Venda; mostrarCliente?: boolean }) {
  const s = statusBadge[venda.statusComissao];
  return (
    <Link
      href={`/vendas/${venda.id}`}
      className="block w-full rounded-[18px] bg-surface px-4 py-3.5 text-left transition active:scale-[0.99] active:bg-surface-3 md:px-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[16px] font-semibold">{mostrarCliente ? venda.cliente : venda.empreendimento}</span>
        <Money cents={venda.comissao} signed className="text-[16px] font-semibold" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[13px] text-label-2">
          {mostrarCliente ? `${dayLabel(venda.data)}, ${venda.empreendimento}` : `${dayLabel(venda.data)} de ${venda.data.slice(0, 4)}, ${venda.tipo}`}
        </span>
        <Badge tone={s.tone}>{s.label}</Badge>
      </div>
      <div className="mt-0.5 text-[13px] text-label-2">Venda de {brl(venda.valorVenda)}</div>
    </Link>
  );
}

function LinhaMes({ ano, grupo, atual }: { ano: number; grupo: GrupoMes; atual: boolean }) {
  const [open, setOpen] = useState(atual);
  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${MONTHS[grupo.mes - 1]} de ${ano}`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 py-4 pr-3 pl-4 text-left md:pr-4 md:pl-5"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] font-medium">{MONTHS[grupo.mes - 1]}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[13px] text-label-2">
            {plural(grupo.vendas.length, "venda", "vendas")}
            {atual && <Badge>Atual</Badge>}
          </div>
        </div>
        <Money cents={grupo.comissao} signed whole className="text-[17px] font-semibold" />
        <Chevron open={open} />
      </button>
      <Collapse open={open}>
        <div className="mx-1.5 mb-1.5 flex flex-col gap-1.5 rounded-[18px] bg-surface-2 p-1.5 md:mx-2 md:mb-2 md:gap-2 md:p-2">
          {grupo.vendas.map((venda) => (
            <LinhaVenda key={venda.id} venda={venda} />
          ))}
        </div>
      </Collapse>
    </div>
  );
}

export function VendasPorAno({ anos, hoje }: { anos: GrupoAno[]; hoje: string }) {
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);
  const [aberto, setAberto] = useState<number | null>(anoHoje);

  return (
    <div className="flex flex-col gap-3">
      {anos.map((g) => {
        const open = aberto === g.ano;
        return (
          <div key={g.ano} className={cn("rounded-[26px] border border-white/[0.06] bg-surface transition-colors", open && "bg-surface/80")}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setAberto(open ? null : g.ano)}
              className="flex w-full items-center gap-2 py-5 pr-4 pl-5 text-left md:px-6"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[20px] font-semibold tracking-[-0.01em]">{g.ano}</div>
                <div className="text-[13px] text-label-2">{plural(g.qtd, "venda", "vendas")}</div>
              </div>
              <Money cents={g.comissao} signed whole className="text-[19px] font-semibold" />
              <Chevron open={open} direction="right" />
            </button>
            <Collapse open={open}>
              <div className="mx-2 mb-2 flex flex-col gap-2 rounded-[22px] bg-surface-2/70 p-1.5 md:mx-3 md:mb-3 md:p-2.5">
                {g.meses.map((m) => (
                  <LinhaMes key={m.mes} ano={g.ano} grupo={m} atual={g.ano === anoHoje && m.mes === mesHoje} />
                ))}
              </div>
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}
