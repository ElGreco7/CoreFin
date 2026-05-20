"""
scripts/reset_videos.py

Apaga APENAS os vídeos existentes e repopula com URLs verificadas (2025/2026).
Artigos NÃO são afetados.

USO (via build.sh com RUN_SEED=true):
  Adicione ao build.sh:
    python manage.py shell -c "exec(open('scripts/reset_videos.py', encoding='utf-8').read())"
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

# ── VÍDEOS VERIFICADOS (URLs testadas em maio/2026) ──────────────────────────

VIDEOS = [
    # ── Fundamentos Financeiros ──────────────────────────────────────────────
    {
        "title": "7 passos para organizar sua vida financeira em 2026",
        "description": "Me Poupe! ensina como organizar suas finanças do zero com passos simples e práticos.",
        "file_url": "https://www.youtube.com/watch?v=Uru7IhCSjJI",
        "category": "Planejamento",
        "duration_minutes": 14,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Planejamento financeiro: 4 passos para prosperar em 2026",
        "description": "Gustavo Cerbasi revela os 4 passos essenciais para organizar as finanças e construir patrimônio.",
        "file_url": "https://www.youtube.com/watch?v=OneUdoCsuUo",
        "category": "Planejamento",
        "duration_minutes": 18,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },
    {
        "title": "Como administrar o MEI em 2025/2026",
        "description": "Dicas essenciais para microempreendedores organizarem, planejarem e fazerem o negócio crescer.",
        "file_url": "https://www.youtube.com/watch?v=msi5_t9Akas",
        "category": "Planejamento",
        "duration_minutes": 16,
        "level": "beginner",
        "trilha": "Fundamentos Financeiros",
    },

    # ── MEI e Tributação ─────────────────────────────────────────────────────
    {
        "title": "10 dicas do Sebrae para o MEI começar 2026 sem surpresas",
        "description": "O Sebrae reúne as principais datas e obrigações do MEI para o ano de 2026.",
        "file_url": "https://www.youtube.com/watch?v=nGRD_fzyD_c",
        "category": "Tributação",
        "duration_minutes": 8,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Como abrir MEI gratuitamente em 2026 — passo a passo",
        "description": "Tutorial oficial do Sebrae para abrir seu CNPJ MEI de forma gratuita e simples.",
        "file_url": "https://www.youtube.com/watch?v=N3PwRyNL8OM",
        "category": "Tributação",
        "duration_minutes": 10,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Declaração Anual do MEI 2025 (DASN-SIMEI) em menos de 5 minutos",
        "description": "Passo a passo para fazer a declaração anual do MEI sem erros e sem precisar de contador.",
        "file_url": "https://www.youtube.com/watch?v=DQ6q_Aq6pvg",
        "category": "Tributação",
        "duration_minutes": 7,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Como emitir nota fiscal MEI de produtos — Sebrae 2026",
        "description": "Aprenda a emitir nota fiscal de produtos como MEI usando o emissor gratuito do Sebrae.",
        "file_url": "https://www.youtube.com/watch?v=S_SVai_l8MQ",
        "category": "Tributação",
        "duration_minutes": 12,
        "level": "intermediate",
        "trilha": "MEI e Tributação",
    },
    {
        "title": "Vantagens e benefícios de ser MEI em 2026",
        "description": "Entenda as principais vantagens de formalizar seu negócio como MEI e os benefícios previdenciários.",
        "file_url": "https://www.youtube.com/watch?v=yzem2jG4TtI",
        "category": "Tributação",
        "duration_minutes": 11,
        "level": "beginner",
        "trilha": "MEI e Tributação",
    },

    # ── Gestão de Negócio ────────────────────────────────────────────────────
    {
        "title": "10 dicas do Sebrae para MEI em 2026",
        "description": "Sebrae compartilha dicas práticas de gestão, finanças e crescimento para microempreendedores.",
        "file_url": "https://www.youtube.com/watch?v=uiaNmvyras4",
        "category": "Estratégia",
        "duration_minutes": 13,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },
    {
        "title": "Como declarar o MEI no Imposto de Renda 2025/2026",
        "description": "Guia completo sobre como declarar os rendimentos do MEI no IR sem cometer erros.",
        "file_url": "https://www.youtube.com/watch?v=UWY3WVToQ3E",
        "category": "Tributação",
        "duration_minutes": 14,
        "level": "intermediate",
        "trilha": "Gestão de Negócio",
    },

    # ── Crescimento e Investimentos ──────────────────────────────────────────
    {
        "title": "Guia completo: Tesouro Direto 2026 com simulações",
        "description": "Todos os títulos do Tesouro Direto explicados com simulações práticas para iniciantes e intermediários.",
        "file_url": "https://www.youtube.com/watch?v=mjmh26Ma72M",
        "category": "Investimento",
        "duration_minutes": 20,
        "level": "beginner",
        "trilha": "Crescimento e Investimentos",
    },
    {
        "title": "Como investir no Tesouro Direto: guia completo para iniciantes 2026",
        "description": "Aprenda sobre Tesouro Selic, IPCA+ e Prefixado e como começar a investir com segurança.",
        "file_url": "https://www.youtube.com/watch?v=bolG9pgxEAU",
        "category": "Investimento",
        "duration_minutes": 18,
        "level": "beginner",
        "trilha": "Crescimento e Investimentos",
    },
    {
        "title": "Tesouro Reserva: o novo título do Tesouro Direto (maio 2026)",
        "description": "Entenda o novo Tesouro Reserva, com liquidez 24h via Pix, lançado em maio de 2026.",
        "file_url": "https://www.youtube.com/watch?v=ddB-3NfUI-0",
        "category": "Investimento",
        "duration_minutes": 15,
        "level": "intermediate",
        "trilha": "Crescimento e Investimentos",
    },
]


def main():
    print("=" * 70)
    print("CoreFin · Reset de Vídeos (URLs verificadas maio/2026)")
    print("=" * 70)

    # Remove APENAS vídeos (tipo 'video'), mantém artigos intactos
    videos_existentes = Content.objects.filter(type="video")
    total_removidos = videos_existentes.count()
    PathContent.objects.filter(content__in=videos_existentes).delete()
    videos_existentes.delete()
    print(f"🗑️  {total_removidos} vídeos antigos removidos.")
    print(f"📥 Inserindo {len(VIDEOS)} vídeos novos...\n")

    sucessos = 0
    erros = 0

    for i, video in enumerate(VIDEOS, start=1):
        print(f"[{i}/{len(VIDEOS)}] {video['title'][:65]}")

        try:
            trilha = Path.objects.get(title=video["trilha"])
        except Path.DoesNotExist:
            print(f"  ⚠️  Trilha '{video['trilha']}' não existe. Pulando.")
            erros += 1
            continue

        content = Content.objects.create(
            title=video["title"],
            description=video["description"],
            file_url=video["file_url"],
            category=video["category"],
            type="video",
            level=video["level"],
            status="published",
            duration_minutes=video["duration_minutes"],
            published_at=timezone.now(),
        )

        ordem = PathContent.objects.filter(path=trilha).count() + 1
        PathContent.objects.create(
            path=trilha,
            content=content,
            display_order=ordem,
            is_required=False,
        )

        print(f"  ✓ Adicionado a '{trilha.title}'")
        sucessos += 1

    print()
    print("=" * 70)
    print(f"✅ Concluído | Adicionados: {sucessos} | Erros: {erros}")
    print("=" * 70)


if __name__ == "__main__":
    main()
else:
    main()