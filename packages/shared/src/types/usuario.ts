export type Perfil = "admin" | "operador" | "consulta";
export type StatusUsuario = "ativo" | "inativo";

export interface Usuario {
  id: string;
  nome_completo: string;
  login: string;
  senha_hash: string;
  perfil: Perfil;
  status: StatusUsuario;
  email?: string | null;
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
  sync_status: "pendente_sync" | "sincronizado" | "erro";
  sync_at?: string | null;
  criado_por?: string | null;
}
