import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from "react-imask";
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { getEmpresa, saveEmpresa, forcarResyncCompleto } from "@/lib/db";
import { getSyncConfig, saveSyncConfig, testarConexao, executarSync } from "@/lib/sync";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { Upload, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const schema = z.object({
  razao_social: z.string().min(2, "Informe a razão social"),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().min(14, "CNPJ inválido"),
  logradouro: z.string().min(1, "Informe o logradouro"),
  numero: z.string().min(1, "Informe o número"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Informe o bairro"),
  cidade: z.string().min(1, "Informe a cidade"),
  uf: z.string().length(2, "UF inválida"),
  cep: z.string().min(8, "CEP inválido"),
  telefones: z.string().optional(),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  texto_rodape: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ConfiguracoesPage() {
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [loading, setLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Estado do painel de backend
  const [backendUrl, setBackendUrl] = useState("");
  const [backendLogin, setBackendLogin] = useState("");
  const [backendSenha, setBackendSenha] = useState("");
  const [savingBackend, setSavingBackend] = useState(false);
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendTestResult, setBackendTestResult] = useState<"ok" | "erro" | null>(null);
  const [backendTestMsg, setBackendTestMsg] = useState("");
  const [resyncing, setResyncing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { uf: "", cep: "" },
  });

  useEffect(() => {
    getEmpresa().then((e) => {
      if (e) {
        form.reset(e as FormData);
        setLogoBase64(e.logotipo ?? null);
      }
    });
    getSyncConfig().then((cfg) => {
      if (cfg) {
        setBackendUrl(cfg.backend_url);
        setBackendLogin(cfg.backend_login);
        setBackendSenha(cfg.backend_senha);
      }
    });
  }, [form]);

  async function handleUploadLogo() {
    const path = await open({ filters: [{ name: "Imagem", extensions: ["png", "jpg", "jpeg"] }] });
    if (!path) return;
    const bytes = await readFile(path as string);
    const base64 = btoa(String.fromCharCode(...bytes));
    const ext = (path as string).split(".").pop()?.toLowerCase() ?? "png";
    setLogoBase64(`data:image/${ext};base64,${base64}`);
    toast.success("Logo carregada");
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await saveEmpresa({ ...data, logotipo: logoBase64 ?? undefined }, usuario!.id);
      await verificarPendentes();
      toast.success("Configurações salvas com sucesso");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleTestarBackend() {
    setTestingBackend(true);
    setBackendTestResult(null);
    setBackendTestMsg("");
    try {
      await testarConexao(backendUrl, backendLogin, backendSenha);
      setBackendTestResult("ok");
      setBackendTestMsg("Conexão estabelecida com sucesso.");
    } catch (e) {
      setBackendTestResult("erro");
      setBackendTestMsg(String(e instanceof Error ? e.message : e));
    } finally {
      setTestingBackend(false);
    }
  }

  async function handleResyncCompleto() {
    setResyncing(true);
    try {
      const count = await forcarResyncCompleto();
      const result = await executarSync();
      const erros = result.push.erros.length;
      if (erros === 0) {
        toast.success(`Re-sync concluído: ${count} registros enviados ao backend`);
      } else {
        toast.warning(`Re-sync parcial: ${count} enfileirados, ${erros} erro(s). Verifique a conexão.`);
      }
      await verificarPendentes();
    } catch (e) {
      toast.error("Erro no re-sync: " + String(e));
    } finally {
      setResyncing(false);
    }
  }

  async function handleSalvarBackend() {
    setSavingBackend(true);
    try {
      await saveSyncConfig({ backend_url: backendUrl, backend_login: backendLogin, backend_senha: backendSenha });
      toast.success("Configuração do backend salva");
    } catch (e) {
      toast.error("Erro ao salvar: " + String(e));
    } finally {
      setSavingBackend(false);
    }
  }

  const err = form.formState.errors;

  return (
    <div className="p-6 max-w-2xl space-y-10">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Configurações da Empresa</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Logotipo</h2>
          <div className="flex items-center gap-4">
            {logoBase64 ? (
              <img src={logoBase64} alt="Logo" className="h-16 object-contain border rounded-lg p-1" />
            ) : (
              <div className="w-24 h-16 border-2 border-dashed rounded-lg flex items-center justify-center text-slate-400 text-xs">
                Sem logo
              </div>
            )}
            <button type="button" onClick={handleUploadLogo} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-slate-50">
              <Upload size={15} /> Carregar imagem
            </button>
            {logoBase64 && (
              <button type="button" onClick={() => setLogoBase64(null)} className="text-xs text-destructive hover:underline">
                Remover
              </button>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Dados da Empresa</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("razao_social")} />
              {err.razao_social && <p className="text-xs text-destructive mt-1">{err.razao_social.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("nome_fantasia")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ *</label>
              <IMaskInput
                mask="00.000.000/0000-00"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.watch("cnpj") ?? ""}
                onAccept={(v) => form.setValue("cnpj", v, { shouldValidate: true })}
              />
              {err.cnpj && <p className="text-xs text-destructive mt-1">{err.cnpj.message}</p>}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Endereço</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("logradouro")} />
              {err.logradouro && <p className="text-xs text-destructive mt-1">{err.logradouro.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("numero")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("complemento")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bairro *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("bairro")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cidade *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("cidade")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UF *</label>
              <input maxLength={2} className="w-full border rounded-lg px-3 py-2 text-sm uppercase" {...form.register("uf")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CEP *</label>
              <IMaskInput
                mask="00000-000"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.watch("cep") ?? ""}
                onAccept={(v) => form.setValue("cep", v, { shouldValidate: true })}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Contato</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone(s)</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="(11) 99999-9999" {...form.register("telefones")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" {...form.register("email")} />
              {err.email && <p className="text-xs text-destructive mt-1">{err.email.message}</p>}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Documentos</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Texto de rodapé dos documentos</label>
            <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" {...form.register("texto_rodape")} placeholder="Ex: Obrigado pela preferência. Dúvidas: (11) 9999-9999" />
          </div>
        </section>

        <div className="pt-2">
          <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2">
            {loading && <Loader2 size={15} className="animate-spin" />}
            Salvar configurações
          </button>
        </div>
      </form>

      {/* Seção de backend separada do form da empresa */}
      <section className="border-t pt-8">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Sincronização com Backend</h2>
        <p className="text-sm text-slate-500 mb-5">
          Configure o endereço e credenciais do servidor backend para sincronizar os dados.
        </p>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL do Backend</label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://api.exemplo.com"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Login</label>
              <input
                type="text"
                autoCapitalize="none"
                value={backendLogin}
                onChange={(e) => setBackendLogin(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={backendSenha}
                onChange={(e) => setBackendSenha(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {backendTestResult && (
            <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${backendTestResult === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {backendTestResult === "ok"
                ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
                : <XCircle size={15} className="mt-0.5 flex-shrink-0" />}
              {backendTestMsg}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleTestarBackend}
              disabled={testingBackend || !backendUrl || !backendLogin}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
            >
              {testingBackend && <Loader2 size={14} className="animate-spin" />}
              Testar conexão
            </button>
            <button
              type="button"
              onClick={handleSalvarBackend}
              disabled={savingBackend || !backendUrl}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {savingBackend && <Loader2 size={14} className="animate-spin" />}
              Salvar
            </button>
          </div>

          <div className="border-t pt-4 mt-2">
            <p className="text-xs text-slate-500 mb-3">
              Use o botão abaixo se o backend estiver desatualizado (ex: itens de cautelas não aparecem no PWA).
              Isso reenvia todos os dados do banco local para o servidor.
            </p>
            <button
              type="button"
              onClick={handleResyncCompleto}
              disabled={resyncing || !backendUrl}
              className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 flex items-center gap-2"
            >
              {resyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Re-sincronizar tudo com o backend
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
