"""
apps/finance/views.py
ViewSets com isolamento de dados por usuário (queryset filtrado sempre).

CHANGELOG:
  - CashCloseView: novo endpoint GET /api/finance/cash-close/
    Agrupa receitas e despesas por forma de pagamento no período informado.
"""
from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count
from django.http import HttpResponse
from django.utils import timezone

from rest_framework import viewsets, permissions, views, response, status
from rest_framework.renderers import BaseRenderer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.users.models import User

from .models import Category, Income, Expense, TransactionBase
from .serializers import (
    CategorySerializer,
    IncomeSerializer,
    ExpenseSerializer,
    SummarySerializer,
    CashCloseSerializer,
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
    media_type = "*/*"
    format = "file"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class OwnedModelMixin:
    """Restringe querysets ao usuário autenticado."""
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
    GET /api/finance/summary/?month=YYYY-MM
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


# ── Fechamento de caixa ─────────────────────────────────────────────────────

PAYMENT_METHOD_LABELS = dict(TransactionBase.PaymentMethod.choices)


def _group_by_payment(queryset):
    """
    Recebe um queryset de Income ou Expense e retorna lista
    [{payment_method, payment_method_display, total, count}]
    ordenada pelo maior total.
    """
    rows = (
        queryset
        .values("payment_method")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )
    return [
        {
            "payment_method": r["payment_method"],
            "payment_method_display": PAYMENT_METHOD_LABELS.get(
                r["payment_method"], r["payment_method"]
            ),
            "total": r["total"] or Decimal("0"),
            "count": r["count"],
        }
        for r in rows
    ]


class CashCloseView(views.APIView):
    """
    GET /api/finance/cash-close/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

    Fechamento de caixa: agrupa receitas e despesas por forma de pagamento.
    Se start_date/end_date não informados, usa o mês atual.

    Exemplo de resposta:
    {
      "period_start": "2026-05-01",
      "period_end":   "2026-05-31",
      "total_income":  5000.00,
      "total_expense": 2300.00,
      "balance":       2700.00,
      "income_by_payment": [
        {"payment_method": "pix",      "payment_method_display": "PIX",      "total": 3000.00, "count": 12},
        {"payment_method": "dinheiro", "payment_method_display": "Dinheiro", "total": 2000.00, "count": 8}
      ],
      "expense_by_payment": [
        {"payment_method": "credito",  "payment_method_display": "Crédito",  "total": 1500.00, "count": 5},
        {"payment_method": "pix",      "payment_method_display": "PIX",      "total":  800.00, "count": 3}
      ]
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE, required=False,
                             description="Data inicial (YYYY-MM-DD). Padrão: 1º do mês atual."),
            OpenApiParameter("end_date", OpenApiTypes.DATE, required=False,
                             description="Data final (YYYY-MM-DD). Padrão: último dia do mês atual."),
        ],
        responses={200: CashCloseSerializer},
    )
    def get(self, request):
        start, end = _parse_date_range(request)
        if start is None:
            return response.Response(
                {"detail": "Datas inválidas. Use o formato YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        incomes = Income.objects.filter(user=user, date__range=(start, end))
        expenses = Expense.objects.filter(user=user, date__range=(start, end))

        total_income = incomes.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        total_expense = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")

        data = {
            "period_start": start,
            "period_end": end,
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": total_income - total_expense,
            "income_by_payment": _group_by_payment(incomes),
            "expense_by_payment": _group_by_payment(expenses),
        }
        serializer = CashCloseSerializer(data)
        return response.Response(serializer.data)


# ── Exportação de relatórios ────────────────────────────────────────────────

def _resolve_target_user(request):
    user_id = request.query_params.get("user")
    if not user_id:
        return request.user
    if getattr(request.user, "role", None) != User.Role.ADMIN:
        return request.user
    return User.objects.filter(pk=user_id).first()


def _parse_date_range(request):
    today = timezone.now().date()
    start_str = request.query_params.get("start_date")
    end_str = request.query_params.get("end_date")

    try:
        start = date.fromisoformat(start_str) if start_str else today.replace(day=1)
        if end_str:
            end = date.fromisoformat(end_str)
        else:
            _, last_day = monthrange(today.year, today.month)
            end = today.replace(day=last_day)
    except ValueError:
        return None, None

    return start, end


def _build_yearly_summary(user, year):
    months = []
    total_in = 0
    total_out = 0

    for month in range(1, 13):
        _, last_day = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, last_day)

        income = (
            Income.objects.filter(user=user, date__range=(start, end))
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        expense = (
            Expense.objects.filter(user=user, date__range=(start, end))
            .aggregate(total=Sum("amount"))["total"] or 0
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
        "totals": {"income": total_in, "expense": total_out, "balance": total_in - total_out},
    }


class TransactionsCSVReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("end_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("user", OpenApiTypes.INT, required=False),
        ],
        responses={(200, "text/csv"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        start, end = _parse_date_range(request)
        if start is None:
            return response.Response({"detail": "Datas inválidas."}, status=status.HTTP_400_BAD_REQUEST)

        incomes = Income.objects.filter(user=target_user, date__range=(start, end))
        expenses = Expense.objects.filter(user=target_user, date__range=(start, end))
        content = generate_transactions_csv(incomes, expenses)

        resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="transacoes_{start}_{end}.csv"'
        return resp


class TransactionsPDFReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[
            OpenApiParameter("start_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("end_date", OpenApiTypes.DATE, required=False),
            OpenApiParameter("user", OpenApiTypes.INT, required=False),
        ],
        responses={(200, "application/pdf"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        start, end = _parse_date_range(request)
        if start is None:
            return response.Response({"detail": "Datas inválidas."}, status=status.HTTP_400_BAD_REQUEST)

        incomes = Income.objects.filter(user=target_user, date__range=(start, end))
        expenses = Expense.objects.filter(user=target_user, date__range=(start, end))
        pdf_bytes = generate_transactions_pdf(target_user, incomes, expenses, start, end)

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="transacoes_{start}_{end}.pdf"'
        return resp


class SummaryCSVReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[OpenApiParameter("year", OpenApiTypes.INT, required=False),
                    OpenApiParameter("user", OpenApiTypes.INT, required=False)],
        responses={(200, "text/csv"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        year = int(request.query_params.get("year") or timezone.now().year)
        content = generate_summary_csv(_build_yearly_summary(target_user, year))

        resp = HttpResponse(content, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="resumo_{year}.csv"'
        return resp


class SummaryPDFReportView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    renderer_classes = [PassthroughRenderer]

    @extend_schema(
        parameters=[OpenApiParameter("year", OpenApiTypes.INT, required=False),
                    OpenApiParameter("user", OpenApiTypes.INT, required=False)],
        responses={(200, "application/pdf"): OpenApiTypes.BINARY},
    )
    def get(self, request):
        target_user = _resolve_target_user(request)
        if target_user is None:
            return response.Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        year = int(request.query_params.get("year") or timezone.now().year)
        pdf_bytes = generate_summary_pdf(target_user, _build_yearly_summary(target_user, year), year)

        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="resumo_{year}.pdf"'
        return resp
