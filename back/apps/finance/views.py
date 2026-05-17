"""
apps/finance/views.py
ViewSets com isolamento de dados por usuário (queryset filtrado sempre).
"""
from calendar import monthrange
from datetime import date

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import viewsets, permissions, views, response, status
from rest_framework.renderers import BaseRenderer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.users.models import User

from .models import Category, Income, Expense
from .serializers import (
    CategorySerializer,
    IncomeSerializer,
    ExpenseSerializer,
    SummarySerializer,
)
from .filters import IncomeFilter, ExpenseFilter
from .reports.generators import (
    generate_transactions_csv,
    generate_transactions_pdf,
    generate_summary_csv,
    generate_summary_pdf,
)


# ── Renderer "coringa" pra endpoints que retornam arquivo (CSV/PDF) ─────────
class PassthroughRenderer(BaseRenderer):
    """
    Renderer que aceita qualquer formato (*/*).
    Não transforma nada — a view já monta a HttpResponse na mão.
    """
    media_type = "*/*"
    format = "file"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class OwnedModelMixin:
    """
    Mixin que restringe querysets ao usuário autenticado.
    Aplicar em todo ViewSet que lida com dados financeiros.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)


class CategoryViewSet(OwnedModelMixin, viewsets.ModelViewSet):
    """CRUD de categorias do usuário."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


class IncomeViewSet(OwnedModelMixin, viewsets.ModelViewSet):
    """CRUD de receitas do usuário."""
    queryset = Income.objects.select_related("category").all()
    serializer_class = IncomeSerializer
    filterset_class = IncomeFilter
    ordering_fields = ["date", "amount", "created_at"]
    search_fields = ["description"]


class ExpenseViewSet(OwnedModelMixin, viewsets.ModelViewSet):
    """CRUD de despesas do usuário."""
    queryset = Expense.objects.select_related("category").all()
    serializer_class = ExpenseSerializer
    filterset_class = ExpenseFilter
    ordering_fields = ["date", "amount", "created_at"]
    search_fields = ["description"]


