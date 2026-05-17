/**
 * src/app/services/notifications.ts
 *
 * Funções de notificações do CoreFin.
 */
import { api } from "./api";

export type NotificationType = 'info' | 'warning' | 'success' | 'goal';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  // Opcional: link de ação (pode vir do backend ou não)
  action_url?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function listNotifications(params?: Record<string, string | number>): Promise<PaginatedResponse<Notification>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Notification>>(`/notifications/${query}`);
}

async function getUnreadCount(): Promise<{ count: number }> {
  return api.get<{ count: number }>('/notifications/unread_count/');
}

async function markAsRead(id: number): Promise<Notification> {
  return api.patch<Notification>(`/notifications/${id}/mark_read/`);
}

async function markAllAsRead(): Promise<{ updated: number }> {
  return api.post<{ updated: number }>('/notifications/mark_all_read/');
}

async function deleteNotification(id: number): Promise<void> {
  return api.delete(`/notifications/${id}/`);
}

export const notifications = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};