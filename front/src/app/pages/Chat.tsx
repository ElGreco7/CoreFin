import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Plus,
  MessageSquare,
  TrendingUp,
  DollarSign,
  PieChart,
  Target,
  Clock,
  User,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/Button';
import corefinLogo from '../../imports/logo_icone_corefin_(1).png';
import { chat, Conversation, Message } from '../services/chat';

const quickSuggestions = [
  {
    icon: TrendingUp,
    text: 'Analisar tendências de receita',
    prompt: 'Analise as tendências da minha receita nos últimos 3 meses',
  },
  {
    icon: DollarSign,
    text: 'Sugestões para reduzir custos',
    prompt: 'Quais custos posso reduzir para melhorar minha margem de lucro?',
  },
  {
    icon: PieChart,
    text: 'Relatório de despesas',
    prompt: 'Gere um relatório detalhado das minhas despesas por categoria',
  },
  {
    icon: Target,
    text: 'Progresso das metas',
    prompt: 'Como estou em relação às minhas metas financeiras?',
  },
];

// Mensagem inicial (mostrada quando uma nova conversa está sem mensagens)
const welcomeMessage: Message = {
  id: -1,
  conversation: -1,
  sender: 'assistant',
  content: 'Olá! Sou o CoreChat, seu assistente financeiro inteligente. Como posso ajudá-lo hoje?',
  created_at: new Date().toISOString(),
};

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

export function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [sending, setSending] = useState(false);

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
  }

  async function handleSendMessage(content?: string) {
    const messageContent = (content || inputValue).trim();
    if (!messageContent || sending) return;

    setSending(true);
    setInputValue('');

    // Se não tem conversa ativa, cria uma
    let convId: number;
    let conv = activeConversation;

    if (!conv) {
      try {
        conv = await chat.createConversation();
        setActiveConversation(conv);
        // Adiciona à lista de conversas
        setConversations((prev) => [conv!, ...prev]);
      } catch {
        alert('Erro ao criar conversa.');
        setSending(false);
        return;
      }
    }
    convId = conv.id;

    // Adiciona a mensagem do usuário na UI imediatamente (otimismo)
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

      // Substitui a mensagem temporária pela real, e adiciona a do bot
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...withoutTemp, result.user_message, result.assistant_message];
      });

      // Atualiza a conversa na sidebar (preview, contador, título)
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? result.conversation : c))
      );
      setActiveConversation(result.conversation);
    } catch {
      // Reverte: remove a mensagem temporária e mostra erro
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

  // Mensagens exibidas: se não há conversa ativa, mostra mensagem de boas vindas
  const displayMessages = activeConversation ? messages : [welcomeMessage];
  const showSuggestions = !activeConversation || messages.length === 0;

  return (
    <div className="h-[calc(100vh-80px)] flex gap-6 p-8">
      {/* Sidebar - Conversations History */}
      <div className="w-80 flex flex-col gap-4">
        <Button
          variant="primary"
          className="w-full gap-2"
          onClick={handleNewConversation}
        >
          <Plus className="w-5 h-5" />
          Nova Conversa
        </Button>

        <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border overflow-hidden">
        {/* Chat Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-1">
            <img src={corefinLogo} alt="CoreFin" className="w-20 h-20 object-contain" />
            <div>
              <h2 className="text-2xl text-foreground">
                {activeConversation?.title || 'CoreChat'}
              </h2>
              <p className="text-sm text-muted-foreground">Assistente Financeiro Inteligente</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingMessages ? (
            <div className="text-center text-muted-foreground py-12">
              Carregando mensagens...
            </div>
          ) : (
            displayMessages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'assistant' && (
                  <img
                    src={corefinLogo}
                    alt="CoreFin"
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                )}
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-accent text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <span
                    className={`text-xs mt-2 block ${
                      message.sender === 'user' ? 'text-white/70' : 'text-muted-foreground'
                    }`}
                  >
                    {message.id > 0 ? formatTime(message.created_at) : ''}
                  </span>
                </div>
                {message.sender === 'user' && (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Indicador "pensando" — estilo Claude/ChatGPT com logo */}
          {isTyping && (
            <div className="flex gap-4 justify-start">
              <img
                src={corefinLogo}
                alt="CoreFin"
                className="w-12 h-12 object-contain flex-shrink-0 animate-pulse"
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

          {/* Quick Suggestions - só na primeira tela */}
          {showSuggestions && !isLoadingMessages && (
            <div className="pt-6">
              <p className="text-sm text-muted-foreground mb-4">Sugestões rápidas:</p>
              <div className="grid grid-cols-2 gap-3">
                {quickSuggestions.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(suggestion.prompt)}
                      disabled={sending}
                      className="p-4 bg-accent hover:bg-primary/10 border border-border rounded-xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {suggestion.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Âncora pro auto-scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
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
              className="flex-1 px-4 py-3 bg-accent border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
            <Button
              variant="primary"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || sending}
              className="gap-2 px-6"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Enviando...' : 'Enviar'}
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