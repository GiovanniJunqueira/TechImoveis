"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { EstadoForm } from "@/app/(auth)/actions";
import { cn } from "@/components/ui";

/**
 * Botão de exclusão em dois toques: o primeiro pede confirmação, o segundo exclui.
 * Evita diálogo nativo (feio no celular) e exclusão acidental.
 */
export function BotaoExcluir({
  acao,
  rotulo,
  confirmacao,
  className,
}: {
  acao: () => Promise<EstadoForm | void>;
  rotulo: string;
  confirmacao: string;
  className?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {confirmando && <p className="px-1 text-center text-[13px] text-label-2">{confirmacao}</p>}
      <div className="flex gap-2">
        {confirmando && (
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="h-[50px] flex-1 rounded-full bg-surface-2 text-[17px] font-semibold transition active:scale-[0.98]"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          disabled={pendente}
          onClick={() => {
            if (!confirmando) return setConfirmando(true);
            iniciar(async () => {
              const r = await acao();
              if (r?.erro) {
                setErro(r.erro);
                setConfirmando(false);
              }
            });
          }}
          className={cn(
            "flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-60",
            confirmando ? "bg-negative text-white" : "bg-surface text-negative",
          )}
        >
          <Trash2 className="size-[18px]" />
          {pendente ? "Excluindo…" : confirmando ? "Confirmar" : rotulo}
        </button>
      </div>
      {erro && <p className="text-center text-[13px] text-negative">{erro}</p>}
    </div>
  );
}

/** Lixeira compacta: o primeiro toque vira "Excluir?" em vermelho por 3 s; o segundo exclui. */
export function LixeiraConfirmar({ rotulo, aoConfirmar, pendente }: { rotulo: string; aoConfirmar: () => void; pendente?: boolean }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 3000);
    return () => clearTimeout(t);
  }, [armado]);

  return (
    <button
      type="button"
      aria-label={armado ? `Confirmar: ${rotulo}` : rotulo}
      disabled={pendente}
      onClick={() => {
        if (!armado) return setArmado(true);
        setArmado(false);
        aoConfirmar();
      }}
      className={cn(
        "flex h-9 shrink-0 items-center justify-center rounded-full transition active:scale-[0.96] disabled:opacity-50",
        armado ? "bg-negative px-3 text-[14px] font-semibold text-white" : "w-9 bg-transparent text-label-3 hover:text-negative",
      )}
    >
      {armado ? "Excluir?" : <Trash2 className="size-[18px]" />}
    </button>
  );
}
