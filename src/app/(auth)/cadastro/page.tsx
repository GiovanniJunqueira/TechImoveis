import Link from "next/link";
import { CadastroForm } from "./cadastro-form";

export const metadata = { title: "Criar conta · Tech Imóveis" };

export default function CadastroPage() {
  return (
    <>
      <h1 className="text-[34px] leading-tight font-bold tracking-[-0.02em]">Criar conta</h1>
      <p className="mt-2 mb-8 text-[17px] text-label-2">Comece a organizar suas vendas em menos de um minuto.</p>
      <CadastroForm />
      <p className="mt-8 text-center text-[15px] text-label-2">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-accent">
          Entrar
        </Link>
      </p>
    </>
  );
}
