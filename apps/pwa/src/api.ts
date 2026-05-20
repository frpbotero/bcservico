import axios from 'axios';
import type { AssinaturaPayload, CautelaCompleta, CautelaPendente, LoginResponse } from './types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const http = axios.create({ baseURL: BASE_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('cautelas_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function apiLogin(login: string, senha: string): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/auth/login', { login, senha });
  return data;
}

export async function apiCautelasPendentes(): Promise<CautelaPendente[]> {
  const { data } = await http.get<CautelaPendente[]>('/cautelas/pendentes');
  return data;
}

export async function apiCautelaDetalhe(id: string): Promise<CautelaCompleta> {
  const { data } = await http.get<CautelaCompleta>(`/cautelas/${id}`);
  return data;
}

export async function apiRegistrarAssinatura(id: string, payload: AssinaturaPayload): Promise<void> {
  await http.post(`/cautelas/${id}/assinatura`, payload);
}
