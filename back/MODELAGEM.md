# CoreFin: Modelagem de Software

CENTRO UNIVERSITÁRIO CEUNI - FAMETRO
FACULDADE METROPOLITANA DE MANAUS - FAMETRO
CURSO DE BACHARELADO EM SISTEMAS DE INFORMAÇÃO

NOME DOS AUTORES: CARLOS VICTOR
                                        ELLY LIMA
                                                   FRANCISCO EMANUEL
                                                  LUCAS RIBEIRO

COREFIN: Modelagem de Software

MANAUS - AM
2026

## 1. INTRODUÇÃO

Este documento tem como objetivo apresentar a modelagem de software do sistema CoreFin, descrevendo sua estrutura, funcionamento e principais componentes. A modelagem busca organizar de forma clara os requisitos, regras de negócio, atores e diagramas do sistema, servindo como base para o desenvolvimento da aplicação e facilitando a compreensão do projeto.

Além disso, este documento contribui para a padronização das etapas de desenvolvimento, proporcionando uma visão estruturada e integrada do sistema.

## 2. VISÃO GERAL DO SISTEMA

O CoreFin é uma plataforma web desenvolvida para auxiliar microempreendedores individuais (MEIs) na organização e no controle de suas finanças.

O sistema permite o registro manual de receitas e despesas, categorização de transações, visualização de dados por meio de dashboards e geração de relatórios financeiros. Também oferece funcionalidades de planejamento financeiro, como a criação e acompanhamento de metas.

Além disso, o sistema conta com um módulo de educação financeira, disponibilizando conteúdos informativos como artigos e vídeos. Para complementar a experiência do usuário, o CoreFin possui um assistente virtual educacional, responsável por auxiliar na utilização da plataforma e na compreensão de conceitos financeiros.

## 3. OBJETIVO DA MODELAGEM

A modelagem do sistema CoreFin tem como finalidade representar de forma estruturada suas funcionalidades, componentes e interações.

Por meio da utilização de diagramas UML e descrições textuais, busca-se facilitar a compreensão do sistema, apoiar o processo de desenvolvimento e garantir maior organização na implementação.

Dessa forma, a modelagem atua como um guia para o desenvolvimento do sistema, contribuindo para a consistência e qualidade do projeto.

## 4. REQUISITOS DO SISTEMA

Os requisitos definem as funcionalidades e características que o sistema deve atender, servindo como base para a modelagem e desenvolvimento.

### 4.1 REQUISITOS FUNCIONAIS

- O sistema deve permitir o cadastro, autenticação e recuperação de senha de usuários, bem como o gerenciamento de perfil, incluindo edição de dados e alteração de senha.
- No módulo financeiro, o sistema deve permitir o registro manual de transações, classificadas como receita ou despesa e organizadas por categorias.
- Deve possibilitar a visualização, edição e exclusão dessas transações, além do cálculo automático de receitas, despesas e saldo.
- O sistema deve disponibilizar um dashboard com indicadores financeiros e permitir a geração de relatórios com aplicação de filtros e exportação dos dados.
- No módulo de planejamento, deve permitir o cadastro, acompanhamento, edição e exclusão de metas financeiras.
- Na área educacional, deve oferecer conteúdos como artigos e vídeos, com possibilidade de pesquisa e filtragem.
- O sistema deve permitir a interação com um assistente virtual educacional, além de apresentar notificações e histórico de atividades.
- Por fim, o sistema deve permitir que administradores gerenciem usuários e conteúdos educacionais.

### 4.2 REQUISITOS NÃO FUNCIONAIS

- O sistema deve possuir interface intuitiva e de fácil utilização.
- Deve garantir a segurança das informações por meio de autenticação e controle de acesso.
- Deve apresentar desempenho adequado na exibição de dashboards, relatórios e transações.
- Deve ser compatível com navegadores modernos e permitir acesso em diferentes dispositivos.
- Deve garantir disponibilidade e estabilidade durante o uso.
- Deve possuir navegação responsiva com menu lateral retrátil.

## 5. REGRAS DE NEGÓCIO

- O sistema exige cadastro com e-mail único para cada usuário.
- O acesso às funcionalidades ocorre apenas mediante autenticação.
- As transações financeiras são registradas manualmente e devem possuir uma categoria associada.
- O sistema realiza automaticamente o cálculo de receitas, despesas e saldo.
- O usuário pode criar e acompanhar metas financeiras.
- O sistema disponibiliza conteúdos educacionais voltados à educação financeira.
- O assistente virtual auxilia o usuário na utilização do sistema e na compreensão de conceitos financeiros.
- O administrador é responsável pelo gerenciamento de usuários e conteúdos educacionais.

## 6. ATORES DO SISTEMA

O sistema CoreFin possui dois atores principais:

- Usuário (MEI): responsável por utilizar as funcionalidades do sistema, incluindo registro de transações, visualização de relatórios, acompanhamento de metas e acesso a conteúdos educacionais.
- Administrador: responsável pelo gerenciamento de usuários e conteúdos educacionais, garantindo o funcionamento adequado da plataforma.

## 7. FLUXO DE TRABALHO DA EQUIPE

