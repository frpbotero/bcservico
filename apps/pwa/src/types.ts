export interface User {
  id: string;
  nome_completo: string;
  login: string;
  perfil: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface ClienteResumo {
  razao_social: string;
  cnpj_cpf: string;
  cidade: string;
  uf: string;
}

export interface CautelaPendente {
  id: string;
  numero: string;
  data_emissao: string;
  status: string;
  nome_destinatario: string;
  cargo_destinatario: string | null;
  cliente: ClienteResumo;
}

export interface ProdutoResumo {
  nome: string;
  unidade_medida: string;
  codigo_interno: string | null;
}

export interface CautelaItemCompleto {
  id: string;
  quantidade: number;
  observacao: string | null;
  produto: ProdutoResumo;
}

export interface ClienteCompleto {
  razao_social: string;
  cnpj_cpf: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  email: string | null;
  telefone: string | null;
}

export interface CautelaCompleta {
  id: string;
  numero: string;
  data_emissao: string;
  status: string;
  nome_destinatario: string;
  cargo_destinatario: string | null;
  observacao_geral: string | null;
  cliente: ClienteCompleto;
  itens: CautelaItemCompleto[];
}

export interface AssinaturaPayload {
  assinatura_imagem: string;
  assinatura_nome: string;
  assinatura_cargo?: string;
}
