import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { autenticar, criarPrimeiroAdmin, precisaCriarPrimeiroAdmin } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";
import { ClipboardList, Loader2 } from "lucide-react";

const loginSchema = z.object({
  login: z.string().min(1, "Informe o usuário"),
  senha: z.string().min(1, "Informe a senha"),
});

const adminSchema = z.object({
  nome_completo: z.string().min(2, "Nome muito curto"),
  login: z.string().min(3, "Usuário muito curto"),
  senha: z.string().min(6, "Senha mínimo 6 caracteres"),
  confirmar: z.string(),
}).refine((d) => d.senha === d.confirmar, { message: "Senhas não coincidem", path: ["confirmar"] });

type LoginForm = z.infer<typeof loginSchema>;
type AdminForm = z.infer<typeof adminSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUsuario } = useAuthStore();
  const [modoAdmin, setModoAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    precisaCriarPrimeiroAdmin().then(setModoAdmin);
  }, []);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const adminForm = useForm<AdminForm>({ resolver: zodResolver(adminSchema) });

  async function onLogin(data: LoginForm) {
    setLoading(true);
    try {
      const usuario = await autenticar(data.login, data.senha);
      if (!usuario) {
        toast.error("Usuário ou senha inválidos");
        return;
      }
      setUsuario(usuario);
      navigate("/");
    } catch (e) {
      toast.error("Erro ao autenticar: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onCriarAdmin(data: AdminForm) {
    setLoading(true);
    try {
      const usuario = await criarPrimeiroAdmin({
        nome_completo: data.nome_completo,
        login: data.login,
        senha: data.senha,
      });
      setUsuario(usuario);
      navigate("/");
      toast.success("Administrador criado com sucesso!");
    } catch (e) {
      toast.error("Erro ao criar administrador: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  if (modoAdmin === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-3">
            <ClipboardList size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">App Cautelas</h1>
          <p className="text-sm text-slate-500 mt-1">
            {modoAdmin ? "Configure o administrador inicial" : "Acesse sua conta"}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          {modoAdmin ? (
            <form onSubmit={adminForm.handleSubmit(onCriarAdmin)} className="space-y-4">
              <h2 className="font-semibold text-slate-800 mb-1">Primeiro acesso</h2>
              <p className="text-xs text-slate-500 mb-4">
                Crie o usuário administrador para começar a usar o sistema.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...adminForm.register("nome_completo")}
                />
                {adminForm.formState.errors.nome_completo && (
                  <p className="text-xs text-destructive mt-1">{adminForm.formState.errors.nome_completo.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuário (login)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...adminForm.register("login")}
                  autoComplete="username"
                />
                {adminForm.formState.errors.login && (
                  <p className="text-xs text-destructive mt-1">{adminForm.formState.errors.login.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...adminForm.register("senha")}
                  autoComplete="new-password"
                />
                {adminForm.formState.errors.senha && (
                  <p className="text-xs text-destructive mt-1">{adminForm.formState.errors.senha.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...adminForm.register("confirmar")}
                  autoComplete="new-password"
                />
                {adminForm.formState.errors.confirmar && (
                  <p className="text-xs text-destructive mt-1">{adminForm.formState.errors.confirmar.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Criar administrador
              </button>
            </form>
          ) : (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...loginForm.register("login")}
                  autoComplete="username"
                  autoFocus
                />
                {loginForm.formState.errors.login && (
                  <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.login.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  {...loginForm.register("senha")}
                  autoComplete="current-password"
                />
                {loginForm.formState.errors.senha && (
                  <p className="text-xs text-destructive mt-1">{loginForm.formState.errors.senha.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
