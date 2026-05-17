"""
apps/notifications/views.py
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Endpoints das notificações do usuário logado.

    Endpoints automáticos:
        GET    /api/notifications/         → lista (paginada, filtrável)
        GET    /api/notifications/{id}/    → detalhe
        PATCH  /api/notifications/{id}/    → atualiza (basicamente, marca como lida)
        DELETE /api/notifications/{id}/    → deleta

    Endpoints customizados:
        POST   /api/notifications/{id}/mark_read/   → marca uma como lida
        POST   /api/notifications/mark_all_read/    → marca TODAS como lidas
        GET    /api/notifications/unread_count/     → conta não lidas (pro badge)

    Filtros (querystring):
        ?type=info               → filtra por tipo
        ?is_read=false           → só não lidas
        ?search=pagamento        → busca em title/message
        ?ordering=-created_at    → ordena (default: mais recentes primeiro)
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    # Filtros
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["type", "is_read"]
    search_fields = ["title", "message"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]  # default

    def get_queryset(self):
        """Usuário só vê as próprias notificações."""
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Atribui automaticamente o usuário logado ao criar."""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """
        Ao atualizar (PATCH), se está marcando como lida,
        define o read_at automaticamente.
        """
        instance = serializer.instance
        was_unread = not instance.is_read
        is_marking_read = serializer.validated_data.get("is_read", False)

        if was_unread and is_marking_read:
            serializer.save(read_at=timezone.now())
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """
        Atalho pra marcar uma notificação como lida.

        POST /api/notifications/{id}/mark_read/
        """
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at", "updated_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """
        Marca TODAS as notificações do usuário como lidas.

        POST /api/notifications/mark_all_read/
        """
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response(
            {"marked_as_read": updated},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """
        Retorna o número de notificações não lidas.
        Útil pro badge no header do site.

        GET /api/notifications/unread_count/
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})