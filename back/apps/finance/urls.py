"""
apps/finance/urls.py
Prefixo base: /api/finance/

CHANGELOG:
  - Adicionado: GET /api/finance/cash-close/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    IncomeViewSet,
    ExpenseViewSet,
    SummaryView,
    CashCloseView,
    TransactionsCSVReportView,
    TransactionsPDFReportView,
    SummaryCSVReportView,
    SummaryPDFReportView,
)


router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("incomes",    IncomeViewSet,   basename="income")
router.register("expenses",   ExpenseViewSet,  basename="expense")


urlpatterns = [
    path("", include(router.urls)),
    path("summary/",    SummaryView.as_view(),   name="finance-summary"),
    path("cash-close/", CashCloseView.as_view(), name="finance-cash-close"),

    # Relatórios exportáveis
    path("reports/transactions.csv", TransactionsCSVReportView.as_view(), name="report-transactions-csv"),
    path("reports/transactions.pdf", TransactionsPDFReportView.as_view(), name="report-transactions-pdf"),
    path("reports/summary.csv",      SummaryCSVReportView.as_view(),      name="report-summary-csv"),
    path("reports/summary.pdf",      SummaryPDFReportView.as_view(),      name="report-summary-pdf"),
]
