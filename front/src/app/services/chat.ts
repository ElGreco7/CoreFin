/**
 * src/app/services/chat.ts
 *
 * Funções do CoreChat (assistente IA).
 */
import { api } from "./api";

export type MessageSender = 'user' | 'assistant';

export interface Message {
  id: number;
  conversation: number;
  sender: MessageSender;
  content: string;
  metadata?: Record<string, any>;
  is_streaming?: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  last_message_preview: string;
  last_message_at: string | null;
  message_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;

  // Vem só no detail
  messages?: Message[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface SendMessageResponse {
  user_message: Message;
  assistant_message: Message;
  conversation: Conversation;
}

async function listConversations(params?: Record<string, string | number>): Promise<PaginatedResponse<Conversation>> {
  const query = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return api.get<PaginatedResponse<Conversation>>(`/conversations/${query}`);
}

async function getConversation(id: number): Promise<Conversation> {
  return api.get<Conversation>(`/conversations/${id}/`);
}

async function createConversation(title?: string): Promise<Conversation> {
  return api.post<Conversation>('/conversations/', { title: title || 'Nova conversa' });
}

async function deleteConversation(id: number): Promise<void> {
  return api.delete(`/conversations/${id}/`);
}

async function archiveConversation(id: number): Promise<Conversation> {
  return api.post<Conversation>(`/conversations/${id}/archive/`);
}

async function sendMessage(conversationId: number, content: string): Promise<SendMessageResponse> {
  return api.post<SendMessageResponse>(`/conversations/${conversationId}/send_message/`, { content });
}

export const chat = {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation,
  archiveConversation,
  sendMessage,
};