export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-accent opacity-20 blur-[120px]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[13px] bg-accent text-[17px] font-bold text-white">TI</span>
          <span className="text-[20px] font-semibold tracking-[-0.01em]">Tech Imóveis</span>
        </div>
        {children}
      </div>
    </div>
  );
}
