"""
apps/finance/reports/generators.py
Gera arquivos CSV e PDF a partir das transações do usuário.
"""
import csv
import io
from datetime import date
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


# ── CSV ─────────────────────────────────────────────────────────────────────

def generate_transactions_csv(incomes_qs, expenses_qs) -> bytes:
    """
    Gera um CSV com receitas e despesas combinadas.

    Args:
        incomes_qs: queryset de Income
        expenses_qs: queryset de Expense

    Returns:
        bytes do arquivo CSV (pronto pra HttpResponse)
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=",", quoting=csv.QUOTE_MINIMAL)

    # Cabeçalho
    writer.writerow([
        "Tipo",
        "Data",
        "Categoria",
        "Descricao",
        "Valor (R$)",
    ])

    # Receitas
    for inc in incomes_qs.select_related("category"):
        writer.writerow([
            "Receita",
            inc.date.strftime("%d/%m/%Y"),
            inc.category.name if inc.category else "Sem categoria",
            inc.description or "",
            f"{inc.amount:.2f}".replace(".", ","),
        ])

    # Despesas
    for exp in expenses_qs.select_related("category"):
        writer.writerow([
            "Despesa",
            exp.date.strftime("%d/%m/%Y"),
            exp.category.name if exp.category else "Sem categoria",
            exp.description or "",
            f"{exp.amount:.2f}".replace(".", ","),
        ])

    # Encoding UTF-8 com BOM (pra Excel abrir com acentos certos)
    content = buffer.getvalue()
    return content.encode("utf-8-sig")


def generate_summary_csv(summary_data: dict) -> bytes:
    """
    Gera CSV de resumo mensal por categoria.

    Args:
        summary_data: dict com chaves 'months' (list) e 'totals' (dict)
    """
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=",")

    writer.writerow(["Periodo", "Receitas (R$)", "Despesas (R$)", "Saldo (R$)"])

    for row in summary_data.get("months", []):
        writer.writerow([
            row["period"],
            f"{row['income']:.2f}".replace(".", ","),
            f"{row['expense']:.2f}".replace(".", ","),
            f"{row['balance']:.2f}".replace(".", ","),
        ])

    # Total
    totals = summary_data.get("totals", {})
    writer.writerow([])  # linha vazia
    writer.writerow([
        "TOTAL",
        f"{totals.get('income', 0):.2f}".replace(".", ","),
        f"{totals.get('expense', 0):.2f}".replace(".", ","),
        f"{totals.get('balance', 0):.2f}".replace(".", ","),
    ])

    return buffer.getvalue().encode("utf-8-sig")


# ── PDF ─────────────────────────────────────────────────────────────────────

def _money(value) -> str:
    """Formata Decimal/float como 'R$ 1.234,56'."""
    if value is None:
        return "R$ 0,00"
    return f"R$ {value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _build_pdf_header(user, title: str, start: date | None, end: date | None) -> list:
    """Cabeçalho comum dos PDFs."""
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"<b>{title}</b>", styles["Title"]))
    elements.append(Spacer(1, 0.3 * cm))

    info = f"<b>Usuário:</b> {user.name} ({user.email})<br/>"
    if start and end:
        info += f"<b>Período:</b> {start.strftime('%d/%m/%Y')} a {end.strftime('%d/%m/%Y')}<br/>"
    info += f"<b>Gerado em:</b> {date.today().strftime('%d/%m/%Y')}"

    elements.append(Paragraph(info, styles["Normal"]))
    elements.append(Spacer(1, 0.5 * cm))

    return elements


def generate_transactions_pdf(
    user,
    incomes_qs,
    expenses_qs,
    start: date | None = None,
    end: date | None = None,
) -> bytes:
    """Gera PDF com tabela de transações e totais."""

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    elements = _build_pdf_header(user, "Relatório de Transações", start, end)

    # ── Tabela ─────────────────────────────────────────────────────
    data = [["Tipo", "Data", "Categoria", "Descrição", "Valor"]]

    total_in = Decimal("0")
    total_out = Decimal("0")

    for inc in incomes_qs.select_related("category").order_by("date"):
        data.append([
            "Receita",
            inc.date.strftime("%d/%m/%Y"),
            inc.category.name if inc.category else "—",
            (inc.description or "")[:40],
            _money(inc.amount),
        ])
        total_in += inc.amount

    for exp in expenses_qs.select_related("category").order_by("date"):
        data.append([
            "Despesa",
            exp.date.strftime("%d/%m/%Y"),
            exp.category.name if exp.category else "—",
            (exp.description or "")[:40],
            _money(exp.amount),
        ])
        total_out += exp.amount

    # Cria a tabela
    table = Table(data, colWidths=[2.2 * cm, 2.5 * cm, 3.5 * cm, 6 * cm, 2.8 * cm])
    table.setStyle(TableStyle([
        # Cabeçalho
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),

        # Corpo
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ALIGN", (4, 1), (4, -1), "RIGHT"),  # coluna valor à direita

        # Zebra striping
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6f8")]),
    ]))
    elements.append(table)

    # ── Totais ──────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.6 * cm))

    balance = total_in - total_out
    totals_data = [
        ["Total de Receitas:", _money(total_in)],
        ["Total de Despesas:", _money(total_out)],
        ["Saldo:", _money(balance)],
    ]
    totals_table = Table(totals_data, colWidths=[5 * cm, 4 * cm])
    totals_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (1, 0), (1, 0), colors.HexColor("#27ae60")),    # receitas verde
        ("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor("#c0392b")),    # despesas vermelho
        ("TEXTCOLOR", (1, 2), (1, 2),
         colors.HexColor("#27ae60") if balance >= 0 else colors.HexColor("#c0392b")),
        ("LINEABOVE", (0, 2), (-1, 2), 1, colors.black),
    ]))
    elements.append(totals_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_summary_pdf(user, summary_data: dict, year: int | None = None) -> bytes:
    """Gera PDF do resumo mensal."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm)

    title = f"Resumo Financeiro {year}" if year else "Resumo Financeiro"
    elements = _build_pdf_header(user, title, None, None)

    data = [["Período", "Receitas", "Despesas", "Saldo"]]

    total_in = Decimal("0")
    total_out = Decimal("0")

    for row in summary_data.get("months", []):
        data.append([
            row["period"],
            _money(row["income"]),
            _money(row["expense"]),
            _money(row["balance"]),
        ])
        total_in += Decimal(str(row["income"]))
        total_out += Decimal(str(row["expense"]))

    # Linha de total
    data.append([
        "TOTAL",
        _money(total_in),
        _money(total_out),
        _money(total_in - total_out),
    ])

    table = Table(data, colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c3e50")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ecf0f1")),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f4f6f8")]),
    ]))
    elements.append(table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes