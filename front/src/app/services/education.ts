/**
 * src/app/services/education.ts
 *
 * Funções de educação financeira do CoreFin.
 */
import { api } from "./api";

export type ContentType = 'article' | 'video' | 'image' | 'document';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type ContentStatus = 'published' | 'draft' | 'archived';

export interface Content {
  id: number;
  title: string;
  description: string;
  category: string;
  type: ContentType;
  type_display?: string;
  level: Level;
  level_display?: string;
  body?: string;
  file_url?: string;
  thumbnail_url?: string;
  duration_minutes: number;
  status: ContentStatus;
  views_count: number;
  downloads_count: number;
  published_at: string | null;
  created_at: string;
  updated_at?: string;

  // Campos calculados do serializer
  user_progress_percent?: number;
  is_completed?: boolean;
  average_rating?: number;
}

export interface Path {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  level: Level;
  level_display?: string;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at?: string;

  content_count?: number;
  completion_percent?: number;
  path_contents?: PathContent[];
}

export interface PathContent {
  id: number;
  content: Content;
  content_id?: number;
  display_order: number;
  is_required: boolean;
}

export interface UserProgressData {
  id: number;
  content: number;
  progress_percent: number;
  is_completed: boolean;
  completed_at: string | null;
  last_accessed_at: string;
}

export interface Rating {
  id: number;
  content: number;
  user_name?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Paths (trilhas) ──────────────────────────────────────────────────────────

async function listPaths(params?: Record<string, string | number>): Promise<PaginatedResponse<Path>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Path>>(`/education/paths/${query}`);
}

async function getPath(id: number): Promise<Path> {
  return api.get<Path>(`/education/paths/${id}/`);
}

async function createPath(data: Partial<Path>): Promise<Path> {
  return api.post<Path>('/education/paths/', data);
}

async function updatePath(id: number, data: Partial<Path>): Promise<Path> {
  return api.patch<Path>(`/education/paths/${id}/`, data);
}

async function deletePath(id: number): Promise<void> {
  return api.delete(`/education/paths/${id}/`);
}

// ── Contents (conteúdos) ─────────────────────────────────────────────────────

async function listContents(params?: Record<string, string | number>): Promise<PaginatedResponse<Content>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Content>>(`/education/contents/${query}`);
}

async function getContent(id: number): Promise<Content> {
  return api.get<Content>(`/education/contents/${id}/`);
}

async function createContent(data: Partial<Content>): Promise<Content> {
  return api.post<Content>('/education/contents/', data);
}

async function updateContent(id: number, data: Partial<Content>): Promise<Content> {
  return api.patch<Content>(`/education/contents/${id}/`, data);
}

async function deleteContent(id: number): Promise<void> {
  return api.delete(`/education/contents/${id}/`);
}

async function markAsCompleted(contentId: number): Promise<UserProgressData> {
  return api.post<UserProgressData>(`/education/contents/${contentId}/mark_completed/`);
}

async function updateProgress(contentId: number, percent: number): Promise<UserProgressData> {
  return api.post<UserProgressData>(`/education/contents/${contentId}/track_progress/`, {
    progress_percent: percent,
  });
}

// ── Ratings ──────────────────────────────────────────────────────────────────

async function rateContent(contentId: number, rating: number, comment?: string): Promise<Rating> {
  return api.post<Rating>(`/education/contents/${contentId}/rate/`, {
    rating,
    comment: comment || '',
  });
}

export const education = {
  // Paths
  listPaths,
  getPath,
  createPath,
  updatePath,
  deletePath,
  // Contents
  listContents,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  markAsCompleted,
  updateProgress,
  rateContent,
};