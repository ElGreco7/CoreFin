"""
apps/goals/views.py
Views (endpoints) do app de Metas.
"""
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from .models import Goal, Contribution
from .serializers import GoalSerializer, ContributionSerializer


class GoalViewSet(viewsets.ModelViewSet):
    """
    Endpoints CRUD pras metas do usuário logado.

    Endpoints automáticos:
        GET    /api/goals/         → lista metas do usuário
        POST   /api/goals/         → cria meta nova
        GET    /api/goals/{id}/    → detalhes
        PATCH  /api/goals/{id}/    → atualiza
        DELETE /api/goals/{id}/    → deleta

    Endpoints customizados:
        POST   /api/goals/{id}/contribute/    → faz aporte na meta
        GET    /api/goals/{id}/contributions/ → lista aportes da meta
    """

    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Filtro de segurança: usuário só vê SUAS metas.
        Aplicado automaticamente em todos os endpoints.
        """
        return Goal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        Ao criar uma meta, associa automaticamente ao usuário logado.
        O cliente não envia o user_id — vem do token.
        """
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def contribute(self, request, pk=None):
        """
        Faz um aporte na meta.

        POST /api/goals/{id}/contribute/
        Body: { "amount": "500.00", "notes": "Aporte do mês" }

        Atualiza atomicamente o current_amount da meta.
        Se atingir o target_amount, marca como concluída.
        """
        goal = self.get_object()  # já filtra por usuário
        amount = request.data.get("amount")
        notes = request.data.get("notes", "")

        if amount is None or amount == "":
            return Response(
                {"error": "O campo 'amount' é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Conversão segura para Decimal (preserva precisão monetária).
        # Usar str() evita imprecisão de float quando o cliente manda 5000.50.
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"error": "O 'amount' deve ser um número positivo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Transação atômica: garante que aporte + atualização da meta
        # acontecem juntos. Se algo falhar, nada é gravado.
        with transaction.atomic():
            contribution = Contribution.objects.create(
                goal=goal,
                user=request.user,
                amount=amount,
                date=timezone.now().date(),
                notes=notes,
                is_automatic=False,
            )

            goal.current_amount += amount

            # Se atingiu o objetivo, marca como concluída
            if goal.current_amount >= goal.target_amount:
                goal.status = Goal.Status.COMPLETED
                goal.completed_at = timezone.now()

            goal.save()

        return Response(
            {
                "contribution": ContributionSerializer(contribution).data,
                "goal": GoalSerializer(goal).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def contributions(self, request, pk=None):
        """
        Lista todos os aportes feitos numa meta específica.

        GET /api/goals/{id}/contributions/
        """
        goal = self.get_object()
        qs = goal.contributions.all().order_by("-date", "-created_at")
        serializer = ContributionSerializer(qs, many=True)
        return Response(serializer.data)