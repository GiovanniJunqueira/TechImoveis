import { ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReactNode } from "react";
import { brl, brlInt } from "@/lib/format";

export const cn = (...xs: Parameters<typeof clsx>) => twMerge(clsx(xs));

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="pt-6 pb-7 md:pt-12">
      <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.02em] md:text-[40px]">{title}</h1>
      {subtitle && <div className="mt-2 text-[17px] text-label-2">{subtitle}</div>}
      {children}
    </header>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-[26px] border border-white/[0.06] bg-surface", className)}>{children}</div>;
}

/** Valor monetário com sinal e cor (verde positivo, vermelho negativo). */
export function Money({ cents, signed = false, whole = false, className }: { cents: number; signed?: boolean; whole?: boolean; className?: string }) {
  const tone = !signed ? "" : cents < 0 ? "text-negative" : "text-positive";
  const sign = signed && cents > 0 ? "+" : "";
  return <span className={cn("whitespace-nowrap tabular-nums", tone, className)}>{sign}{whole ? brlInt(cents) : brl(cents)}</span>;
}

/** Número de destaque que se ajusta à largura da tela. */
export const heroNumber = "block text-[clamp(34px,11vw,52px)] leading-none font-bold tracking-[-0.03em]";

export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "positive" | "negative" | "pending" | "neutral" }) {
  const tones = {
    accent: "bg-accent/20 text-accent",
    positive: "bg-positive/15 text-positive",
    negative: "bg-negative/15 text-negative",
    pending: "bg-pending/15 text-pending",
    neutral: "bg-white/10 text-label-2",
  };
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[13px] font-medium", tones[tone])}>{children}</span>;
}

export function Chevron({ open, direction = "right" }: { open?: boolean; direction?: "right" | "down" }) {
  return (
    <ChevronRight
      aria-hidden
      className={cn(
        "size-5 shrink-0 text-label-3 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)]",
        direction === "down" && "rotate-90",
        open && "rotate-90",
      )}
    />
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-9 mb-3 flex items-baseline justify-between px-1">
      <h2 className="text-[22px] font-bold tracking-[-0.01em]">{children}</h2>
      {action}
    </div>
  );
}

export function PrimaryButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-accent text-[17px] font-semibold text-white transition active:scale-[0.98] active:opacity-80",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-surface-2 text-[17px] font-semibold transition active:scale-[0.98] active:bg-surface-3",
        className,
      )}
    >
      {children}
    </button>
  );
}
