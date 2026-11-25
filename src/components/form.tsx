"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode } from "react";
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

export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
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
