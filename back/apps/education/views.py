"""
apps/education/views.py
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import F
from django.utils import timezone

from .models import Path, Content, UserProgress, Rating
from .serializers import (
    PathListSerializer,
    PathDetailSerializer,
    ContentListSerializer,
    ContentDetailSerializer,
    RatingSerializer,
    UserProgressSerializer,
)
from .permissions import IsAdminOrReadOnly


class PathViewSet(viewsets.ModelViewSet):
    """
    Trilhas de aprendizado.

    Endpoints:
        GET    /api/education/paths/         → lista trilhas publicadas
        GET    /api/education/paths/{id}/    → detalhe (com conteúdos)
        POST/PATCH/DELETE                    → só admin

    Filtros:
        ?level=beginner
        ?search=finanças
    """

    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["level", "is_published"]
    search_fields = ["title", "description"]
    ordering_fields = ["display_order", "title", "created_at"]
    ordering = ["display_order", "title"]

    def get_queryset(self):
        qs = Path.objects.all()
        # Usuários comuns só veem trilhas publicadas
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PathListSerializer
        return PathDetailSerializer


class ContentViewSet(viewsets.ModelViewSet):
    """
    Conteúdos individuais (artigos, vídeos, etc).

    Endpoints:
        GET    /api/education/contents/         → lista conteúdos publicados
        GET    /api/education/contents/{id}/    → detalhe (incrementa view)
        POST/PATCH/DELETE                       → só admin

    Endpoints customizados (qualquer usuário autenticado):
        POST   /api/education/contents/{id}/track_progress/  → atualiza %
        POST   /api/education/contents/{id}/mark_completed/  → conclui
        POST   /api/education/contents/{id}/rate/            → avalia

    Filtros:
        ?type=video
        ?level=beginner
        ?category=investimentos
        ?search=texto
    """

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["type", "level", "category", "status"]
    search_fields = ["title", "description", "category"]
    ordering_fields = ["created_at", "views_count", "title"]
    ordering = ["-created_at"]

    def get_permissions(self):
        """
        Permissões granulares:
          - track_progress, mark_completed, rate: qualquer usuário autenticado
            (são ações pessoais sobre o conteúdo, não no conteúdo)
          - resto (list, retrieve, create, update, delete): IsAdminOrReadOnly
        """
        if self.action in ["track_progress", "mark_completed", "rate"]:
            return [IsAuthenticated()]
        return [IsAdminOrReadOnly()]

    def get_queryset(self):
        qs = Content.objects.all()
        # Usuários comuns só veem conteúdo publicado
        if not self.request.user.is_authenticated or not self.request.user.is_staff:
            qs = qs.filter(status=Content.Status.PUBLISHED)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ContentListSerializer
        return ContentDetailSerializer

    def get_serializer_context(self):
        """Passa o request pro serializer poder calcular progresso pessoal."""
        return {**super().get_serializer_context(), "request": self.request}

    def retrieve(self, request, *args, **kwargs):
        """Sobrescreve o GET de detalhe pra incrementar o contador de views."""
        instance = self.get_object()

        # Incrementa atomicamente — evita race condition se 2 usuários
        # acessarem ao mesmo tempo. F() faz UPDATE direto no SQL.
        Content.objects.filter(pk=instance.pk).update(
            views_count=F("views_count") + 1
        )

        # Atualiza ou cria o registro de progresso (last_accessed_at é auto_now)
        UserProgress.objects.update_or_create(
            user=request.user,
            content=instance,
            defaults={},  # last_accessed_at se atualiza sozinho
        )

        # Recarrega pra retornar com o views_count atualizado
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def track_progress(self, request, pk=None):
        """
        Atualiza o progresso do usuário logado neste conteúdo.

        POST /api/education/contents/{id}/track_progress/
        Body: { "progress_percent": 65 }
        """
        content = self.get_object()
        progress_percent = request.data.get("progress_percent")

        if progress_percent is None:
            return Response(
                {"error": "Campo 'progress_percent' é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            progress_percent = int(progress_percent)
            if not 0 <= progress_percent <= 100:
                raise ValueError
        except (ValueError, TypeError):
            return Response(
                {"error": "'progress_percent' deve ser inteiro entre 0 e 100."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress, _ = UserProgress.objects.update_or_create(
            user=request.user,
            content=content,
            defaults={
                "progress_percent": progress_percent,
                "is_completed": progress_percent == 100,
                "completed_at": timezone.now() if progress_percent == 100 else None,
            },
        )

        return Response(UserProgressSerializer(progress).data)

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """
        Marca o conteúdo como 100% concluído.
        Atalho pra track_progress com 100.

        POST /api/education/contents/{id}/mark_completed/
        """
        content = self.get_object()
        progress, _ = UserProgress.objects.update_or_create(
            user=request.user,
            content=content,
            defaults={
                "progress_percent": 100,
                "is_completed": True,
                "completed_at": timezone.now(),
            },
        )
        return Response(UserProgressSerializer(progress).data)

    @action(detail=True, methods=["post"])
    def rate(self, request, pk=None):
        """
        Avalia este conteúdo (cria ou atualiza a avaliação do usuário).

        POST /api/education/contents/{id}/rate/
        Body: { "rating": 5, "comment": "Excelente!" }
        """
        content = self.get_object()

        rating, created = Rating.objects.update_or_create(
            user=request.user,
            content=content,
            defaults={
                "rating": request.data.get("rating"),
                "comment": request.data.get("comment", ""),
            },
        )

        serializer = RatingSerializer(rating)
        try:
            RatingSerializer().validate_rating(rating.rating)
        except Exception as e:
            rating.delete() if created else None
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class RatingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Listagem de avaliações.
    Usuário comum só pode LER avaliações (criar/editar é via /contents/{id}/rate/).

    Endpoints:
        GET    /api/education/ratings/         → lista
        GET    /api/education/ratings/{id}/    → detalhe

    Filtros:
        ?content=5     → todas as avaliações de um conteúdo
        ?rating=5      → só com 5 estrelas
    """

    queryset = Rating.objects.all()
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["content", "rating"]
    ordering_fields = ["created_at", "rating"]
    ordering = ["-created_at"]