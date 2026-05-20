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
