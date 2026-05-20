import { invoke } from "@tauri-apps/api/core";
import { getUsuarioByLogin, createUsuario, countUsuarios } from "./db";
import type { Usuario } from "@cautelas/shared";

export async function hashPassword(password: string): Promise<string> {
  return invoke<string>("hash_password", { password });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return invoke<boolean>("verify_password", { password, hash });
}

export async function autenticar(login: string, senha: string): Promise<Usuario | null> {
  const usuario = await getUsuarioByLogin(login);
  if (!usuario || usuario.status !== "ativo") return null;
  const ok = await verifyPassword(senha, usuario.senha_hash);
  return ok ? usuario : null;
}

export async function precisaCriarPrimeiroAdmin(): Promise<boolean> {
  const count = await countUsuarios();
  return count === 0;
}

export async function criarPrimeiroAdmin(dados: {
  nome_completo: string;
  login: string;
  senha: string;
}): Promise<Usuario> {
  const hash = await hashPassword(dados.senha);
  return createUsuario(
    { nome_completo: dados.nome_completo, login: dados.login, senha_hash: hash, perfil: "admin" },
    null
  );
}
