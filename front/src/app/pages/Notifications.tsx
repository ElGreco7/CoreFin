import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bell,
  Check,
  Trash2,
  AlertCircle,
  TrendingUp,
  Target,
  Settings as SettingsIcon,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  notifications as notificationsService,
  Notification,
  NotificationType,
} from '../services/notifications';

export function Notifications() {
  const navigate = useNavigate();

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  // Carrega notificações
  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await notificationsService.listNotifications({
        ordering: '-created_at',
        page_size: 100,
      });
      setItems(data.results);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'unread' ? items.filter((n) => !n.read) : items;

  // ── Ações ──────────────────────────────────────────────────────────────

  async function handleMarkAsRead(id: number) {
    // Otimismo: atualiza UI antes de esperar a resposta
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsService.markAsRead(id);
    } catch {
      // Reverte em caso de erro
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      alert('Erro ao marcar como lida. Tente novamente.');
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    // Otimismo
    const previousState = [...items];
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await notificationsService.markAllAsRead();
    } catch {
      setItems(previousState);
      alert('Erro ao marcar todas como lidas.');
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleDelete(id: number) {
    // Otimismo
    const previousState = [...items];
    setItems((prev) => prev.filter((n) => n.id !== id));

    try {
      await notificationsService.deleteNotification(id);
    } catch {
      setItems(previousState);
      alert('Erro ao excluir notificação.');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
  }

  function getNotificationIcon(type: NotificationType) {
    switch (type) {
      case 'success':
        return <TrendingUp className="w-5 h-5 text-secondary" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case 'goal':
        return <Target className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  }

  function getNotificationStyle(type: NotificationType) {
    switch (type) {
      case 'success':
        return 'bg-secondary/10 border-secondary/20';
      case 'warning':
        return 'bg-destructive/10 border-destructive/20';
      case 'goal':
        return 'bg-primary/10 border-primary/20';
      default:
        return 'bg-accent border-border';
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-3xl text-foreground mb-2">Notificações</h1>
            <p className="text-muted-foreground">
              {loading
                ? 'Carregando...'
                : unreadCount > 0
                ? `Você tem ${unreadCount} ${unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}`
                : 'Todas as notificações foram lidas'}
            </p>
          </div>
        </div>
        <Link to="/settings">
          <Button variant="outline" className="gap-2">
            <SettingsIcon className="w-5 h-5" />
            Configurar
          </Button>
        </Link>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas ({items.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === 'unread'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Não lidas ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            className="gap-2"
            disabled={markingAll}
          >
            <Check className="w-5 h-5" />
            {markingAll ? 'Marcando...' : 'Marcar todas como lidas'}
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === 'unread'
                ? 'Nenhuma notificação não lida'
                : 'Nenhuma notificação por aqui'}
            </p>
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                As notificações vão aparecer aqui quando houver alertas, conquistas ou avisos do sistema.
              </p>
            )}
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card rounded-xl border p-4 transition-all hover:shadow-md ${
                !notification.read ? 'border-l-4 border-l-primary' : ''
              } ${getNotificationStyle(notification.type)}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'success'
                      ? 'bg-secondary/10'
                      : notification.type === 'warning'
                      ? 'bg-destructive/10'
                      : notification.type === 'goal'
                      ? 'bg-primary/10'
                      : 'bg-accent'
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-foreground">
                      {notification.title}
                      {!notification.read && (
                        <span className="ml-2 inline-block w-2 h-2 bg-primary rounded-full"></span>
                      )}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Marcar como lida
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}