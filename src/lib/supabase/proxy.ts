import type { Database } from "@/lib/supabase/database.types";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rotas abertas (sem login). */
const PUBLICAS = ["/entrar", "/cadastro", "/auth", "/portal", "/api/portal"];

/** Renova a sessão do Supabase e redireciona quem não está logado. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Não coloque código entre a criação do cliente e getClaims(): é o que renova o token.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!logado && !publica) {
    return redirectKeepingCookies(request, response, "/entrar", path);
  }
  if (logado && (path === "/entrar" || path === "/cadastro")) {
    return redirectKeepingCookies(request, response, "/");
  }

  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
