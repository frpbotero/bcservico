import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getProdutoById, createProduto, updateProduto, checkCodigoInternoExiste } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { ArrowLeft, Loader2 } from "lucide-react";

const UNIDADES = ["Un", "Kg", "m²", "L", "m", "cx", "pc", "par"];

const schema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  codigo_interno: z.string().optional(),
  descricao: z.string().optional(),
  unidade_medida: z.string().min(1, "Selecione a unidade"),
  preco_referencia: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(["ativo", "inativo"]),
});

type FormData = z.infer<typeof schema>;

export default function ProdutoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(id);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ativo", unidade_medida: "Un" },
  });

  useEffect(() => {
    if (id) {
      getProdutoById(id).then((p) => {
        if (p) form.reset(p as FormData);
      });
    }
  }, [id, form]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      if (data.codigo_interno) {
        const existe = await checkCodigoInternoExiste(data.codigo_interno, id);
        if (existe) {
          form.setError("codigo_interno", { message: "Código já utilizado" });
          return;
        }
      }
      const payload = { ...data, codigo_interno: data.codigo_interno || null, preco_referencia: data.preco_referencia ?? null };
      if (isEditing && id) {
        await updateProduto(id, payload);
        toast.success("Produto atualizado");
      } else {
        await createProduto(payload, usuario!.id);
        toast.success("Produto cadastrado");
      }
      await verificarPendentes();
      navigate("/produtos");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  const err = form.formState.errors;

  return (
    <div className="p-6 max-w-xl">
      <button onClick={() => navigate("/produtos")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-6">{isEditing ? "Editar Produto" : "Novo Produto"}</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("nome")} />
          {err.nome && <p className="text-xs text-destructive mt-1">{err.nome.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código Interno</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("codigo_interno")} />
            {err.codigo_interno && <p className="text-xs text-destructive mt-1">{err.codigo_interno.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Medida *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("unidade_medida")}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preço de Referência (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              {...form.register("preco_referencia")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("status")}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
          <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" {...form.register("descricao")} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate("/produtos")} className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {isEditing ? "Salvar alterações" : "Cadastrar produto"}
          </button>
        </div>
      </form>
    </div>
  );
}
