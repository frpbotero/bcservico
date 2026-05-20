import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { createRecibo, listClientes, listProdutos } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { hojeISO, formatarMoeda, valorPorExtenso } from "@/lib/utils";
import type { Cliente, Produto } from "@cautelas/shared";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "boleto", label: "Boleto Bancário" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "outro", label: "Outro" },
];

const itemSchema = z.object({
  produto_id: z.string().min(1, "Selecione um produto"),
  quantidade: z.coerce.number().min(0.01, "Qtd inválida"),
  valor_unitario: z.coerce.number().min(0, "Valor inválido"),
});

const schema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  data: z.string().min(1, "Informe a data"),
  forma_pagamento: z.string().min(1, "Selecione a forma de pagamento"),
  forma_pagamento_outro: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(itemSchema).min(1, "Adicione ao menos 1 item"),
});

type FormData = z.infer<typeof schema>;

function TotalPreview({ itens }: { itens: FormData["itens"] }) {
  const total = itens.reduce((acc, i) => acc + (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0), 0);
  return (
    <div className="bg-slate-50 border rounded-xl p-4 space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Total Geral</span>
        <span className="font-bold text-slate-900 text-base">{formatarMoeda(total)}</span>
      </div>
      <p className="text-xs text-slate-500 italic">{valorPorExtenso(total)}</p>
    </div>
  );
}

export default function ReciboFormPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data: hojeISO(),
      forma_pagamento: "",
      itens: [{ produto_id: "", quantidade: 1, valor_unitario: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "itens" });
  const watchedItens = useWatch({ control: form.control, name: "itens" });
  const watchedForma = useWatch({ control: form.control, name: "forma_pagamento" });

  useEffect(() => {
    listClientes({ status: "ativo" }).then(setClientes);
    listProdutos({ status: "ativo" }).then((ps) => {
      setProdutos(ps);
    });
  }, []);

  // Preenche valor_unitario com o preço de referência ao selecionar produto
  function handleProdutoChange(idx: number, produtoId: string) {
    const produto = produtos.find((p) => p.id === produtoId);
    if (produto?.preco_referencia) {
      form.setValue(`itens.${idx}.valor_unitario`, produto.preco_referencia);
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const recibo = await createRecibo(
        {
          cliente_id: data.cliente_id,
          data: data.data,
          forma_pagamento: data.forma_pagamento,
          forma_pagamento_outro: data.forma_pagamento === "outro" ? data.forma_pagamento_outro : undefined,
          observacoes: data.observacoes,
          itens: data.itens.map((i) => ({
            produto_id: i.produto_id,
            quantidade: Number(i.quantidade),
            valor_unitario: Number(i.valor_unitario),
          })),
        },
        usuario!.id
      );
      await verificarPendentes();
      toast.success(`Recibo ${recibo.numero} emitido com sucesso`);
      navigate("/recibos");
    } catch (e) {
      toast.error("Erro ao emitir recibo: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  const err = form.formState.errors;

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={() => navigate("/recibos")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-6">Novo Recibo de Venda</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Dados Gerais */}
        <section className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Dados Gerais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("cliente_id")}>
                <option value="">Selecione…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
              </select>
              {err.cliente_id && <p className="text-xs text-destructive mt-1">{err.cliente_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("data")} />
              {err.data && <p className="text-xs text-destructive mt-1">{err.data.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("forma_pagamento")}>
                <option value="">Selecione…</option>
                {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              {err.forma_pagamento && <p className="text-xs text-destructive mt-1">{err.forma_pagamento.message}</p>}
            </div>

            {watchedForma === "outro" && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Especifique a forma de pagamento</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Cheque, permuta…" {...form.register("forma_pagamento_outro")} />
              </div>
            )}
          </div>
        </section>

        {/* Itens */}
        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Itens</h2>
            <button
              type="button"
              onClick={() => append({ produto_id: "", quantidade: 1, valor_unitario: 0 })}
              className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <Plus size={14} /> Adicionar item
            </button>
          </div>

          {err.itens?.root && <p className="text-xs text-destructive mb-3">{err.itens.root.message}</p>}

          {/* Header */}
          <div className="grid grid-cols-12 gap-2 mb-1 px-0.5">
            <span className="col-span-5 text-xs text-slate-500">Produto *</span>
            <span className="col-span-2 text-xs text-slate-500">Qtd *</span>
            <span className="col-span-2 text-xs text-slate-500">Vl. Unit. *</span>
            <span className="col-span-2 text-xs text-slate-500 text-right">Subtotal</span>
          </div>

          <div className="space-y-2">
            {fields.map((field, idx) => {
              const qtd = Number(watchedItens?.[idx]?.quantidade) || 0;
              const vu = Number(watchedItens?.[idx]?.valor_unitario) || 0;
              const subtotal = qtd * vu;
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      className="w-full border rounded-lg px-2 py-1.5 text-sm"
                      {...form.register(`itens.${idx}.produto_id`, {
                        onChange: (e) => handleProdutoChange(idx, e.target.value),
                      })}
                    >
                      <option value="">Selecione…</option>
                      {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    {err.itens?.[idx]?.produto_id && <p className="text-xs text-destructive mt-0.5">{err.itens[idx]?.produto_id?.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" min="0.01" className="w-full border rounded-lg px-2 py-1.5 text-sm" {...form.register(`itens.${idx}.quantidade`)} />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="0,00" {...form.register(`itens.${idx}.valor_unitario`)} />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-slate-700">
                    {formatarMoeda(subtotal)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(idx)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Total preview */}
        <TotalPreview itens={watchedItens ?? []} />

        {/* Observações */}
        <section className="bg-white border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Observações</h2>
          <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Observações do recibo…" {...form.register("observacoes")} />
        </section>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate("/recibos")} className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />}
            Emitir Recibo
          </button>
        </div>
      </form>
    </div>
  );
}
