/**
 * src/app/components/CategoryManager.tsx
 *
 * Gerencia as categorias do usuário: listar, criar, renomear, excluir.
 * Separa visualmente categorias de Receita e Despesa.
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from './Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { finance, Category } from '../services/finance';

type CategoryType = 'income' | 'expense';

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Criar nova
  const [creatingType, setCreatingType] = useState<CategoryType | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Editar (renomear)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Excluir
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Erro genérico
  const [errorMsg, setErrorMsg] = useState('');

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await finance.listCategories();
      setCategories(data.results);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // Categorias separadas por tipo
  const incomes = categories.filter((c) => c.type === 'income').sort((a, b) => a.name.localeCompare(b.name));
  const expenses = categories.filter((c) => c.type === 'expense').sort((a, b) => a.name.localeCompare(b.name));

  // ── Criar ─────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!newName.trim() || !creatingType) return;

    setErrorMsg('');
    setCreating(true);
    try {
      const created = await finance.createCategory({
        name: newName.trim(),
        type: creatingType,
      });
      setCategories((prev) => [...prev, created]);
      setNewName('');
      setCreatingType(null);
    } catch (err: any) {
      if (err?.data?.name) {
        setErrorMsg(`Já existe uma categoria "${newName}" deste tipo.`);
      } else {
        setErrorMsg('Erro ao criar categoria.');
      }
    } finally {
      setCreating(false);
    }
  }

  // ── Editar (renomear) ─────────────────────────────────────────────────
  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setErrorMsg('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;

    setErrorMsg('');
    setSaving(true);
    try {
      const updated = await finance.updateCategory(editingId, { name: editName.trim() });
      setCategories((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      cancelEdit();
    } catch (err: any) {
      if (err?.data?.name) {
        setErrorMsg(`Já existe uma categoria "${editName}" deste tipo.`);
      } else {
        setErrorMsg('Erro ao salvar alteração.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Excluir ───────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await finance.deleteCategory(deleteTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setErrorMsg('Erro ao excluir categoria.');
    } finally {
      setDeleting(false);
    }
  }

  // ── UI de uma lista (income ou expense) ───────────────────────────────
  function renderList(list: Category[], type: CategoryType, label: string, accentColor: string) {
    const Icon = type === 'income' ? ArrowUpRight : ArrowDownRight;
    return (
      <div className="bg-accent rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${accentColor}`} />
            <h3 className="text-lg text-foreground">{label}</h3>
            <span className="text-sm text-muted-foreground">({list.length})</span>
          </div>
          {creatingType !== type && (
            <button
              onClick={() => {
                setCreatingType(type);
                setNewName('');
                setEditingId(null);
                setErrorMsg('');
              }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Nova
            </button>
          )}
        </div>

        {/* Form inline pra criar */}
        {creatingType === type && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              autoFocus
              placeholder={`Nome da categoria de ${type === 'income' ? 'receita' : 'despesa'}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') {
                  setCreatingType(null);
                  setNewName('');
                }
              }}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={creating}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? '...' : 'Criar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCreatingType(null);
                setNewName('');
              }}
              disabled={creating}
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* Lista */}
        {list.length === 0 && creatingType !== type ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria cadastrada.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 px-3 py-1.5 bg-accent border border-border rounded text-foreground focus:outline-none focus:ring-2 focus:ring-primary mr-2"
                      disabled={saving}
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-2 hover:bg-accent rounded-lg transition-colors text-secondary"
                      title="Salvar"
                      disabled={saving}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
                      title="Cancelar"
                      disabled={saving}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        title="Renomear"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando categorias...
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl text-foreground mb-2">Gerenciar Categorias</h2>
      <p className="text-muted-foreground mb-6">
        Crie, renomeie ou exclua categorias para organizar suas transações.
        Excluir uma categoria não apaga as transações — elas ficam como "Sem categoria".
      </p>

      {errorMsg && (
        <div className="mb-4 bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderList(incomes, 'income', 'Receitas', 'text-secondary')}
        {renderList(expenses, 'expense', 'Despesas', 'text-destructive')}
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{deleteTarget?.name}</strong>?
              <br />
              As transações associadas <strong>não serão apagadas</strong> — elas ficarão sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}