-- CreateTable
CREATE TABLE "recibos" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "cliente_id" TEXT,
    "usuario_emissor_id" TEXT,
    "forma_pagamento" TEXT,
    "forma_pagamento_outro" TEXT,
    "total_geral" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'emitido',
    "cancelamento_motivo" TEXT,
    "cancelado_em" TEXT,
    "criado_em" TEXT NOT NULL,
    "atualizado_em" TEXT NOT NULL,
    "deletado_em" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'pendente_sync',
    "sync_at" TEXT,
    "criado_por" TEXT,

    CONSTRAINT "recibos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recibo_itens" (
    "id" TEXT NOT NULL,
    "recibo_id" TEXT NOT NULL,
    "produto_id" TEXT,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "valor_unitario" DOUBLE PRECISION NOT NULL,
    "valor_total" DOUBLE PRECISION NOT NULL,
    "criado_em" TEXT NOT NULL,
    "criado_por" TEXT,

    CONSTRAINT "recibo_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recibos_numero_key" ON "recibos"("numero");

-- AddForeignKey
ALTER TABLE "recibo_itens" ADD CONSTRAINT "recibo_itens_recibo_id_fkey" FOREIGN KEY ("recibo_id") REFERENCES "recibos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
