import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarData(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function formatarMoeda(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function hojeISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function statusCautelaLabel(status: string): string {
  const map: Record<string, string> = {
    rascunho: "Rascunho",
    aguardando_entrega: "Aguardando Entrega",
    entregue_assinada: "Entregue / Assinada",
    devolucao_parcial: "Devolução Parcial",
    encerrada: "Encerrada",
  };
  return map[status] ?? status;
}

export function perfilLabel(perfil: string): string {
  const map: Record<string, string> = {
    admin: "Administrador",
    operador: "Operador",
    consulta: "Consulta",
  };
  return map[perfil] ?? perfil;
}
