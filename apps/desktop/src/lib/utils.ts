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

const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function grupoExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena > 0) partes.push(CENTENAS[centena]);
  if (resto > 0 && resto < 20) {
    partes.push(UNIDADES[resto]);
  } else if (resto >= 20) {
    const dez = Math.floor(resto / 10);
    const uni = resto % 10;
    partes.push(DEZENAS[dez]);
    if (uni > 0) partes.push(UNIDADES[uni]);
  }
  return partes.join(" e ");
}

function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  const bilhoes = Math.floor(n / 1_000_000_000);
  const milhoes = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1_000);
  const resto = n % 1_000;
  const partes: string[] = [];
  if (bilhoes > 0) partes.push(`${grupoExtenso(bilhoes)} ${bilhoes === 1 ? "bilhão" : "bilhões"}`);
  if (milhoes > 0) partes.push(`${grupoExtenso(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
  if (milhares > 0) partes.push(`${grupoExtenso(milhares)} mil`);
  if (resto > 0) partes.push(grupoExtenso(resto));
  return partes.join(" e ");
}

export function valorPorExtenso(valor: number): string {
  if (valor < 0) return `menos ${valorPorExtenso(-valor)}`;
  if (valor === 0) return "zero reais";
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  const partes: string[] = [];
  if (inteiro > 0) partes.push(`${inteiroExtenso(inteiro)} ${inteiro === 1 ? "real" : "reais"}`);
  if (centavos > 0) partes.push(`${grupoExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.join(" e ");
}

export function formasPagamentoLabel(forma: string, outro?: string | null): string {
  const map: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "PIX",
    cartao_debito: "Cartão de Débito",
    cartao_credito: "Cartão de Crédito",
    boleto: "Boleto Bancário",
    transferencia: "Transferência Bancária",
    outro: outro ? `Outro — ${outro}` : "Outro",
  };
  return map[forma] ?? forma;
}

export function perfilLabel(perfil: string): string {
  const map: Record<string, string> = {
    admin: "Administrador",
    operador: "Operador",
    consulta: "Consulta",
  };
  return map[perfil] ?? perfil;
}
