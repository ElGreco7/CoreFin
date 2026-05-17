/**
 * src/app/services/finance.ts
 *
 * Funções de finanças do CoreFin (categorias, receitas, despesas, resumo).
 */
import { api } from "./api";

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  created_at: string;
}

export interface Income {
  id: number;
  amount: string;          // vem como string do Django (Decimal)
  date: string;            // ISO: "2026-05-14"
  description: string;
  category: number | null;
  category_name?: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Expense {
  id: number;
  amount: string;
  date: string;
  description: string;
  category: number | null;
  category_name?: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Summary {
  total_income: string;
  total_expense: string;
  balance: string;
  period_start: string;
  period_end: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Funções ─────────────────────────────────────────────────────────────────

/**
 * Resumo do mês atual (ou mês específico via param 'month' formato YYYY-MM).
 */
async function getSummary(month?: string): Promise<Summary> {
  const query = month ? `?month=${month}` : '';
  return api.get<Summary>(`/finance/summary/${query}`);
}

// Receitas
async function listIncomes(params?: Record<string, string | number>): Promise<PaginatedResponse<Income>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Income>>(`/finance/incomes/${query}`);
}

async function createIncome(data: Partial<Income>): Promise<Income> {
  return api.post<Income>('/finance/incomes/', data);
}

async function updateIncome(id: number, data: Partial<Income>): Promise<Income> {
  return api.patch<Income>(`/finance/incomes/${id}/`, data);
}

async function deleteIncome(id: number): Promise<void> {
  return api.delete(`/finance/incomes/${id}/`);
}

// Despesas
async function listExpenses(params?: Record<string, string | number>): Promise<PaginatedResponse<Expense>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Expense>>(`/finance/expenses/${query}`);
}

async function createExpense(data: Partial<Expense>): Promise<Expense> {
  return api.post<Expense>('/finance/expenses/', data);
}

async function updateExpense(id: number, data: Partial<Expense>): Promise<Expense> {
  return api.patch<Expense>(`/finance/expenses/${id}/`, data);
}

async function deleteExpense(id: number): Promise<void> {
  return api.delete(`/finance/expenses/${id}/`);
}

// Categorias
async function listCategories(): Promise<PaginatedResponse<Category>> {
  return api.get<PaginatedResponse<Category>>('/finance/categories/');
}

async function createCategory(data: Partial<Category>): Promise<Category> {
  return api.post<Category>('/finance/categories/', data);
}

async function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  return api.patch<Category>(`/finance/categories/${id}/`, data);
}

async function deleteCategory(id: number): Promise<void> {
  return api.delete(`/finance/categories/${id}/`);
}

// ── Export único ────────────────────────────────────────────────────────────
export const finance = {
  getSummary,
  // incomes
  listIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  // expenses
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  // categories
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};