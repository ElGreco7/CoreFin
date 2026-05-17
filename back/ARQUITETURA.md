# Arquitetura do Projeto CoreFin

Este documento descreve a arquitetura técnica do sistema CoreFin, alinhada aos marcos acadêmicos da FAMETRO, com foco na implementação real do backend Django REST e do frontend React.

## 1. Visão Geral

O CoreFin adota uma arquitetura **API-first em camadas**, com separação total entre apresentação e dados. O backend atua como uma API REST que serve exclusivamente JSON, enquanto o frontend (React) é um cliente independente que consome essa API via HTTP.

Essa separação garante:

- Acoplamento mínimo entre interface e regras de negócio
- Possibilidade de múltiplos clientes (web, mobile) consumirem a mesma API
- Manutenção facilitada (cada camada evolui independentemente)
- Escalabilidade horizontal (backend pode rodar em vários servidores atrás de um load balancer)

## 2. Camadas do Sistema

### 2.1 Frontend (Cliente)

Aplicação web desenvolvida em React, responsável por toda a interface, navegação e experiência do usuário. As principais telas incluem:

- Autenticação: Login e Cadastro
- Área do usuário: Início, Dashboard, Transações, Nova Transação, Relatórios, Metas, Nova Meta, Educação Financeira, CoreChat, Notificações, Configurações
- Área administrativa: Admin Home, Gerenciar Usuários, Gerenciar Conteúdo, Analytics Admin, Configurações Admin

O frontend é responsável por renderizar gráficos, tabelas, badges de notificação, formulários de entrada e pela apresentação visual das interações com o assistente virtual.

### 2.2 Backend (API REST)

Servidor Django + Django REST Framework que expõe aproximadamente 60 endpoints REST. As responsabilidades incluem:

- Autenticação JWT (tokens de acesso e refresh, com blacklist para revogação)
- Controle de acesso baseado em **roles** (administrador, usuário, visualizador)
- Isolamento de dados por usuário em recursos pessoais (transações, metas, conversas, notificações)
- Cálculo de indicadores financeiros (saldos, totais por período, progresso de metas)
- Geração de relatórios em CSV e PDF
- Rastreamento automático de eventos via Django signals
- Documentação automática da API via drf-spectacular (Swagger)

O backend segue o padrão arquitetural do DRF:

- **Models** definem a estrutura e regras de persistência dos dados
- **Serializers** convertem objetos Python em JSON e validam entradas
- **ViewSets e APIViews** processam requisições HTTP e aplicam regras de negócio
- **URLs** mapeiam rotas para as views correspondentes

### 2.3 Banco de Dados

PostgreSQL como sistema de gerenciamento de dados, garantindo integridade referencial, suporte a transações ACID e tipos avançados como JSONB para metadados flexíveis. O esquema contém 15 tabelas de domínio organizadas por feature, mais 11 tabelas auxiliares do Django (autenticação, sessões, blacklist de JWT, etc).

## 3. Tecnologias Utilizadas

### Frontend
- React (biblioteca de interface)
- Vite (bundler e servidor de desenvolvimento)
- TypeScript (tipagem estática)
- Tailwind CSS (estilização utilitária)
- shadcn/ui (componentes de UI)
- React Router (navegação entre telas)
- Lucide React (ícones)

### Backend
- Python 3.10+
- Django 4.2
- Django REST Framework
- djangorestframework-simplejwt (autenticação JWT)
- django-filter (filtros nas APIs)
- django-cors-headers (CORS para o frontend)
- drf-spectacular (documentação Swagger automática)
- reportlab (geração de PDFs)
- python-decouple (variáveis de ambiente)

### Banco de Dados
- PostgreSQL 14+
- Driver psycopg 3.x (conexão Django ↔ Postgres)

## 4. Módulos Funcionais (Apps Django)

A arquitetura é organizada em 9 apps Django independentes, cada um responsável por um domínio específico:

