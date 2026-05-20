import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IMaskInput } from "react-imask";
import { toast } from "sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { getEmpresa, saveEmpresa } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { Upload, Loader2 } from "lucide-react";

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

  const err = form.formState.errors;

  return (
    <div className="p-6 max-w-2xl">
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
    </div>
  );
}
