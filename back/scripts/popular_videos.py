"""
scripts/popular_videos.py

Popula o banco com vídeos curados do YouTube como conteúdo educacional.

USO:
  python manage.py shell -c "exec(open('scripts/popular_videos.py', encoding='utf-8').read())"

IMPORTANTE:
  Antes de rodar em produção/apresentação, REVISE as URLs e confirme
  que os vídeos ainda estão disponíveis. URLs do YouTube podem mudar.
"""

import os
import sys
import django

# Setup do Django se rodando standalone
if __name__ == "__main__" and not os.environ.get("DJANGO_SETTINGS_MODULE"):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

from django.utils import timezone
from apps.education.models import Path, Content, PathContent


# ── VÍDEOS CURADOS POR TRILHA ────────────────────────────────────────────────
# Cada vídeo tem: title, description, file_url (YouTube), category,
#                duration_minutes, level (beginner/intermediate/advanced),
#                trilha (título exato da trilha pra vincular)

VIDEOS = [
    # ── Fundamentos Financeiros ─────────────────────────────────────────────
    {
        "title": "Como organizar suas finanças pessoais do ZERO",
        "description": "Nathália Arcuri (Me Poupe!) ensina como começar a organizar suas finanças, mesmo que você nunca tenha feito isso antes.",
        "file_url": "https://www.youtube.com/watch?v=33kjNMy_zfc",
        "category": "Planejamento",
        "duration_minutes": 18,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Como SAIR DAS DÍVIDAS em 6 passos",
        "description": "Aprenda o passo a passo prático para sair do vermelho e começar a juntar dinheiro com a Nath Finanças.",
        "file_url": "https://www.youtube.com/watch?v=L77tVt9aqTA",
        "category": "Planejamento",
        "duration_minutes": 15,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Reserva de emergência: por onde começar",
        "description": "Gustavo Cerbasi explica o que é, quanto guardar e onde investir sua reserva de emergência.",
        "file_url": "https://www.youtube.com/watch?v=zPYNQ-O27_8",
        "category": "Planejamento",
        "duration_minutes": 12,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Como criar um orçamento que realmente funciona",
        "description": "Método prático para organizar seu orçamento mensal e parar de ficar no negativo.",
        "file_url": "https://www.youtube.com/watch?v=ZK1szOA-mU8",
        "category": "Planejamento",
        "duration_minutes": 14,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },

    # ── MEI e Tributação ────────────────────────────────────────────────────
    {
        "title": "MEI: tudo que você precisa saber para começar",
        "description": "Guia completo sobre como abrir, manter e gerenciar um MEI no Brasil.",
        "file_url": "https://www.youtube.com/watch?v=YXp8MK0YlXc",
        "category": "Tributação",
        "duration_minutes": 22,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "DAS-MEI: como pagar e nunca atrasar",
        "description": "Tutorial passo a passo de como gerar e pagar o DAS do MEI sem complicação.",
        "file_url": "https://www.youtube.com/watch?v=4OmTQOlMzQ8",
        "category": "Tributação",
        "duration_minutes": 8,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Declaração Anual do MEI passo a passo",
        "description": "Como fazer a DASN-SIMEI sem erros e sem precisar de contador.",
        "file_url": "https://www.youtube.com/watch?v=oWZ5q3pZWvI",
        "category": "Tributação",
        "duration_minutes": 16,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Quando o MEI deve virar ME ou EPP",
        "description": "Sinais de que seu negócio cresceu além do MEI e como fazer a transição corretamente.",
        "file_url": "https://www.youtube.com/watch?v=eqo7nXNd9JI",
        "category": "Tributação",
        "duration_minutes": 14,
        "level": "intermediate",
        "trilha": "MEI e Tributação",
    },

    # ── Gestão de Negócio ───────────────────────────────────────────────────
    {
        "title": "Precificação para pequenos negócios",
        "description": "Como calcular o preço de venda dos seus produtos ou serviços de forma estratégica.",
        "file_url": "https://www.youtube.com/watch?v=oVlqcuPHkFI",
        "category": "Estratégia",
        "duration_minutes": 19,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },
    {
        "title": "Fluxo de caixa: o coração do seu negócio",
        "description": "Aprenda a controlar o fluxo de caixa para nunca mais ser pego de surpresa com contas.",
        "file_url": "https://www.youtube.com/watch?v=QnD0wBNNVCs",
        "category": "Fluxo de Caixa",
        "duration_minutes": 17,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },
    {
        "title": "Margem de lucro: como calcular e melhorar",
        "description": "Entenda a diferença entre margem bruta, líquida e operacional, e como usar isso a seu favor.",
        "file_url": "https://www.youtube.com/watch?v=pZ8xCPbVCo8",
        "category": "Análise",
        "duration_minutes": 13,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },

    # ── Crescimento e Investimentos ─────────────────────────────────────────
    {
        "title": "Tesouro Direto explicado de uma vez por todas",
        "description": "Tudo sobre Tesouro Selic, IPCA+ e Prefixado para começar a investir com segurança.",
        "file_url": "https://www.youtube.com/watch?v=SWxLQfpYWLY",
        "category": "Investimento",
        "duration_minutes": 18,
        "level": "intermediate",
        "trilha": "Crescimento e Investimentos",
    },
    {
        "title": "CDB, LCI, LCA: qual a diferença na prática",
        "description": "Comparação clara entre os principais investimentos de renda fixa do Brasil.",
        "file_url": "https://www.youtube.com/watch?v=A4tjK5cQz_M",
        "category": "Investimento",
        "duration_minutes": 15,
        "level": "intermediate",
        "trilha": "Crescimento e Investimentos",
    },
    {
        "title": "Fundos imobiliários para iniciantes",
        "description": "Como começar a investir em FIIs e gerar renda passiva mensal.",
        "file_url": "https://www.youtube.com/watch?v=z3Lh0V7uF_4",
        "category": "Investimento",
        "duration_minutes": 20,
        "level": "advanced",
        "trilha": "Crescimento e Investimentos",
    },
    {
        "title": "Como reinvestir o lucro do seu negócio",
        "description": "Estratégias inteligentes para usar o lucro a favor do crescimento do seu MEI.",
        "file_url": "https://www.youtube.com/watch?v=hYYwY8wQqQw",
        "category": "Investimento",
        "duration_minutes": 14,
        "level": "advanced",
        "trilha": "Crescimento e Investimentos",
    },
]


