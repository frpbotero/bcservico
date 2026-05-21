use base64::{engine::general_purpose, Engine as _};
use printpdf::*;
use serde::Deserialize;
use std::io::{BufWriter, Cursor};
use tauri::command;

#[derive(Deserialize)]
pub struct ItemPdf {
    pub produto_nome: String,
    pub unidade: String,
    pub quantidade: f64,
    pub observacao: String,
}

#[derive(Deserialize)]
pub struct PdfPayload {
    pub numero: String,
    pub cliente_nome: String,
    pub cliente_cpf_cnpj: String,
    pub cliente_telefone: String,
    pub itens: Vec<ItemPdf>,
    pub data_saida: String,
    pub data_prevista_devolucao: String,
    pub observacoes: String,
    pub empresa_nome: String,
    pub empresa_cpf_cnpj: String,
    pub empresa_telefone: String,
    pub empresa_email: String,
    pub empresa_endereco: String,
    pub empresa_logo_base64: String,
    pub rodape_texto: String,
}

#[command]
pub fn generate_pdf(payload: PdfPayload) -> Result<Vec<u8>, String> {
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Cautela {}", payload.numero),
        Mm(210.0_f32),
        Mm(297.0_f32),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Garante cor preta para texto e linhas (sem isso o PDF fica em branco)
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    current_layer.set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));

    let font = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| e.to_string())?;
    let font_regular = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| e.to_string())?;

    let margin_left = 15.0_f32;
    let margin_right = 195.0_f32;
    let page_top = 282.0_f32;

    let mut y = page_top;

    // ── LOGO (canto superior direito) ─────────────────────────────────────────
    if !payload.empresa_logo_base64.is_empty() {
        let b64 = if let Some(pos) = payload.empresa_logo_base64.find(',') {
            &payload.empresa_logo_base64[pos + 1..]
        } else {
            &payload.empresa_logo_base64
        };
        if let Ok(bytes) = general_purpose::STANDARD.decode(b64) {
            if let Ok(reader) = ::image::io::Reader::new(Cursor::new(bytes)).with_guessed_format() {
                if let Ok(dyn_img) = reader.decode() {
                    let logo = dyn_img.thumbnail(400, 120);
                    let (w_px, h_px) = (logo.width() as f32, logo.height() as f32);
                    let dpi = 150.0_f32;
                    let w_mm = w_px / dpi * 25.4;
                    let h_mm = h_px / dpi * 25.4;
                    let logo_x = margin_right - w_mm;
                    let logo_y = page_top - h_mm + 5.0;
                    let pdf_img = Image::from_dynamic_image(&logo);
                    pdf_img.add_to_layer(
                        current_layer.clone(),
                        ImageTransform {
                            translate_x: Some(Mm(logo_x)),
                            translate_y: Some(Mm(logo_y)),
                            dpi: Some(dpi),
                            ..Default::default()
                        },
                    );
                }
            }
        }
    }

    // ── CABEÇALHO ────────────────────────────────────────────────────────────
    current_layer.use_text(payload.empresa_nome.as_str(), 16.0, Mm(margin_left), Mm(y), &font);
    y -= 7.0;

    if !payload.empresa_cpf_cnpj.is_empty() {
        current_layer.use_text(
            format!("CNPJ/CPF: {}", payload.empresa_cpf_cnpj).as_str(),
            9.0, Mm(margin_left), Mm(y), &font_regular,
        );
        y -= 5.0;
    }

    if !payload.empresa_endereco.is_empty() {
        current_layer.use_text(
            payload.empresa_endereco.as_str(),
            9.0, Mm(margin_left), Mm(y), &font_regular,
        );
        y -= 5.0;
    }

    let mut contato_parts: Vec<String> = vec![];
    if !payload.empresa_telefone.is_empty() {
        contato_parts.push(format!("Tel: {}", payload.empresa_telefone));
    }
    if !payload.empresa_email.is_empty() {
        contato_parts.push(format!("E-mail: {}", payload.empresa_email));
    }
    if !contato_parts.is_empty() {
        current_layer.use_text(
            contato_parts.join("  |  ").as_str(),
            9.0, Mm(margin_left), Mm(y), &font_regular,
        );
        y -= 5.0;
    }

    y -= 3.0;
    draw_line(&current_layer, margin_left, y, margin_right, y);
    y -= 6.0;

    current_layer.use_text(
        format!("CAUTELA Nº {}", payload.numero).as_str(),
        14.0, Mm(margin_left), Mm(y), &font,
    );
    y -= 8.0;

    // ── DADOS DO CLIENTE ─────────────────────────────────────────────────────
    current_layer.use_text("DADOS DO DESTINATÁRIO", 10.0, Mm(margin_left), Mm(y), &font);
    y -= 5.0;

    current_layer.use_text(
        format!("Nome/Razão Social: {}", payload.cliente_nome).as_str(),
        9.0, Mm(margin_left), Mm(y), &font_regular,
    );
    y -= 5.0;

    let mut cliente_linha2: Vec<String> = vec![];
    if !payload.cliente_cpf_cnpj.is_empty() {
        cliente_linha2.push(format!("CPF/CNPJ: {}", payload.cliente_cpf_cnpj));
    }
    if !payload.cliente_telefone.is_empty() {
        cliente_linha2.push(format!("Telefone: {}", payload.cliente_telefone));
    }
    if !cliente_linha2.is_empty() {
        current_layer.use_text(
            cliente_linha2.join("   ").as_str(),
            9.0, Mm(margin_left), Mm(y), &font_regular,
        );
        y -= 5.0;
    }

    let mut datas_linha: Vec<String> = vec![format!("Data de saída: {}", payload.data_saida)];
    if !payload.data_prevista_devolucao.is_empty() {
        datas_linha.push(format!("Devolução prevista: {}", payload.data_prevista_devolucao));
    }
    current_layer.use_text(
        datas_linha.join("   ").as_str(),
        9.0, Mm(margin_left), Mm(y), &font_regular,
    );
    y -= 8.0;

    // ── TABELA DE ITENS ───────────────────────────────────────────────────────
    current_layer.use_text("ITENS DA CAUTELA", 10.0, Mm(margin_left), Mm(y), &font);
    y -= 5.0;

    draw_line(&current_layer, margin_left, y + 1.0, margin_right, y + 1.0);
    current_layer.use_text("Produto", 8.0, Mm(margin_left), Mm(y - 2.0), &font);
    current_layer.use_text("Qtd", 8.0, Mm(130.0_f32), Mm(y - 2.0), &font);
    current_layer.use_text("Un.", 8.0, Mm(150.0_f32), Mm(y - 2.0), &font);
    current_layer.use_text("Observação", 8.0, Mm(162.0_f32), Mm(y - 2.0), &font);
    y -= 6.0;
    draw_line(&current_layer, margin_left, y + 1.0, margin_right, y + 1.0);
    y -= 1.0;

    for item in &payload.itens {
        current_layer.use_text(
            truncate(&item.produto_nome, 45).as_str(),
            8.0, Mm(margin_left), Mm(y), &font_regular,
        );
        current_layer.use_text(
            format!("{:.2}", item.quantidade).as_str(),
            8.0, Mm(130.0_f32), Mm(y), &font_regular,
        );
        current_layer.use_text(item.unidade.as_str(), 8.0, Mm(150.0_f32), Mm(y), &font_regular);
        current_layer.use_text(
            truncate(&item.observacao, 25).as_str(),
            8.0, Mm(162.0_f32), Mm(y), &font_regular,
        );
        y -= 6.0;
    }

    draw_line(&current_layer, margin_left, y + 1.0, margin_right, y + 1.0);
    y -= 8.0;

    // ── OBSERVAÇÕES ───────────────────────────────────────────────────────────
    if !payload.observacoes.is_empty() {
        current_layer.use_text(
            format!("Observações: {}", truncate(&payload.observacoes, 100)).as_str(),
            8.0, Mm(margin_left), Mm(y), &font_regular,
        );
        y -= 10.0;
    }

    // ── ÁREA DE ASSINATURA ────────────────────────────────────────────────────
    y -= 5.0;
    current_layer.use_text(
        "Declaro ter recebido os itens listados acima em perfeito estado:",
        9.0, Mm(margin_left), Mm(y), &font_regular,
    );
    y -= 18.0;

    draw_line(&current_layer, margin_left, y, 90.0_f32, y);
    current_layer.use_text(
        "Assinatura do Destinatário", 7.0, Mm(margin_left), Mm(y - 4.0), &font_regular,
    );

    draw_line(&current_layer, 115.0_f32, y, margin_right, y);
    current_layer.use_text(
        "Responsável pela Empresa", 7.0, Mm(115.0_f32), Mm(y - 4.0), &font_regular,
    );

    // ── RODAPÉ ────────────────────────────────────────────────────────────────
    let rodape_y = 12.0_f32;
    draw_line(&current_layer, margin_left, rodape_y + 3.0, margin_right, rodape_y + 3.0);
    if !payload.rodape_texto.is_empty() {
        current_layer.use_text(
            truncate(&payload.rodape_texto, 90).as_str(),
            7.0, Mm(margin_left), Mm(rodape_y), &font_regular,
        );
    }

    let mut buffer = BufWriter::new(Vec::new());
    doc.save(&mut buffer).map_err(|e| e.to_string())?;
    let bytes = buffer.into_inner().map_err(|e| e.to_string())?;

    Ok(bytes)
}

