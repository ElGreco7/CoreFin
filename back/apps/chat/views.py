"""
apps/chat/views.py
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.conf import settings
from django.db import transaction
from django.utils import timezone

import google.generativeai as genai

from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    SendMessageSerializer,
)

logger = logging.getLogger(__name__)


# ── Prompt do sistema (personalidade do CoreChat) ────────────────────────────

SYSTEM_PROMPT = """Você é o CoreChat, assistente financeiro do CoreFin — uma plataforma de gestão financeira para Microempreendedores Individuais (MEI) brasileiros.

DIRETRIZES DE COMPORTAMENTO:
- Responda sempre em português brasileiro, com tom amigável e profissional
- Seja conciso: respostas claras de 2-4 parágrafos no máximo
- Use markdown leve quando útil (negrito, listas, mas evite títulos grandes)
- Fale como especialista em finanças pessoais e empresariais de pequeno porte
- Foque em: gestão de fluxo de caixa, organização de receitas/despesas, planejamento financeiro, obrigações do MEI (DAS, declaração anual), educação financeira básica

LIMITAÇÕES — IMPORTANTE:
- Você NÃO tem acesso aos dados financeiros reais do usuário (transações, metas, saldos)
- Quando o usuário perguntar algo específico sobre as finanças DELE ("qual meu saldo?", "quanto gastei?"), explique gentilmente que você não tem essa informação acessível no momento e oriente onde encontrar (Dashboard, Relatórios, etc)
- Não dê conselhos de investimento de alto risco ou em renda variável específica (não recomende ações)
- Nunca invente números ou estatísticas. Se não souber, diga que não sabe

FORMATO PADRÃO:
- Resposta direta primeiro
- Depois exemplo prático quando útil
- Encerre com uma pergunta de follow-up curta quando fizer sentido"""


# ── Geração de resposta da IA ────────────────────────────────────────────────

def _generate_ai_response(user_message: str, conversation: Conversation) -> dict:
    """
    Gera a resposta da IA pra mensagem do usuário.

    Usa o Google Gemini com o contexto das últimas mensagens da conversa
    pra manter a continuidade do diálogo.

    Returns:
        dict com 'content' (str) e 'metadata' (dict).
    """
    # Fallback se a chave não estiver configurada
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY não configurada. Usando resposta placeholder.")
        return {
            "content": (
                "Estou momentaneamente indisponível para responder com IA. "
                "Por favor, tente novamente em alguns instantes."
            ),
            "metadata": {"model": "fallback", "reason": "no_api_key"},
        }

    try:
        # Configura o cliente
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
        )

        # Recupera histórico recente da conversa (últimas 10 mensagens)
        # pra manter contexto sem estourar limites de token
        recent_messages = (
            Message.objects
            .filter(conversation=conversation)
            .order_by("-created_at")[:10]
        )
        # Inverte pra ordem cronológica
        history_msgs = list(reversed(list(recent_messages)))

        # Monta o histórico no formato do Gemini
        history = []
        for msg in history_msgs:
            role = "user" if msg.sender == Message.Sender.USER else "model"
            history.append({"role": role, "parts": [msg.content]})

        # Inicia o chat com o histórico e envia a nova mensagem
        chat = model.start_chat(history=history)
        response = chat.send_message(user_message)

        # Extrai o texto e metadados
        ai_text = response.text or "Desculpe, não consegui gerar uma resposta. Tente reformular?"

        usage = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "tokens_input": getattr(response.usage_metadata, "prompt_token_count", 0),
                "tokens_output": getattr(response.usage_metadata, "candidates_token_count", 0),
            }

        return {
            "content": ai_text,
            "metadata": {
                "model": settings.GEMINI_MODEL,
                "provider": "google_gemini",
                **usage,
            },
        }

    except Exception as e:
        # Logar erro mas devolver resposta amigável pro usuário
        logger.exception(f"Erro ao chamar Gemini: {e}")
        return {
            "content": (
                "Tive um problema técnico ao processar sua mensagem agora. "
                "Pode tentar de novo em alguns instantes?"
            ),
            "metadata": {"model": "error_fallback", "error": str(e)[:200]},
        }


class ConversationViewSet(viewsets.ModelViewSet):
    """
    Endpoints das conversas do CoreChat.

    Endpoints automáticos:
        GET    /api/conversations/         → lista (sidebar)
        POST   /api/conversations/         → cria conversa nova
        GET    /api/conversations/{id}/    → detalhe (com mensagens)
        PATCH  /api/conversations/{id}/    → atualiza (rename, archive)
        DELETE /api/conversations/{id}/    → deleta

    Endpoints customizados:
        POST   /api/conversations/{id}/send_message/  → envia msg pra IA
        POST   /api/conversations/{id}/archive/       → arquiva
        POST   /api/conversations/{id}/unarchive/     → desarquiva
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_archived"]
    search_fields = ["title", "last_message_preview"]
    ordering_fields = ["last_message_at", "created_at"]
    ordering = ["-last_message_at", "-created_at"]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return ConversationListSerializer
        return ConversationDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def send_message(self, request, pk=None):
        """
        Envia uma mensagem do usuário e recebe a resposta da IA.

        POST /api/conversations/{id}/send_message/
        Body: { "content": "Como economizar 20% do meu salário?" }
        """
        conversation = self.get_object()

        input_serializer = SendMessageSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        user_content = input_serializer.validated_data["content"]

        with transaction.atomic():
            # 1. Salva mensagem do usuário
            user_msg = Message.objects.create(
                conversation=conversation,
                sender=Message.Sender.USER,
                content=user_content,
            )

            # 2. Gera resposta da IA
            ai_data = _generate_ai_response(user_content, conversation)

            # 3. Salva resposta da IA
            ai_msg = Message.objects.create(
                conversation=conversation,
                sender=Message.Sender.ASSISTANT,
                content=ai_data["content"],
                metadata=ai_data["metadata"],
            )

            # 4. Atualiza dados desnormalizados da conversa
            conversation.last_message_preview = ai_data["content"][:255]
            conversation.last_message_at = timezone.now()
            conversation.message_count += 2  # user + assistant

            # Se for a primeira mensagem, gera um título a partir dela
            if conversation.message_count == 2 and conversation.title == "Nova conversa":
                conversation.title = user_content[:50] + ("..." if len(user_content) > 50 else "")

            conversation.save(update_fields=[
                "last_message_preview",
                "last_message_at",
                "message_count",
                "title",
                "updated_at",
            ])

        return Response(
            {
                "user_message": MessageSerializer(user_msg).data,
                "assistant_message": MessageSerializer(ai_msg).data,
                "conversation": ConversationListSerializer(conversation).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Arquiva uma conversa (sem deletar)."""
        conversation = self.get_object()
        conversation.is_archived = True
        conversation.save(update_fields=["is_archived", "updated_at"])
        return Response(ConversationListSerializer(conversation).data)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        """Desarquiva uma conversa."""
        conversation = self.get_object()
        conversation.is_archived = False
        conversation.save(update_fields=["is_archived", "updated_at"])
        return Response(ConversationListSerializer(conversation).data)