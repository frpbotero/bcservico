import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getUsuarioById, createUsuario, updateUsuario, getUsuarioByLogin } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { ArrowLeft, Loader2 } from "lucide-react";

const createSchema = z.object({
  nome_completo: z.string().min(2, "Nome muito curto"),
  login: z.string().min(3, "Login mínimo 3 caracteres"),
  perfil: z.enum(["admin", "operador", "consulta"]),
  status: z.enum(["ativo", "inativo"]),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  senha: z.string().min(6, "Senha mínimo 6 caracteres"),
  confirmar: z.string(),
}).refine((d) => d.senha === d.confirmar, { message: "Senhas não coincidem", path: ["confirmar"] });

const editSchema = z.object({
  nome_completo: z.string().min(2, "Nome muito curto"),
  login: z.string().min(3, "Login mínimo 3 caracteres"),
  perfil: z.enum(["admin", "operador", "consulta"]),
  status: z.enum(["ativo", "inativo"]),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  senha: z.string().optional(),
  confirmar: z.string().optional(),
}).refine((d) => !d.senha || d.senha === d.confirmar, { message: "Senhas não coincidem", path: ["confirmar"] });

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

export default function UsuarioFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { usuario: logado } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(id);

  const form = useForm<CreateForm | EditForm>({
    resolver: zodResolver(isEditing ? editSchema : createSchema) as never,
    defaultValues: { status: "ativo", perfil: "operador" },
  });

  useEffect(() => {
    if (id) {
      getUsuarioById(id).then((u) => {
        if (u) form.reset({ ...u, email: u.email ?? undefined, senha: "", confirmar: "" });
      });
    }
  }, [id, form]);

  async function onSubmit(data: CreateForm | EditForm) {
    setLoading(true);
    try {
      const loginExistente = await getUsuarioByLogin(data.login);
      if (loginExistente && loginExistente.id !== id) {
        form.setError("login", { message: "Login já utilizado" });
        return;
      }

      if (isEditing && id) {
        const editData = data as EditForm;
        const hash = editData.senha ? await hashPassword(editData.senha) : undefined;
        await updateUsuario(id, {
          nome_completo: editData.nome_completo,
          perfil: editData.perfil,
          status: editData.status,
          email: editData.email || undefined,
          senha_hash: hash,
        });
        toast.success("Usuário atualizado");
      } else {
        const createData = data as CreateForm;
        const hash = await hashPassword(createData.senha);
        await createUsuario(
          { nome_completo: createData.nome_completo, login: createData.login, senha_hash: hash, perfil: createData.perfil, email: createData.email || undefined },
          logado!.id
        );
        toast.success("Usuário criado");
      }
      await verificarPendentes();
      navigate("/usuarios");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  const err = form.formState.errors as Record<string, { message?: string }>;

  return (
    <div className="p-6 max-w-lg">
      <button onClick={() => navigate("/usuarios")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="text-xl font-bold text-slate-900 mb-6">{isEditing ? "Editar Usuário" : "Novo Usuário"}</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("nome_completo")} />
          {err.nome_completo && <p className="text-xs text-destructive mt-1">{err.nome_completo.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Login *</label>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("login")} disabled={isEditing} />
            {err.login && <p className="text-xs text-destructive mt-1">{err.login.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil *</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("perfil")}>
              <option value="admin">Administrador</option>
              <option value="operador">Operador</option>
              <option value="consulta">Consulta</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("email")} />
            {err.email && <p className="text-xs text-destructive mt-1">{err.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              {...form.register("status")}
              disabled={id === logado?.id}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">
            {isEditing ? "Alterar senha (deixe em branco para manter)" : "Senha *"}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Senha</label>
              <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("senha")} autoComplete="new-password" />
              {err.senha && <p className="text-xs text-destructive mt-1">{err.senha.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Confirmar senha</label>
              <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("confirmar")} autoComplete="new-password" />
              {err.confirmar && <p className="text-xs text-destructive mt-1">{err.confirmar.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate("/usuarios")} className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {isEditing ? "Salvar alterações" : "Criar usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}