| Módulo | App | Responsabilidade |
|--------|-----|------------------|
| Núcleo | apps.core | BaseModel abstrato com timestamps, paginação customizada |
| Autenticação | apps.users | Cadastro, login JWT, recuperação e troca de senha, sistema de roles |
| Financeiro | apps.finance | Categorias, receitas, despesas, resumo mensal, relatórios CSV/PDF |
| Metas | apps.goals | Metas financeiras, aportes, cálculo automático de progresso |
| Educacional | apps.education | Trilhas de aprendizado, conteúdos (artigo/vídeo/imagem/documento), progresso por usuário, avaliações |
| Assistente Virtual | apps.chat | Conversas com IA, histórico de mensagens, arquivamento |
| Notificações | apps.notifications | Central de notificações por tipo, marcação de lidas, contador para badge |
| Analytics | apps.analytics | Rastreamento automático de eventos via signals, estatísticas agregadas, histórico de atividades |
| Administração | apps.admin_api | Gestão de usuários via API, estatísticas administrativas, reset de senha por admin |

## 5. Aspectos Transversais

### 5.1 Segurança

- Senhas armazenadas com hash (PBKDF2 com SHA256 — padrão Django)
- Autenticação via JWT com tokens de curta duração (1h) e refresh tokens (7 dias)
- Blacklist de tokens para revogação no logout
- Variáveis sensíveis (SECRET_KEY, senha do banco) isoladas em arquivo `.env` não versionado
- CORS configurado para aceitar apenas origens autorizadas
- Permissões granulares por endpoint (IsAuthenticated, IsAdminRole, IsAdminOrReadOnly)

### 5.2 Performance

- Otimização de queries com `select_related` (evita problema N+1 em JOINs)
- Atualizações parciais com `update_fields` (não reescreve linhas inteiras)
- Operações em massa com `UPDATE` direto no banco (em vez de loops Python)
- Paginação automática em todas as listagens (20 itens por página)
- Índices em chaves estrangeiras e campos frequentemente filtrados

### 5.3 Integridade de Dados

- Transações atômicas em operações críticas (aportes em metas, envio de mensagens no chat)
- Isolamento por usuário aplicado no `get_queryset()` de cada ViewSet (usuário nunca vê dados de outro)
- Validações em duas camadas: nos models (constraints do banco) e nos serializers (regras de negócio)
- Cascade configurado corretamente nas foreign keys (deletar usuário apaga seus dados; deletar categoria preserva transações com NULL)

### 5.4 Observabilidade

- Documentação automática da API em `/api/docs/` (Swagger interativo)
- Logs de eventos gerados automaticamente via Django signals (sem necessidade de código repetido nas views)
- Histórico completo de atividades acessível tanto pelo usuário (`/my-activity/`) quanto pelo admin (`/events/`)

## 6. Fluxo de uma Requisição

Para ilustrar como as camadas se comunicam, segue o fluxo de uma requisição típica (ex: usuário registrando uma receita):

1. **Frontend** envia `POST /api/finance/incomes/` com body JSON e header `Authorization: Bearer <token>`
2. **Middleware do Django** valida CORS e aceita a requisição
3. **DRF Authentication** verifica o JWT e identifica o usuário
4. **URL Router** direciona para `IncomeViewSet.create()`
5. **Permissão** (`IsAuthenticated`) é verificada
6. **Serializer** valida o body (campos obrigatórios, tipos, formatos)
7. **View** chama `perform_create()`, que associa a receita ao usuário logado
8. **Model** persiste no PostgreSQL
9. **Signal** dispara automaticamente, criando um evento de analytics
10. **Serializer** converte o objeto criado em JSON
11. **Response** retorna ao frontend com status 201 e dados da receita

Todo esse fluxo é desacoplado: cada camada pode ser testada e modificada independentemente.

## 7. Considerações Finais

A arquitetura do CoreFin foi projetada para equilibrar **simplicidade** (escolhas técnicas convencionais e bem documentadas) com **extensibilidade** (modularização em apps independentes, padrões consistentes). 

A escolha de uma arquitetura API-first abre caminho para futuras integrações sem necessidade de reestruturação: aplicativo mobile, integrações com bancos via Open Finance, conexão com sistemas contábeis, etc. A documentação automática via Swagger reduz o atrito para qualquer desenvolvedor que precise consumir ou estender a API.

A separação clara entre frontend e backend também facilita o desenvolvimento em paralelo: enquanto a equipe de backend evolui as regras de negócio, a equipe de frontend pode trabalhar nas telas usando dados simulados ou apontando para um ambiente de desenvolvimento — sem bloqueios mútuos.