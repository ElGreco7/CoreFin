# CoreFin

> Plataforma de Gestão Financeira para Microempreendedores Individuais (MEI)

**Trabalho de Conclusão de Curso · 2026**

---

## Sobre o Projeto

O **CoreFin** é uma aplicação web full-stack desenvolvida como solução de gestão financeira voltada ao Microempreendedor Individual (MEI) brasileiro. O projeto combina ferramentas de controle financeiro, educação personalizada e assistência inteligente em uma única plataforma, com o objetivo de auxiliar pequenos empreendedores na tomada de decisões e na organização contábil do seu negócio.

A motivação para o desenvolvimento partiu da constatação de que grande parte dos MEIs no Brasil ainda gerencia suas finanças de maneira informal — utilizando cadernos, planilhas dispersas ou mesmo a memória —, o que dificulta o crescimento sustentável e o cumprimento de obrigações fiscais. O CoreFin propõe centralizar essas atividades em uma interface intuitiva, acessível em qualquer dispositivo, e enriquecida com recursos educacionais.

---

## Principais Funcionalidades

### Para o usuário final (MEI)
- **Dashboard financeiro** com indicadores de receita, despesa e score em tempo real
- **Gestão completa de transações** (receitas e despesas) com categorização customizável
- **Sistema de metas financeiras** com aportes programados e acompanhamento de progresso
- **Relatórios exportáveis** em PDF e CSV, filtrados por período
- **Notificações inteligentes** sobre eventos financeiros relevantes
- **Educação financeira** com trilhas de aprendizado, vídeos e artigos
- **Assistente conversacional (CoreChat)** com integração à API Google Gemini para auxílio personalizado

### Para o administrador
- **Painel administrativo** com visão geral de usuários, conteúdos e atividade da plataforma
- **Gestão completa de usuários** (criação, edição, ativação, reset de senha, exclusão)
- **Gerenciamento de conteúdo educacional** (trilhas e materiais)
- **Analytics agregado** com métricas de uso e eventos do sistema
- **Configurações e monitoramento de saúde** do sistema

---

## Arquitetura

O CoreFin segue uma arquitetura **cliente-servidor desacoplada**, com comunicação via API REST autenticada por tokens JWT.

┌─────────────────────────────┐
│   Frontend (React + Vite)   │
│   TypeScript · TailwindCSS   │
└──────────────┬──────────────┘
│
│ HTTPS · JWT
│
┌──────────────▼──────────────┐
│   Backend (Django REST)     │
│   Python 3.13 · DRF · JWT   │
└──────────────┬──────────────┘
│
│
┌───────▼────────┐
│   PostgreSQL   │
└────────────────┘

---

## Stack Tecnológica

### Backend
- **Python 3.13** com **Django 4.2** e **Django REST Framework**
- **PostgreSQL** como banco de dados relacional
- **psycopg 3.x** para conexão com PostgreSQL
- **djangorestframework-simplejwt** para autenticação por tokens JWT
- **drf-spectacular** para geração automática de documentação OpenAPI/Swagger
- **ReportLab** para geração de PDFs
- **Google Generative AI SDK** para integração com o modelo Gemini

### Frontend
- **React 18** com **Vite** como bundler
- **TypeScript** como linguagem principal
- **TailwindCSS** para estilização
- **shadcn/ui** como base de componentes
- **Recharts** para visualização de dados
- **React Router v6** para navegação
- **Lucide React** para iconografia

### Infraestrutura
- **Render** para hospedagem do backend, frontend e banco de dados
- **Git/GitHub** para controle de versão

---

