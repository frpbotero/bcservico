import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createCautela, updateCautela, getCautelaCompleta, listClientes, listProdutos } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { hojeISO } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import type { Cliente, Produto } from "@cautelas/shared";

const itemSchema = z.object({
  produto_id: z.string().min(1, "Selecione um produto"),
  quantidade: z.coerce.number().min(0.01, "Quantidade inválida"),
  observacao: z.string().optional(),
});

const schema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  nome_destinatario: z.string().min(2, "Informe o destinatário"),
  cargo_destinatario: z.string().optional(),
  data_emissao: z.string().min(1, "Informe a data"),
  observacao_geral: z.string().optional(),
  itens: z.array(itemSchema).min(1, "Adicione ao menos 1 item"),
});

type FormData = z.infer<typeof schema>;

export default function CautelaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const isEditing = Boolean(id);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_emissao: hojeISO(),
      itens: [{ produto_id: "", quantidade: 1, observacao: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "itens" });

  useEffect(() => {
    listClientes({ status: "ativo" }).then(setClientes);
    listProdutos({ status: "ativo" }).then(setProdutos);
    if (id) {
      getCautelaCompleta(id).then((c) => {
        if (c) {
          form.reset({
            cliente_id: c.cliente_id,
            nome_destinatario: c.nome_destinatario,
            cargo_destinatario: c.cargo_destinatario ?? "",
            data_emissao: c.data_emissao,
            observacao_geral: c.observacao_geral ?? "",
            itens: c.itens.map((i) => ({
              produto_id: i.produto_id,
              quantidade: i.quantidade,
              observacao: i.observacao ?? "",
            })),
          });
        }
      });
    }
  }, [id, form]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      if (isEditing && id) {
        await updateCautela(id, data, usuario!.id);
        toast.success("Cautela atualizada");
      } else {
        const cautela = await createCautela(data, usuario!.id);
        toast.success(`Cautela ${cautela.numero} criada como rascunho`);
      }
      await verificarPendentes();
      navigate("/cautelas");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  const err = form.formState.errors;

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={() => navigate("/cautelas")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-6">{isEditing ? "Editar Cautela" : "Nova Cautela"}</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Destinatário (nome) *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("nome_destinatario")} />
              {err.nome_destinatario && <p className="text-xs text-destructive mt-1">{err.nome_destinatario.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Função</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("cargo_destinatario")} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data de emissão *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("data_emissao")} />
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Itens</h2>
            <button
              type="button"
              onClick={() => append({ produto_id: "", quantidade: 1, observacao: "" })}
              className="text-xs flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <Plus size={14} /> Adicionar item
            </button>
          </div>

          {err.itens?.root && <p className="text-xs text-destructive mb-3">{err.itens.root.message}</p>}

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Produto *</label>}
                  <select className="w-full border rounded-lg px-2 py-1.5 text-sm" {...form.register(`itens.${idx}.produto_id`)}>
                    <option value="">Selecione…</option>
                    {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  {err.itens?.[idx]?.produto_id && <p className="text-xs text-destructive mt-0.5">{err.itens[idx]?.produto_id?.message}</p>}
                </div>
                <div className="col-span-2">
                  {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Qtd *</label>}
                  <input type="number" step="0.01" min="0.01" className="w-full border rounded-lg px-2 py-1.5 text-sm" {...form.register(`itens.${idx}.quantidade`)} />
                  {err.itens?.[idx]?.quantidade && <p className="text-xs text-destructive mt-0.5">{err.itens[idx]?.quantidade?.message}</p>}
                </div>
                <div className="col-span-4">
                  {idx === 0 && <label className="block text-xs text-slate-500 mb-1">Obs. do item</label>}
                  <input className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="opcional" {...form.register(`itens.${idx}.observacao`)} />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  {idx === 0 && <div className="mb-1 h-4" />}
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Observações</h2>
          <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" placeholder="Observações gerais da cautela…" {...form.register("observacao_geral")} />
        </section>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate("/cautelas")} className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {isEditing ? "Salvar alterações" : "Salvar rascunho"}
          </button>
        </div>
      </form>
    </div>
  );
}
