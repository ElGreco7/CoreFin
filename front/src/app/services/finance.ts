/**
 * src/app/services/finance.ts
 *
 * CHANGELOG:
 *  - Income e Expense agora têm campo `payment_method` e `payment_method_display`.
 *  - Novo tipo `CashClose` e função `getCashClose()`.
 */
import { api } from "./api";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix:      'PIX',
  credito:  'Crédito',
  debito:   'Débito',
};

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix',      label: 'PIX' },
  { value: 'credito',  label: 'Crédito' },
  { value: 'debito',   label: 'Débito' },
];

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
  amount: string;
  date: string;
  description: string;
  category: number | null;
  category_name?: string;
  payment_method: PaymentMethod;
  payment_method_display?: string;
  ai_tags: string[];
  created_at: string;
}

export interface Expense {
  id: number;
  amount: string;
  date: string;
  description: string;
  category: number | null;
  category_name?: string;
  payment_method: PaymentMethod;
  payment_method_display?: string;
  is_recurring: boolean;
  ai_tags: string[];
  created_at: string;
}

export interface Summary {
  total_income: string;
  total_expense: string;
  balance: string;
  period_start: string;
  period_end: string;
}

export interface PaymentMethodBreakdown {
  payment_method: PaymentMethod;
  payment_method_display: string;
  total: string;
  count: number;
}

export interface CashClose {
  period_start: string;
  period_end: string;
  total_income: string;
  total_expense: string;
  balance: string;
  income_by_payment: PaymentMethodBreakdown[];
  expense_by_payment: PaymentMethodBreakdown[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Funções ──────────────────────────────────────────────────────────────────

async function getSummary(month?: string): Promise<Summary> {
  const query = month ? `?month=${month}` : '';
  return api.get<Summary>(`/finance/summary/${query}`);
}

async function getCashClose(params?: { start_date?: string; end_date?: string }): Promise<CashClose> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<CashClose>(`/finance/cash-close/${query}`);
}

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

export const finance = {
  getSummary,
  getCashClose,
  listIncomes, createIncome, updateIncome, deleteIncome,
  listExpenses, createExpense, updateExpense, deleteExpense,
  listCategories, createCategory, updateCategory, deleteCategory,
};