// ── RECIBO DE VENDA ────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ItemPdfRecibo {
    pub produto_nome: String,
    pub unidade: String,
    pub quantidade: f64,
    pub valor_unitario: f64,
    pub valor_total: f64,
}

#[derive(Deserialize)]
pub struct PdfReciboPayload {
    pub numero: String,
    pub data: String,
    pub forma_pagamento: String,
    pub cliente_nome: String,
    pub cliente_cpf_cnpj: String,
    pub itens: Vec<ItemPdfRecibo>,
    pub total_geral: f64,
    pub valor_por_extenso: String,
    pub observacoes: String,
    pub empresa_nome: String,
    pub empresa_cpf_cnpj: String,
    pub empresa_telefone: String,
    pub empresa_email: String,
    pub empresa_endereco: String,
    pub empresa_logo_base64: String,
    pub rodape_texto: String,
}

#[command]
pub fn generate_pdf_recibo(payload: PdfReciboPayload) -> Result<Vec<u8>, String> {
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Recibo {}", payload.numero),
        Mm(210.0_f32),
        Mm(297.0_f32),
        "Layer 1",
    );

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Garante cor preta para texto e linhas (sem isso o PDF fica em branco)
    current_layer.set_fill_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));
    current_layer.set_outline_color(Color::Rgb(Rgb::new(0.0, 0.0, 0.0, None)));

    let font = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|e| e.to_string())?;
    let font_regular = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;

    let margin_left = 15.0_f32;
    let margin_right = 195.0_f32;
    let page_top = 282.0_f32;
    let mut y = page_top;

    // ── LOGO ─────────────────────────────────────────────────────────────────
    if !payload.empresa_logo_base64.is_empty() {
        let b64 = if let Some(pos) = payload.empresa_logo_base64.find(',') {
            &payload.empresa_logo_base64[pos + 1..]
        } else {
            &payload.empresa_logo_base64
        };
        if let Ok(bytes) = general_purpose::STANDARD.decode(b64) {
            if let Ok(reader) = ::image::io::Reader::new(Cursor::new(bytes)).with_guessed_format() {
                if let Ok(dyn_img) = reader.decode() {
                    let logo = dyn_img.thumbnail(400, 120);
                    let (w_px, h_px) = (logo.width() as f32, logo.height() as f32);
                    let dpi = 150.0_f32;
                    let w_mm = w_px / dpi * 25.4;
                    let h_mm = h_px / dpi * 25.4;
                    let pdf_img = Image::from_dynamic_image(&logo);
                    pdf_img.add_to_layer(
                        current_layer.clone(),
                        ImageTransform {
                            translate_x: Some(Mm(margin_right - w_mm)),
                            translate_y: Some(Mm(page_top - h_mm + 5.0)),
                            dpi: Some(dpi),
                            ..Default::default()
                        },
                    );
                }
            }
        }
    }

    // ── CABEÇALHO ────────────────────────────────────────────────────────────
    current_layer.use_text(payload.empresa_nome.as_str(), 16.0, Mm(margin_left), Mm(y), &font);
    y -= 7.0;
    if !payload.empresa_cpf_cnpj.is_empty() {
        current_layer.use_text(format!("CNPJ/CPF: {}", payload.empresa_cpf_cnpj).as_str(), 9.0, Mm(margin_left), Mm(y), &font_regular);
        y -= 5.0;
    }
    if !payload.empresa_endereco.is_empty() {
        current_layer.use_text(payload.empresa_endereco.as_str(), 9.0, Mm(margin_left), Mm(y), &font_regular);
        y -= 5.0;
    }
    let mut contato_parts: Vec<String> = vec![];
    if !payload.empresa_telefone.is_empty() { contato_parts.push(format!("Tel: {}", payload.empresa_telefone)); }
    if !payload.empresa_email.is_empty() { contato_parts.push(format!("E-mail: {}", payload.empresa_email)); }
    if !contato_parts.is_empty() {
        current_layer.use_text(contato_parts.join("  |  ").as_str(), 9.0, Mm(margin_left), Mm(y), &font_regular);
        y -= 5.0;
    }

    y -= 3.0;
    draw_line(&current_layer, margin_left, y, margin_right, y);
    y -= 7.0;

    current_layer.use_text(format!("RECIBO DE VENDA Nº {}", payload.numero).as_str(), 14.0, Mm(margin_left), Mm(y), &font);
    y -= 6.0;
    let data_str = format!("Data: {}   |   Pagamento: {}", payload.data, payload.forma_pagamento);
    current_layer.use_text(data_str.as_str(), 9.0, Mm(margin_left), Mm(y), &font_regular);
    y -= 8.0;

    // ── DADOS DO CLIENTE ─────────────────────────────────────────────────────
    current_layer.use_text("CLIENTE", 10.0, Mm(margin_left), Mm(y), &font);
    y -= 5.0;
    current_layer.use_text(format!("Nome/Razão Social: {}", payload.cliente_nome).as_str(), 9.0, Mm(margin_left), Mm(y), &font_regular);
    y -= 5.0;
    if !payload.cliente_cpf_cnpj.is_empty() {
        current_layer.use_text(format!("CPF/CNPJ: {}", payload.cliente_cpf_cnpj).as_str(), 9.0, Mm(margin_left), Mm(y), &font_regular);
        y -= 5.0;
    }
    y -= 8.0;

    // ── TABELA DE ITENS ───────────────────────────────────────────────────────
    current_layer.use_text("ITENS", 10.0, Mm(margin_left), Mm(y), &font);
    y -= 5.0;

    draw_line(&current_layer, margin_left, y + 1.0, margin_right, y + 1.0);
    current_layer.use_text("Produto", 8.0, Mm(margin_left), Mm(y - 2.5), &font);
    current_layer.use_text("Qtd", 8.0, Mm(110.0_f32), Mm(y - 2.5), &font);
    current_layer.use_text("Un.", 8.0, Mm(125.0_f32), Mm(y - 2.5), &font);
    current_layer.use_text("Vl. Unit.", 8.0, Mm(140.0_f32), Mm(y - 2.5), &font);
    current_layer.use_text("Total", 8.0, Mm(170.0_f32), Mm(y - 2.5), &font);
    y -= 7.0;
    draw_line(&current_layer, margin_left, y + 1.0, margin_right, y + 1.0);
    y -= 1.0;

    for item in &payload.itens {
        current_layer.use_text(truncate(&item.produto_nome, 40).as_str(), 8.0, Mm(margin_left), Mm(y), &font_regular);
        current_layer.use_text(format!("{:.2}", item.quantidade).as_str(), 8.0, Mm(110.0_f32), Mm(y), &font_regular);
        current_layer.use_text(item.unidade.as_str(), 8.0, Mm(125.0_f32), Mm(y), &font_regular);
        current_layer.use_text(format!("R$ {:.2}", item.valor_unitario).as_str(), 8.0, Mm(140.0_f32), Mm(y), &font_regular);
        current_layer.use_text(format!("R$ {:.2}", item.valor_total).as_str(), 8.0, Mm(170.0_f32), Mm(y), &font_regular);
        y -= 6.0;
    }

    draw_line(&current_layer, margin_left, y + 1.0, margin_right, y + 1.0);
    y -= 8.0;

    // ── TOTAL ─────────────────────────────────────────────────────────────────
    current_layer.use_text(format!("TOTAL GERAL: R$ {:.2}", payload.total_geral).as_str(), 11.0, Mm(120.0_f32), Mm(y), &font);
    y -= 6.0;
    current_layer.use_text(
        truncate(&format!("Por extenso: {}", payload.valor_por_extenso), 90).as_str(),
        9.0, Mm(margin_left), Mm(y), &font_regular,
    );
    y -= 10.0;

    // ── OBSERVAÇÕES ───────────────────────────────────────────────────────────
    if !payload.observacoes.is_empty() {
        current_layer.use_text(
            format!("Observações: {}", truncate(&payload.observacoes, 100)).as_str(),
            8.0, Mm(margin_left), Mm(y), &font_regular,
        );
        y -= 10.0;
    }

    // ── ASSINATURA ────────────────────────────────────────────────────────────
    y -= 15.0;
    let sig_x1 = 65.0_f32;
    let sig_x2 = 145.0_f32;
    draw_line(&current_layer, sig_x1, y, sig_x2, y);
    let label = "Emitente";
    let label_x = sig_x1 + (sig_x2 - sig_x1) / 2.0 - 5.0;
    current_layer.use_text(label, 7.0, Mm(label_x), Mm(y - 4.0), &font_regular);

    // ── RODAPÉ ────────────────────────────────────────────────────────────────
    let rodape_y = 12.0_f32;
    draw_line(&current_layer, margin_left, rodape_y + 3.0, margin_right, rodape_y + 3.0);
    if !payload.rodape_texto.is_empty() {
        current_layer.use_text(truncate(&payload.rodape_texto, 90).as_str(), 7.0, Mm(margin_left), Mm(rodape_y), &font_regular);
    }

    let mut buffer = BufWriter::new(Vec::new());
    doc.save(&mut buffer).map_err(|e| e.to_string())?;
    let bytes = buffer.into_inner().map_err(|e| e.to_string())?;
    Ok(bytes)
}

fn draw_line(layer: &PdfLayerReference, x1: f32, y1: f32, x2: f32, y2: f32) {
    let points = vec![
        (Point::new(Mm(x1), Mm(y1)), false),
        (Point::new(Mm(x2), Mm(y2)), false),
    ];
    let line = Line {
        points,
        is_closed: false,
    };
    layer.add_line(line);
}

fn truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max_chars - 1).collect();
        format!("{}…", truncated)
    }
}