## Estrutura do Repositório
corefin-fixed/
├── back/                       # Backend Django REST
│   ├── apps/                   # Módulos da aplicação
│   │   ├── core/               # Utilitários base
│   │   ├── users/              # Autenticação e usuários
│   │   ├── finance/            # Receitas, despesas, relatórios
│   │   ├── goals/              # Metas financeiras
│   │   ├── education/          # Conteúdo educacional
│   │   ├── chat/               # Assistente conversacional
│   │   ├── notifications/      # Sistema de notificações
│   │   ├── analytics/          # Rastreamento de eventos
│   │   └── admin_api/          # Endpoints administrativos
│   ├── config/                 # Configurações do Django
│   ├── manage.py
│   └── requirements.txt
│
├── front/                      # Frontend React + Vite
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── contexts/       # React contexts (auth, etc)
│   │   │   ├── pages/          # Páginas da aplicação
│   │   │   ├── services/       # Camada de comunicação com API
│   │   │   └── routes.tsx      # Configuração de rotas
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── README.md                   # Este arquivo

---

## Como Executar Localmente

### Pré-requisitos

- Python 3.11+ (recomendado 3.13)
- Node.js 18+
- PostgreSQL 14+
- Git

### Backend

```bash
cd back

# Cria e ativa o ambiente virtual
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
# source .venv/bin/activate   # Linux/Mac

# Instala dependências
pip install -r requirements.txt

# Configura variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL e GEMINI_API_KEY

# Aplica migrações
python manage.py migrate

# Cria superusuário
python manage.py createsuperuser

# Inicia o servidor
python manage.py runserver
```

O backend estará disponível em `http://localhost:8000`.

Documentação interativa da API: `http://localhost:8000/api/docs/`

### Frontend

```bash
cd front

# Instala dependências
npm install

# Configura variáveis de ambiente
cp .env.example .env.local
# A URL padrão da API é http://localhost:8000/api

# Inicia o servidor de desenvolvimento
npx vite
```

O frontend estará disponível em `http://localhost:5173`.

---

## Credenciais de Demonstração

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Administrador | `admin@corefin.com` | `sua-nova-senha` |
| Usuário comum | `maria@teste.com` | `senha12345` |

> Recomendamos a criação de novos usuários através da tela de cadastro para testar o fluxo completo.

---

## Documentação da API

A API segue o padrão REST e está totalmente documentada via **Swagger/OpenAPI**:

- **Swagger UI:** `http://localhost:8000/api/docs/`
- **OpenAPI JSON:** `http://localhost:8000/api/schema/`

Principais grupos de endpoints:

| Prefixo | Descrição |
|---------|-----------|
| `/api/auth/` | Autenticação, registro, recuperação de senha |
| `/api/finance/` | Receitas, despesas, categorias, relatórios |
| `/api/goals/` | Metas financeiras e aportes |
| `/api/education/` | Trilhas, conteúdos, progresso, avaliações |
| `/api/conversations/` | Chat com o assistente |
| `/api/notifications/` | Notificações do usuário |
| `/api/analytics/` | Rastreamento e estatísticas de eventos |
| `/api/admin/` | Endpoints administrativos |

---

## Modelo de Permissões

A plataforma implementa três níveis de acesso:

- **Administrador:** acesso total à plataforma, incluindo painel administrativo e gestão de conteúdo
- **Visualizador:** acesso ao painel administrativo em modo somente-leitura
- **Usuário:** acesso às funcionalidades pessoais (transações, metas, educação, chat)

A validação ocorre tanto no backend (via `permission_classes` do DRF) quanto no frontend (via componente `ProtectedRoute`).

---

## Status do Projeto

| Módulo | Status |
|--------|--------|
| Autenticação | ✅ Completo |
| Gestão Financeira | ✅ Completo |
| Metas | ✅ Completo |
| Relatórios | ✅ Completo |
| Notificações | ✅ Completo |
| Educação | ✅ Completo |
| Chat com IA (Gemini) | ⏳ Integração final pendente |
| Painel Administrativo | ✅ Completo |
| Deploy em Produção | ⏳ Pendente |

---

## Equipe

Projeto desenvolvido como Trabalho de Conclusão de Curso.

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos. Os direitos sobre o código pertencem aos autores e à instituição de ensino.