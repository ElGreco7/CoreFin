"""
apps/analytics/views.py
"""
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Event
from .serializers import EventSerializer, TrackEventSerializer


def _get_client_ip(request):
    """Pega o IP real do cliente (considerando proxy)."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Eventos rastreados — só leitura, só admin.

    Endpoints:
        GET   /api/analytics/events/         → lista todos
        GET   /api/analytics/events/{id}/    → detalhe

    Filtros:
        ?event_type=login
        ?category=auth
        ?user=5
    """

    queryset = Event.objects.select_related("user").all()
    serializer_class = EventSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["event_type", "category", "user", "related_type"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]


class TrackEventView(APIView):
    """
    Endpoint pra REGISTRAR um evento (chamado pelo front).
    Qualquer usuário autenticado pode usar.

    POST /api/analytics/track/
    Body: {
      "event_type": "page_view",
      "category": "navigation",
      "properties": { "page": "/dashboard" }
    }

    O backend automaticamente preenche:
        - user (do token)
        - ip_address (do request)
        - user_agent (do request)
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TrackEventSerializer,
        responses={201: EventSerializer},
        description="Registra um evento de analytics. Campos sensíveis (user, IP, user_agent) são preenchidos pelo backend."
    )
    def post(self, request):
        serializer = TrackEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = Event.objects.create(
            user=request.user,
            event_type=serializer.validated_data["event_type"],
            category=serializer.validated_data.get("category", ""),
            related_type=serializer.validated_data.get("related_type", ""),
            related_id=serializer.validated_data.get("related_id"),
            properties=serializer.validated_data.get("properties", {}),
            session_id=serializer.validated_data.get("session_id", ""),
            ip_address=_get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        )

        return Response(
            EventSerializer(event).data,
            status=status.HTTP_201_CREATED,
        )


class AnalyticsStatsView(APIView):
    """
    Estatísticas agregadas — usado pelo dashboard admin.
    Só admin acessa.

    GET /api/analytics/stats/
    GET /api/analytics/stats/?days=7    → janela de tempo (default: 30)
    """

    permission_classes = [IsAdminUser]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="days",
                description="Janela de tempo em dias (default: 30)",
                required=False,
                type=OpenApiTypes.INT,
            ),
        ],
        responses={200: OpenApiTypes.OBJECT},
        description="Estatísticas agregadas para o dashboard de analytics (admin)."
    )
    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        events = Event.objects.filter(created_at__gte=since)

        # Total de eventos no período
        total_events = events.count()

        # Usuários únicos ativos no período
        active_users = events.exclude(user__isnull=True).values("user").distinct().count()

        # Top 10 tipos de evento mais frequentes
        top_event_types = list(
            events.values("event_type")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Top 5 categorias
        top_categories = list(
            events.exclude(category="")
            .values("category")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        # Eventos por dia (pra gráfico de linha)
        events_per_day = list(
            events.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )

        # Comparação com período anterior
        previous_start = since - timedelta(days=days)
        previous_events = Event.objects.filter(
            created_at__gte=previous_start,
            created_at__lt=since,
        ).count()

        # Variação percentual
        if previous_events > 0:
            variation = round(((total_events - previous_events) / previous_events) * 100, 2)
        else:
            variation = None

        return Response({
            "period_days": days,
            "total_events": total_events,
            "active_users": active_users,
            "previous_period_events": previous_events,
            "variation_percent": variation,
            "top_event_types": top_event_types,
            "top_categories": top_categories,
            "events_per_day": events_per_day,
        })


class MyActivityView(APIView):
    """
    Lista os eventos do PRÓPRIO usuário logado.
    Diferente do EventViewSet (que é admin-only e mostra tudo),
    aqui o usuário comum vê seu próprio histórico.

    GET /api/analytics/my-activity/
    GET /api/analytics/my-activity/?event_type=goal_created
    GET /api/analytics/my-activity/?days=7
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("event_type", OpenApiTypes.STR, required=False),
            OpenApiParameter("category", OpenApiTypes.STR, required=False),
            OpenApiParameter("days", OpenApiTypes.INT, required=False, description="Últimos N dias (default: 30)"),
        ],
        responses={200: EventSerializer(many=True)},
    )
    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        qs = Event.objects.filter(user=request.user, created_at__gte=since)

        event_type = request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        qs = qs.order_by("-created_at")[:200]  # limita a 200 por request

        serializer = EventSerializer(qs, many=True)
        return Response(serializer.data)