# CoreFin · Backend

API REST do CoreFin, construída com **Django 4.2** e **Django REST Framework**.

---

## Visão Geral

Este serviço expõe a API consumida pelo frontend React e centraliza toda a lógica de negócio da plataforma, persistindo dados em **PostgreSQL** e autenticando requisições via **JWT**.

---

## Stack

- Django 4.2
- Django REST Framework
- djangorestframework-simplejwt (autenticação)
- drf-spectacular (Swagger/OpenAPI)
- PostgreSQL + psycopg 3.x
- ReportLab (geração de PDFs)
- google-generativeai (CoreChat)

---

## Estrutura dos Apps

| App | Responsabilidade |
|-----|------------------|
| `core` | Modelo base (`BaseModel`) com `created_at`, `updated_at` |
| `users` | CustomUser baseado em e-mail, roles, JWT, recuperação de senha |
| `finance` | Categorias, receitas, despesas, relatórios em CSV/PDF |
| `goals` | Metas financeiras com aportes (`/contribute/`) |
| `education` | Trilhas, conteúdos, progresso e avaliações |
| `chat` | Conversas com o assistente e integração com Gemini |
| `notifications` | Notificações por usuário |
| `analytics` | Rastreamento de eventos via signals |
| `admin_api` | Endpoints administrativos (gestão de usuários) |

---

## Configuração

### Pré-requisitos

- Python 3.11+
- PostgreSQL 14+

### Setup

```bash
# 1. Ambiente virtual
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate   # Linux/Mac

# 2. Dependências
pip install -r requirements.txt

# 3. Variáveis de ambiente
cp .env.example .env
```

### Variáveis de Ambiente

Edite o arquivo `.env`:

```env
# Django
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Banco de dados
DB_NAME=corefin
DB_USER=postgres
DB_PASSWORD=sua-senha
DB_HOST=localhost
DB_PORT=5432

# IA (Gemini)
GEMINI_API_KEY=sua-chave-do-gemini

# CORS (frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Migrações e superusuário

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Execução

```bash
python manage.py runserver
```

A API ficará disponível em `http://localhost:8000`.

---

## Comandos Úteis

```bash
# Criar uma nova migração após alterações em models
python manage.py makemigrations

# Aplicar migrações pendentes
python manage.py migrate

# Acessar o shell Django
python manage.py shell

# Coletar arquivos estáticos (deploy)
python manage.py collectstatic --noinput

# Rodar testes
python manage.py test
```

---

## Documentação Interativa

Após iniciar o servidor:

- **Swagger UI:** http://localhost:8000/api/docs/
- **OpenAPI Schema:** http://localhost:8000/api/schema/
- **Django Admin:** http://localhost:8000/admin/

---

## Endpoints Principais

### Autenticação (`/api/auth/`)
- `POST /register/` — Cadastro
- `POST /login/` — Login (retorna access + refresh tokens)
- `POST /refresh/` — Renova access token
- `POST /logout/` — Invalida o refresh token (blacklist)
- `GET /me/` — Dados do usuário autenticado
- `POST /password-reset/request/` — Solicita reset de senha
- `POST /password-reset/confirm/` — Confirma reset com token
- `POST /change-password/` — Troca de senha autenticada

### Financeiro (`/api/finance/`)
- `GET/POST /categories/` — Categorias
- `GET/POST /incomes/` — Receitas
- `GET/POST /expenses/` — Despesas
- `GET /summary/` — Resumo do período
- `GET /reports/transactions.{csv,pdf}` — Relatório de transações
- `GET /reports/summary.{csv,pdf}` — Relatório de resumo

### Metas (`/api/goals/`)
- `GET/POST /goals/` — CRUD de metas
- `POST /goals/{id}/contribute/` — Registrar aporte

### Educação (`/api/education/`)
- `GET/POST /paths/` — Trilhas
- `GET/POST /contents/` — Conteúdos
- `POST /contents/{id}/mark_completed/` — Marcar como concluído
- `POST /contents/{id}/rate/` — Avaliar

### Chat (`/api/conversations/`)
- `GET/POST /conversations/` — Conversas
- `POST /conversations/{id}/send_message/` — Enviar mensagem

### Administrativo (`/api/admin/`)
- `GET/POST /users/` — Gestão de usuários
- `POST /users/{id}/activate/` — Ativar
- `POST /users/{id}/deactivate/` — Desativar
- `POST /users/{id}/reset-password/` — Resetar senha
- `GET /users/stats/` — Estatísticas

### Analytics (`/api/analytics/`)
- `GET /events/` — Lista de eventos (admin)
- `GET /stats/` — Estatísticas agregadas (admin)
- `GET /my-activity/` — Atividade do próprio usuário
- `POST /track/` — Registrar evento

---

## Permissões

A aplicação utiliza um modelo de permissões baseado em **roles**:

| Role | Acesso |
|------|--------|
| `admin` | Total — gestão de usuários, conteúdo, configurações |
| `viewer` | Painel administrativo em modo leitura |
| `user` | Funcionalidades pessoais (transações, metas, chat) |

As permissões são aplicadas via `permission_classes` do DRF, com lógica granular por ação quando necessário (`get_permissions()`).

---

## Convenções

- **Modelos** herdam de `apps.core.models.BaseModel`
- **Serializers** seguem o padrão `XList` (leve) e `XDetail` (completo)
- **Views** usam `ModelViewSet` quando possível, com actions customizadas via `@action`
- **Migrações** são versionadas e nunca devem ser editadas após commit