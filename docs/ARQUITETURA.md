# Tech Imóveis — Arquitetura e Plano (v0.1)

> Nome provisório: **Tech Imóveis**. SaaS multitenant para o corretor autônomo gerir clientes, vendas, planos de pagamento e comissões, com portal do cliente.

## 1. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Público inicial | Corretor autônomo (1 tenant = 1 corretor). Imobiliária com vários corretores fica para depois, mas o modelo já nasce preparado (tabela de membros com papel). |
| Tipos de venda | Todos (lançamento, pronto, revenda), com foco em **lançamento**. |
| Comissão | Corretor cadastra manualmente o valor/percentual por venda. Normalmente paga pelo cliente, de uma vez, mas o modelo aceita várias parcelas e vários pagadores. Regras finas: a definir. |
| Plano de pagamento | Corretor monta. Construtora pode ter **modelos pré-cadastrados** (tabela de pagamento) que preenchem o plano automaticamente, sempre editável. |
| Portal do cliente | Consulta do plano + envio de documentos. Sem assinatura por enquanto. Acesso por **link gerado pelo corretor** (sem senha). |
| Documentos | Nuvem: **Cloudflare R2** (10 GB grátis, sem custo de download — o mais barato ao escalar). |
| Visual | Estilo Apple/iOS escuro (referência: app de controle do usuário). Base preta, cartões agrupados que expandem (ano › mês › cliente), cor de destaque **personalizável por corretor** (padrão azul), salva no tenant. Aprovado em 24/11/2026. |
| Código | Claude é o dono do código, programa e publica. |
| Pasta | `C:\GestaoCorretores` |

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Front + back (BFF) | **Next.js (App Router) + TypeScript** |
| UI | **Tailwind CSS 4** com componentes próprios no estilo iOS (`src/components`), Motion para animações, Lucide para ícones |
| Next.js | Versão 16: `src/proxy.ts` (antigo middleware) renova a sessão; Cache Components desligado por enquanto (app todo atrás de login) |
| Dev local | Supabase CLI no Docker (`npx supabase start`), migrações em `supabase/migrations` |
| Banco, login | **Supabase** (Postgres + Auth). Isolamento multitenant via **Row Level Security** |
| Arquivos | **Cloudflare R2** com URLs assinadas (upload/download direto do navegador, expiram em minutos) |
| Hospedagem | **Cloudflare Workers** (Next.js via OpenNext) — plano grátis permite uso comercial |
| Mobile | Layout responsivo + **PWA** (instalável na tela inicial do celular) |
| Validação | Zod + React Hook Form |
| Datas e dinheiro | Valores em **centavos (inteiro)** no banco; `date-fns` com fuso `America/Sao_Paulo` |

### Custos estimados
- Desenvolvimento/teste: **R$ 0** (+ domínio ~R$ 40/ano).
- Produção com clientes pagantes: **Supabase Pro US$ 25/mês** (o grátis pausa após 7 dias sem uso e tem 500 MB). Cloudflare continua grátis até volumes altos; R2 ~US$ 0,015/GB/mês acima de 10 GB.

## 3. Multitenância e segurança
- Toda tabela de negócio tem `tenant_id`.
- Políticas RLS: o usuário só lê/grava linhas de tenants onde é membro (`membros_tenant`).
- Arquivos no R2 organizados por `tenants/{tenant_id}/clientes/{cliente_id}/...`; nunca públicos, só via URL assinada gerada pelo servidor após checar permissão.
- LGPD: CPF e documentos são dados pessoais. Logs de acesso, exclusão sob pedido, termo de uso/privacidade.

## 4. Portal do cliente (link sem senha)
- Corretor clica em "Gerar link" no cliente → servidor cria um token aleatório longo, guarda apenas o **hash** no banco, com validade (ex.: 30 dias) e possibilidade de **revogar**.
- Proposta de segurança extra (recomendado, pois há documentos): ao abrir o link, o cliente confirma **4 últimos dígitos do CPF** ou data de nascimento. Sem senha para guardar.
- O cliente vê: dados da compra, plano de pagamento (parcelas pagas/a vencer), documentos liberados e área para **enviar documentos** (ficam com status "pendente de revisão" para o corretor).
- A tela do portal usa a cor de destaque e o logo do corretor.

