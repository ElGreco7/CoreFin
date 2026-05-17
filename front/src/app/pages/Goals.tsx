import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Target, TrendingUp, Calendar, Edit2, Trash2, CheckCircle, PiggyBank } from 'lucide-react';
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
import { goals as goalsService, Goal } from '../services/goals';
import { ApiError } from '../services/api';

// Mapeamento das categorias do backend pra português
const CATEGORY_LABELS: Record<Goal['category'], string> = {
  emergency: 'Reserva de Emergência',
  investment: 'Investimento',
  expansion: 'Expansão',
  equipment: 'Equipamentos',
  training: 'Treinamento',
  other: 'Outro',
};

// Helpers
function formatCurrency(value: string | number) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return 'Sem prazo';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function getDaysRemaining(deadline: string | null) {
  if (!deadline) return null;
  const today = new Date();
  const target = new Date(deadline);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function Goals() {
  const [goalsList, setGoalsList] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [contributingTo, setContributingTo] = useState<Goal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeNotes, setContributeNotes] = useState('');
  const [contributing, setContributing] = useState(false);
  const [contributeError, setContributeError] = useState('');

  // Carrega metas
  async function loadGoals() {
    setLoading(true);
    try {
      const data = await goalsService.listGoals({ page_size: 100 });
      setGoalsList(data.results);
    } catch {
      setGoalsList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  // Agrupa por status
  const activeGoals = goalsList.filter((g) => g.status === 'active');
  const completedGoals = goalsList.filter((g) => g.status === 'completed');
  const pausedGoals = goalsList.filter((g) => g.status === 'paused');

  // Totais
  const totalTarget = activeGoals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0);
  const totalCurrent = activeGoals.reduce((sum, g) => sum + parseFloat(g.current_amount), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  // ── Excluir ───────────────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await goalsService.deleteGoal(deleteTarget.id);
      setGoalsList((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert('Erro ao excluir meta.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Editar ────────────────────────────────────────────────────────────
  function openEdit(goal: Goal) {
    setEditingGoal({ ...goal });
    setEditDialogOpen(true);
    setEditError('');
  }

  async function handleEditSave() {
    if (!editingGoal) return;
    setEditError('');
    setSaving(true);
    try {
      const updated = await goalsService.updateGoal(editingGoal.id, {
        name: editingGoal.name,
        description: editingGoal.description,
        target_amount: editingGoal.target_amount,
        category: editingGoal.category,
        deadline: editingGoal.deadline,
        status: editingGoal.status,
      });
      setGoalsList((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setEditDialogOpen(false);
      setEditingGoal(null);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data || {};
        const firstError =
          data.name?.[0] || data.target_amount?.[0] || data.detail || 'Erro ao salvar.';
        setEditError(firstError);
      } else {
        setEditError('Erro de conexão.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Aportar ───────────────────────────────────────────────────────────
  function openContribute(goal: Goal) {
    setContributingTo(goal);
    setContributeAmount('');
    setContributeNotes('');
    setContributeError('');
  }

  async function handleContribute() {
    if (!contributingTo) return;
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) {
      setContributeError('Informe um valor maior que zero.');
      return;
    }

    setContributeError('');
    setContributing(true);
    try {
      const result = await goalsService.contribute(
        contributingTo.id,
        contributeAmount,
        contributeNotes || undefined
      );
      // Atualiza a meta na lista com o novo current_amount/progress
      setGoalsList((prev) => prev.map((g) => (g.id === result.goal.id ? result.goal : g)));
      setContributingTo(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setContributeError(err.data?.detail || err.message || 'Erro ao aportar.');
      } else {
        setContributeError('Erro de conexão.');
      }
    } finally {
      setContributing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Metas Financeiras</h1>
          <p className="text-muted-foreground">Acompanhe e alcance seus objetivos financeiros</p>
        </div>
        <Link to="/goals/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-5 h-5" />
            Nova Meta
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Metas Ativas</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{activeGoals.length}</div>
          <div className="text-sm text-primary">Em progresso</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Progresso Geral</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{overallProgress.toFixed(0)}%</div>
          <div className="text-sm text-secondary">{formatCurrency(totalCurrent)} economizado</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Metas Concluídas</span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{completedGoals.length}</div>
          <div className="text-sm text-secondary">Objetivos alcançados</div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando metas...</div>
      ) : goalsList.length === 0 ? (
        /* Estado vazio */
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl text-foreground mb-2">Nenhuma meta cadastrada</h3>
          <p className="text-muted-foreground mb-6">
            Comece criando sua primeira meta financeira pra acompanhar seu progresso.
          </p>
          <Link to="/goals/new">
            <Button variant="primary" className="gap-2">
              <Plus className="w-5 h-5" />
              Criar primeira meta
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl text-foreground mb-4">Metas Ativas</h2>
              <div className="grid grid-cols-1 gap-6">
                {activeGoals.map((goal) => {
                  const current = parseFloat(goal.current_amount);
                  const target = parseFloat(goal.target_amount);
                  const progress = Math.min((current / target) * 100, 100);
                  const remaining = Math.max(0, target - current);
                  const daysLeft = getDaysRemaining(goal.deadline);

                  return (
                    <div
                      key={goal.id}
                      className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                              <Target className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl text-foreground">{goal.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {CATEGORY_LABELS[goal.category]}
                                {goal.description && ` — ${goal.description}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openContribute(goal)}
                            className="p-2 hover:bg-secondary/10 rounded-lg transition-colors"
                            title="Aportar valor"
                          >
                            <PiggyBank className="w-5 h-5 text-muted-foreground hover:text-secondary" />
                          </button>
                          <button
                            onClick={() => openEdit(goal)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(goal)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            Progresso: {progress.toFixed(1)}%
                          </span>
                          <span className="text-sm text-primary">
                            Faltam {formatCurrency(remaining)}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          {goal.deadline && (
                            <>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Prazo: {formatDate(goal.deadline)}</span>
                              </div>
                              {daysLeft !== null && (
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs ${
                                    daysLeft > 90
                                      ? 'bg-secondary/10 text-secondary'
                                      : daysLeft > 30
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-destructive/10 text-destructive'
                                  }`}
                                >
                                  {daysLeft > 0 ? `${daysLeft} dias restantes` : 'Vencido'}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Valor Atual</div>
                          <div className="text-xl text-foreground">{formatCurrency(current)}</div>
                          <div className="text-xs text-muted-foreground">
                            de {formatCurrency(target)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paused Goals */}
          {pausedGoals.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl text-foreground mb-4">Metas Pausadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pausedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-muted/30 rounded-xl border border-border p-6"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg text-foreground">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_LABELS[goal.category]}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(goal)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(goal)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">Pausada</span>
                      <span className="text-sm text-foreground">
                        {formatCurrency(goal.current_amount)} de{' '}
                        {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-2xl text-foreground mb-4">Metas Concluídas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-gradient-to-br from-secondary/5 to-primary/5 rounded-xl border border-secondary/20 p-6"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg text-foreground mb-1">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_LABELS[goal.category]}
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(goal)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary">
                        Concluída {goal.deadline && `em ${formatDate(goal.deadline)}`}
                      </span>
                      <span className="text-lg text-foreground">
                        {formatCurrency(goal.target_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta <strong>{deleteTarget?.name}</strong>?
              <br />
              Esta ação não pode ser desfeita.
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

      {/* Contribute Modal */}
      <Dialog
        open={!!contributingTo}
        onOpenChange={(open) => !open && !contributing && setContributingTo(null)}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Aportar para {contributingTo?.name}</DialogTitle>
            <DialogDescription>
              Adicione um valor a esta meta. O progresso será atualizado automaticamente.
            </DialogDescription>
          </DialogHeader>
          {contributingTo && (
            <div className="grid gap-4 py-4">
              <div className="bg-accent rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Atual:</span>
                  <span className="text-foreground">{formatCurrency(contributingTo.current_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meta:</span>
                  <span className="text-foreground">{formatCurrency(contributingTo.target_amount)}</span>
                </div>
              </div>

              <div className="grid gap-2">
                <label htmlFor="contributeAmount" className="text-sm font-medium">
                  Valor do aporte (R$)
                </label>
                <input
                  id="contributeAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  autoFocus
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="0,00"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={contributing}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="contributeNotes" className="text-sm font-medium">
                  Observação (opcional)
                </label>
                <input
                  id="contributeNotes"
                  type="text"
                  value={contributeNotes}
                  onChange={(e) => setContributeNotes(e.target.value)}
                  placeholder="Ex: Mesada de Janeiro, bônus do trabalho..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={contributing}
                />
              </div>

              {contributeError && (
                <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">
                  {contributeError}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContributingTo(null)}
              disabled={contributing}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleContribute} disabled={contributing}>
              {contributing ? 'Aportando...' : 'Aportar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Modal */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => !saving && setEditDialogOpen(open)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Meta Financeira</DialogTitle>
            <DialogDescription>
              Faça as alterações necessárias na meta abaixo.
            </DialogDescription>
          </DialogHeader>
          {editingGoal && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">Nome da Meta</label>
                <input
                  id="edit-name"
                  value={editingGoal.name}
                  onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="edit-description" className="text-sm font-medium">Descrição</label>
                <textarea
                  id="edit-description"
                  value={editingGoal.description}
                  onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-target" className="text-sm font-medium">Valor Alvo (R$)</label>
                  <input
                    id="edit-target"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingGoal.target_amount}
                    onChange={(e) => setEditingGoal({ ...editingGoal, target_amount: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-category" className="text-sm font-medium">Categoria</label>
                  <select
                    id="edit-category"
                    value={editingGoal.category}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, category: e.target.value as Goal['category'] })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={saving}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="edit-deadline" className="text-sm font-medium">Prazo (opcional)</label>
                  <input
                    id="edit-deadline"
                    type="date"
                    value={editingGoal.deadline || ''}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, deadline: e.target.value || null })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={saving}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="edit-status" className="text-sm font-medium">Status</label>
                  <select
                    id="edit-status"
                    value={editingGoal.status}
                    onChange={(e) =>
                      setEditingGoal({ ...editingGoal, status: e.target.value as Goal['status'] })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={saving}
                  >
                    <option value="active">Ativa</option>
                    <option value="completed">Concluída</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>
              </div>

              {editError && (
                <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">
                  {editError}
                </div>
              )}
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