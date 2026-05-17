"""
apps/admin_api/views.py
"""
from datetime import timedelta

from django.contrib.auth.tokens import default_token_generator
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.users.models import User
from .permissions import IsAdminRole
from .serializers import (
    UserListAdminSerializer,
    UserDetailAdminSerializer,
    UserCreateAdminSerializer,
)


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Gestão de usuários pelo painel admin.

    Endpoints automáticos:
        GET    /api/admin/users/         → lista (paginada, filtrável)
        POST   /api/admin/users/         → cria usuário (admin escolhe role)
        GET    /api/admin/users/{id}/    → detalhe
        PATCH  /api/admin/users/{id}/    → atualiza (nome, role, is_active)
        DELETE /api/admin/users/{id}/    → deleta (cuidado!)

    Endpoints customizados:
        POST   /api/admin/users/{id}/deactivate/      → desativa conta
        POST   /api/admin/users/{id}/activate/        → reativa conta
        POST   /api/admin/users/{id}/reset-password/  → gera token de reset
        GET    /api/admin/users/stats/                → estatísticas

    Filtros:
        ?role=admin
        ?is_active=false
        ?search=fulano       → busca em name/email
        ?ordering=-created_at
    """

    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["role", "is_active"]
    search_fields = ["name", "email"]
    ordering_fields = ["created_at", "last_login", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return User.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return UserListAdminSerializer
        if self.action == "create":
            return UserCreateAdminSerializer
        return UserDetailAdminSerializer

    def perform_destroy(self, instance):
        """
        Proteção: não deixa deletar o próprio admin que está fazendo a requisição.
        Também não deixa deletar o último superuser.
        """
        if instance == self.request.user:
            raise ValueError("Você não pode deletar sua própria conta.")

        if instance.is_superuser:
            other_supers = User.objects.filter(is_superuser=True).exclude(pk=instance.pk).count()
            if other_supers == 0:
                raise ValueError("Não é possível deletar o último superusuário.")

        instance.delete()

    def destroy(self, request, *args, **kwargs):
        """Override pra tratar o ValueError do perform_destroy."""
        try:
            return super().destroy(request, *args, **kwargs)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Desativa a conta do usuário (sem deletar)."""
        user = self.get_object()
        if user == request.user:
            return Response(
                {"detail": "Você não pode desativar a própria conta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])
        return Response(UserDetailAdminSerializer(user).data)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Reativa uma conta desativada."""
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active", "updated_at"])
        return Response(UserDetailAdminSerializer(user).data)

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        """
        Admin gera um token de reset de senha para o usuário.
        Retorna o token (em DEV, também printa no console).

        POST /api/admin/users/{id}/reset-password/
        """
        user = self.get_object()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # === DEV: print no console ===
        print("\n" + "=" * 70)
        print("ADMIN GEROU RESET DE SENHA")
        print("=" * 70)
        print(f"Admin:    {request.user.email}")
        print(f"Para:     {user.email}")
        print(f"UID:      {uid}")
        print(f"Token:    {token}")
        print("=" * 70 + "\n")

        return Response({
            "detail": "Token de reset gerado.",
            "uid": uid,
            "token": token,
            "user_email": user.email,
        })

    @action(detail=False, methods=["get"])
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="days",
                description="Janela de tempo em dias pra contar novos usuários (default: 30)",
                required=False,
                type=OpenApiTypes.INT,
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
    )
    def stats(self, request):
        """
        Estatísticas de usuários pro dashboard admin.

        GET /api/admin/users/stats/
        GET /api/admin/users/stats/?days=7
        """
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        total = User.objects.count()
        active = User.objects.filter(is_active=True).count()
        inactive = total - active

        # Novos no período
        new_in_period = User.objects.filter(created_at__gte=since).count()

        # Logaram recentemente
        logged_recently = User.objects.filter(
            last_login__gte=since
        ).count()

        # Distribuição por role
        by_role = list(
            User.objects.values("role").annotate(count=Count("id")).order_by("role")
        )

        return Response({
            "period_days": days,
            "total": total,
            "active": active,
            "inactive": inactive,
            "new_in_period": new_in_period,
            "logged_recently": logged_recently,
            "by_role": by_role,
        })