import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { CautelaCompleta, EmpresaEmissora } from "@cautelas/shared";

export interface PdfPayload {
  cautela: CautelaCompleta;
  empresa: EmpresaEmissora;
}

/**
 * Gera o PDF de uma cautela e salva em local escolhido pelo usuário.
 * Retorna o caminho salvo ou null se o usuário cancelou.
 */
export async function gerarPdfCautela(payload: PdfPayload): Promise<string | null> {
  // 1. Pede ao Rust para gerar os bytes do PDF
  const pdfBytes: number[] = await invoke<number[]>("generate_pdf", {
    payload: {
      numero: payload.cautela.numero,
      cliente_nome: payload.cautela.cliente.razao_social,
      cliente_cpf_cnpj: payload.cautela.cliente.cnpj_cpf,
      cliente_telefone: payload.cautela.cliente.telefones ?? "",
      itens: payload.cautela.itens.map((item) => ({
        produto_nome: item.produto_nome,
        unidade: item.produto_unidade,
        quantidade: item.quantidade,
        observacao: item.observacao ?? "",
      })),
      data_saida: payload.cautela.data_emissao,
      data_prevista_devolucao: "",
      observacoes: payload.cautela.observacao_geral ?? "",
      empresa_nome: payload.empresa.razao_social,
      empresa_cpf_cnpj: payload.empresa.cnpj ?? "",
      empresa_telefone: payload.empresa.telefones ?? "",
      empresa_email: payload.empresa.email ?? "",
      empresa_endereco: formatarEnderecoEmpresa(payload.empresa),
      empresa_logo_base64: payload.empresa.logotipo ?? "",
      rodape_texto: payload.empresa.texto_rodape ?? "",
      assinatura_imagem: payload.cautela.assinatura_imagem ?? "",
      assinatura_nome: payload.cautela.assinatura_nome ?? "",
      assinatura_cargo: payload.cautela.assinatura_cargo ?? "",
    },
  });

  // 2. Abre diálogo de salvar
  const caminho = await save({
    defaultPath: `cautela-${payload.cautela.numero}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (!caminho) return null;

  // 3. Escreve o arquivo
  const bytes = new Uint8Array(pdfBytes);
  await writeFile(caminho, bytes);

  return caminho;
}

export async function gerarPdfRecibo(
  recibo: import("@/lib/db").ReciboCompleto,
  empresa: EmpresaEmissora,
  valorExtenso: string
): Promise<string | null> {
  const pdfBytes: number[] = await invoke<number[]>("generate_pdf_recibo", {
    payload: {
      numero: recibo.numero,
      data: recibo.data,
      forma_pagamento: recibo.forma_pagamento === "outro"
        ? (recibo.forma_pagamento_outro ?? "Outro")
        : recibo.forma_pagamento,
      cliente_nome: recibo.cliente.razao_social,
      cliente_cpf_cnpj: recibo.cliente.cnpj_cpf,
      itens: recibo.itens.map((i) => ({
        produto_nome: i.produto_nome,
        unidade: i.produto_unidade,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.valor_total,
      })),
      total_geral: recibo.total_geral,
      valor_por_extenso: valorExtenso,
      observacoes: recibo.observacoes ?? "",
      empresa_nome: empresa.razao_social,
      empresa_cpf_cnpj: empresa.cnpj ?? "",
      empresa_telefone: empresa.telefones ?? "",
      empresa_email: empresa.email ?? "",
      empresa_endereco: formatarEnderecoEmpresa(empresa),
      empresa_logo_base64: empresa.logotipo ?? "",
      rodape_texto: empresa.texto_rodape ?? "",
    },
  });

  const caminho = await save({
    defaultPath: `recibo-${recibo.numero}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (!caminho) return null;
  await writeFile(caminho, new Uint8Array(pdfBytes));
  return caminho;
}

function formatarEnderecoEmpresa(empresa: EmpresaEmissora): string {
  const partes: string[] = [];
  if (empresa.logradouro) {
    let linha = empresa.logradouro;
    if (empresa.numero) linha += `, ${empresa.numero}`;
    if (empresa.complemento) linha += ` — ${empresa.complemento}`;
    partes.push(linha);
  }
  if (empresa.bairro) partes.push(empresa.bairro);
  if (empresa.cidade || empresa.uf) {
    partes.push([empresa.cidade, empresa.uf].filter(Boolean).join(" — "));
  }
  if (empresa.cep) partes.push(`CEP ${empresa.cep}`);
  return partes.join(", ");
}
