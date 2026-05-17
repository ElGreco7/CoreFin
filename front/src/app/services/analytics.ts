/**
 * src/app/services/analytics.ts
 *
 * Funções de analytics do CoreFin.
 * - Endpoints admin: events, stats (só admin)
 * - Endpoints do usuário: my-activity, track (qualquer logado)
 */
import { api } from "./api";

export interface AnalyticsEvent {
  id: number;
  user: number | null;
  user_email?: string;
  event_type: string;
  category: string;
  related_type: string;
  related_id: number | null;
  properties: Record<string, any>;
  session_id: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
}

export interface AnalyticsStats {
  period_days: number;
  total_events: number;
  active_users: number;
  previous_period_events: number;
  variation_percent: number | null;
  top_event_types: { event_type: string; count: number }[];
  top_categories: { category: string; count: number }[];
  events_per_day: { day: string; count: number }[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Admin endpoints ────────────────────────────────────────────────────────

async function listEvents(params?: Record<string, string | number>): Promise<PaginatedResponse<AnalyticsEvent>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<AnalyticsEvent>>(`/analytics/events/${query}`);
}

async function getStats(days?: number): Promise<AnalyticsStats> {
  const query = days ? `?days=${days}` : '';
  return api.get<AnalyticsStats>(`/analytics/stats/${query}`);
}

// ── Endpoints do usuário comum ─────────────────────────────────────────────

async function getMyActivity(params?: { event_type?: string; category?: string; days?: number }): Promise<AnalyticsEvent[]> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<AnalyticsEvent[]>(`/analytics/my-activity/${query}`);
}

async function trackEvent(data: {
  event_type: string;
  category?: string;
  related_type?: string;
  related_id?: number;
  properties?: Record<string, any>;
  session_id?: string;
}): Promise<AnalyticsEvent> {
  return api.post<AnalyticsEvent>('/analytics/track/', data);
}

export const analytics = {
  listEvents,
  getStats,
  getMyActivity,
  trackEvent,
};