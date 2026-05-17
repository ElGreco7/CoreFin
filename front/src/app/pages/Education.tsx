import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Search,
  BookOpen,
  Video,
  Award,
  TrendingUp,
  Clock,
  Play,
  CheckCircle,
  Star,
  Filter,
  ArrowRight,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  education,
  Content,
  Path,
  ContentType,
  Level,
} from '../services/education';

const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

function getTypeIcon(type: ContentType, className = 'w-5 h-5') {
  switch (type) {
    case 'video':
      return <Video className={className} />;
    case 'article':
      return <BookOpen className={className} />;
    case 'image':
      return <ImageIcon className={className} />;
    case 'document':
      return <FileText className={className} />;
  }
}

export function Education() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedType, setSelectedType] = useState<'all' | ContentType>('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [pathsData, contentsData] = await Promise.all([
          education.listPaths({ page_size: 50 }).catch(() => null),
          education.listContents({ page_size: 100 }).catch(() => null),
        ]);
        if (pathsData?.results) setPaths(pathsData.results);
        if (contentsData?.results) setContents(contentsData.results);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Categorias únicas extraídas dos conteúdos
  const categories = [
    'Todos',
    ...Array.from(new Set(contents.map((c) => c.category).filter(Boolean))),
  ];

  // Filtros
  const filteredContent = contents.filter((content) => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Todos' || content.category === selectedCategory;
    const matchesType = selectedType === 'all' || content.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  // Estatísticas
  const completedCount = contents.filter((c) => c.is_completed).length;
  const totalMinutes = contents.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const activePathsCount = paths.filter(
    (p) => p.completion_percent !== undefined && p.completion_percent > 0 && p.completion_percent < 100
  ).length;

  // Handler de "concluir" um conteúdo (a partir do card)
  async function handleMarkCompleted(content: Content) {
    try {
      await education.markAsCompleted(content.id);
      setContents((prev) =>
        prev.map((c) =>
          c.id === content.id ? { ...c, is_completed: true, user_progress_percent: 100 } : c
        )
      );
    } catch {
      alert('Erro ao marcar como concluído.');
    }
  }

  // Recomendações: 2 conteúdos não concluídos, priorizando os mais bem avaliados
  const recommendations = contents
    .filter((c) => !c.is_completed)
    .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
    .slice(0, 2);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Educação Financeira</h1>
        <p className="text-muted-foreground">
          Aprimore suas habilidades e conhecimentos em gestão financeira
        </p>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Conteúdos Concluídos</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : completedCount}</div>
          <div className="text-sm text-secondary">
            de {contents.length} disponíveis
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Tempo de Estudo</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : `${totalHours.toFixed(1)}h`}
          </div>
          <div className="text-sm text-primary">conteúdo total</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Trilhas Ativas</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : activePathsCount}</div>
          <div className="text-sm text-primary">em progresso</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Trilhas</span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">{loading ? '...' : paths.length}</div>
          <div className="text-sm text-secondary">disponíveis</div>
        </div>
      </div>

      {/* Loading geral */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground">Carregando conteúdo educacional...</p>
        </div>
      ) : paths.length === 0 && contents.length === 0 ? (
        /* Estado vazio total */
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl text-foreground mb-2">Conteúdo em breve</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Nossa equipe está preparando trilhas e conteúdos exclusivos sobre
            gestão financeira pra MEI. Volte logo!
          </p>
        </div>
      ) : (
        <>
          {/* Trilhas */}
          {paths.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl text-foreground">Trilhas de Aprendizado</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paths.map((path) => {
                  const progress = path.completion_percent || 0;
                  return (
                    <div
                      key={path.id}
                      className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg text-foreground mb-1">{path.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {path.description}
                          </p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {path.content_count || 0} {(path.content_count || 0) === 1 ? 'conteúdo' : 'conteúdos'}
                          </span>
                          <span className="text-sm text-primary">{progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full gap-2">
                        {progress > 0 ? 'Continuar' : 'Começar'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search e Filtros */}
          {contents.length > 0 && (
            <>
              <div className="mb-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar conteúdo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedType('all')}
                      className={`px-4 py-2.5 rounded-lg transition-all ${
                        selectedType === 'all'
                          ? 'bg-primary text-white'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setSelectedType('article')}
                      className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                        selectedType === 'article'
                          ? 'bg-primary text-white'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      Artigos
                    </button>
                    <button
                      onClick={() => setSelectedType('video')}
                      className={`px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 ${
                        selectedType === 'video'
                          ? 'bg-primary text-white'
                          : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      Vídeos
                    </button>
                  </div>
                </div>

                {/* Categorias */}
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

              {/* Grid de Conteúdos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl text-foreground">
                    {selectedCategory === 'Todos' ? 'Todo Conteúdo' : selectedCategory}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {filteredContent.length}{' '}
                    {filteredContent.length === 1 ? 'resultado' : 'resultados'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContent.map((content) => {
                    const completed = content.is_completed;
                    return (
                      <Link
                        key={content.id}
                        to={`/education/content/${content.id}`}
                        className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all cursor-pointer group block"
                      >
                        {/* Thumbnail */}
                        <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                          {content.thumbnail_url ? (
                            <img
                              src={content.thumbnail_url}
                              alt={content.title}
                              className="w-full h-full object-cover"
                            />
                          ) : content.type === 'video' ? (
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                          ) : (
                            <div className="text-primary group-hover:scale-110 transition-transform">
                              {getTypeIcon(content.type, 'w-16 h-16')}
                            </div>
                          )}
                          {completed && (
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          )}
                          {content.duration_minutes > 0 && (
                            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs text-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(content.duration_minutes)}
                            </div>
                          )}
                        </div>

                        {/* Content info */}
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                content.level === 'beginner'
                                  ? 'bg-secondary/10 text-secondary'
                                  : content.level === 'intermediate'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-destructive/10 text-destructive'
                              }`}
                            >
                              {LEVEL_LABELS[content.level]}
                            </span>
                            {content.category && (
                              <span className="text-xs text-muted-foreground">
                                {content.category}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {content.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {content.description}
                          </p>

                          <div className="flex items-center justify-between">
                            {content.average_rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm text-foreground">
                                  {content.average_rating.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem avaliações</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!completed) handleMarkCompleted(content);
                              }}
                              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-sm"
                            >
                              {completed ? 'Revisar' : 'Marcar como concluído'}
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {filteredContent.length === 0 && (
                  <div className="text-center py-16">
                    <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl text-foreground mb-2">
                      Nenhum conteúdo encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Tente ajustar os filtros ou buscar por outros termos
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recomendações */}
          {recommendations.length > 0 && (
            <div className="mt-12 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/20 p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl text-foreground mb-2">Recomendado pra você</h3>
                  <p className="text-muted-foreground">
                    Conteúdos bem avaliados que você ainda não concluiu
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec) => (
                  <Link
                    key={rec.id}
                    to={`/education/content/${rec.id}`}
                    className="bg-card rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer block"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          rec.type === 'video' ? 'bg-primary/10' : 'bg-secondary/10'
                        }`}
                      >
                        {getTypeIcon(rec.type, rec.type === 'video' ? 'w-5 h-5 text-primary' : 'w-5 h-5 text-secondary')}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-foreground mb-1">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {rec.duration_minutes > 0 && (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(rec.duration_minutes)}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{LEVEL_LABELS[rec.level]}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}