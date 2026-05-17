import { useEffect, useState } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Button } from '../components/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { finance, Summary, Expense } from '../services/finance';
import { tokens } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

type Period = 'week' | 'month' | 'year';

interface MonthRow {
  month: string;
  receitas: number;
  despesas: number;
  lucro: number;
}

interface CategoryRow {
  name: string;
  value: number;
  color: string;
}

const PIE_COLORS = ['#1e5a8e', '#2670a8', '#6fbd6b', '#8dd089', '#3b82f6', '#f59e0b', '#94a3b8'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

function dayLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

function monthQuery(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function Reports() {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);

  const [monthlyData, setMonthlyData] = useState<MonthRow[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryRow[]>([]);
  const [weeklyData, setWeeklyData] = useState<MonthRow[]>([]);

  // Carrega tudo conforme o período selecionado
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const today = new Date();

        if (period === 'year') {
          // 12 meses
          const months: Date[] = [];
          for (let i = 11; i >= 0; i--) {
            months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
          }
          const summaries = await Promise.all(
            months.map((d) => finance.getSummary(monthQuery(d)).catch(() => null))
          );
          const rows: MonthRow[] = months.map((d, i) => {
            const receitas = parseFloat(summaries[i]?.total_income || '0');
            const despesas = parseFloat(summaries[i]?.total_expense || '0');
            return {
              month: monthLabel(d),
              receitas,
              despesas,
              lucro: receitas - despesas,
            };
          });
          setMonthlyData(rows);
        } else if (period === 'month') {
          // 6 meses
          const months: Date[] = [];
          for (let i = 5; i >= 0; i--) {
            months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
          }
          const summaries = await Promise.all(
            months.map((d) => finance.getSummary(monthQuery(d)).catch(() => null))
          );
          const rows: MonthRow[] = months.map((d, i) => {
            const receitas = parseFloat(summaries[i]?.total_income || '0');
            const despesas = parseFloat(summaries[i]?.total_expense || '0');
            return {
              month: monthLabel(d),
              receitas,
              despesas,
              lucro: receitas - despesas,
            };
          });
          setMonthlyData(rows);
        } else {
          // week: últimos 7 dias
          const days: Date[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d);
          }
          // pega receitas e despesas dos últimos 7 dias
          const [incomes, expenses] = await Promise.all([
            finance.listIncomes({
              start_date: isoDate(days[0]),
              end_date: isoDate(days[6]),
              page_size: 500,
            }).catch(() => null),
            finance.listExpenses({
              start_date: isoDate(days[0]),
              end_date: isoDate(days[6]),
              page_size: 500,
            }).catch(() => null),
          ]);
          const rows: MonthRow[] = days.map((d) => {
            const iso = isoDate(d);
            const receitas = (incomes?.results || [])
              .filter((i) => i.date === iso)
              .reduce((sum, i) => sum + parseFloat(i.amount), 0);
            const despesas = (expenses?.results || [])
              .filter((e) => e.date === iso)
              .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            return {
              month: dayLabel(d),
              receitas,
              despesas,
              lucro: receitas - despesas,
            };
          });
          setMonthlyData(rows);
          setWeeklyData(rows); // usado no gráfico de barras
        }

        // Despesas por categoria — sempre do mês atual
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const expensesData = await finance.listExpenses({
          start_date: isoDate(firstDay),
          end_date: isoDate(today),
          page_size: 500,
        }).catch(() => null);

        if (expensesData?.results) {
          const byCategory: Record<string, number> = {};
          for (const exp of expensesData.results) {
            const key = exp.category_name || 'Sem categoria';
            byCategory[key] = (byCategory[key] || 0) + parseFloat(exp.amount);
          }
          const sorted = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7);
          setCategoryData(
            sorted.map(([name, value], idx) => ({
              name,
              value,
              color: PIE_COLORS[idx % PIE_COLORS.length],
            }))
          );
        }

        // Se mudou de week pra outro, gera weekly baseado nos últimos 7 dias mesmo
        if (period !== 'week') {
          const days: Date[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d);
          }
          const [incomes, expenses] = await Promise.all([
            finance.listIncomes({
              start_date: isoDate(days[0]),
              end_date: isoDate(days[6]),
              page_size: 500,
            }).catch(() => null),
            finance.listExpenses({
              start_date: isoDate(days[0]),
              end_date: isoDate(days[6]),
              page_size: 500,
            }).catch(() => null),
          ]);
          const weekRows: MonthRow[] = days.map((d) => {
            const iso = isoDate(d);
            const receitas = (incomes?.results || [])
              .filter((i) => i.date === iso)
              .reduce((sum, i) => sum + parseFloat(i.amount), 0);
            const despesas = (expenses?.results || [])
              .filter((e) => e.date === iso)
              .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            return {
              month: dayLabel(d),
              receitas,
              despesas,
              lucro: receitas - despesas,
            };
          });
          setWeeklyData(weekRows);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [period]);

  // KPIs
  const totalRevenue = monthlyData.reduce((sum, item) => sum + item.receitas, 0);
  const totalExpenses = monthlyData.reduce((sum, item) => sum + item.despesas, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Calcula período para exportação
  function getExportPeriod(): { start: string; end: string } {
    const today = new Date();
    let start: Date;
    if (period === 'week') {
      start = new Date(today);
      start.setDate(today.getDate() - 6);
    } else if (period === 'year') {
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    } else {
      // month → 6 meses
      start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    }
    return { start: isoDate(start), end: isoDate(today) };
  }

  async function handleExport(format: 'csv' | 'pdf', kind: 'transactions' | 'summary') {
    const { start, end } = getExportPeriod();
    const url = `${API_URL}/finance/reports/${kind}.${format}?start_date=${start}&end_date=${end}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${tokens.getAccess()}` },
      });
      if (!response.ok) throw new Error('Falha ao exportar');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${kind}_${start}_a_${end}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert('Erro ao exportar relatório. Tente novamente.');
    }
  }

  // ── Insights dinâmicos ──────────────────────────────────────────────────
  const insights = (() => {
    const list: { title: string; description: string; type: 'positive' | 'info' }[] = [];

    if (monthlyData.length >= 2) {
      const first = monthlyData[0].receitas;
      const last = monthlyData[monthlyData.length - 1].receitas;
      if (first > 0) {
        const growth = ((last - first) / first) * 100;
        if (growth > 5) {
          list.push({
            title: 'Crescimento Consistente',
            description: `Suas receitas cresceram ${growth.toFixed(0)}% no período. Continue assim!`,
            type: 'positive',
          });
        } else if (growth < -5) {
          list.push({
            title: 'Atenção à receita',
            description: `Suas receitas caíram ${Math.abs(growth).toFixed(0)}% no período.`,
            type: 'info',
          });
        }
      }
    }

    if (categoryData.length > 0 && totalExpenses > 0) {
      const top = categoryData[0];
      const pct = (top.value / totalExpenses) * 100;
      list.push({
        title: 'Categoria com mais gastos',
        description: `"${top.name}" representa ${pct.toFixed(0)}% das suas despesas. Analise se há espaço para otimização.`,
        type: 'info',
      });
    }

    if (monthlyData.length > 0) {
      const best = monthlyData.reduce((acc, m) => (m.lucro > acc.lucro ? m : acc), monthlyData[0]);
      if (best.lucro > 0) {
        list.push({
          title: 'Melhor período',
          description: `${best.month} foi o período mais lucrativo (${formatCurrency(best.lucro)}). Veja o que funcionou.`,
          type: 'positive',
        });
      }
    }

    if (parseFloat(profitMargin) > 0) {
      list.push({
        title: 'Margem de lucro',
        description: `Sua margem de lucro está em ${profitMargin}%. Acompanhe periodicamente.`,
        type: 'info',
      });
    }

    if (list.length === 0) {
      list.push({
        title: 'Sem dados suficientes',
        description: 'Registre mais transações para receber insights personalizados.',
        type: 'info',
      });
    }

    return list.slice(0, 4);
  })();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">Análise detalhada do desempenho financeiro</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-2 bg-card border border-border rounded-lg p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-md transition-all ${
                period === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-md transition-all ${
                period === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              6 meses
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-4 py-2 rounded-md transition-all ${
                period === 'year' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ano
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-5 h-5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf', 'transactions')} className="cursor-pointer">
                Transações em PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv', 'transactions')} className="cursor-pointer">
                Transações em CSV (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf', 'summary')} className="cursor-pointer">
                Resumo em PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv', 'summary')} className="cursor-pointer">
                Resumo em CSV (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Receita Total</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl text-foreground mb-1">
            {loading ? '...' : formatCurrency(totalRevenue)}
          </div>
          <div className="text-sm text-secondary">
            {period === 'week' ? 'Últimos 7 dias' : period === 'year' ? 'Últimos 12 meses' : 'Últimos 6 meses'}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Despesas Totais</span>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="text-2xl text-foreground mb-1">
            {loading ? '...' : formatCurrency(totalExpenses)}
          </div>
          <div className="text-sm text-destructive">
            {period === 'week' ? 'Últimos 7 dias' : period === 'year' ? 'Últimos 12 meses' : 'Últimos 6 meses'}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Lucro Líquido</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl text-foreground mb-1">
            {loading ? '...' : formatCurrency(totalProfit)}
          </div>
          <div className={`text-sm ${totalProfit >= 0 ? 'text-secondary' : 'text-destructive'}`}>
            {totalProfit >= 0 ? 'No verde' : 'No vermelho'}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Margem de Lucro</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
              <PieChartIcon className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-2xl text-foreground mb-1">{loading ? '...' : `${profitMargin}%`}</div>
          <div className="text-sm text-muted-foreground">Média do período</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue vs Expenses Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">
            Receitas vs Despesas ({period === 'week' ? '7 dias' : period === 'year' ? '12 meses' : '6 meses'})
          </h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="reports-colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6fbd6b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6fbd6b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reports-colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e5a8e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1e5a8e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="receitas" stroke="#6fbd6b" fillOpacity={1} fill="url(#reports-colorReceitas)" name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke="#1e5a8e" fillOpacity={1} fill="url(#reports-colorDespesas)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit Trend */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">Evolução do Lucro</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="lucro"
                  stroke="#6fbd6b"
                  strokeWidth={3}
                  name="Lucro Líquido"
                  dot={{ fill: '#6fbd6b', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">Despesas por Categoria (mês atual)</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : categoryData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhuma despesa registrada este mês.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly Performance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">Desempenho Semanal (últimos 7 dias)</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="receitas" fill="#6fbd6b" name="Receitas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="despesas" fill="#1e5a8e" name="Despesas" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-xl text-foreground mb-4">Insights e Recomendações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                insight.type === 'positive'
                  ? 'bg-secondary/5 border border-secondary/20'
                  : 'bg-primary/5 border border-primary/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    insight.type === 'positive' ? 'bg-secondary/10' : 'bg-primary/10'
                  }`}
                >
                  {insight.type === 'positive' ? (
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  ) : (
                    <Calendar className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h4 className="text-foreground mb-1">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}