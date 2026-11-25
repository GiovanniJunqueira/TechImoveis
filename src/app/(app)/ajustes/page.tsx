import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, Chevron, PageHeader, SectionTitle } from "@/components/ui";
import { getContexto } from "@/lib/dal";
import { SeletorCor } from "./seletor-cor";
import { PerfilForm } from "./perfil-form";
import { sair } from "@/app/(auth)/actions";

export default async function AjustesPage() {
  const { perfil, tenant, email, papel } = await getContexto();

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Seus dados e como o sistema aparece para você e seus clientes." />

      <SectionTitle>Seu perfil</SectionTitle>
      <PerfilForm perfil={perfil} email={email} />

      <SectionTitle>Cor de destaque</SectionTitle>
      <SeletorCor inicial={tenant.cor_destaque} podeEditar={papel === "dono"} />
      <p className="mt-2 px-1 text-[13px] text-label-2">
        Essa cor aparece nos botões, na navegação e no portal que seus clientes acessam.
      </p>

      <SectionTitle>Cadastros</SectionTitle>
      <Card className="overflow-hidden">
        <Link href="/construtoras" className="flex w-full items-center gap-3 px-4 py-3 transition active:bg-surface-3 md:px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-3 text-accent">
            <Building2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1 text-[17px]">Construtoras e planos de pagamento</span>
          <Chevron />
        </Link>
      </Card>

      <form action={sair} className="mt-10">
        <button
          type="submit"
          className="flex h-[54px] w-full items-center justify-center rounded-full bg-surface text-[17px] font-semibold text-negative transition active:scale-[0.98] active:bg-surface-2"
        >
          Sair da conta
        </button>
      </form>
    </>
  );
}
