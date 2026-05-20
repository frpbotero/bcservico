-- CreateTable
CREATE TABLE "empresa_emissora" (
    "id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "complemento" TEXT,
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "telefones" TEXT,
    "email" TEXT,
    "logotipo" TEXT,
    "texto_rodape" TEXT,
    "criado_em" TEXT NOT NULL,
    "atualizado_em" TEXT NOT NULL,
    "deletado_em" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'pendente_sync',
    "sync_at" TEXT,
    "criado_por" TEXT,

    CONSTRAINT "empresa_emissora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "email" TEXT,
    "criado_em" TEXT NOT NULL,
    "atualizado_em" TEXT NOT NULL,
    "deletado_em" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'pendente_sync',
    "sync_at" TEXT,
    "criado_por" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "cnpj_cpf" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "complemento" TEXT,
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "telefones" TEXT,
    "email" TEXT,
    "nome_contato" TEXT,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" TEXT NOT NULL,
    "atualizado_em" TEXT NOT NULL,
    "deletado_em" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'pendente_sync',
    "sync_at" TEXT,
    "criado_por" TEXT,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_interno" TEXT,
    "descricao" TEXT,
    "unidade_medida" TEXT NOT NULL DEFAULT 'Un',
    "preco_referencia" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" TEXT NOT NULL,
    "atualizado_em" TEXT NOT NULL,
    "deletado_em" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'pendente_sync',
    "sync_at" TEXT,
    "criado_por" TEXT,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cautelas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data_emissao" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "nome_destinatario" TEXT NOT NULL,
    "cargo_destinatario" TEXT,
    "usuario_emissor_id" TEXT NOT NULL,
    "observacao_geral" TEXT,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "assinatura_nome" TEXT,
    "assinatura_cargo" TEXT,
    "assinatura_imagem" TEXT,
    "assinatura_coletada_em" TEXT,
    "assinatura_operador_id" TEXT,
    "criado_em" TEXT NOT NULL,
    "atualizado_em" TEXT NOT NULL,
    "deletado_em" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'pendente_sync',
    "sync_at" TEXT,
    "criado_por" TEXT,

    CONSTRAINT "cautelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cautela_itens" (
    "id" TEXT NOT NULL,
    "cautela_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "criado_em" TEXT NOT NULL,
    "criado_por" TEXT,

    CONSTRAINT "cautela_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_cpf_key" ON "clientes"("cnpj_cpf");

-- CreateIndex
CREATE UNIQUE INDEX "cautelas_numero_key" ON "cautelas"("numero");

-- AddForeignKey
ALTER TABLE "cautelas" ADD CONSTRAINT "cautelas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautela_itens" ADD CONSTRAINT "cautela_itens_cautela_id_fkey" FOREIGN KEY ("cautela_id") REFERENCES "cautelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautela_itens" ADD CONSTRAINT "cautela_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
