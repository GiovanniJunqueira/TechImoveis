-- Tech Imóveis: regras de plano que dependem da RENDA do cliente e desconto no financiamento.
--
-- Construtoras como a Vibra limitam cada parcela da entrada a um % da renda familiar
-- (ex.: mensais até 28% da renda) e algumas também limitam o total da série a um % do
-- imóvel (pós-chave até 5%). E do valor aprovado pelo banco descontam um % (ex.: 1,5%
-- para cobrir o INCC até a assinatura do financiamento).
--
-- Os tetos ficam na série do modelo (jsonb) e são copiados para a série da venda, para
-- o editor continuar avisando depois de salvo. Regras do modelo inteiro ficam em `regras`.

alter table public.plano_series
  add column teto_renda_percentual numeric(6, 2) check (teto_renda_percentual > 0 and teto_renda_percentual <= 1000),
  add column teto_imovel_percentual numeric(6, 2) check (teto_imovel_percentual > 0 and teto_imovel_percentual <= 100);

alter table public.vendas
  add column renda_centavos bigint check (renda_centavos >= 0),
  add column financiamento_aprovado_centavos bigint check (financiamento_aprovado_centavos >= 0),
  add column desconto_financiamento_percentual numeric(5, 2) check (desconto_financiamento_percentual between 0 and 100);

-- { desconto_financiamento_percentual?: number, parcela_pos_entrega_percentual_renda?: number }
alter table public.modelos_pagamento add column regras jsonb not null default '{}'::jsonb;

-- ------------------------------------------------------------
-- Modelo do sistema: Vibra (tabela com teto pela renda)
-- defasagem_meses = meses entre a assinatura e o 1º vencimento; mes_fixo = mês do ano
-- em que a série vence (anuais em dezembro); completa = linha que fecha o plano.
-- ------------------------------------------------------------
insert into public.modelos_pagamento (tenant_id, construtora_id, construtora_nome, nome, descricao, regras, series)
values (
  null, null, 'Vibra', 'Tabela Vibra (teto pela renda)',
  E'4 atos de valor livre: assinatura, 30, 60 e 90 dias. O último ato fecha a conta.\n'
  'Mensais durante a obra em 3 faixas: até 28%, 22% e 18% da renda por parcela.\n'
  'Anual (dezembro) e parcela única: até 100% da renda cada.\n'
  'Pós-chave: até 10% da renda por parcela e até 5% do imóvel no total.\n'
  'Do valor aprovado pelo banco desconta-se 1,5% para cobrir o INCC até a assinatura do financiamento. Documentação grátis.',
  '{"desconto_financiamento_percentual": 1.5, "parcela_pos_entrega_percentual_renda": 30}'::jsonb,
  '[
    {"tipo": "ato", "descricao": "1º Ato (assinatura)", "quantidade": 1, "percentual": null, "intervalo_meses": 0, "defasagem_meses": 0},
    {"tipo": "ato", "descricao": "2º Ato (30 dias)", "quantidade": 1, "percentual": null, "intervalo_meses": 0, "defasagem_meses": 1},
    {"tipo": "ato", "descricao": "3º Ato (60 dias)", "quantidade": 1, "percentual": null, "intervalo_meses": 0, "defasagem_meses": 2},
    {"tipo": "ato", "descricao": "4º Ato (90 dias)", "quantidade": 1, "percentual": null, "intervalo_meses": 0, "defasagem_meses": 3, "completa": true},
    {"tipo": "mensal", "descricao": "Mensais 1", "quantidade": 6, "percentual": null, "intervalo_meses": 1, "defasagem_meses": 4, "teto_renda_percentual": 28},
    {"tipo": "mensal", "descricao": "Mensais 2", "quantidade": 6, "percentual": null, "intervalo_meses": 1, "defasagem_meses": 10, "teto_renda_percentual": 22},
    {"tipo": "mensal", "descricao": "Mensais 3", "quantidade": 5, "percentual": null, "intervalo_meses": 1, "defasagem_meses": 16, "teto_renda_percentual": 18},
    {"tipo": "anual", "descricao": "Anual (dezembro)", "quantidade": 1, "percentual": null, "intervalo_meses": 12, "defasagem_meses": 4, "mes_fixo": 12, "teto_renda_percentual": 100},
    {"tipo": "outro", "descricao": "Parcela única", "quantidade": 1, "percentual": null, "intervalo_meses": 0, "defasagem_meses": 21, "teto_renda_percentual": 100},
    {"tipo": "outro", "descricao": "Pós-chave", "quantidade": 18, "percentual": null, "intervalo_meses": 1, "defasagem_meses": 22, "teto_renda_percentual": 10, "teto_imovel_percentual": 5},
    {"tipo": "financiamento", "descricao": null, "quantidade": 1, "percentual": null, "intervalo_meses": 0, "defasagem_meses": null}
  ]'::jsonb
);
