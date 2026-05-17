import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  ChevronDown,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { finance, Income, Expense, Category } from '../services/finance';
import { tokens } from '../services/api';

// Modelo unificado pra mostrar receitas + despesas na mesma tabela
type TransactionType = 'income' | 'expense';

interface UnifiedTransaction {
  id: number;
  _type: TransactionType;
  date: string;
  description: string;
  amount: string;
  category: number | null;
  category_name: string;
}

// URL base do backend (mesma do api.ts)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Transactions() {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modais
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<UnifiedTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<UnifiedTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega dados do backend
  async function loadData() {
    setLoading(true);
    try {
      const [incomesData, expensesData, categoriesData] = await Promise.all([
        finance.listIncomes({ ordering: '-date', page_size: 100 }).catch(() => null),
        finance.listExpenses({ ordering: '-date', page_size: 100 }).catch(() => null),
        finance.listCategories().catch(() => null),
      ]);

      const incomes: UnifiedTransaction[] =
        incomesData?.results.map((i: Income) => ({
          id: i.id,
          _type: 'income' as const,
          date: i.date,
          description: i.description || 'Receita',
          amount: i.amount,
          category: i.category,
          category_name: i.category_name || 'Sem categoria',
        })) || [];

      const expenses: UnifiedTransaction[] =
        expensesData?.results.map((e: Expense) => ({
          id: e.id,
          _type: 'expense' as const,
          date: e.date,
          description: e.description || 'Despesa',
          amount: e.amount,
          category: e.category,
          category_name: e.category_name || 'Sem categoria',
        })) || [];

      const all = [...incomes, ...expenses].sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(all);

      if (categoriesData?.results) setCategories(categoriesData.results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Aplica filtros no front (já temos tudo carregado)
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t._type === filterType;
    const matchesCategory =
      filterCategory === 'all' || String(t.category) === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Totais
  const totalIncome = filteredTransactions
    .filter((t) => t._type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t._type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const balance = totalIncome - totalExpense;

  // ── Ações ──────────────────────────────────────────────────────────────

  function handleDeleteClick(transaction: UnifiedTransaction) {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!transactionToDelete) return;

    setDeleting(true);
    try {
      if (transactionToDelete._type === 'income') {
        await finance.deleteIncome(transactionToDelete.id);
      } else {
        await finance.deleteExpense(transactionToDelete.id);
      }
      // Remove da lista local sem precisar recarregar tudo
      setTransactions((prev) =>
        prev.filter((t) => !(t.id === transactionToDelete.id && t._type === transactionToDelete._type))
      );
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    } catch (err) {
      alert('Erro ao excluir transação. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  function handleEditClick(transaction: UnifiedTransaction) {
    setEditingTransaction({ ...transaction });
    setEditDialogOpen(true);
  }

  async function handleEditSave() {
    if (!editingTransaction) return;

    setSaving(true);
    try {
      const payload = {
        description: editingTransaction.description,
        amount: editingTransaction.amount,
        date: editingTransaction.date,
        category: editingTransaction.category,
      };

      if (editingTransaction._type === 'income') {
        await finance.updateIncome(editingTransaction.id, payload);
      } else {
        await finance.updateExpense(editingTransaction.id, payload);
      }

      // Atualiza na lista local
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTransaction.id && t._type === editingTransaction._type
            ? editingTransaction
            : t
        )
      );
      setEditDialogOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      alert('Erro ao salvar alterações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // ── Exportação ─────────────────────────────────────────────────────────
  async function handleExport(format: 'csv' | 'pdf') {
    // Calcula período: primeiro dia do mês até hoje
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDate = firstDay.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    const url = `${API_URL}/finance/reports/transactions.${format}?start_date=${startDate}&end_date=${endDate}`;

    try {
      // Faz fetch com token JWT
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokens.getAccess()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar');
      }

      // Cria um link de download a partir do blob
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `transacoes_${startDate}_a_${endDate}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Erro ao exportar o relatório. Tente novamente.');
    }
  }

  // Categorias filtradas pelo tipo selecionado (pra dropdown de filtro)
  const filterableCategories =
    filterType === 'all'
      ? categories
      : categories.filter((c) => c.type === filterType);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Transações</h1>
          <p className="text-muted-foreground">Gerencie todas as suas transações financeiras</p>
        </div>
        <Link to="/transactions/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-5 h-5" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Receitas</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{formatCurrency(totalIncome)}</div>
          <div className="text-sm text-secondary">
            {filteredTransactions.filter((t) => t._type === 'income').length} transações
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Despesas</span>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{formatCurrency(totalExpense)}</div>
          <div className="text-sm text-destructive">
            {filteredTransactions.filter((t) => t._type === 'expense').length} transações
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Saldo Líquido</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{formatCurrency(balance)}</div>
          <div className={`text-sm ${balance >= 0 ? 'text-secondary' : 'text-destructive'}`}>
            Período filtrado
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setFilterCategory('all'); // reset categoria ao mudar tipo
              }}
              className="appearance-none pl-10 pr-10 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="all">Todas as categorias</option>
              {filterableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-5 h-5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                Baixar CSV (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                Baixar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent border-b border-border">
              <tr>
                <th className="text-left px-6 py-4 text-sm text-muted-foreground">Data</th>
                <th className="text-left px-6 py-4 text-sm text-muted-foreground">Descrição</th>
                <th className="text-left px-6 py-4 text-sm text-muted-foreground">Categoria</th>
                <th className="text-right px-6 py-4 text-sm text-muted-foreground">Valor</th>
                <th className="text-right px-6 py-4 text-sm text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    Carregando transações...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <p className="text-muted-foreground mb-2">Nenhuma transação encontrada</p>
                    <Link to="/transactions/new" className="text-primary hover:underline text-sm">
                      Criar a primeira transação
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={`${transaction._type}-${transaction.id}`} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            transaction._type === 'income' ? 'bg-secondary/10' : 'bg-destructive/10'
                          }`}
                        >
                          {transaction._type === 'income' ? (
                            <ArrowUpRight className="w-5 h-5 text-secondary" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <span className="text-foreground">{transaction.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {transaction.category_name}
                    </td>
                    <td
                      className={`px-6 py-4 text-right ${
                        transaction._type === 'income' ? 'text-secondary' : 'text-destructive'
                      }`}
                    >
                      {transaction._type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(transaction)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(transaction)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias na transação abaixo.
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">Descrição</label>
                <input
                  id="description"
                  value={editingTransaction.description}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, description: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="category" className="text-sm font-medium">Categoria</label>
                <select
                  id="category"
                  value={editingTransaction.category ?? ''}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      category: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Sem categoria</option>
                  {categories
                    .filter((c) => c.type === editingTransaction._type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="amount" className="text-sm font-medium">Valor (R$)</label>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingTransaction.amount}
                    onChange={(e) =>
                      setEditingTransaction({ ...editingTransaction, amount: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="date" className="text-sm font-medium">Data</label>
                  <input
                    id="date"
                    type="date"
                    value={editingTransaction.date}
                    onChange={(e) =>
                      setEditingTransaction({ ...editingTransaction, date: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Tipo: <span className="font-medium">{editingTransaction._type === 'income' ? 'Receita' : 'Despesa'}</span>
                {' '}(o tipo não pode ser alterado — exclua e crie uma nova transação se necessário)
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleEditSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}