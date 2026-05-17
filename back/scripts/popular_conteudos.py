"""
scripts/popular_conteudos.py

Popula o banco com conteúdos educacionais gerados pelo Gemini.

USO:
  python manage.py shell -c "exec(open('scripts/popular_conteudos.py', encoding='utf-8').read())"

OU (em forma de comando):
  python scripts/popular_conteudos.py

OPÇÕES (editáveis no início do arquivo):
  DRY_RUN = True   → apenas mostra o que faria, sem salvar
  LIMPAR_ANTES = False → se True, apaga todos os contents/paths antes
"""

import os
import sys
import time
import json
import django

# Setup do Django se rodando standalone
if __name__ == "__main__" and not os.environ.get("DJANGO_SETTINGS_MODULE"):
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    django.setup()

from django.conf import settings
from django.utils import timezone
import google.generativeai as genai

from apps.education.models import Path, Content, PathContent


# ── CONFIGURAÇÕES ────────────────────────────────────────────────────────────

DRY_RUN = False           # True = só mostra, não salva
LIMPAR_ANTES = False      # True = apaga tudo antes (cuidado!)
PAUSA_ENTRE_REQS = 5      # segundos entre chamadas pro Gemini (rate limit)


# ── ESTRUTURA DAS TRILHAS ────────────────────────────────────────────────────

TRILHAS = [
    {
        "title": "Fundamentos Financeiros",
        "description": "A base que todo empreendedor precisa: organização, hábitos e mentalidade financeira saudável.",
        "level": "beginner",
        "topicos": [
            "O que é gestão financeira pessoal e por que importa",
            "Como organizar receitas e despesas no dia a dia",
            "Reserva de emergência: por que e quanto guardar",
            "Diferença entre dinheiro pessoal e dinheiro do negócio",
            "Educação financeira: hábitos diários que mudam tudo",
        ],
    },
    {
        "title": "MEI e Tributação",
        "description": "Tudo o que o Microempreendedor Individual precisa saber sobre impostos e obrigações fiscais.",
        "level": "beginner",
        "topicos": [
            "O que é o MEI e quem pode ser",
            "DAS-MEI: o que é, valor e como pagar",
            "Declaração Anual do MEI: passo a passo",
            "Quando o MEI precisa desenquadrar",
            "Notas fiscais: quando emitir e como",
        ],
    },
    {
        "title": "Gestão de Negócio",
        "description": "Estratégias práticas para gerenciar e fazer o seu negócio crescer com saúde financeira.",
        "level": "intermediate",
        "topicos": [
            "Como calcular o preço de venda do seu produto",
            "Controle de fluxo de caixa para microempreendedores",
            "Margem de lucro: o número que todo MEI precisa saber",
            "Como negociar com fornecedores e ter mais lucro",
            "Capital de giro: o que é e como gerenciar",
        ],
    },
    {
        "title": "Crescimento e Investimentos",
        "description": "Como fazer o dinheiro trabalhar por você: do reinvestimento à aposentadoria.",
        "level": "advanced",
        "topicos": [
            "Quando e como reinvestir o lucro do negócio",
            "Tesouro Direto explicado para iniciantes",
            "CDB, LCI, LCA: qual a diferença",
            "Como diversificar: ações, fundos imobiliários e renda fixa",
            "Planejando aposentadoria para autônomos e MEIs",
        ],
    },
]


# ── PROMPT PRO GEMINI ────────────────────────────────────────────────────────

def montar_prompt(topico: str, trilha_titulo: str, nivel: str) -> str:
    nivel_br = {"beginner": "iniciante", "intermediate": "intermediário", "advanced": "avançado"}[nivel]

    return f"""Gere um artigo educacional sobre: "{topico}"

CONTEXTO:
- Plataforma: CoreFin (gestão financeira para MEI brasileiros)
- Trilha: {trilha_titulo}
- Nível do leitor: {nivel_br}
- Público: Microempreendedores Individuais (MEI) que estão aprendendo a gerir suas finanças

RETORNE APENAS UM JSON VÁLIDO neste formato exato (sem ```json, sem comentários, sem texto antes ou depois):

{{
  "title": "Título atraente e claro, máx 90 caracteres",
  "description": "Descrição curta que aparece nos cards, 1-2 frases, máx 200 caracteres",
  "body": "Corpo do artigo em markdown. Comece direto, sem repetir o título. Use ## para subtítulos. Inclua exemplos práticos quando útil. 600 a 900 palavras.",
  "category": "Uma das categorias: Planejamento | Fluxo de Caixa | Tributação | Análise | Estratégia | Investimento | Operações | Educação",
  "duration_minutes": 8
}}

REGRAS:
- Português brasileiro, tom amigável e direto
- Linguagem acessível, evite jargão técnico sem explicar
- Inclua pelo menos 1 exemplo prático no body
- Não invente leis específicas, valores exatos ou estatísticas
- duration_minutes deve refletir tempo de leitura realista (4-12 min)
"""


