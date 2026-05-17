# CoreFin · Frontend

Aplicação web do CoreFin, construída com **React 18**, **Vite** e **TypeScript**.

---

## Visão Geral

Interface da plataforma CoreFin, responsável pela experiência do usuário final e do administrador. Comunica-se com o backend Django via API REST autenticada por JWT.

---

## Stack

- React 18
- Vite (bundler)
- TypeScript
- TailwindCSS
- shadcn/ui (Radix UI)
- Recharts (gráficos)
- React Router v6
- Lucide React (ícones)

---

## Estrutura de Pastas

src/
├── app/
│   ├── components/       # Componentes reutilizáveis
│   │   ├── ui/           # Primitivos do shadcn/ui
│   │   ├── Button.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── CategoryManager.tsx
│   │
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   │
│   ├── services/         # Camada de comunicação com API
│   │   ├── api.ts        # Cliente HTTP + refresh de JWT
│   │   ├── auth.ts
│   │   ├── finance.ts
│   │   ├── goals.ts
│   │   ├── education.ts
│   │   ├── chat.ts
│   │   ├── notifications.ts
│   │   ├── admin.ts
│   │   └── analytics.ts
│   │
│   ├── pages/            # Páginas da aplicação
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── NewTransaction.tsx
│   │   ├── Reports.tsx
│   │   ├── Goals.tsx
│   │   ├── NewGoal.tsx
│   │   ├── Notifications.tsx
│   │   ├── Settings.tsx
│   │   ├── Education.tsx
│   │   ├── Chat.tsx
│   │   ├── Admin.tsx
│   │   ├── ManageUsers.tsx
│   │   ├── ManageContent.tsx
│   │   ├── AdminAnalytics.tsx
│   │   └── AdminSettings.tsx
│   │
│   └── routes.tsx        # Configuração de rotas
│
├── imports/              # Assets estáticos (logo, etc)
├── styles/               # CSS global
└── main.tsx              # Entry point

---

## Configuração

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Setup

```bash
# 1. Instala dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
```

### Variáveis de Ambiente

Edite o arquivo `.env.local`:

```env
VITE_API_URL=http://localhost:8000/api
```

Para produção, aponte para a URL do backend hospedado:

```env
VITE_API_URL=https://corefin-api.onrender.com/api
```

> **Importante:** o Vite só lê variáveis de ambiente que começam com o prefixo `VITE_`.

### Execução

```bash
# Desenvolvimento
npx vite

# Build de produção
npx vite build

# Preview da build
npx vite preview
```

A aplicação estará disponível em `http://localhost:5173` em desenvolvimento.

---

## Comandos Disponíveis

```bash
# Servidor de desenvolvimento
npx vite

# Build de produção
npx vite build

# Preview da build
npx vite preview

# Type check
npx tsc --noEmit
```

---

## Telas Implementadas

### Públicas
- **Login** — Autenticação por e-mail e senha
- **Cadastro** — Registro de novos usuários (com nome do negócio)

### Usuário
- **Home** — Saudação personalizada e atalhos
- **Dashboard** — Indicadores financeiros e gráficos
- **Transações** — Listagem, filtros, criação e exportação
- **Nova Transação** — Formulário de receita/despesa
- **Relatórios** — Análises por período + exportação CSV/PDF
- **Metas** — Listagem com progresso
- **Nova Meta** — Criação de metas financeiras
- **Notificações** — Centro de avisos
- **Configurações** — Perfil, troca de senha, gestão de categorias
- **Educação** — Trilhas e conteúdos educacionais
- **CoreChat** — Assistente conversacional com IA

### Administrador
- **Admin** — Dashboard administrativo
- **Gerenciar Usuários** — CRUD completo de contas
- **Gerenciar Conteúdo** — CRUD de trilhas e conteúdos
- **Analytics** — Métricas e eventos
- **Configurações do Sistema** — Status e ferramentas

---

## Padrões de Desenvolvimento

### Camada de Serviços
Toda comunicação com a API passa pelos arquivos em `src/app/services/`. Cada módulo do backend tem seu service correspondente (ex.: `finance.ts`, `goals.ts`).

### Autenticação
O `AuthContext` mantém o estado do usuário logado e os tokens JWT. O cliente HTTP (`services/api.ts`) intercepta requisições para anexar o token e renová-lo automaticamente quando expira.

### Proteção de Rotas
O componente `ProtectedRoute` envolve as páginas que exigem autenticação, validando também o role do usuário quando necessário:

```tsx
<ProtectedRoute requireRole={['admin', 'viewer']}>
  <Admin />
</ProtectedRoute>
```

### Estilização
A aplicação utiliza TailwindCSS para classes utilitárias e tokens CSS customizados (`bg-primary`, `text-secondary`, etc.) definidos no tema global, permitindo consistência visual e suporte a modo claro/escuro.

---

## Estado e Performance

- **Atualizações otimistas** em operações como marcar notificação como lida, melhorando a percepção de performance
- **Estados de loading e vazio** dedicados em cada tela
- **Auto-scroll** no chat para a última mensagem
- **Paginação e filtragem** aplicadas tanto no backend (querystring) quanto no frontend