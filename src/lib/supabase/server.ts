import type { Database } from "@/lib/supabase/database.types";
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente do Supabase para Server Components, Server Actions e Route Handlers. Crie um por requisição. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: não dá para gravar cookies aqui.
            // O proxy já renova a sessão a cada requisição.
          }
        },
      },
    },
  );
}