# ── GERAÇÃO E PARSING ────────────────────────────────────────────────────────

def gerar_artigo(model, topico: str, trilha_titulo: str, nivel: str) -> dict | None:
    """Chama o Gemini com modo JSON nativo e retorna o artigo. None se falhar."""
    prompt = montar_prompt(topico, trilha_titulo, nivel)

    # Schema JSON forçado — Gemini garante saída válida
    generation_config = genai.GenerationConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "body": {"type": "string"},
                "category": {"type": "string"},
                "duration_minutes": {"type": "integer"},
            },
            "required": ["title", "description", "body", "category", "duration_minutes"],
        },
    )

    try:
        response = model.generate_content(prompt, generation_config=generation_config)
        text = response.text.strip()
        data = json.loads(text)

        # Sanitização
        data["title"] = str(data["title"])[:200].strip()
        data["description"] = str(data["description"])[:500].strip()
        data["body"] = str(data["body"]).strip()
        data["category"] = str(data["category"]).strip()
        data["duration_minutes"] = int(data.get("duration_minutes", 8))

        return data

    except json.JSONDecodeError as e:
        print(f"  ❌ JSON inválido: {e}")
        print(f"  Resposta bruta: {text[:200]}...")
        return None
    except Exception as e:
        print(f"  ❌ Erro ao chamar Gemini: {e}")
        return None


# ── EXECUÇÃO PRINCIPAL ───────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("CoreFin · Populador de Conteúdo Educacional")
    print("=" * 70)
    print(f"DRY_RUN:       {DRY_RUN}")
    print(f"LIMPAR_ANTES:  {LIMPAR_ANTES}")
    print(f"Pausa entre:   {PAUSA_ENTRE_REQS}s")
    print(f"Modelo:        {settings.GEMINI_MODEL}")
    print("=" * 70)
    print()

    # Limpa se solicitado
    if LIMPAR_ANTES and not DRY_RUN:
        print("🗑️  Apagando conteúdos e trilhas existentes...")
        PathContent.objects.all().delete()
        Content.objects.all().delete()
        Path.objects.all().delete()
        print("   Limpeza concluída.\n")

    # Configura Gemini
    if not settings.GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY não configurada. Abortando.")
        return

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    # Contador total
    total_topicos = sum(len(t["topicos"]) for t in TRILHAS)
    artigo_atual = 0
    sucessos = 0
    falhas = 0

    for trilha_data in TRILHAS:
        print(f"\n📚 Trilha: {trilha_data['title']}")
        print("-" * 70)

        # Cria ou recupera a trilha
        if DRY_RUN:
            trilha = None
            print(f"   [DRY] Criaria trilha: {trilha_data['title']}")
        else:
            trilha, criada = Path.objects.get_or_create(
                title=trilha_data["title"],
                defaults={
                    "description": trilha_data["description"],
                    "level": trilha_data["level"],
                    "is_published": True,
                },
            )
            print(f"   {'✨ Criada' if criada else '↻ Recuperada'}: {trilha.title}")

        # Gera artigos
        for ordem, topico in enumerate(trilha_data["topicos"], start=1):
            artigo_atual += 1
            print(f"\n   [{artigo_atual}/{total_topicos}] {topico}")

            artigo = gerar_artigo(model, topico, trilha_data["title"], trilha_data["level"])

            if not artigo:
                falhas += 1
                continue

            print(f"      ✓ Gerado: '{artigo['title'][:60]}...'")
            print(f"      Categoria: {artigo['category']} · Leitura: {artigo['duration_minutes']}min")

            if not DRY_RUN:
                # Verifica se já existe pelo título
                content, criado = Content.objects.get_or_create(
                    title=artigo["title"],
                    defaults={
                        "description": artigo["description"],
                        "body": artigo["body"],
                        "category": artigo["category"],
                        "type": "article",
                        "level": trilha_data["level"],
                        "status": "published",
                        "duration_minutes": artigo["duration_minutes"],
                        "published_at": timezone.now(),
                    },
                )

                if not criado:
                    print(f"      ↻ Conteúdo já existia (mesmo título). Pulando vinculação.")
                else:
                    # Vincula à trilha
                    PathContent.objects.get_or_create(
                        path=trilha,
                        content=content,
                        defaults={"display_order": ordem, "is_required": True},
                    )
                    sucessos += 1
                    print(f"      💾 Salvo no banco e vinculado à trilha.")

            # Pausa pra respeitar rate limit
            if artigo_atual < total_topicos:
                time.sleep(PAUSA_ENTRE_REQS)

    # Resumo final
    print("\n" + "=" * 70)
    print(f"✅ Concluído!")
    print(f"   Sucessos: {sucessos}")
    print(f"   Falhas:   {falhas}")
    print(f"   Total:    {artigo_atual}")
    print("=" * 70)


if __name__ == "__main__":
    main()
else:
    # Sendo executado via manage.py shell
    main()