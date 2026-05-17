import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, CheckCircle, Clock, Star, Calendar, Eye, Video, BookOpen, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { Button } from '../components/Button';
import { education, Content, ContentType, Level } from '../services/education';

const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

function getTypeIcon(type: ContentType) {
  switch (type) {
    case 'video': return Video;
    case 'article': return BookOpen;
    case 'image': return ImageIcon;
    case 'document': return FileText;
  }
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isVimeo(url: string): boolean {
  return /vimeo\.com/.test(url);
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function renderMarkdown(body: string) {
  const NL = String.fromCharCode(10);
  const lines = body.split(NL);
  return lines.map((line, idx) => {
    if (line.startsWith('## ')) return <h2 key={idx} className="text-2xl text-foreground mt-6 mb-3">{line.replace('## ', '')}</h2>;
    if (line.startsWith('### ')) return <h3 key={idx} className="text-xl text-foreground mt-4 mb-2">{line.replace('### ', '')}</h3>;
    if (line.startsWith('# ')) return <h1 key={idx} className="text-3xl text-foreground mt-6 mb-3">{line.replace('# ', '')}</h1>;
    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx} className="text-foreground ml-6 mb-1 list-disc">{line.substring(2)}</li>;
    if (line.trim() === '') return <div key={idx} className="h-3" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={idx} className="text-foreground leading-relaxed mb-3">
        {parts.map((part, pIdx) => part.startsWith('**') && part.endsWith('**') ? (<strong key={pIdx} className="font-semibold">{part.slice(2, -2)}</strong>) : part)}
      </p>
    );
  });
}

export function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [markingCompleted, setMarkingCompleted] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const data = await education.getContent(Number(id));
        setContent(data);
      } catch {
        setError('Conteúdo não encontrado.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleMarkCompleted() {
    if (!content) return;
    setMarkingCompleted(true);
    try {
      await education.markAsCompleted(content.id);
      setContent({ ...content, is_completed: true, user_progress_percent: 100 });
    } catch {
      alert('Erro ao marcar como concluído.');
    } finally {
      setMarkingCompleted(false);
    }
  }

  if (loading) {
    return (<div className="p-8 flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Carregando conteúdo...</p></div>);
  }

  if (error || !content) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{error || 'Conteúdo não encontrado.'}</p>
        <Link to="/education"><Button variant="primary" className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar para Educação</Button></Link>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(content.type);
  const youtubeId = content.type === 'video' ? extractYouTubeId(content.file_url || '') : null;
  const vimeoId = content.type === 'video' && isVimeo(content.file_url || '') ? extractVimeoId(content.file_url || '') : null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate('/education')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar para Educação
      </button>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${content.type === 'video' ? 'bg-destructive/10 text-destructive' : content.type === 'article' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
          <TypeIcon className="w-4 h-4" />
          {content.type === 'video' ? 'Vídeo' : content.type === 'article' ? 'Artigo' : content.type === 'image' ? 'Imagem' : 'Documento'}
        </span>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${content.level === 'beginner' ? 'bg-secondary/10 text-secondary' : content.level === 'intermediate' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
          {LEVEL_LABELS[content.level]}
        </span>
        {content.category && (<span className="text-sm text-muted-foreground">{content.category}</span>)}
        {content.is_completed && (<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-secondary/10 text-secondary"><CheckCircle className="w-4 h-4" />Concluído</span>)}
      </div>

      <h1 className="text-3xl text-foreground mb-3">{content.title}</h1>
      {content.description && (<p className="text-lg text-muted-foreground mb-6">{content.description}</p>)}

      <div className="flex items-center gap-4 mb-8 flex-wrap text-sm text-muted-foreground">
        {content.duration_minutes > 0 && (<div className="flex items-center gap-1"><Clock className="w-4 h-4" />{content.duration_minutes} minutos</div>)}
        <div className="flex items-center gap-1"><Eye className="w-4 h-4" />{content.views_count.toLocaleString('pt-BR')} visualizações</div>
        {content.published_at && (<div className="flex items-center gap-1"><Calendar className="w-4 h-4" />Publicado em {formatDate(content.published_at)}</div>)}
        {content.average_rating && (<div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />{content.average_rating.toFixed(1)}</div>)}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden mb-8">
        {content.type === 'video' && youtubeId && (
          <div className="aspect-video bg-black">
            <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} title={content.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
        {content.type === 'video' && vimeoId && (
          <div className="aspect-video bg-black">
            <iframe src={`https://player.vimeo.com/video/${vimeoId}`} title={content.title} className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        )}
        {content.type === 'video' && !youtubeId && !vimeoId && content.file_url && (
          <div className="p-8 text-center bg-accent">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground mb-3">Vídeo disponível no link externo</p>
            <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">Abrir vídeo<Eye className="w-4 h-4" /></a>
          </div>
        )}
        {content.type === 'article' && (
          <div className="p-8">
            {content.body ? (<article className="prose prose-slate max-w-none">{renderMarkdown(content.body)}</article>) : (<p className="text-muted-foreground text-center py-8">Este artigo ainda não tem conteúdo disponível.</p>)}
          </div>
        )}
        {content.type === 'image' && content.file_url && (
          <div className="p-4">
            <img src={content.file_url} alt={content.title} className="w-full h-auto rounded-lg" />
          </div>
        )}
        {content.type === 'document' && content.file_url && (
          <div className="p-8 text-center bg-accent">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground mb-3">Documento disponível para download</p>
            <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"><Download className="w-4 h-4" />Baixar Documento</a>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/education"><Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar</Button></Link>
        {content.is_completed ? (
          <div className="flex items-center gap-2 text-secondary"><CheckCircle className="w-5 h-5" /><span>Você concluiu este conteúdo</span></div>
        ) : (
          <Button variant="primary" className="gap-2" onClick={handleMarkCompleted} disabled={markingCompleted}>
            <CheckCircle className="w-4 h-4" />
            {markingCompleted ? 'Marcando...' : 'Marcar como concluído'}
          </Button>
        )}
      </div>
    </div>
  );
}
