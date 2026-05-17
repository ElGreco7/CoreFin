"""
scripts/popular_videos_v2.py

Adiciona 12 vídeos verificados ao banco, distribuídos nas 4 trilhas.
URLs validadas em buscas recentes (2025-2026).
"""

import os
import sys
import django

if __name__ == "__main__" and not os.environ.get("DJANGO_SETTINGS_MODULE"):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

from django.utils import timezone
from apps.education.models import Path, Content, PathContent


VIDEOS = [
    # ── Fundamentos Financeiros (3 novos) ───────────────────────────────────
    {
        "title": "Como organizar suas finanças em 7 passos simples",
        "description": "Método prático para sair do zero e ter controle do seu dinheiro mês a mês.",
        "file_url": "https://www.youtube.com/watch?v=cVqHzfFvgQ4",
        "category": "Planejamento",
        "duration_minutes": 12,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Reserva de emergência: por que você precisa ter uma",
        "description": "Entenda quanto guardar, onde guardar e como construir sua reserva financeira.",
        "file_url": "https://www.youtube.com/watch?v=6E_GMrI9wuQ",
        "category": "Planejamento",
        "duration_minutes": 10,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Como fazer um orçamento que realmente funciona",
        "description": "Aprenda o método 50-30-20 e adapte para sua realidade financeira.",
        "file_url": "https://www.youtube.com/watch?v=cmGYJTJgyXk",
        "category": "Planejamento",
        "duration_minutes": 14,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },

    # ── MEI e Tributação (4 novos) ──────────────────────────────────────────
    {
        "title": "Como emitir e pagar a guia DAS MEI em 2026",
        "description": "Passo a passo para gerar a guia do DAS pelo Portal do Empreendedor.",
        "file_url": "https://www.youtube.com/watch?v=T7u616kzWII",
        "category": "Tributação",
        "duration_minutes": 8,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Como pagar o MEI - emissão DAS passo a passo",
        "description": "Tutorial completo de como abrir o boleto do MEI e quitar mensalmente.",
        "file_url": "https://www.youtube.com/watch?v=1CSf6t5Gfr0",
        "category": "Tributação",
        "duration_minutes": 9,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Declaração Anual do MEI 2026 (DASN-SIMEI) passo a passo",
        "description": "Como fazer a Declaração Anual do MEI sem erros e sem contador.",
        "file_url": "https://www.youtube.com/watch?v=X_T_Ur6EVCw",
        "category": "Tributação",
        "duration_minutes": 11,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "DASN-SIMEI 2026 passo a passo na prática",
        "description": "Tutorial atualizado para fazer a declaração anual evitando os erros mais comuns.",
        "file_url": "https://www.youtube.com/watch?v=TT-ckfbQUTM",
        "category": "Tributação",
        "duration_minutes": 13,
        "level": "intermediate",
        "trilha": "MEI e Tributação",
    },

    # ── Gestão de Negócio (3 novos) ─────────────────────────────────────────
    {
        "title": "Como calcular o preço de venda do seu produto",
        "description": "Aprenda a precificar produtos e serviços de forma estratégica e rentável.",
        "file_url": "https://www.youtube.com/watch?v=L9TVA6oC8K8",
        "category": "Estratégia",
        "duration_minutes": 15,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },
    {
        "title": "Fluxo de caixa para pequenos negócios",
        "description": "Como controlar entradas e saídas do seu negócio para nunca ficar no vermelho.",
        "file_url": "https://www.youtube.com/watch?v=Wf2-r57FE7c",
        "category": "Fluxo de Caixa",
        "duration_minutes": 12,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },
    {
        "title": "Margem de lucro: como calcular e aumentar",
        "description": "Entenda margem bruta, líquida e operacional do seu negócio.",
        "file_url": "https://www.youtube.com/watch?v=fGqQ_2OdMxk",
        "category": "Análise",
        "duration_minutes": 10,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },

    # ── Crescimento e Investimentos (2 novos) ───────────────────────────────
    {
        "title": "Tesouro Direto para iniciantes",
        "description": "Como investir no Tesouro Direto com pouco dinheiro e segurança.",
        "file_url": "https://www.youtube.com/watch?v=GekIp3aA8gA",
        "category": "Investimento",
        "duration_minutes": 14,
        "level": "beginner",
        "trilha": "Crescimento e Investimentos",
    },
    {
        "title": "CDB, LCI e LCA: qual o melhor investimento de renda fixa",
        "description": "Diferenças, vantagens e quando escolher cada um.",
        "file_url": "https://www.youtube.com/watch?v=W4ZAEv4lFW8",
        "category": "Investimento",
        "duration_minutes": 13,
        "level": "intermediate",
        "trilha": "Crescimento e Investimentos",
    },
]


def main():
    print("=" * 70)
    print("CoreFin · Populador de Vídeos (v2 - URLs verificadas)")
    print("=" * 70)
    print(f"Total: {len(VIDEOS)} vídeos")
    print()

    sucessos = 0
    pulados = 0
    erros = 0

    for i, video in enumerate(VIDEOS, start=1):
        print(f"[{i}/{len(VIDEOS)}] {video['title'][:60]}")

        try:
            trilha = Path.objects.get(title=video["trilha"])
        except Path.DoesNotExist:
            print(f"  ⚠️  Trilha '{video['trilha']}' não existe. Pulando.")
            erros += 1
            continue

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
            print(f"  ↻ Já existe")
            pulados += 1
            continue

        ordem = PathContent.objects.filter(path=trilha).count() + 1
        PathContent.objects.get_or_create(
            path=trilha,
            content=content,
            defaults={"display_order": ordem, "is_required": False},
        )

        print(f"  ✓ Adicionado a '{trilha.title}'")
        sucessos += 1

    print()
    print("=" * 70)
    print(f"✅ Concluído | Adicionados: {sucessos} | Pulados: {pulados} | Erros: {erros}")
    print("=" * 70)


if __name__ == "__main__":
    main()
else:
    main()