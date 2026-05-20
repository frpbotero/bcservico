import type { Cliente } from "./cliente";

export type StatusCautela =
  | "rascunho"
  | "aguardando_entrega"
  | "entregue_assinada"
  | "devolucao_parcial"
  | "encerrada";

export interface Cautela {
  id: string;
  numero: string;
  data_emissao: string;
  cliente_id: string;
  nome_destinatario: string;
  cargo_destinatario?: string | null;
  usuario_emissor_id: string;
  observacao_geral?: string | null;
  status: StatusCautela;
  assinatura_nome?: string | null;
  assinatura_cargo?: string | null;
  assinatura_imagem?: string | null;
  assinatura_coletada_em?: string | null;
  assinatura_operador_id?: string | null;
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
  sync_status: "pendente_sync" | "sincronizado" | "erro";
  sync_at?: string | null;
  criado_por?: string | null;
}

export interface CautelaItem {
  id: string;
  cautela_id: string;
  produto_id: string;
  quantidade: number;
  observacao?: string | null;
  criado_em: string;
  criado_por?: string | null;
}

export interface CautelaCompleta extends Cautela {
  cliente: Cliente;
  itens: Array<CautelaItem & { produto_nome: string; produto_unidade: string }>;
}
