/**
 * src/app/services/api.ts
 *
 * Cliente HTTP central do CoreFin.
 * Toda chamada do frontend pro backend passa por aqui.
 *
 * Funções:
 *  - apiRequest()  → função genérica de requisição
 *  - api.get()     → atalho pra GET
 *  - api.post()    → atalho pra POST
 *  - api.patch()   → atalho pra PATCH
 *  - api.delete()  → atalho pra DELETE
 *
 * Recursos automáticos:
 *  - Adiciona o token JWT do localStorage no header
 *  - Renova o token quando expira (401 → refresh → retry)
 *  - Converte body em JSON
 *  - Trata erros HTTP de forma uniforme
 */

// ── URL base ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ── Chaves do localStorage ──────────────────────────────────────────────────
const ACCESS_KEY = "corefin_access_token";
const REFRESH_KEY = "corefin_refresh_token";

// ── Funções pra gerenciar tokens no localStorage ────────────────────────────
export const tokens = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),

  save: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },

  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Tipos ───────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    const message = data?.detail || data?.error || `Erro ${status}`;
    super(message);
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: any;
  // Se false, não envia o token JWT (usado em login/register)
  withAuth?: boolean;
};

// ── Tentar renovar o access token usando o refresh token ────────────────────
async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokens.getRefresh();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      tokens.clear();
      return null;
    }

    const data = await res.json();
    // SimpleJWT retorna { access, refresh? }
    // Se rotação estiver ligada, vem novo refresh também
    if (data.refresh) {
      tokens.save(data.access, data.refresh);
    } else {
      localStorage.setItem(ACCESS_KEY, data.access);
    }
    return data.access;
  } catch {
    tokens.clear();
    return null;
  }
}

// ── Função genérica de requisição ───────────────────────────────────────────
export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, withAuth = true } = options;

  // Monta a URL
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  // Monta os headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (withAuth) {
    const access = tokens.getAccess();
    if (access) {
      headers["Authorization"] = `Bearer ${access}`;
    }
  }

  // Faz a requisição
  let response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Se deu 401 e tem refresh token, tenta renovar e refazer
  if (response.status === 401 && withAuth) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers["Authorization"] = `Bearer ${newAccess}`;
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  // Resposta bem-sucedida sem body (ex: DELETE 204)
  if (response.status === 204) {
    return undefined as T;
  }

  // Lê o body como JSON (sempre, mesmo em erro)
  const data = await response.json().catch(() => ({}));

  // Se ainda deu erro depois do refresh, lança exceção
  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}

// ── Atalhos pra cada método HTTP ────────────────────────────────────────────
export const api = {
  get: <T = any>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),

  patch: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),

  put: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),

  delete: <T = any>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};