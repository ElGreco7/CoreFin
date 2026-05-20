import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  Clock,
  User,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/Button';
import corefinLogo from '../../imports/logo_icone_corefin_(1).png';
import { chat, Conversation, Message } from '../services/chat';
import { useAuth } from '../contexts/AuthContext';

function formatTimestamp(dateStr: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  return `${diffDays}d atrás`;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Retorna a saudação adequada conforme o horário.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Pega o primeiro nome do usuário a partir do full_name.
 */
function getFirstName(name?: string): string {
  if (!name) return '';
  return name.trim().split(' ')[0];
}

export function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);

  // Controla qual painel aparece no mobile: 'list' (lista de conversas)
  // ou 'chat' (janela da conversa). No desktop os dois aparecem sempre.
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carrega lista de conversas ao montar
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll pra última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function loadConversations() {
    setIsLoadingConversations(true);
    try {
      const data = await chat.listConversations({ is_archived: 'false', page_size: 50 });
      setConversations(data.results);
    } catch {
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function loadConversation(conv: Conversation) {
    setActiveConversation(conv);
    setMobileView('chat');
    setIsLoadingMessages(true);
    try {
      const full = await chat.getConversation(conv.id);
      setMessages(full.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  function handleNewConversation() {
    setActiveConversation(null);
    setMessages([]);
    setInputValue('');
    setMobileView('chat');
  }

  async function handleSendMessage(content?: string) {
    const messageContent = (content || inputValue).trim();
    if (!messageContent || sending) return;

    setSending(true);
    setInputValue('');

    let convId: number;
    let conv = activeConversation;

    if (!conv) {
      try {
        conv = await chat.createConversation();
        setActiveConversation(conv);
        setConversations((prev) => [conv!, ...prev]);
      } catch {
        alert('Erro ao criar conversa.');
        setSending(false);
        return;
      }
    }
    convId = conv.id;

    const tempUserMsg: Message = {
      id: Date.now(),
      conversation: convId,
      sender: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      const result = await chat.sendMessage(convId, messageContent);

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...withoutTemp, result.user_message, result.assistant_message];
      });

      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? result.conversation : c))
      );
      setActiveConversation(result.conversation);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsTyping(false);
      setSending(false);
    }
  }

  async function handleDeleteConversation(conv: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Excluir a conversa "${conv.title}"?`)) return;

    try {
      await chat.deleteConversation(conv.id);
      setConversations((prev) => prev.filter((c) => c.id !== conv.id));
      if (activeConversation?.id === conv.id) {
        handleNewConversation();
      }
    } catch {
      alert('Erro ao excluir conversa.');
    }
  }

  // Tela de boas-vindas só aparece quando não há conversa ativa
  const showWelcome = !activeConversation && messages.length === 0;
  const firstName = getFirstName(user?.name);
  const greeting = getGreeting();

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-4 lg:gap-6 p-4 lg:p-8">
      {/* Sidebar - Conversations History.
          Mobile: ocupa a tela toda, escondida quando mobileView === 'chat'.
          Desktop: largura fixa, sempre visível. */}
      <div
        className={`${mobileView === 'chat' ? 'hidden' : 'flex'} lg:flex w-full lg:w-80 flex-col gap-4 min-h-0`}
      >
        <Button
          variant="primary"
          className="w-full gap-2"
          onClick={handleNewConversation}
        >
          <Plus className="w-5 h-5" />
          Nova Conversa
        </Button>

        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-border">
            <h3 className="text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversas Recentes
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda.
                <br />
                Comece enviando uma mensagem!
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`group w-full p-4 text-left hover:bg-accent transition-colors border-b border-border/50 cursor-pointer ${
                    activeConversation?.id === conv.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-foreground line-clamp-1 flex-1">{conv.title}</h4>
                    <button
                      onClick={(e) => handleDeleteConversation(conv, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  {conv.last_message_preview && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {conv.last_message_preview}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {conv.message_count} {conv.message_count === 1 ? 'msg' : 'msgs'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(conv.last_message_at || conv.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area.
          Mobile: ocupa a tela toda, escondida quando mobileView === 'list'.
          Desktop: ocupa o espaço restante, sempre visível. */}
      <div
        className={`${mobileView === 'list' ? 'hidden' : 'flex'} lg:flex flex-1 flex-col bg-card rounded-xl border border-border overflow-hidden min-h-0`}
      >
        {/* Chat Header */}
        <div className="p-4 lg:p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-2 lg:gap-1">
            {/* Botão voltar - só no mobile */}
            <button
              onClick={() => setMobileView('list')}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
              aria-label="Voltar para conversas"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <img
              src={corefinLogo}
              alt="CoreFin"
              className="w-12 h-12 lg:w-20 lg:h-20 object-contain flex-shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-xl lg:text-2xl text-foreground truncate">
                {activeConversation?.title || 'CoreChat'}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                Assistente Financeiro Inteligente
              </p>
            </div>
          </div>
        </div>

        {/* Messages Area / Tela de boas-vindas */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 min-h-0">
          {showWelcome ? (
            // ── Tela de boas-vindas (sem conversa ativa) ──
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <img
                src={corefinLogo}
                alt="CoreFin"
                className="w-24 h-24 lg:w-40 lg:h-40 object-contain mb-6 lg:mb-8"
              />
              <h1 className="text-3xl lg:text-5xl text-foreground mb-2">
                {greeting}{firstName ? `, ${firstName}` : ''}
              </h1>
            </div>
          ) : isLoadingMessages ? (
            <div className="text-center text-muted-foreground py-12">
              Carregando mensagens...
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 lg:gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'assistant' && (
                  <img
                    src={corefinLogo}
                    alt="CoreFin"
                    className="w-9 h-9 lg:w-12 lg:h-12 object-contain flex-shrink-0"
                  />
                )}
                <div
                  className={`max-w-[80%] lg:max-w-2xl rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-accent text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <span
                    className={`text-xs mt-2 block ${
                      message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    {message.id > 0 ? formatTime(message.created_at) : ''}
                  </span>
                </div>
                {message.sender === 'user' && (
                  <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 lg:w-6 lg:h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Indicador "pensando" */}
          {isTyping && (
            <div className="flex gap-2 lg:gap-4 justify-start">
              <img
                src={corefinLogo}
                alt="CoreFin"
                className="w-9 h-9 lg:w-12 lg:h-12 object-contain flex-shrink-0 animate-pulse"
              />
              <div className="bg-accent text-foreground rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Pensando</span>
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  ></div>
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Âncora pro auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 lg:p-6 border-t border-border">
          <div className="flex gap-2 lg:gap-3">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sending}
              className="flex-1 min-w-0 px-4 py-3 bg-accent border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
            <Button
              variant="primary"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || sending}
              className="gap-2 px-4 lg:px-6 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">{sending ? 'Enviando...' : 'Enviar'}</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            CoreChat usa IA para analisar seus dados financeiros. As respostas podem conter imprecisões.
          </p>
        </div>
      </div>
    </div>
  );
}