A gestão e o acompanhamento das tarefas da equipe de desenvolvimento seguem a metodologia ágil Kanban. Para este controle diário, utilizamos a ferramenta visual Trello, onde as atividades estão categorizadas por prioridade e divididas nas etapas de "A Fazer", "Em Desenvolvimento" e "Feito", garantindo a organização e a distribuição correta das responsabilidades.

## 8. MODELAGEM UML

### 8.1 DIAGRAMA DE CASO DE USO

O diagrama de caso de uso representa as interações entre os atores e o sistema, evidenciando suas principais funcionalidades.

Figura 1 – Diagrama de Caso de Uso

### 8.2 DIAGRAMA DE CLASSES

O diagrama de classes representa a estrutura do sistema, incluindo suas entidades e relacionamentos.

Figura 2 – Diagrama de Classes

### 8.3 DIAGRAMA DE ATIVIDADE

Os diagramas de atividade representam o fluxo de execução das principais funcionalidades do sistema.

Figura 3 – Diagrama de Atividade – Registrar Transação

Figura 4 – Diagrama de Atividade – Criar Meta Financeira

Figura 5 – Diagrama de Atividade – Interagir com Bot

### 8.4 DIAGRAMA DE SEQUÊNCIA

Os diagramas de sequência representam a interação entre os componentes do sistema ao longo do tempo.

Figura 6 – Diagrama de Sequência – Registrar Transação

Figura 7 – Diagrama de Sequência – Criar Meta Financeira

Figura 8 – Diagrama de Sequência – Interagir com Bot

## 9. MODELOS REFERENCIAIS E DIFERENCIAL DO SISTEMA

Para embasar o desenvolvimento do CoreFin, foram analisados três sistemas existentes no mercado que possuem propostas semelhantes. A análise focou em identificar as funcionalidades oferecidas para justificar as melhorias que serão aplicadas em nosso projeto.

### Meu Dinheiro
Site de origem: https://www.meudinheiroweb.com.br
Funcionalidades: É um sistema web completo focado no controle financeiro pessoal e empresarial. Oferece recursos avançados como fluxo de caixa detalhado, controle de contas a pagar e a receber, importação de extratos bancários, centro de custos, e geração de relatórios gráficos complexos.

### Controle
Site de origem: Disponível nas plataformas Google Play e App Store.
Funcionalidades: Aplicativo mobile voltado para a agilidade. Suas principais funções incluem o registro diário rápido de entradas e saídas de caixa, visualização de saldo atual, categorização básica de despesas e relatórios mensais de faturamento.

### Clínica Financeira (Portal Sicoob)
Site de origem: https://www.sicoob.com.br/web/sicoob/clinica-financeira
Funcionalidades: Plataforma focada exclusivamente na educação financeira. Oferece cartilhas, calculadoras de juros, planilhas para download, artigos sobre gestão de negócios e dicas práticas para o letramento financeiro de empreendedores.

### 9.1 O DIFERENCIAL DO COREFIN

Ao analisar os sistemas acima, percebe-se uma lacuna no mercado para o Microempreendedor Individual (MEI). Sistemas como o "Meu Dinheiro" são muito complexos e exigem muito tempo de preenchimento, enquanto plataformas como o "Sicoob" são apenas teóricas, sem a parte prática de gestão diária.

O grande diferencial do CoreFin é a união da simplicidade operacional com a educação ativa. O nosso sistema não será apenas um "caderno de anotações digital", ele trará um design minimalista (onde o lançamento de dados é feito em menos de 3 cliques) aliado a um Assistente Virtual Educacional (Bot) integrado. O diferencial está em educar o usuário enquanto ele usa a ferramenta: se ele registrar muitas despesas, o sistema não apenas mostra o saldo negativo, mas o assistente automaticamente sugere conteúdos curtos e dicas de como reverter a situação, adequando-se à rotina corrida do MEI.

## 10. ARQUITETURA DO SISTEMA

O CoreFin utiliza uma arquitetura em camadas, separando frontend, backend e banco de dados. O frontend é desenvolvido em React, sendo responsável pela interface e interação com o usuário.

O backend é desenvolvido em Django e utiliza o padrão arquitetural MVT (Model–View–Template), no qual o Model é responsável pela estrutura dos dados, o View pelo processamento das requisições e o Template pela apresentação das informações. Esse padrão contribui para a organização do sistema e separação de responsabilidades.

O banco de dados PostgreSQL é responsável pelo armazenamento das informações, garantindo integridade e segurança.

A arquitetura é organizada em módulos funcionais, incluindo autenticação, transações financeiras, relatórios, metas, educação financeira, assistente virtual, notificações, configurações e administração.

## 11. CONSIDERAÇÕES FINAIS

A modelagem do sistema CoreFin permitiu organizar de forma estruturada seus componentes, funcionalidades e fluxos de funcionamento.

A utilização de diagramas UML contribuiu para a visualização do sistema e para a compreensão das interações entre seus elementos, tornando o desenvolvimento mais organizado e consistente.

Dessa forma, a modelagem estabelece uma base sólida para a implementação do sistema, contribuindo para a qualidade e evolução do projeto.
