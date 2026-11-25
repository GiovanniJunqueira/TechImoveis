import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tech Imóveis",
  description: "Gestão de vendas, clientes e comissões para corretores de imóveis.",
  appleWebApp: { capable: true, title: "Tech Imóveis", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // "Ocultar valores" já vem aplicado do servidor, para os valores nunca aparecerem ao abrir o app.
  const ocultar = (await cookies()).get("ocultar_valores")?.value === "1";
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full${ocultar ? " valores-ocultos" : ""}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
