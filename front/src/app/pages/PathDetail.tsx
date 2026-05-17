import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, Video, FileText, Image as ImageIcon, CheckCircle, Clock, Play } from 'lucide-react';
import { Button } from '../components/Button';
import { education, Path, ContentType, Level } from '../services/education';

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
    case 'video': return <Video className={className} />;
    case 'article': return <BookOpen className={className} />;
    case 'image': return <ImageIcon className={className} />;
    case 'document': return <FileText className={className} />;
  }
}

export function PathDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [path, setPath] = useState<Path | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await education.getPath(Number(id));
        setPath(data);
      } catch {
        setError('Trilha não encontrada.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando trilha...</p>
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{error || 'Trilha não encontrada.'}</p>
        <Link to="/education">
          <Button variant="primary" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Educação
          </Button>
        </Link>
      </div>
    );
  }

  const pathContents = path.path_contents || [];
  const sortedContents = [...pathContents].sort((a, b) => a.display_order - b.display_order);
  const completedCount = sortedContents.filter(pc => pc.content.is_completed).length;
  const totalCount = sortedContents.length;
  const progress = path.completion_percent || 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/education')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Educação
      </button>

      {/* Header da trilha */}
      <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl border border-border p-8 mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {path.level && (
                <span className={`px-3 py-1 rounded-full text-sm ${
                  path.level === 'beginner' ? 'bg-secondary/10 text-secondary' :
                  path.level === 'intermediate' ? 'bg-primary/10 text-primary' :
                  'bg-destructive/10 text-destructive'
                }`}>
                  {LEVEL_LABELS[path.level]}
                </span>
              )}
            </div>
            <h1 className="text-3xl text-foreground mb-2">{path.title}</h1>
            {path.description && (
              <p className="text-muted-foreground">{path.description}</p>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {completedCount} de {totalCount} conteúdos concluídos
            </span>
            <span className="text-sm text-primary">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de conteúdos */}
      <div>
        <h2 className="text-2xl text-foreground mb-4">Conteúdos da trilha</h2>

        {sortedContents.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Esta trilha ainda não tem conteúdos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedContents.map((pc, idx) => {
              const c = pc.content;
              const completed = c.is_completed;
              return (
                <Link
                  key={pc.id}
                  to={`/education/content/${c.id}`}
                  className="block bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Numeração + status */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      completed ? 'bg-secondary text-white' : 'bg-accent text-muted-foreground'
                    }`}>
                      {completed ? <CheckCircle className="w-5 h-5" /> : <span>{idx + 1}</span>}
                    </div>

                    {/* Ícone do tipo */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      c.type === 'video' ? 'bg-destructive/10 text-destructive' :
                      c.type === 'article' ? 'bg-primary/10 text-primary' :
                      'bg-secondary/10 text-secondary'
                    }`}>
                      {getTypeIcon(c.type)}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {c.description}
                      </p>
                    </div>

                    {/* Duração */}
                    {c.duration_minutes > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                        <Clock className="w-4 h-4" />
                        {formatDuration(c.duration_minutes)}
                      </div>
                    )}

                    {/* CTA */}
                    <div className="text-primary flex-shrink-0">
                      <Play className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
