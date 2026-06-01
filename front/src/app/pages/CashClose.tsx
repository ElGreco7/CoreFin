// src/app/pages/CashClose.tsx
//
// Fechamento de caixa: apura os valores recebidos e pagos por forma de pagamento
// no período selecionado, com gráficos e totais.

import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { finance, CashClose as CashCloseData, PaymentMethodBreakdown } from '../services/finance';

// ── Paleta de cores para os gráficos ────────────────────────────────────────
const COLORS = ['#1e5a8e', '#2670a8', '#6fbd6b', '#f59e0b'];

const METHOD_ICON: Record<string, string> = {
  pix:      '⚡',
  credito:  '💳',
  debito:   '💳',
  dinheiro: '💵',
};

function formatMoney(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ── Componente principal ─────────────────────────────────────────────────────

export function CashClose() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate,   setEndDate]   = useState(todayISO());
  const [data, setData] = useState<CashCloseData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  async function load(start: string, end: string) {
    setLoading(true);
    setError('');
    try {
      const result = await finance.getCashClose({ start_date: start, end_date: end });
      setData(result);
    } catch {
      setError('Não foi possível carregar os dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(startDate, endDate); }, []);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    load(startDate, endDate);
  }

  // Constrói dados para o gráfico de barras comparativo
  function buildComparisonData(
    incomes: PaymentMethodBreakdown[],
    expenses: PaymentMethodBreakdown[],
  ) {
    const methods = new Set([
      ...incomes.map((i) => i.payment_method),
      ...expenses.map((e) => e.payment_method),
    ]);
    return Array.from(methods).map((m) => {
      const inc = incomes.find((i)  => i.payment_method === m);
      const exp = expenses.find((e) => e.payment_method === m);
      return {
        name:     inc?.payment_method_display || exp?.payment_method_display || m,
        Receitas: parseFloat(inc?.total || '0'),
        Despesas: parseFloat(exp?.total || '0'),
      };
    });
  }

  const balance   = data ? parseFloat(data.balance) : 0;
  const isPositive = balance >= 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Fechamento de Caixa</h1>
        <p className="text-muted-foreground">
          Apure os valores recebidos e pagos por forma de pagamento no período selecionado.
        </p>
      </div>

      {/* Filtro de período */}
      <form onSubmit={handleFilter}
        className="bg-card rounded-xl border border-border p-6 mb-8 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Data inicial</label>
          <input
            type="date" value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Data final</label>
          <input
            type="date" value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="submit"
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
          <Calendar className="w-4 h-4" />
          Consultar
        </button>
        {data && (
          <span className="text-sm text-muted-foreground self-center ml-auto">
            {formatDate(data.period_start)} — {formatDate(data.period_end)}
          </span>
        )}
      </form>

      {error && (
        <div className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-muted-foreground py-16">Carregando...</div>
      )}

      {!loading && data && (
        <>
          {/* Cards de totais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-semibold text-foreground">{formatMoney(data.total_income)}</p>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-semibold text-foreground">{formatMoney(data.total_expense)}</p>
              </div>
            </div>
            <div className={`bg-card rounded-xl border p-6 flex items-center gap-4 ${
              isPositive ? 'border-green-500/40' : 'border-red-500/40'
            }`}>
              <div className={`p-3 rounded-full ${
                isPositive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <DollarSign className={`w-6 h-6 ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo do período</p>
                <p className={`text-2xl font-semibold ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatMoney(data.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico comparativo */}
          {(data.income_by_payment.length > 0 || data.expense_by_payment.length > 0) && (
            <div className="bg-card rounded-xl border border-border p-6 mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Receitas vs Despesas por forma de pagamento
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={buildComparisonData(data.income_by_payment, data.expense_by_payment)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val) => formatMoney(val as number)} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#6fbd6b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabelas por tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Receitas */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Receitas por forma de pagamento</h2>
              </div>
              {data.income_by_payment.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma receita no período.</p>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {data.income_by_payment.map((item, i) => (
                      <div key={item.payment_method} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                          style={{ background: COLORS[i % COLORS.length] + '22' }}>
                          {METHOD_ICON[item.payment_method] ?? '💰'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-sm font-medium text-foreground">{item.payment_method_display}</span>
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatMoney(item.total)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{item.count} transação{item.count !== 1 ? 'ões' : ''}</div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-500"
                              style={{
                                width: `${Math.round(
                                  (parseFloat(item.total) / parseFloat(data.total_income)) * 100
                                )}%`
                              }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data.income_by_payment.map((i) => ({ name: i.payment_method_display, value: parseFloat(i.total) }))}
                        cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        paddingAngle={3} dataKey="value">
                        {data.income_by_payment.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatMoney(val as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Despesas */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-base font-semibold text-foreground">Despesas por forma de pagamento</h2>
              </div>
              {data.expense_by_payment.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {data.expense_by_payment.map((item, i) => (
                      <div key={item.payment_method} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                          style={{ background: COLORS[i % COLORS.length] + '22' }}>
                          {METHOD_ICON[item.payment_method] ?? '💸'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-sm font-medium text-foreground">{item.payment_method_display}</span>
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                              {formatMoney(item.total)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{item.count} transação{item.count !== 1 ? 'ões' : ''}</div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-red-500"
                              style={{
                                width: `${Math.round(
                                  (parseFloat(item.total) / parseFloat(data.total_expense)) * 100
                                )}%`
                              }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={data.expense_by_payment.map((e) => ({ name: e.payment_method_display, value: parseFloat(e.total) }))}
                        cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        paddingAngle={3} dataKey="value">
                        {data.expense_by_payment.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatMoney(val as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
