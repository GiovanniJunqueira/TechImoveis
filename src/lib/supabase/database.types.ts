
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "clientes": {
                  Row: {
                    "atualizado_em": string,"cpf": string | null,"criado_em": string,"data_nascimento": string | null,"email": string | null,"endereco": Json | null,"estado_civil": string | null,"id": string,"nome": string,"observacoes": string | null,"origem": string | null,"profissao": string | null,"renda_centavos": number | null,"rg": string | null,"tags": (string)[],"telefone": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cpf"?: string | null,"criado_em"?: string,"data_nascimento"?: string | null,"email"?: string | null,"endereco"?: Json | null,"estado_civil"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"origem"?: string | null,"profissao"?: string | null,"renda_centavos"?: number | null,"rg"?: string | null,"tags"?: (string)[],"telefone"?: string | null,"tenant_id"?: string
                  }
                  Update: {
                    "atualizado_em"?: string,"cpf"?: string | null,"criado_em"?: string,"data_nascimento"?: string | null,"email"?: string | null,"endereco"?: Json | null,"estado_civil"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"origem"?: string | null,"profissao"?: string | null,"renda_centavos"?: number | null,"rg"?: string | null,"tags"?: (string)[],"telefone"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clientes_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"construtoras": {
                  Row: {
                    "cnpj": string | null,"contato": string | null,"criado_em": string,"id": string,"nome": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj"?: string | null,"contato"?: string | null,"criado_em"?: string,"id"?: string,"nome": string,"tenant_id"?: string
                  }
                  Update: {
                    "cnpj"?: string | null,"contato"?: string | null,"criado_em"?: string,"id"?: string,"nome"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "construtoras_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"documentos": {
                  Row: {
                    "chave_arquivo": string,"cliente_id": string,"criado_em": string,"enviado_por": Database["public"]['Enums']["origem_documento"],"id": string,"mime": string | null,"nome": string,"pasta": string,"status": Database["public"]['Enums']["status_documento"],"tamanho_bytes": number | null,"tenant_id": string,"venda_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chave_arquivo": string,"cliente_id": string,"criado_em"?: string,"enviado_por"?: Database["public"]['Enums']["origem_documento"],"id"?: string,"mime"?: string | null,"nome": string,"pasta"?: string,"status"?: Database["public"]['Enums']["status_documento"],"tamanho_bytes"?: number | null,"tenant_id"?: string,"venda_id"?: string | null
                  }
                  Update: {
                    "chave_arquivo"?: string,"cliente_id"?: string,"criado_em"?: string,"enviado_por"?: Database["public"]['Enums']["origem_documento"],"id"?: string,"mime"?: string | null,"nome"?: string,"pasta"?: string,"status"?: Database["public"]['Enums']["status_documento"],"tamanho_bytes"?: number | null,"tenant_id"?: string,"venda_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documentos_tenant_id_cliente_id_fkey"
      columns: ["tenant_id","cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "documentos_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documentos_tenant_id_venda_id_fkey"
      columns: ["tenant_id","venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"empreendimentos": {
                  Row: {
                    "cidade": string | null,"construtora_id": string | null,"criado_em": string,"endereco": string | null,"id": string,"nome": string,"previsao_entrega": string | null,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cidade"?: string | null,"construtora_id"?: string | null,"criado_em"?: string,"endereco"?: string | null,"id"?: string,"nome": string,"previsao_entrega"?: string | null,"tenant_id"?: string
                  }
                  Update: {
                    "cidade"?: string | null,"construtora_id"?: string | null,"criado_em"?: string,"endereco"?: string | null,"id"?: string,"nome"?: string,"previsao_entrega"?: string | null,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "empreendimentos_tenant_id_construtora_id_fkey"
      columns: ["tenant_id","construtora_id"]
isOneToOne: false
      referencedRelation: "construtoras"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "empreendimentos_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"imobiliarias": {
                  Row: {
                    "contato": string | null,"criado_em": string,"id": string,"nome": string,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contato"?: string | null,"criado_em"?: string,"id"?: string,"nome": string,"tenant_id"?: string
                  }
                  Update: {
                    "contato"?: string | null,"criado_em"?: string,"id"?: string,"nome"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "imobiliarias_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"membros_tenant": {
                  Row: {
                    "criado_em": string,"papel": Database["public"]['Enums']["papel_membro"],"tenant_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"papel"?: Database["public"]['Enums']["papel_membro"],"tenant_id": string,"user_id": string
                  }
                  Update: {
                    "criado_em"?: string,"papel"?: Database["public"]['Enums']["papel_membro"],"tenant_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "membros_tenant_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"modelos_pagamento": {
                  Row: {
                    "construtora_id": string | null,"criado_em": string,"id": string,"nome": string,"series": NonNullable<Json>,"tenant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "construtora_id"?: string | null,"criado_em"?: string,"id"?: string,"nome": string,"series"?: NonNullable<Json>,"tenant_id"?: string
                  }
                  Update: {
                    "construtora_id"?: string | null,"criado_em"?: string,"id"?: string,"nome"?: string,"series"?: NonNullable<Json>,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "modelos_pagamento_tenant_id_construtora_id_fkey"
      columns: ["tenant_id","construtora_id"]
isOneToOne: false
      referencedRelation: "construtoras"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "modelos_pagamento_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "atualizado_em": string,"creci": string | null,"foto_url": string | null,"nome": string,"telefone": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"creci"?: string | null,"foto_url"?: string | null,"nome"?: string,"telefone"?: string | null,"user_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"creci"?: string | null,"foto_url"?: string | null,"nome"?: string,"telefone"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plano_series": {
                  Row: {
                    "criado_em": string,"descricao": string | null,"id": string,"intervalo_meses": number,"ordem": number,"primeiro_vencimento": string | null,"quantidade": number,"tenant_id": string,"tipo": Database["public"]['Enums']["tipo_serie"],"valor_total_centavos": number,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"descricao"?: string | null,"id"?: string,"intervalo_meses"?: number,"ordem"?: number,"primeiro_vencimento"?: string | null,"quantidade"?: number,"tenant_id"?: string,"tipo": Database["public"]['Enums']["tipo_serie"],"valor_total_centavos": number,"venda_id": string
                  }
                  Update: {
                    "criado_em"?: string,"descricao"?: string | null,"id"?: string,"intervalo_meses"?: number,"ordem"?: number,"primeiro_vencimento"?: string | null,"quantidade"?: number,"tenant_id"?: string,"tipo"?: Database["public"]['Enums']["tipo_serie"],"valor_total_centavos"?: number,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plano_series_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "plano_series_tenant_id_venda_id_fkey"
      columns: ["tenant_id","venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"recebimentos": {
                  Row: {
                    "atualizado_em": string,"criado_em": string,"data_prevista": string,"data_recebida": string | null,"forma": Database["public"]['Enums']["forma_pagamento"] | null,"id": string,"observacoes": string | null,"pagador_nome": string | null,"pagador_tipo": Database["public"]['Enums']["pagador_tipo"],"tenant_id": string,"valor_previsto_centavos": number,"valor_recebido_centavos": number | null,"venda_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"criado_em"?: string,"data_prevista": string,"data_recebida"?: string | null,"forma"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"observacoes"?: string | null,"pagador_nome"?: string | null,"pagador_tipo"?: Database["public"]['Enums']["pagador_tipo"],"tenant_id"?: string,"valor_previsto_centavos": number,"valor_recebido_centavos"?: number | null,"venda_id": string
                  }
                  Update: {
                    "atualizado_em"?: string,"criado_em"?: string,"data_prevista"?: string,"data_recebida"?: string | null,"forma"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"observacoes"?: string | null,"pagador_nome"?: string | null,"pagador_tipo"?: Database["public"]['Enums']["pagador_tipo"],"tenant_id"?: string,"valor_previsto_centavos"?: number,"valor_recebido_centavos"?: number | null,"venda_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recebimentos_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_tenant_id_venda_id_fkey"
      columns: ["tenant_id","venda_id"]
isOneToOne: false
      referencedRelation: "vendas"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "cor_destaque": string,"criado_em": string,"id": string,"logo_url": string | null,"nome": string,"plano": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cor_destaque"?: string,"criado_em"?: string,"id"?: string,"logo_url"?: string | null,"nome": string,"plano"?: string
                  }
                  Update: {
                    "cor_destaque"?: string,"criado_em"?: string,"id"?: string,"logo_url"?: string | null,"nome"?: string,"plano"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vendas": {
                  Row: {
                    "atualizado_em": string,"cliente_id": string,"comissao_centavos": number,"comissao_percentual": number | null,"construtora_id": string | null,"criado_em": string,"data_venda": string,"empreendimento_id": string | null,"id": string,"imobiliaria_id": string | null,"imovel_descricao": string | null,"observacoes": string | null,"status": Database["public"]['Enums']["status_venda"],"tenant_id": string,"tipo": Database["public"]['Enums']["tipo_venda"],"unidade": string | null,"valor_venda_centavos": number
                  }
                  ComputedFields: never
                  Insert: {
                    "atualizado_em"?: string,"cliente_id": string,"comissao_centavos"?: number,"comissao_percentual"?: number | null,"construtora_id"?: string | null,"criado_em"?: string,"data_venda"?: string,"empreendimento_id"?: string | null,"id"?: string,"imobiliaria_id"?: string | null,"imovel_descricao"?: string | null,"observacoes"?: string | null,"status"?: Database["public"]['Enums']["status_venda"],"tenant_id"?: string,"tipo"?: Database["public"]['Enums']["tipo_venda"],"unidade"?: string | null,"valor_venda_centavos": number
                  }
                  Update: {
                    "atualizado_em"?: string,"cliente_id"?: string,"comissao_centavos"?: number,"comissao_percentual"?: number | null,"construtora_id"?: string | null,"criado_em"?: string,"data_venda"?: string,"empreendimento_id"?: string | null,"id"?: string,"imobiliaria_id"?: string | null,"imovel_descricao"?: string | null,"observacoes"?: string | null,"status"?: Database["public"]['Enums']["status_venda"],"tenant_id"?: string,"tipo"?: Database["public"]['Enums']["tipo_venda"],"unidade"?: string | null,"valor_venda_centavos"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "vendas_tenant_id_cliente_id_fkey"
      columns: ["tenant_id","cliente_id"]
isOneToOne: false
      referencedRelation: "clientes"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "vendas_tenant_id_construtora_id_fkey"
      columns: ["tenant_id","construtora_id"]
isOneToOne: false
      referencedRelation: "construtoras"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "vendas_tenant_id_empreendimento_id_fkey"
      columns: ["tenant_id","empreendimento_id"]
isOneToOne: false
      referencedRelation: "empreendimentos"
      referencedColumns: ["tenant_id","id"]
    },{
      foreignKeyName: "vendas_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vendas_tenant_id_imobiliaria_id_fkey"
      columns: ["tenant_id","imobiliaria_id"]
isOneToOne: false
      referencedRelation: "imobiliarias"
      referencedColumns: ["tenant_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "forma_pagamento": "pix"|"ted"|"boleto"|"dinheiro"|"cheque"|"outro","origem_documento": "corretor"|"cliente","pagador_tipo": "cliente"|"construtora"|"imobiliaria"|"outro","papel_membro": "dono"|"corretor"|"gestor","status_documento": "ok"|"pendente"|"recusado","status_venda": "proposta"|"fechada"|"distrato","tipo_serie": "sinal"|"mensal"|"intercalada"|"anual"|"chaves"|"financiamento"|"outro","tipo_venda": "lancamento"|"pronto"|"revenda"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "forma_pagamento": ["pix", "ted", "boleto", "dinheiro", "cheque", "outro"],"origem_documento": ["corretor", "cliente"],"pagador_tipo": ["cliente", "construtora", "imobiliaria", "outro"],"papel_membro": ["dono", "corretor", "gestor"],"status_documento": ["ok", "pendente", "recusado"],"status_venda": ["proposta", "fechada", "distrato"],"tipo_serie": ["sinal", "mensal", "intercalada", "anual", "chaves", "financiamento", "outro"],"tipo_venda": ["lancamento", "pronto", "revenda"]
          }
        }
} as const
