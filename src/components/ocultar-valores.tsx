"use client";

import { useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/components/ui";

const CLASSE = "valores-ocultos";
const COOKIE = "ocultar_valores";

// O <html> chega do servidor já com a classe (cookie lido no layout raiz).
// A classe é a fonte da verdade; vários botões na tela ficam em sincronia.
function assinar(aviso: () => void) {
  const obs = new MutationObserver(aviso);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const lerCliente = () => document.documentElement.classList.contains(CLASSE);

/** Botão de olho que esconde (borra) todos os valores em dinheiro. A escolha fica salva num cookie. */
export function OcultarValores({ className }: { className?: string }) {
  const oculto = useSyncExternalStore(assinar, lerCliente, () => false);

  function alternar() {
    const novo = !lerCliente();
    document.documentElement.classList.toggle(CLASSE, novo);
    document.cookie = novo
      ? `${COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`
      : `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }

  const rotulo = oculto ? "Mostrar valores" : "Ocultar valores";
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      aria-pressed={oculto}
      title={rotulo}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-label-2 transition active:scale-95 active:bg-surface-3",
        "[.valores-ocultos_&]:text-accent",
        className,
      )}
    >
      {/* Ícone escolhido por CSS pela classe do <html>, sem piscar na hidratação. */}
      <Eye aria-hidden className="size-[22px] [.valores-ocultos_&]:hidden" />
      <EyeOff aria-hidden className="hidden size-[22px] [.valores-ocultos_&]:block" />
    </button>
  );
}
