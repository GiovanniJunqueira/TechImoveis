import Link from "next/link";
import { EntrarForm } from "./entrar-form";

export const metadata = { title: "Entrar · Tech Imóveis" };

export default async function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-[34px] leading-tight font-bold tracking-[-0.02em]">Entrar</h1>
      <p className="mt-2 mb-8 text-[17px] text-label-2">Suas vendas e comissões, num só lugar.</p>
      <EntrarForm next={typeof next === "string" ? next : "/"} />
      <p className="mt-8 text-center text-[15px] text-label-2">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-accent">
          Criar conta
        </Link>
      </p>
    </>
  );
}
