/**
 * src/app/services/goals.ts
 *
 * Funções de metas financeiras do CoreFin.
 */
import { api } from "./api";

export type GoalCategory =
  | 'emergency'
  | 'investment'
  | 'expansion'
  | 'equipment'
  | 'training'
  | 'other';

export type GoalStatus = 'active' | 'completed' | 'paused';

export interface Goal {
  id: number;
  name: string;
  description: string;
  category: GoalCategory;
  target_amount: string;
  current_amount: string;
  progress_percent: number;
  status: GoalStatus;
  deadline: string | null;          // ← era due_date, agora deadline
  auto_contribute: boolean;
  monthly_contribution: string;     // ← era auto_contribute_amount, agora monthly_contribution
  icon?: string;
  color?: string;
  completed_at: string | null;
  created_at: string;
}

export interface Contribution {
  id: number;
  goal: number;
  amount: string;
  date: string;
  notes: string;
  is_automatic: boolean;
  created_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function listGoals(params?: Record<string, string | number>): Promise<PaginatedResponse<Goal>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Goal>>(`/goals/${query}`);
}

async function getGoal(id: number): Promise<Goal> {
  return api.get<Goal>(`/goals/${id}/`);
}

async function createGoal(data: Partial<Goal>): Promise<Goal> {
  return api.post<Goal>('/goals/', data);
}

async function updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
  return api.patch<Goal>(`/goals/${id}/`, data);
}

async function deleteGoal(id: number): Promise<void> {
  return api.delete(`/goals/${id}/`);
}

async function contribute(goalId: number, amount: string, notes?: string): Promise<{ contribution: Contribution; goal: Goal }> {
  return api.post(`/goals/${goalId}/contribute/`, { amount, notes });
}

export const goals = {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  contribute,
};