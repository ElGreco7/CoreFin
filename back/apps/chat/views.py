"""
apps/chat/views.py
"""
import logging
import time
from datetime import datetime, timedelta

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
from google.api_core.exceptions import ResourceExhausted

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


# ── Fallback de modelos ──────────────────────────────────────────────────────
# Lista ordenada de modelos a tentar. Se o primeiro der 429, tenta o segundo,
# e assim por diante. O modelo configurado em GEMINI_MODEL é tentado primeiro.

DEFAULT_FALLBACK_CHAIN = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
]

# Cache em memória: modelos que retornaram 429 recentemente
# { "model_name": datetime_quando_expira_o_cooldown }
_EXHAUSTED_CACHE: dict[str, datetime] = {}
_COOLDOWN_DURATION = timedelta(minutes=60)


def _get_models_to_try() -> list[str]:
    """Retorna a lista de modelos a tentar, em ordem, sem repetições."""
    primary = settings.GEMINI_MODEL
    chain = [primary] + [m for m in DEFAULT_FALLBACK_CHAIN if m != primary]
    return chain


def _is_in_cooldown(model_name: str) -> bool:
    """Verifica se um modelo está em cooldown (esgotou recentemente)."""
    expires_at = _EXHAUSTED_CACHE.get(model_name)
    if expires_at and expires_at > datetime.now():
        return True
    if expires_at:
        # Cooldown expirou, remove
        _EXHAUSTED_CACHE.pop(model_name, None)
    return False


def _mark_exhausted(model_name: str):
    """Marca um modelo como esgotado por 1 hora."""
    _EXHAUSTED_CACHE[model_name] = datetime.now() + _COOLDOWN_DURATION
    logger.warning(f"Modelo {model_name} esgotado. Cooldown até {_EXHAUSTED_CACHE[model_name]}")


# ── Geração de resposta da IA ────────────────────────────────────────────────

def _try_model(model_name: str, user_message: str, conversation: Conversation) -> dict | None:
    """
    Tenta gerar resposta com um modelo específico.

    Returns:
        dict com 'content' e 'metadata' se OK.
        None se deu erro (modelo esgotado, indisponível, etc).
    """
    try:
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=SYSTEM_PROMPT,
        )

        # Histórico recente da conversa
        recent_messages = (
            Message.objects
            .filter(conversation=conversation)
            .order_by("-created_at")[:10]
        )
        history_msgs = list(reversed(list(recent_messages)))

        history = []
        for msg in history_msgs:
            role = "user" if msg.sender == Message.Sender.USER else "model"
            history.append({"role": role, "parts": [msg.content]})

        chat = model.start_chat(history=history)
        response = chat.send_message(user_message)
        ai_text = response.text or "Desculpe, não consegui gerar uma resposta. Tente reformular?"

        usage = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "tokens_input": getattr(response.usage_metadata, "prompt_token_count", 0),
                "tokens_output": getattr(response.usage_metadata, "candidates_token_count", 0),
            }

        logger.info(f"✅ Resposta gerada com modelo: {model_name}")

        return {
            "content": ai_text,
            "metadata": {
                "model": model_name,
                "provider": "google_gemini",
                **usage,
            },
        }

    except ResourceExhausted as e:
        logger.warning(f"⚠️ Modelo {model_name} esgotado (429): {str(e)[:120]}")
        _mark_exhausted(model_name)
        return None

    except Exception as e:
        logger.exception(f"❌ Erro inesperado com modelo {model_name}: {e}")
        return None


def _generate_ai_response(user_message: str, conversation: Conversation) -> dict:
    """
    Gera resposta da IA tentando modelos em sequência (fallback chain).

    Returns:
        dict com 'content' (str) e 'metadata' (dict).
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY não configurada. Usando placeholder.")
        return {
            "content": (
                "Estou momentaneamente indisponível para responder com IA. "
                "Por favor, tente novamente em alguns instantes."
            ),
            "metadata": {"model": "fallback", "reason": "no_api_key"},
        }

    # Configura a API
    genai.configure(api_key=settings.GEMINI_API_KEY)

    models_chain = _get_models_to_try()
    tried = []
    skipped_cooldown = []

    for model_name in models_chain:
        # Pula modelos em cooldown
        if _is_in_cooldown(model_name):
            skipped_cooldown.append(model_name)
            continue

        tried.append(model_name)
        result = _try_model(model_name, user_message, conversation)

        if result is not None:
            # Adiciona info de fallback se não foi o primário
            if model_name != models_chain[0]:
                result["metadata"]["fallback_used"] = True
                result["metadata"]["models_skipped"] = skipped_cooldown
            return result

    # Todos os modelos falharam
    logger.error(
        f"🔴 Todos os modelos falharam. Tentados: {tried}, "
        f"em cooldown: {skipped_cooldown}"
    )
    return {
        "content": (
            "Estou enfrentando alta demanda no momento. Por favor, tente novamente em alguns minutos."
        ),
        "metadata": {
            "model": "all_exhausted",
            "tried": tried,
            "in_cooldown": skipped_cooldown,
        },
    }


class ConversationViewSet(viewsets.ModelViewSet):
    """
    Endpoints das conversas do CoreChat.
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

            # 2. Gera resposta da IA (com fallback automático)
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
            conversation.message_count += 2

            # Primeira mensagem? Gera título a partir dela
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
        conversation = self.get_object()
        conversation.is_archived = True
        conversation.save(update_fields=["is_archived", "updated_at"])
        return Response(ConversationListSerializer(conversation).data)

    @action(detail=True, methods=["post"])
    def unarchive(self, request, pk=None):
        conversation = self.get_object()
        conversation.is_archived = False
        conversation.save(update_fields=["is_archived", "updated_at"])
        return Response(ConversationListSerializer(conversation).data)