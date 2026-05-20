export type UnidadeMedida = "Un" | "Kg" | "m²" | "L" | "m" | "cx" | "pc" | "par";

export interface Produto {
  id: string;
  nome: string;
  codigo_interno?: string | null;
  descricao?: string | null;
  unidade_medida: UnidadeMedida | string;
  preco_referencia?: number | null;
  status: "ativo" | "inativo";
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
  sync_status: "pendente_sync" | "sincronizado" | "erro";
  sync_at?: string | null;
  criado_por?: string | null;
}
