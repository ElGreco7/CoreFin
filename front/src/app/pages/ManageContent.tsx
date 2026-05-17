import { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Video,
  Image as ImageIcon,
  BookOpen,
  Calendar,
  Eye,
  Filter,
  CheckCircle,
  Clock,
  Archive,
  Layers,
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
import {
  education,
  Content,
  Path,
  ContentType,
  ContentStatus,
  Level,
} from '../services/education';
import { ApiError } from '../services/api';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: 'Artigo',
  video: 'Vídeo',
  image: 'Imagem',
  document: 'Documento',
};

const STATUS_LABELS: Record<ContentStatus, string> = {
  published: 'Publicado',
  draft: 'Rascunho',
  archived: 'Arquivado',
};

const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

function getTypeIcon(type: ContentType) {
  switch (type) {
    case 'article': return FileText;
    case 'video': return Video;
    case 'image': return ImageIcon;
    case 'document': return BookOpen;
  }
}

function getTypeColor(type: ContentType) {
  switch (type) {
    case 'article': return 'bg-primary/10 text-primary';
    case 'video': return 'bg-destructive/10 text-destructive';
    case 'image': return 'bg-secondary/10 text-secondary';
    case 'document': return 'bg-yellow-500/10 text-yellow-600';
  }
}

function getStatusBadge(status: ContentStatus) {
  switch (status) {
    case 'published':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary">
          <CheckCircle className="w-4 h-4" />
          Publicado
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-500/10 text-yellow-600">
          <Clock className="w-4 h-4" />
          Rascunho
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
          <Archive className="w-4 h-4" />
          Arquivado
        </span>
      );
  }
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

type Tab = 'contents' | 'paths';

