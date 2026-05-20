export interface EmpresaEmissora {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefones?: string | null;
  email?: string | null;
  logotipo?: string | null;
  texto_rodape?: string | null;
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
  sync_status: "pendente_sync" | "sincronizado" | "erro";
  sync_at?: string | null;
  criado_por?: string | null;
}
