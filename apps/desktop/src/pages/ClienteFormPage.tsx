import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from "react-imask";
import { toast } from "sonner";
import { getClienteById, createCliente, updateCliente, checkCnpjCpfExiste } from "@/lib/db";
import { validarCpfCnpj } from "@/lib/validators";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  razao_social: z.string().min(2, "Informe a razão social"),
  cnpj_cpf: z.string().min(11, "CNPJ/CPF inválido"),
  logradouro: z.string().min(1, "Informe o logradouro"),
  numero: z.string().min(1, "Informe o número"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Informe o bairro"),
  cidade: z.string().min(1, "Informe a cidade"),
  uf: z.string().length(2, "UF inválida"),
  cep: z.string().min(8, "CEP inválido"),
  telefones: z.string().optional(),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  nome_contato: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(["ativo", "inativo"]),
});

type FormData = z.infer<typeof schema>;

export default function ClienteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(id);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ativo", uf: "", cep: "" },
  });

  useEffect(() => {
    if (id) {
      getClienteById(id).then((c) => {
        if (c) form.reset(c as FormData);
      });
    }
  }, [id, form]);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const cnpjLimpo = data.cnpj_cpf.replace(/\D/g, "");
      if (!validarCpfCnpj(cnpjLimpo)) {
        form.setError("cnpj_cpf", { message: "CPF/CNPJ inválido" });
        return;
      }
      const existe = await checkCnpjCpfExiste(cnpjLimpo, id);
      if (existe) {
        form.setError("cnpj_cpf", { message: "CNPJ/CPF já cadastrado" });
        return;
      }
      const payload = { ...data, cnpj_cpf: cnpjLimpo };
      if (isEditing && id) {
        await updateCliente(id, payload);
        toast.success("Cliente atualizado");
      } else {
        await createCliente(payload, usuario!.id);
        toast.success("Cliente cadastrado");
      }
      await verificarPendentes();
      navigate("/clientes");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  const err = form.formState.errors;

  return (
    <div className="p-6 max-w-2xl">
      <button onClick={() => navigate("/clientes")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-6">{isEditing ? "Editar Cliente" : "Novo Cliente"}</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social / Nome *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("razao_social")} />
            {err.razao_social && <p className="text-xs text-destructive mt-1">{err.razao_social.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ / CPF *</label>
            <IMaskInput
              mask={[{ mask: "000.000.000-00" }, { mask: "00.000.000/0000-00" }]}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.watch("cnpj_cpf") ?? ""}
              onAccept={(v) => form.setValue("cnpj_cpf", v, { shouldValidate: true })}
            />
            {err.cnpj_cpf && <p className="text-xs text-destructive mt-1">{err.cnpj_cpf.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("status")}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("logradouro")} />
            {err.logradouro && <p className="text-xs text-destructive mt-1">{err.logradouro.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("numero")} />
            {err.numero && <p className="text-xs text-destructive mt-1">{err.numero.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("complemento")} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bairro *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("bairro")} />
            {err.bairro && <p className="text-xs text-destructive mt-1">{err.bairro.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cidade *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("cidade")} />
            {err.cidade && <p className="text-xs text-destructive mt-1">{err.cidade.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">UF *</label>
            <input maxLength={2} className="w-full border rounded-lg px-3 py-2 text-sm uppercase" {...form.register("uf")} />
            {err.uf && <p className="text-xs text-destructive mt-1">{err.uf.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CEP *</label>
            <IMaskInput
              mask="00000-000"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.watch("cep") ?? ""}
              onAccept={(v) => form.setValue("cep", v, { shouldValidate: true })}
            />
            {err.cep && <p className="text-xs text-destructive mt-1">{err.cep.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone(s)</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="(11) 99999-9999" {...form.register("telefones")} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("email")} />
            {err.email && <p className="text-xs text-destructive mt-1">{err.email.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do contato responsável</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("nome_contato")} />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" {...form.register("observacoes")} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate("/clientes")} className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {isEditing ? "Salvar alterações" : "Cadastrar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
