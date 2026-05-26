# CoreFin

> Plataforma de Gestão Financeira para Microempreendedores Individuais (MEI)

**Trabalho de Conclusão de Curso · 2026**

---

## Sobre o Projeto

O **CoreFin** é uma aplicação web full-stack desenvolvida como solução de gestão financeira voltada ao Microempreendedor Individual (MEI) brasileiro. O projeto combina ferramentas de controle financeiro, educação personalizada e assistência inteligente em uma única plataforma, com o objetivo de auxiliar pequenos empreendedores na tomada de decisões e na organização contábil do seu negócio.

A motivação para o desenvolvimento partiu da constatação de que grande parte dos MEIs no Brasil ainda gerencia suas finanças de maneira informal — utilizando cadernos, planilhas dispersas ou mesmo a memória —, o que dificulta o crescimento sustentável e o cumprimento de obrigações fiscais. O CoreFin propõe centralizar essas atividades em uma interface intuitiva, acessível em qualquer dispositivo, e enriquecida com recursos educacionais e inteligência artificial.

🔗 **[Acessar aplicação em produção](https://corefin-qraj.onrender.com)**

---

## Principais Funcionalidades

### Para o usuário (MEI)
- **Dashboard financeiro** com indicadores de receita, despesa e score em tempo real
- **Gestão completa de transações** com categorização customizável
- **Sistema de metas financeiras** com aportes programados e acompanhamento de progresso
- **Relatórios exportáveis** em PDF e CSV, filtrados por período
- **Notificações inteligentes** sobre eventos financeiros relevantes
- **Educação financeira** com trilhas de aprendizado, vídeos e artigos
- **CoreChat** — assistente conversacional com integração à API Google Gemini

### Para o administrador
- **Painel administrativo** com visão geral de usuários, conteúdos e atividade
- **Gestão completa de usuários** (criação, edição, ativação, reset de senha)
- **Gerenciamento de conteúdo educacional** (trilhas e materiais)
- **Analytics agregado** com métricas de uso e eventos do sistema

---

## Stack Tecnológica

### Backend
- **Python 3.13** · **Django 4.2** · **Django REST Framework**
- **PostgreSQL** com **psycopg 3.x**
- **djangorestframework-simplejwt** — autenticação JWT
- **drf-spectacular** — documentação OpenAPI/Swagger automática
- **ReportLab** — geração de PDFs
- **Google Generative AI SDK** — integração com Gemini

### Frontend
- **React 18** · **Vite** · **TypeScript**
- **TailwindCSS** · **shadcn/ui**
- **Recharts** — visualização de dados
- **React Router v7** — navegação
- **Lucide React** — iconografia

### Infraestrutura
- **Render** — hospedagem do backend (Web Service), frontend (Static Site) e banco (PostgreSQL)
- **GitHub** — controle de versão com deploy contínuo via `main`

---

## Estrutura do Repositório

```
corefin/
├── back/                       # Backend Django REST
│   ├── apps/
│   │   ├── users/              # Autenticação e usuários
│   │   ├── finance/            # Receitas, despesas, relatórios
│   │   ├── goals/              # Metas financeiras
│   │   ├── education/          # Conteúdo educacional
│   │   ├── chat/               # Assistente conversacional (CoreChat)
│   │   ├── notifications/      # Sistema de notificações
│   │   ├── analytics/          # Rastreamento de eventos
│   │   └── admin_api/          # Endpoints administrativos
│   ├── config/                 # Configurações do Django
│   ├── scripts/                # Scripts de seed do banco
│   ├── build.sh                # Script de build para o Render
│   └── requirements.txt
│
├── front/                      # Frontend React + Vite
│   ├── src/
│   │   └── app/
│   │       ├── components/     # Componentes reutilizáveis
│   │       ├── contexts/       # React Contexts (auth, tema)
│   │       ├── pages/          # Páginas da aplicação
│   │       ├── services/       # Comunicação com a API
│   │       └── routes.tsx      # Configuração de rotas
│   ├── public/                 # Favicon e assets estáticos
│   └── package.json
│
└── README.md
```

---

## Como Executar Localmente

### Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Python | 3.11+ (recomendado 3.13) |
| Node.js | 18+ |
| pnpm | qualquer |
| PostgreSQL | 14+ |
| Git | qualquer |

### 1. Banco de dados

```sql
-- No psql como superusuário:
CREATE DATABASE corefin;
CREATE USER postgres WITH PASSWORD '1234';
GRANT ALL PRIVILEGES ON DATABASE corefin TO postgres;
```

### 2. Backend

```bash
cd back

# Ambiente virtual
python -m venv .venv
.venv\Scripts\Activate.ps1      # Windows
# source .venv/bin/activate     # Mac/Linux

# Dependências
pip install -r requirements.txt

# Variáveis de ambiente
# Crie back/.env com base no exemplo abaixo:
# SECRET_KEY=django-insecure-...
# DEBUG=True
# DB_NAME=corefin
# DB_USER=postgres
# DB_PASSWORD=1234
# DB_HOST=localhost
# DB_PORT=5432
# GEMINI_API_KEY=sua_chave
# GEMINI_MODEL=gemini-2.0-flash

# Migrações e superusuário
python manage.py migrate
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

Backend em: `http://localhost:8000`
Swagger: `http://localhost:8000/api/schema/swagger-ui/`

### 3. Frontend

```bash
cd front

# Dependências
pnpm install

# Variável de ambiente
# Crie front/.env com:
# VITE_API_URL=http://localhost:8000/api

# Iniciar servidor
pnpm dev
```

Frontend em: `http://localhost:5173`

---

## Documentação da API

| Prefixo | Descrição |
|---|---|
| `/api/auth/` | Autenticação, registro, recuperação de senha |
| `/api/finance/` | Receitas, despesas, categorias, relatórios |
| `/api/goals/` | Metas financeiras e aportes |
| `/api/education/` | Trilhas, conteúdos, progresso, avaliações |
| `/api/conversations/` | CoreChat (assistente IA) |
| `/api/notifications/` | Notificações do usuário |
| `/api/analytics/` | Rastreamento e estatísticas |
| `/api/admin/` | Endpoints administrativos |

---

## Modelo de Permissões

| Perfil | Acesso |
|---|---|
| **Administrador** | Acesso total, incluindo painel admin e gestão de conteúdo |
| **Visualizador** | Painel admin em modo somente-leitura |
| **Usuário** | Funcionalidades pessoais (transações, metas, educação, chat) |

---

## Fluxo de Branches

```
francisco (local) ─┐
                   ├──► merge na main ──► Render (deploy automático)
carlos (local)    ─┘
```

- Nunca commitar diretamente na `main`
- Cada desenvolvedor trabalha na sua branch pessoal
- Merge na `main` dispara deploy automático no Render

---

## Status do Projeto

| Módulo | Status |
|---|---|
| Autenticação | ✅ Completo |
| Gestão Financeira | ✅ Completo |
| Metas | ✅ Completo |
| Relatórios | ✅ Completo |
| Notificações | ✅ Completo |
| Educação Financeira | ✅ Completo |
| CoreChat (IA Gemini) | ✅ Completo |
| Painel Administrativo | ✅ Completo |
| Deploy em Produção | ✅ No ar |

---

## Equipe

Desenvolvido como Trabalho de Conclusão de Curso — 2026.

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos. Os direitos sobre o código pertencem aos autores e à instituição de ensino.