def main():
    print("=" * 70)
    print("CoreFin · Populador de Vídeos do YouTube")
    print("=" * 70)
    print(f"Total de vídeos a adicionar: {len(VIDEOS)}")
    print("=" * 70 + "\n")

    sucessos = 0
    pulados = 0
    erros = 0

    for i, video in enumerate(VIDEOS, start=1):
        print(f"[{i}/{len(VIDEOS)}] {video['title'][:60]}")

        # Busca a trilha
        try:
            trilha = Path.objects.get(title=video["trilha"])
        except Path.DoesNotExist:
            print(f"  ⚠️  Trilha '{video['trilha']}' não existe. Pulando.")
            erros += 1
            continue

        # Cria ou recupera o conteúdo
        content, criado = Content.objects.get_or_create(
            title=video["title"],
            defaults={
                "description": video["description"],
                "file_url": video["file_url"],
                "category": video["category"],
                "type": "video",
                "level": video["level"],
                "status": "published",
                "duration_minutes": video["duration_minutes"],
                "published_at": timezone.now(),
            },
        )

        if not criado:
            print(f"  ↻ Já existe (pulando)")
            pulados += 1
            continue

        # Vincula à trilha
        ordem = PathContent.objects.filter(path=trilha).count() + 1
        PathContent.objects.get_or_create(
            path=trilha,
            content=content,
            defaults={"display_order": ordem, "is_required": False},
        )

        print(f"  ✓ Adicionado à trilha '{trilha.title}'")
        sucessos += 1

    print("\n" + "=" * 70)
    print(f"✅ Concluído!")
    print(f"   Sucessos: {sucessos}")
    print(f"   Pulados:  {pulados}")
    print(f"   Erros:    {erros}")
    print(f"   Total:    {len(VIDEOS)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
else:
    main()