## 5. Modelo de dados (rascunho)

```
tenants            id, nome, slug, cor_destaque, logo_url, plano, criado_em
membros_tenant     tenant_id, user_id, papel (dono | corretor | gestor)
perfis             user_id, nome, creci, telefone, foto_url

clientes           id, tenant_id, nome, cpf, rg, email, telefone, data_nasc,
                   estado_civil, profissao, renda, endereco(json), origem, tags[], obs
pastas_documento   id, tenant_id, cliente_id, nome (ex.: Pessoais, Renda, Contrato)
documentos         id, tenant_id, cliente_id, pasta_id, venda_id?, nome, chave_r2,
                   mime, tamanho, enviado_por (corretor|cliente), status (ok|pendente|recusado)

construtoras       id, tenant_id, nome, cnpj, contato
empreendimentos    id, tenant_id, construtora_id, nome, cidade, endereco, previsao_entrega
imobiliarias       id, tenant_id, nome, contato        -- corretora/imobiliária parceira
modelos_pagamento  id, tenant_id, construtora_id, empreendimento_id?, nome, itens(json)
                   -- ex.: sinal 10%, 36 mensais 0,5%, 3 intercaladas 5%, chaves 20%, financ. resto

vendas             id, tenant_id, cliente_id, tipo (lancamento|pronto|revenda),
                   construtora_id?, empreendimento_id?, imobiliaria_id?, unidade,
                   valor_venda_centavos, data_venda, status (proposta|fechada|distrato),
                   comissao_percentual, comissao_valor_centavos, obs
planos_pagamento   id, tenant_id, venda_id, modelo_origem_id?, indice_correcao (INCC|IGPM|nenhum)
parcelas_plano     id, plano_id, tipo (ato|sinal|mensal|intercalada|chaves|financiamento|fgts|permuta),
                   numero, vencimento, valor_centavos, status (a_vencer|paga|atrasada), pago_em

comissoes_receb    id, tenant_id, venda_id, pagador_tipo (cliente|construtora|imobiliaria),
                   pagador_nome, valor_previsto_centavos, data_prevista,
                   valor_recebido_centavos?, data_recebida?, forma (pix|ted|boleto|...), status

links_portal       id, tenant_id, cliente_id, token_hash, expira_em, revogado_em, ultimo_acesso
auditoria          id, tenant_id, user_id?, acao, entidade, entidade_id, em
```

## 6. Telas (Fase 1)
1. Login / cadastro do corretor (e-mail + senha ou link mágico) e onboarding (nome, CRECI, cor, logo).
2. **Dashboard**: vendas do mês, VGV, comissão do mês, a receber (30/60/90 dias), recebido no ano, últimas vendas.
3. **Clientes**: lista com busca → ficha do cliente (dados, pastas de documentos, vendas, link do portal).
4. **Vendas**: lista filtrável por mês/construtora/status → cadastro de venda (cliente, imóvel, valor, comissão).
5. **Financeiro**: comissões a receber / recebidas, de quem, quando; marcar como recebida.
6. **Cadastros**: construtoras, empreendimentos, imobiliárias parceiras.
7. **Configurações**: perfil, cor de destaque, logo.

## 7. Fases
- **Fase 0 — Fundação**: projeto Next.js, design system (tema preto + destaque), Supabase, RLS, deploy de teste.
- **Fase 1 — MVP**: telas da seção 6.
- **Fase 2**: plano de pagamento + modelos por construtora + portal do cliente.
- **Fase 3**: funil de leads/visitas, agenda, lembretes (WhatsApp/e-mail), relatórios e exportação.
- **Fase 4**: assinatura do SaaS (Asaas/Mercado Pago/Stripe), planos, modo imobiliária (vários corretores).

## 8. Em aberto
- Referência visual do usuário (site/sistema próprio).
- Regras de comissão (divisões, impostos, retenções).
- Se o catálogo de construtoras/modelos será **global** (mantido por nós, compartilhado entre corretores) ou por corretor.
- Nome definitivo e domínio.
- Modelo de cobrança do SaaS (preço, período grátis).
