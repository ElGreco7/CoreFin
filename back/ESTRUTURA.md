# CoreFin — Estrutura do Projeto

Backend Django REST (API-first) que serve o frontend React/Vite do CoreFin.

corefin/
├── config/                  # Configuração central do Django
│   ├── settings/
│   │   ├── base.py          # Settings comuns
│   │   ├── development.py   # Sobrescreve para dev
│   │   └── production.py    # Sobrescreve para prod
│   ├── urls.py              # Roteador raiz
│   └── wsgi.py / asgi.py
│
├── apps/
│   ├── core/                # BaseModel abstrato, paginação customizada
│   ├── users/               # Autenticação JWT, recuperação de senha, roles
│   ├── finance/             # Categorias, receitas, despesas, relatórios CSV/PDF
│   │   └── reports/         # Geradores de CSV e PDF (reportlab)
│   ├── goals/               # Metas e aportes
│   ├── education/           # Trilhas, conteúdos, progresso, avaliações
│   ├── chat/                # Conversas com CoreChat (IA)
│   ├── notifications/       # Notificações por tipo, marcação de lidas
│   ├── analytics/           # Eventos rastreados, stats, signals automáticos
│   └── admin_api/           # Gestão admin de usuários via API
│
├── manage.py
├── requirements.txt
├── .env.example             # Template de variáveis de ambiente
└── .env                     # Variáveis reais (NÃO versionar)

## Convenções

- **Cada app é uma feature** — agrupa models, serializers, views e urls relacionados.
- **`core/`** contém utilitários compartilhados (BaseModel com timestamps, paginação).
- **`admin_api/`** isola endpoints administrativos do resto.
- **Autenticação via JWT** (SimpleJWT) — token de acesso (1h) + refresh (7 dias).
- **Documentação** automática em `/api/docs/` (Swagger via drf-spectacular).
- **Permissões padrão**: `IsAuthenticated` em todos os endpoints. Endpoints admin usam `IsAdminRole` (custom).

## Stack

- Django 4.2 + Django REST Framework
- PostgreSQL (driver psycopg3)
- SimpleJWT (autenticação)
- django-filter (filtros)
- drf-spectacular (OpenAPI / Swagger)
- reportlab (geração de PDF)
- django-cors-headers (CORS pro frontend)