export function ManageContent() {
  const [activeTab, setActiveTab] = useState<Tab>('contents');

  const [contents, setContents] = useState<Content[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros (conteúdos)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal de conteúdo
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentForm, setContentForm] = useState<{
    title: string;
    description: string;
    category: string;
    type: ContentType;
    level: Level;
    status: ContentStatus;
    duration_minutes: number;
    body: string;
    file_url: string;
    thumbnail_url: string;
  }>({
    title: '',
    description: '',
    category: '',
    type: 'article',
    level: 'beginner',
    status: 'draft',
    duration_minutes: 0,
    body: '',
    file_url: '',
    thumbnail_url: '',
  });

  // Modal de trilha
  const [showPathModal, setShowPathModal] = useState(false);
  const [editingPath, setEditingPath] = useState<Path | null>(null);
  const [pathForm, setPathForm] = useState<{
    title: string;
    description: string;
    level: Level;
    is_published: boolean;
    thumbnail_url: string;
  }>({
    title: '',
    description: '',
    level: 'beginner',
    is_published: true,
    thumbnail_url: '',
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Exclusão
  const [deleteContent, setDeleteContent] = useState<Content | null>(null);
  const [deletePath, setDeletePath] = useState<Path | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [contentsData, pathsData] = await Promise.all([
        education.listContents({ page_size: 100 }).catch(() => null),
        education.listPaths({ page_size: 100 }).catch(() => null),
      ]);
      if (contentsData?.results) setContents(contentsData.results);
      if (pathsData?.results) setPaths(pathsData.results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Filtros de conteúdo ───────────────────────────────────────────────
  const categories = ['Todos', ...Array.from(new Set(contents.map((c) => c.category).filter(Boolean)))];

  const filteredContents = contents.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || c.category === selectedCategory;
    const matchesType = selectedType === 'all' || c.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  // Estatísticas
  const publishedCount = contents.filter((c) => c.status === 'published').length;
  const totalViews = contents.reduce((sum, c) => sum + (c.views_count || 0), 0);
  const totalDownloads = contents.reduce((sum, c) => sum + (c.downloads_count || 0), 0);

  // ── Ações de conteúdo ─────────────────────────────────────────────────

  function openNewContent() {
    setEditingContent(null);
    setContentForm({
      title: '',
      description: '',
      category: '',
      type: 'article',
      level: 'beginner',
      status: 'draft',
      duration_minutes: 0,
      body: '',
      file_url: '',
      thumbnail_url: '',
    });
    setFormError('');
    setShowContentModal(true);
  }

  function openEditContent(c: Content) {
    setEditingContent(c);
    setContentForm({
      title: c.title,
      description: c.description || '',
      category: c.category || '',
      type: c.type,
      level: c.level,
      status: c.status,
      duration_minutes: c.duration_minutes || 0,
      body: c.body || '',
      file_url: c.file_url || '',
      thumbnail_url: c.thumbnail_url || '',
    });
    setFormError('');
    setShowContentModal(true);
  }

  async function handleSaveContent() {
    setFormError('');
    if (!contentForm.title.trim()) {
      setFormError('Título é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Content> = {
        title: contentForm.title,
        description: contentForm.description,
        category: contentForm.category,
        type: contentForm.type,
        level: contentForm.level,
        status: contentForm.status,
        duration_minutes: contentForm.duration_minutes,
        body: contentForm.body,
        file_url: contentForm.file_url,
        thumbnail_url: contentForm.thumbnail_url,
      };

      // Se está mudando pra publicado e não tinha published_at, define agora
      if (contentForm.status === 'published') {
        (payload as any).published_at = new Date().toISOString();
      }

      if (editingContent) {
        const updated = await education.updateContent(editingContent.id, payload);
        setContents((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await education.createContent(payload);
        setContents((prev) => [created, ...prev]);
      }
      setShowContentModal(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data || {};
        const firstError =
          data.title?.[0] || data.type?.[0] || data.detail || 'Erro ao salvar conteúdo.';
        setFormError(firstError);
      } else {
        setFormError('Erro de conexão.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContent() {
    if (!deleteContent) return;
    setDeleting(true);
    try {
      await education.deleteContent(deleteContent.id);
      setContents((prev) => prev.filter((c) => c.id !== deleteContent.id));
      setDeleteContent(null);
    } catch {
      alert('Erro ao excluir conteúdo.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Ações de trilha ───────────────────────────────────────────────────

  function openNewPath() {
    setEditingPath(null);
    setPathForm({
      title: '',
      description: '',
      level: 'beginner',
      is_published: true,
      thumbnail_url: '',
    });
    setFormError('');
    setShowPathModal(true);
  }

  function openEditPath(p: Path) {
    setEditingPath(p);
    setPathForm({
      title: p.title,
      description: p.description || '',
      level: p.level,
      is_published: p.is_published,
      thumbnail_url: p.thumbnail_url || '',
    });
    setFormError('');
    setShowPathModal(true);
  }

  async function handleSavePath() {
    setFormError('');
    if (!pathForm.title.trim()) {
      setFormError('Título é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<Path> = {
        title: pathForm.title,
        description: pathForm.description,
        level: pathForm.level,
        is_published: pathForm.is_published,
        thumbnail_url: pathForm.thumbnail_url,
      };

      if (editingPath) {
        const updated = await education.updatePath(editingPath.id, payload);
        setPaths((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await education.createPath(payload);
        setPaths((prev) => [created, ...prev]);
      }
      setShowPathModal(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.data?.detail || 'Erro ao salvar trilha.');
      } else {
        setFormError('Erro de conexão.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePath() {
    if (!deletePath) return;
    setDeleting(true);
    try {
      await education.deletePath(deletePath.id);
      setPaths((prev) => prev.filter((p) => p.id !== deletePath.id));
      setDeletePath(null);
    } catch {
      alert('Erro ao excluir trilha.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Gerenciar Conteúdo</h1>
          <p className="text-muted-foreground">Administre trilhas e conteúdos educacionais</p>
        </div>
        <Button
          variant="primary"
          className="gap-2"
          onClick={activeTab === 'contents' ? openNewContent : openNewPath}
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'contents' ? 'Novo Conteúdo' : 'Nova Trilha'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Conteúdos</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : contents.length}</div>
          <div className="text-sm text-primary">cadastrados</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Publicados</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : publishedCount}</div>
          <div className="text-sm text-secondary">disponíveis ao público</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Trilhas</span>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : paths.length}</div>
          <div className="text-sm text-primary">criadas</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Visualizações</span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : totalViews.toLocaleString('pt-BR')}
          </div>
          <div className="text-sm text-secondary">no total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-card border border-border rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('contents')}
          className={`px-6 py-2 rounded-md transition-all ${
            activeTab === 'contents'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Conteúdos ({contents.length})
        </button>
        <button
          onClick={() => setActiveTab('paths')}
          className={`px-6 py-2 rounded-md transition-all ${
            activeTab === 'paths'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Trilhas ({paths.length})
        </button>
      </div>

      {activeTab === 'contents' && (
        <>
          {/* Filtros */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar conteúdo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="article">Artigos</option>
                  <option value="video">Vídeos</option>
                  <option value="image">Imagens</option>
                  <option value="document">Documentos</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="published">Publicado</option>
                  <option value="draft">Rascunho</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>

              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        selectedCategory === category
                          ? 'bg-primary text-white'
                          : 'bg-accent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Conteúdos */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Conteúdo</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Categoria</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Estatísticas</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </td>
                    </tr>
                  ) : filteredContents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl text-foreground mb-2">Nenhum conteúdo encontrado</h3>
                        <p className="text-muted-foreground">
                          Tente ajustar os filtros ou criar novo conteúdo
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredContents.map((content) => {
                      const TypeIcon = getTypeIcon(content.type);
                      return (
                        <tr key={content.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(content.type)}`}
                              >
                                <TypeIcon className="w-5 h-5" />
                              </div>
                              <div className="max-w-md">
                                <div className="text-foreground mb-1">{content.title}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {content.description}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  <span>Criado em {formatDate(content.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${getTypeColor(content.type)}`}
                            >
                              <TypeIcon className="w-4 h-4" />
                              {CONTENT_TYPE_LABELS[content.type]}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-foreground">{content.category || '-'}</span>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(content.status)}</td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <Eye className="w-4 h-4 text-muted-foreground" />
                                {content.views_count.toLocaleString('pt-BR')} views
                              </div>
                              {content.duration_minutes > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  {content.duration_minutes} min
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditContent(content)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                              </button>
                              <button
                                onClick={() => setDeleteContent(content)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </button>
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
        </>
      )}

      {activeTab === 'paths' && (
        <>
          {/* Tabela de Trilhas */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Trilha</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Nível</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Conteúdos</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-left text-sm text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </td>
                    </tr>
                  ) : paths.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16">
                        <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl text-foreground mb-2">Nenhuma trilha criada</h3>
                        <p className="text-muted-foreground">
                          Crie sua primeira trilha clicando em "Nova Trilha"
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paths.map((path) => (
                      <tr key={path.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                              <Layers className="w-5 h-5 text-white" />
                            </div>
                            <div className="max-w-md">
                              <div className="text-foreground mb-1">{path.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {path.description}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                Criada em {formatDate(path.created_at)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground">
                            {LEVEL_LABELS[path.level]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground">
                            {path.content_count || 0}{' '}
                            {(path.content_count || 0) === 1 ? 'conteúdo' : 'conteúdos'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {path.is_published ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary">
                              <CheckCircle className="w-4 h-4" />
                              Publicada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-500/10 text-yellow-600">
                              <Clock className="w-4 h-4" />
                              Rascunho
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPath(path)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </button>
                            <button
                              onClick={() => setDeletePath(path)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
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
        </>
      )}

      {/* Modal Conteúdo */}
      <Dialog open={showContentModal} onOpenChange={(open) => !saving && setShowContentModal(open)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? 'Editar Conteúdo' : 'Novo Conteúdo'}
            </DialogTitle>
            <DialogDescription>
              {editingContent
                ? 'Edite os dados do conteúdo abaixo.'
                : 'Crie um novo conteúdo educacional.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Título *</label>
              <input
                type="text"
                value={contentForm.title}
                onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                rows={2}
                value={contentForm.description}
                onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  value={contentForm.type}
                  onChange={(e) => setContentForm({ ...contentForm, type: e.target.value as ContentType })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                >
                  <option value="article">Artigo</option>
                  <option value="video">Vídeo</option>
                  <option value="image">Imagem</option>
                  <option value="document">Documento</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Nível *</label>
                <select
                  value={contentForm.level}
                  onChange={(e) => setContentForm({ ...contentForm, level: e.target.value as Level })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                >
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Planejamento, Tributação..."
                  value={contentForm.category}
                  onChange={(e) => setContentForm({ ...contentForm, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Duração (minutos)</label>
                <input
                  type="number"
                  min="0"
                  value={contentForm.duration_minutes}
                  onChange={(e) =>
                    setContentForm({ ...contentForm, duration_minutes: parseInt(e.target.value) || 0 })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                />
              </div>
            </div>

            {/* Campos condicionais por tipo */}
            {contentForm.type === 'article' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Conteúdo do Artigo (markdown/texto)</label>
                <textarea
                  rows={6}
                  value={contentForm.body}
                  onChange={(e) => setContentForm({ ...contentForm, body: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  disabled={saving}
                />
              </div>
            )}

            {contentForm.type !== 'article' && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">URL do arquivo</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={contentForm.file_url}
                  onChange={(e) => setContentForm({ ...contentForm, file_url: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  {contentForm.type === 'video' && 'Cole aqui o link do vídeo (YouTube, Vimeo, etc).'}
                  {contentForm.type === 'image' && 'URL pública da imagem.'}
                  {contentForm.type === 'document' && 'URL do PDF ou documento.'}
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">URL da Miniatura (opcional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={contentForm.thumbnail_url}
                onChange={(e) => setContentForm({ ...contentForm, thumbnail_url: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Status *</label>
              <select
                value={contentForm.status}
                onChange={(e) => setContentForm({ ...contentForm, status: e.target.value as ContentStatus })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Apenas conteúdos "Publicado" aparecem pra usuários comuns.
              </p>
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContentModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveContent} disabled={saving}>
              {saving ? 'Salvando...' : editingContent ? 'Salvar Alterações' : 'Criar Conteúdo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Trilha */}
      <Dialog open={showPathModal} onOpenChange={(open) => !saving && setShowPathModal(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPath ? 'Editar Trilha' : 'Nova Trilha'}
            </DialogTitle>
            <DialogDescription>
              Trilhas agrupam conteúdos relacionados em uma sequência de aprendizado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Título *</label>
              <input
                type="text"
                value={pathForm.title}
                onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Descrição</label>
              <textarea
                rows={3}
                value={pathForm.description}
                onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                disabled={saving}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Nível *</label>
              <select
                value={pathForm.level}
                onChange={(e) => setPathForm({ ...pathForm, level: e.target.value as Level })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              >
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">URL da Miniatura (opcional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={pathForm.thumbnail_url}
                onChange={(e) => setPathForm({ ...pathForm, thumbnail_url: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={saving}
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
              <input
                id="is_published"
                type="checkbox"
                checked={pathForm.is_published}
                onChange={(e) => setPathForm({ ...pathForm, is_published: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
                disabled={saving}
              />
              <label htmlFor="is_published" className="text-sm text-foreground cursor-pointer">
                Trilha publicada (visível aos usuários comuns)
              </label>
            </div>

            {formError && (
              <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPathModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSavePath} disabled={saving}>
              {saving ? 'Salvando...' : editingPath ? 'Salvar Alterações' : 'Criar Trilha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Content */}
      <AlertDialog open={!!deleteContent} onOpenChange={(open) => !open && setDeleteContent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <strong>{deleteContent?.title}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Path */}
      <AlertDialog open={!!deletePath} onOpenChange={(open) => !open && setDeletePath(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir trilha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletePath?.title}</strong>?
              <br />
              Os conteúdos individuais não serão excluídos, apenas o agrupamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePath}
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