export interface Cliente {
  id: string;
  razao_social: string;
  cnpj_cpf: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefones?: string | null;
  email?: string | null;
  nome_contato?: string | null;
  observacoes?: string | null;
  status: "ativo" | "inativo";
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
  sync_status: "pendente_sync" | "sincronizado" | "erro";
  sync_at?: string | null;
  criado_por?: string | null;
}
