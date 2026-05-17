import { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Crown,
  KeyRound,
  Power,
  Copy,
  Building2,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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
import { adminApi, AdminUser, UserRole, ResetPasswordResponse } from '../services/admin';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 30) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR');
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  user: 'Usuário',
  viewer: 'Visualizador',
};

function getRoleBadgeColor(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'bg-destructive/10 text-destructive';
    case 'user':
      return 'bg-primary/10 text-primary';
    case 'viewer':
      return 'bg-secondary/10 text-secondary';
  }
}

function getRoleIcon(role: UserRole) {
  switch (role) {
    case 'admin':
      return Crown;
    case 'user':
      return User;
    case 'viewer':
      return Shield;
  }
}

export function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal de criar/editar
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    business_name: '',
    role: 'user' as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Modal de exclusão
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal de reset de senha (mostra o token)
  const [resetResponse, setResetResponse] = useState<ResetPasswordResponse | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await adminApi.listUsers({ page_size: 100 });
      setUsers(data.results);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtros aplicados
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || u.role === selectedRole;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && u.is_active) ||
      (selectedStatus === 'inactive' && !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Estatísticas
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;
  const inactiveUsers = totalUsers - activeUsers;

  // ── Ações ─────────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', business_name: '', role: 'user' });
    setFormError('');
    setShowAddModal(true);
  }

  function openEditModal(user: AdminUser) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      business_name: user.business_name || '',
      role: user.role,
    });
    setFormError('');
    setShowAddModal(true);
  }

  async function handleSave() {
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Nome é obrigatório.');
      return;
    }

    if (!editingUser) {
      // Criando: precisa de email e senha
      if (!formData.email.trim()) {
        setFormError('E-mail é obrigatório.');
        return;
      }
      if (formData.password.length < 8) {
        setFormError('A senha precisa ter no mínimo 8 caracteres.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Editar (não muda email/password aqui)
        const updated = await adminApi.updateUser(editingUser.id, {
          name: formData.name,
          business_name: formData.business_name,
          role: formData.role,
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        // Criar
        const created = await adminApi.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          business_name: formData.business_name || undefined,
          role: formData.role,
        });
        setUsers((prev) => [created, ...prev]);
      }
      setShowAddModal(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data || {};
        const firstError =
          data.email?.[0] ||
          data.password?.[0] ||
          data.name?.[0] ||
          data.detail ||
          'Erro ao salvar. Verifique os dados.';
        if (firstError.includes('already exists')) {
          setFormError('Este e-mail já está cadastrado.');
        } else {
          setFormError(firstError);
        }
      } else {
        setFormError('Erro de conexão.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user: AdminUser) {
    try {
      const updated = user.is_active
        ? await adminApi.deactivateUser(user.id)
        : await adminApi.activateUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      if (err instanceof ApiError && err.data?.detail) {
        alert(err.data.detail);
      } else {
        alert('Erro ao alterar status.');
      }
    }
  }

  async function handleResetPassword(user: AdminUser) {
    try {
      const response = await adminApi.resetUserPassword(user.id);
      setResetResponse(response);
    } catch {
      alert('Erro ao gerar token de reset.');
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.data?.detail) {
        alert(err.data.detail);
      } else {
        alert('Erro ao excluir usuário.');
      }
    } finally {
      setDeleting(false);
    }
  }

  function copyToken() {
    if (!resetResponse) return;
    const fullText = `UID: ${resetResponse.uid}\nToken: ${resetResponse.token}`;
    navigator.clipboard.writeText(fullText);
    alert('Token copiado!');
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Administre contas, permissões e acesso</p>
        </div>
        <Button variant="primary" className="gap-2" onClick={openAddModal}>
          <Plus className="w-5 h-5" />
          Adicionar Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Usuários</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : totalUsers}</div>
          <div className="text-sm text-primary">cadastrados</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Usuários Ativos</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : activeUsers}</div>
          <div className="text-sm text-secondary">contas habilitadas</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Administradores</span>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : adminUsers}</div>
          <div className="text-sm text-destructive">com acesso total</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Inativos</span>
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <XCircle className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : inactiveUsers}
          </div>
          <div className="text-sm text-muted-foreground">contas desabilitadas</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">Todas as Funções</option>
            <option value="admin">Administrador</option>
            <option value="user">Usuário</option>
            <option value="viewer">Visualizador</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-muted-foreground">Usuário</th>
                <th className="px-6 py-4 text-left text-sm text-muted-foreground">E-mail</th>
                <th className="px-6 py-4 text-left text-sm text-muted-foreground">Função</th>
                <th className="px-6 py-4 text-left text-sm text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm text-muted-foreground">Último Acesso</th>
                <th className="px-6 py-4 text-left text-sm text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    Carregando usuários...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl text-foreground mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-muted-foreground">Tente ajustar os filtros</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const RoleIcon = getRoleIcon(u.role);
                  const isCurrentUser = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-foreground flex items-center gap-2">
                              {u.name}
                              {isCurrentUser && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  você
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {u.business_name && (
                                <>
                                  <Building2 className="w-3 h-3" />
                                  {u.business_name}
                                  <span>•</span>
                                </>
                              )}
                              Cadastrado em {formatDate(u.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${getRoleBadgeColor(u.role)}`}
                        >
                          <RoleIcon className="w-4 h-4" />
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary">
                            <CheckCircle className="w-4 h-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
                            <XCircle className="w-4 h-4" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {timeAgo(u.last_login)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Resetar senha"
                          >
                            <KeyRound className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </button>
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                              title={u.is_active ? 'Desativar' : 'Ativar'}
                            >
                              <Power className={`w-4 h-4 ${u.is_active ? 'text-muted-foreground hover:text-destructive' : 'text-muted-foreground hover:text-secondary'}`} />
                            </button>
                          )}
                          {!isCurrentUser && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => !saving && setShowAddModal(open)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Edite os dados do usuário abaixo.'
                : 'Preencha os dados pra criar uma nova conta.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nome Completo *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">E-mail *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingUser || saving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              />
              {editingUser && (
                <p className="text-xs text-muted-foreground">
                  E-mail não pode ser alterado depois da criação.
                </p>
              )}
            </div>

            {!editingUser && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Senha Inicial * (mín. 8 caracteres)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                />
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">Nome do Negócio (opcional)</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Função *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              >
                <option value="user">Usuário</option>
                <option value="viewer">Visualizador (somente leitura no admin)</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              <br />
              Esta ação não pode ser desfeita e **todos os dados** do usuário
              (transações, metas, etc) serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Result Modal */}
      <Dialog open={!!resetResponse} onOpenChange={(open) => !open && setResetResponse(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Token de Reset Gerado</DialogTitle>
            <DialogDescription>
              Envie este token para <strong>{resetResponse?.user_email}</strong>{' '}
              redefinir a senha.
            </DialogDescription>
          </DialogHeader>
          {resetResponse && (
            <div className="grid gap-4 py-4">
              <div className="bg-accent rounded-lg p-4 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">UID</div>
                  <code className="text-sm font-mono text-foreground break-all">
                    {resetResponse.uid}
                  </code>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Token</div>
                  <code className="text-sm font-mono text-foreground break-all">
                    {resetResponse.token}
                  </code>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Em produção, esse token seria enviado por e-mail automaticamente. No
                desenvolvimento, copie e mande pro usuário pelo canal que preferir.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetResponse(null)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={copyToken} className="gap-2">
              <Copy className="w-4 h-4" />
              Copiar UID + Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}