class SummaryView(views.APIView):
    """
    GET /api/finance/summary/?month=2024-03
    Retorna totais de receitas, despesas e saldo do período.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        month_param = request.query_params.get("month")
        if month_param:
            try:
                year, month = map(int, month_param.split("-"))
            except ValueError:
                return response.Response(
                    {"error": "Formato inválido. Use YYYY-MM."},
                    status=400,
                )
        else:
            today = timezone.now().date()
            year, month = today.year, today.month

        _, last_day = monthrange(year, month)
        period_start = date(year, month, 1)
        period_end = date(year, month, last_day)

        user = request.user
        total_income = (
            Income.objects.filter(user=user, date__range=(period_start, period_end))
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        total_expense = (
            Expense.objects.filter(user=user, date__range=(period_start, period_end))
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        data = {
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": total_income - total_expense,
            "period_start": period_start,
            "period_end": period_end,
        }
        serializer = SummarySerializer(data)
        return response.Response(serializer.data)


# ── Exportação de relatórios ────────────────────────────────────────────────

def _resolve_target_user(request):
    """
    Resolve qual usuário usar nos relatórios:
    - Admin pode passar ?user={id} pra exportar dados de outro
    - Usuário comum sempre exporta os próprios dados
    Retorna o User ou None se o ?user= for inválido.
    """
    user_id = request.query_params.get("user")

    if not user_id:
        return request.user

    if getattr(request.user, "role", None) != User.Role.ADMIN:
        return request.user

    return User.objects.filter(pk=user_id).first()


def _parse_date_range(request):
    """
    Lê start_date e end_date da querystring (formato YYYY-MM-DD).
    Se não vier, usa o mês atual.
    """
    today = timezone.now().date()
    start_str = request.query_params.get("start_date")
    end_str = request.query_params.get("end_date")

    try:
        if start_str:
            start = date.fromisoformat(start_str)
        else:
            start = today.replace(day=1)

        if end_str:
            end = date.fromisoformat(end_str)
        else:
            _, last_day = monthrange(today.year, today.month)
            end = today.replace(day=last_day)
    except ValueError:
        return None, None

    return start, end


def _build_yearly_summary(user, year):
    """
    Constrói o resumo mensal do ano (jan..dez) pra um usuário.
    """
    months = []
    total_in = 0
    total_out = 0

    for month in range(1, 13):
        _, last_day = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)

        income = (
            Income.objects.filter(user=user, date__range=(start, end))
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        expense = (
            Expense.objects.filter(user=user, date__range=(start, end))
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        months.append({
            "period": f"{month:02d}/{year}",
            "income": float(income),
            "expense": float(expense),
            "balance": float(income - expense),
        })

        total_in += float(income)
        total_out += float(expense)

    return {
        "months": months,
        "totals": {
            "income": total_in,
            "expense": total_out,
            "balance": total_in - total_out,
        },
    }


class TransactionsCSVReportView(views.APIView):
    """
    GET /api/finance/reports/transactions.csv
    Exporta receitas e despesas em CSV (abre no Excel).
    """
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("end_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("user", OpenApiTypes.INT, required=False, description="ID do usuário (só admin)"),
        ],
        responses={(200, "text/csv"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response(
                {"detail": "Usuário não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        start, end = _parse_date_range(request)
        if start is None:
            return response.Response(
                {"detail": "Datas inválidas. Use o formato YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        incomes = Income.objects.filter(user=target_user, date__range=(start, end))
        expenses = Expense.objects.filter(user=target_user, date__range=(start, end))

        content = generate_transactions_csv(incomes, expenses)

        filename = f"transacoes_{start.isoformat()}_a_{end.isoformat()}.csv"
        resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


class TransactionsPDFReportView(views.APIView):
    """
    GET /api/finance/reports/transactions.pdf
    Mesmo que o CSV, mas em PDF.
    """
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("end_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("user", OpenApiTypes.INT, required=False, description="ID do usuário (só admin)"),
        ],
        responses={(200, "application/pdf"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response(
                {"detail": "Usuário não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        start, end = _parse_date_range(request)
        if start is None:
            return response.Response(
                {"detail": "Datas inválidas. Use o formato YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        incomes = Income.objects.filter(user=target_user, date__range=(start, end))
        expenses = Expense.objects.filter(user=target_user, date__range=(start, end))

        pdf_bytes = generate_transactions_pdf(target_user, incomes, expenses, start, end)

        filename = f"transacoes_{start.isoformat()}_a_{end.isoformat()}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


class SummaryCSVReportView(views.APIView):
    """
    GET /api/finance/reports/summary.csv
    Resumo mensal do ano inteiro (12 linhas).
    """
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[
            OpenApiParameter("year", OpenApiTypes.INT, required=False),
            OpenApiParameter("user", OpenApiTypes.INT, required=False, description="ID do usuário (só admin)"),
        ],
        responses={(200, "text/csv"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response(
                {"detail": "Usuário não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        year = int(request.query_params.get("year") or timezone.now().year)
        summary_data = _build_yearly_summary(target_user, year)

        content = generate_summary_csv(summary_data)

        resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="resumo_{year}.csv"'
        return resp


class SummaryPDFReportView(views.APIView):
    """
    GET /api/finance/reports/summary.pdf
    Mesmo resumo mensal, em PDF.
    """
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[
            OpenApiParameter("year", OpenApiTypes.INT, required=False),
            OpenApiParameter("user", OpenApiTypes.INT, required=False, description="ID do usuário (só admin)"),
        ],
        responses={(200, "application/pdf"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response(
                {"detail": "Usuário não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        year = int(request.query_params.get("year") or timezone.now().year)
        summary_data = _build_yearly_summary(target_user, year)

        pdf_bytes = generate_summary_pdf(target_user, summary_data, year)

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="resumo_{year}.pdf"'
        return resp