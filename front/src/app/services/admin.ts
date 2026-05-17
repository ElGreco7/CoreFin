/**
 * src/app/services/admin.ts
 *
 * Funções administrativas do CoreFin.
 * Só admin/viewer têm acesso a esses endpoints.
 */
import { api } from "./api";

export type UserRole = 'admin' | 'user' | 'viewer';

export interface AdminUser {
  id: number;
  name: string;
  business_name?: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_staff: boolean;
  is_superuser?: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  period_days: number;
  total: number;
  active: number;
  inactive: number;
  new_in_period: number;
  logged_recently: number;
  by_role: { role: UserRole; count: number }[];
}

export interface ResetPasswordResponse {
  detail: string;
  uid: string;
  token: string;
  user_email: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Usuários ───────────────────────────────────────────────────────────────

async function listUsers(params?: Record<string, string | number>): Promise<PaginatedResponse<AdminUser>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<AdminUser>>(`/admin/users/${query}`);
}

async function getUser(id: number): Promise<AdminUser> {
  return api.get<AdminUser>(`/admin/users/${id}/`);
}

async function createUser(data: { name: string; email: string; password: string; role: UserRole; business_name?: string }): Promise<AdminUser> {
  return api.post<AdminUser>('/admin/users/', data);
}

async function updateUser(id: number, data: Partial<AdminUser>): Promise<AdminUser> {
  return api.patch<AdminUser>(`/admin/users/${id}/`, data);
}

async function deleteUser(id: number): Promise<void> {
  return api.delete(`/admin/users/${id}/`);
}

async function activateUser(id: number): Promise<AdminUser> {
  return api.post<AdminUser>(`/admin/users/${id}/activate/`);
}

async function deactivateUser(id: number): Promise<AdminUser> {
  return api.post<AdminUser>(`/admin/users/${id}/deactivate/`);
}

async function resetUserPassword(id: number): Promise<ResetPasswordResponse> {
  return api.post<ResetPasswordResponse>(`/admin/users/${id}/reset-password/`);
}

async function getUserStats(days?: number): Promise<UserStats> {
  const query = days ? `?days=${days}` : '';
  return api.get<UserStats>(`/admin/users/stats/${query}`);
}

export const adminApi = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  resetUserPassword,
  getUserStats,
};