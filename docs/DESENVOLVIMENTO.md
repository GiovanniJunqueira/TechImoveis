# Desenvolvimento local

Pré-requisitos: Node 22+, Docker Desktop rodando.

```bash
npm install
npm run db:start      # sobe o Supabase local (Postgres + Auth + Storage) no Docker
cp .env.example .env.local   # preencha a publishable key mostrada pelo comando acima
npm run dev           # http://localhost:3000
```

Comandos úteis:

| Comando | O que faz |
|---|---|
| `npm run db:start` | Sobe o Supabase local (sem Studio e serviços que não usamos) |
| `npx supabase stop` | Desliga o Supabase local |
| `npm run db:reset` | Apaga o banco local e reaplica todas as migrações |
| `npm run db:types` | Regera `src/lib/supabase/database.types.ts` depois de mudar o banco |
| `npx supabase migration new <nome>` | Cria uma migração nova em `supabase/migrations` |

E-mails do Auth local (confirmação, recuperação de senha) aparecem no Mailpit: http://127.0.0.1:54324

## Conta de teste (só no banco local)

- E-mail: `corretor.teste@example.com`
- Senha: `TesteLocal#2026`

Some quando você roda `npm run db:reset`; é só criar de novo em `/cadastro` e clicar em "Ver com dados de exemplo".

## Problemas conhecidos

- Depois de mudar um arquivo de Server Actions (`*-actions.ts`) ou acrescentar exportações em componentes de cliente, o `npm run dev` às vezes dá erro 500 ("Element type is invalid" ou "Cannot read properties of undefined (reading 'bind')"). É cache do modo de desenvolvimento: pare e rode `npm run dev` de novo.
