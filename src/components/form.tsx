"use client";

import { startTransition } from "react";
import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/components/ui";

/** Grupo de campos no estilo de lista agrupada do iOS. */
export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-separator overflow-hidden rounded-[18px] border border-white/[0.06] bg-surface">{children}</div>;
}

export function Field({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col px-4 pt-2.5 pb-2">
      <span className="text-[12px] text-label-2">{label}</span>
      <input
        {...props}
        className={cn("bg-transparent py-0.5 text-[17px] text-label outline-none placeholder:text-label-3", className)}
      />
    </label>
  );
}

/**
 * Formulário que chama a action sem o reset automático do React 19:
 * se o servidor devolver um erro, o que a pessoa digitou continua na tela.
 */
export function FormSemReset({ acao, className, children }: { acao: (form: FormData) => void; className?: string; children: ReactNode }) {
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
    >
      {children}
    </form>
  );
}

export function SubmitButton({ children, pendingLabel, pending: pendente }: { children: ReactNode; pendingLabel: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendente ?? status.pending;
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[54px] w-full items-center justify-center rounded-full bg-accent text-[17px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormMessage({ erro, aviso }: { erro?: string; aviso?: string }) {
  if (!erro && !aviso) return null;
  return (
    <p
      role={erro ? "alert" : "status"}
      className={cn("rounded-2xl px-4 py-3 text-[15px]", erro ? "bg-negative/15 text-negative" : "bg-positive/15 text-positive")}
    >
      {erro ?? aviso}
    </p>
  );
}

type Opcao = { value: string; label: string };

export function SelectField({
  label,
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: Opcao[] }) {
  return (
    <label className="flex flex-col px-4 pt-2.5 pb-2">
      <span className="text-[12px] text-label-2">{label}</span>
      <select
        {...props}
        className={cn("appearance-none bg-transparent py-0.5 text-[17px] text-label outline-none [&>option]:bg-surface", className)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextAreaField({ label, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="flex flex-col px-4 pt-2.5 pb-2">
      <span className="text-[12px] text-label-2">{label}</span>
      <textarea
        rows={3}
        {...props}
        className={cn("resize-none bg-transparent py-0.5 text-[17px] text-label outline-none placeholder:text-label-3", className)}
      />
    </label>
  );
}

const centavosFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Campo de dinheiro estilo caixa eletrônico: os dígitos entram pela direita (1 → 0,01 → 0,12 → 1,23).
 * Envia o valor em centavos no campo `name`.
 */
export function MoneyField({
  label,
  name,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (cents: number) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col px-4 pt-2.5 pb-2">
      <span className="text-[12px] text-label-2">{label}</span>
      <div className="flex items-baseline gap-1.5 py-0.5 text-[17px]">
        <span className="text-label-2">R$</span>
        <input
          inputMode="numeric"
          required={required}
          value={value ? centavosFmt.format(value / 100) : ""}
          placeholder="0,00"
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, "").slice(0, 13);
            onChange(digitos ? Number(digitos) : 0);
          }}
          className="min-w-0 flex-1 bg-transparent text-label tabular-nums outline-none placeholder:text-label-3"
        />
      </div>
      <input type="hidden" name={name} value={value} />
    </label>
  );
}

/** Controle segmentado do iOS (radio). */
export function Segmented({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Opcao[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" className="flex rounded-[10px] bg-surface-2 p-0.5">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex-1 cursor-pointer rounded-[8px] py-1.5 text-center text-[14px] font-medium transition",
            value === o.value ? "bg-surface-3 text-label shadow" : "text-label-2",
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/** Interruptor do iOS. */
export function Toggle({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between px-4 py-3 text-[17px]">
      {label}
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-surface-3 transition peer-checked:bg-positive peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-[2px] after:left-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

/** Título pequeno acima de um grupo de campos. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <div className="mt-4 mb-1.5 px-4 text-[13px] text-label-2 uppercase">{children}</div>;
}
