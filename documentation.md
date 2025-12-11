# Documentação do Projeto ScoutVôlei

## 1. Visão Geral do Projeto

**ScoutVôlei** é uma aplicação móvel construída com Expo e React Native, projetada para auxiliar no processo de "scouting" (observação e análise) de partidas de voleibol. O objetivo principal é fornecer uma ferramenta eficiente para registrar dados de partidas, gerenciar equipes e jogadores, e gerar relatórios detalhados para análise de desempenho.

### Propósito e Funcionalidades Principais:

*   **Scouting de Partidas:** Registrar ações de jogo, pontuações e outros eventos importantes durante uma partida de voleibol.
*   **Gerenciamento de Equipes e Jogadores:** Manter um cadastro de equipes e seus respectivos jogadores, incluindo informações detalhadas como posição, número da camisa e dados pessoais.
*   **Acompanhamento de Partidas:** Registrar o progresso das partidas, incluindo pontuações por set e resultados finais.
*   **Relatórios Detalhados:** Gerar relatórios visuais e tabulares sobre o desempenho de equipes e jogadores, utilizando gráficos para facilitar a análise.
*   **Aniversariantes do Mês:** Visualizar rapidamente quais atletas de todos os times fazem aniversário em um mês específico.
*   **Sincronização de Dados:** Capacidade de sincronizar dados localmente armazenados com um serviço em nuvem (Firebase), garantindo persistência e acessibilidade.
*   **Tematização Flexível:** Suporte a temas claro e escuro para uma experiência de usuário personalizável.
*   **Autenticação de Usuário:** Gerenciamento de login para acesso seguro à aplicação.

### Tecnologias Chave Utilizadas:

*   **Expo & React Native:** Frameworks para desenvolvimento de aplicações móveis multiplataforma (Android, iOS).
*   **Expo Router:** Sistema de roteamento baseado em arquivos para navegação na aplicação.
*   **NativeWind (Tailwind CSS):** Framework CSS utilitário para estilização rápida e responsiva de componentes React Native.
*   **Drizzle ORM & Expo SQLite:** ORM (Object-Relational Mapper) type-safe para gerenciamento do banco de dados SQLite local.
*   **Firebase:** Plataforma de desenvolvimento de aplicativos móveis e web, presumivelmente utilizada para serviços de backend (como autenticação e sincronização de dados).
*   **Zustand:** Biblioteca leve e flexível para gerenciamento de estado global.
*   **React Native Paper:** Biblioteca de componentes UI Material Design 3 para React Native, fornecendo uma experiência visual consistente.
*   **TypeScript:** Linguagem de programação que adiciona tipagem estática ao JavaScript, aumentando a robustez e manutenibilidade do código.
*   **@expo/vector-icons:** Coleção de ícones vetoriais prontos para uso.
*   **react-native-css-interop:** Permite o uso de CSS padrão em componentes React Native, facilitando a integração com NativeWind.

## 2. Arquitetura

A arquitetura do ScoutVôlei segue o padrão de componentes e serviços, com uma clara separação de preocupações para facilitar a manutenção e escalabilidade.

### Estrutura de Diretórios:

*   **`app/`**: Contém as telas da aplicação e a configuração principal do Expo Router.
    *   `_layout.tsx`: Layout raiz da aplicação, responsável por configurar o tema, provedores (como `PaperProvider`), e gerenciar migrações do Drizzle ORM.
    *   `index.tsx`: Tela de login inicial da aplicação.
    *   `(app)/`: Grupo de rotas protegidas que exigem autenticação.
        *   `history.tsx`: Tela de histórico de partidas.
        *   `settings/`: Módulo de configurações e perfil do usuário.
            *   `index.tsx`: Tela principal de configurações (antigo profile.tsx).
            *   `birthdays.tsx`: Tela de lista de aniversariantes.
        *   `teams/`: Módulo para gerenciamento de equipes (listagem, criação, edição, etc.).
        *   `scout/`: Módulo para o processo de scouting de partidas, incluindo setup e relatórios.
*   **`src/`**: Código fonte principal da aplicação.
    *   **`components/`**: Componentes de UI reutilizáveis, incluindo subdiretórios para componentes específicos (ex: `report/` para gráficos e tabelas de relatórios).
    *   **`database/`**: Configuração do banco de dados local.
        *   `db.ts`: Inicializa a conexão com o `expo-sqlite` e o Drizzle ORM.
        *   `schemas/index.ts`: Define os esquemas das tabelas do banco de dados (teams, players, matches, matchActions) usando Drizzle ORM.
    *   **`services/`**: Módulos que encapsulam a lógica de negócio e interação com o banco de dados/API.
        *   `teamService.ts`, `playerService.ts`, `matchService.ts`: Serviços específicos para CRUD e lógica relacionada a equipes, jogadores e partidas.
        *   `syncService.ts`: Responsável pela sincronização de dados entre o banco de dados local e o backend (Firebase).
        *   `pdfGenerator.ts`: Gera relatórios em formato PDF.
        *   `firebaseConfig.ts`: Configuração do Firebase.
    *   **`store/`**: Gerenciamento de estado global via Zustand.
        *   `authStore.ts`: Estado e ações relacionadas à autenticação do usuário.
        *   `themeStore.ts`: Estado e ações para gerenciamento do tema (claro/escuro).
    *   **`theme/`**: Definições de temas (`index.ts` combina React Native Paper e React Navigation themes).
*   **`drizzle/`**: Contém os arquivos de migração gerados pelo Drizzle ORM (`0000_initial-schema.sql`, `migrations.js`).

### Fluxo de Dados:

Os dados fluem através da aplicação seguindo um padrão MVVM (Model-View-ViewModel) ou um similar onde:

1.  **Views (Componentes de UI):** Interagem com o usuário, exibem dados e disparam ações.
2.  **Stores (Zustand):** Gerenciam o estado global da aplicação e expõem funções para modificá-lo. As Views podem observar as Stores.
3.  **Services:** Contêm a lógica de negócio para manipulação de dados, interagindo com o banco de dados local (Drizzle ORM) ou com APIs externas (Firebase). As Stores ou Views chamam os Services para realizar operações complexas.
4.  **Database (Drizzle ORM & SQLite):** Armazenamento persistente dos dados locais.

### Fluxo de Autenticação:

1.  O usuário insere credenciais na `app/index.tsx` (LoginScreen).
2.  A função `login` do `authStore` é chamada.
3.  Após a validação bem-sucedida, o `authStore` atualiza o estado do usuário.
4.  A aplicação redireciona o usuário para `/(app)/history` ou outra rota protegida.
5.  Um `useEffect` em `app/index.tsx` garante o redirecionamento automático se o usuário já estiver logado.

### Gerenciamento de Tema:

1.  O `themeStore` (Zustand) gerencia o `mode` atual do tema (claro ou escuro).
2.  O `app/_layout.tsx` utiliza o `mode` do `themeStore` para selecionar entre `CombinedDefaultTheme` e `CombinedDarkTheme`, definidos em `src/theme/index.ts`.
3.  O `PaperProvider` do React Native Paper, no `_layout.tsx`, aplica o tema selecionado a todos os componentes filhos.
4.  Componentes de UI podem acessar o tema via `useTheme()` do `react-native-paper`.

### Sincronização de Dados:

1.  O `syncService` é responsável por manter os dados locais sincronizados com o backend (Firebase).
2.  O serviço inicia uma sincronização periódica após o carregamento inicial da aplicação e a conclusão das migrações do banco de dados (`app/_layout.tsx`).
3.  As tabelas do banco de dados (teams, players, matches, matchActions) incluem os campos `syncStatus` (`pending` ou `synced`) e `deleted` (para soft deletion), que são usados pelo `syncService` para controlar o estado da sincronização.

## 3. Módulos/Funcionalidades Principais

Esta seção detalha as principais funcionalidades e como elas são implementadas dentro da arquitetura do projeto.

### Gerenciamento de Equipes e Jogadores:

*   **Responsabilidade:** Os serviços `teamService.ts` e `playerService.ts` em `src/services/` são responsáveis pelas operações CRUD (Criar, Ler, Atualizar, Deletar) de equipes e jogadores, respectivamente.
*   **Estrutura do Banco de Dados:** As tabelas `teams` e `players` em `src/database/schemas/index.ts` armazenam os dados. A tabela `players` possui uma chave estrangeira (`teamId`) para vincular jogadores a suas equipes.
*   **Fluxo:** As telas em `app/(app)/teams/` (como `index.tsx`, `new.tsx`, `[id].tsx`, `add-player.tsx`, `edit-player.tsx`, `edit.tsx`, `view-player.tsx`) interagem com esses serviços para exibir, criar, editar e excluir informações de equipes e jogadores.

### Gerenciamento de Partidas e Ações de Jogo (Scouting):

*   **Responsabilidade:** O `matchService.ts` em `src/services/` gerencia as operações relacionadas a partidas. A gravação de ações de jogo durante o scouting é uma parte central desta funcionalidade.
*   **Estrutura do Banco de Dados:** As tabelas `matches` e `matchActions` em `src/database/schemas/index.ts` armazenam os dados das partidas e suas ações. A tabela `matchActions` registra detalhes como `actionType`, `quality`, `scoreChange`, e está vinculada a `matches` e opcionalmente a `players`.
*   **Fluxo:**
    *   As telas sob `app/scout/setup.tsx` e `app/scout/[matchId]/index.tsx` são usadas para configurar uma partida e registrar as ações de jogo em tempo real.
    *   A tela `app/(app)/history.tsx` provavelmente lista as partidas anteriores.

### Aniversariantes do Mês:

*   **Responsabilidade:** O `playerService.ts` possui um método dedicado (`getBirthdaysByMonth`) que busca e filtra atletas pelo mês de nascimento, ordenando por dia.
*   **Interface:** A tela `app/(app)/settings/birthdays.tsx` oferece um seletor horizontal de meses e uma lista visual dos aniversariantes.

### Relatórios:

*   **Responsabilidade:** A geração de relatórios é feita pelo `pdfGenerator.ts` para exportação e pelos componentes em `src/components/report/` para visualização interativa na aplicação.
*   **Componentes de UI:**
    *   `ActionTable.tsx`: Exibe ações detalhadas da partida em formato tabular.
    *   `EfficiencyBarChart.tsx`, `RadarChart.tsx`, `SplitPieChart.tsx`: Componentes gráficos para visualizar a eficiência, desempenho geral e outras métricas de jogadores e equipes.
*   **Fluxo:** A tela `app/scout/report/[matchId].tsx` é o principal ponto de acesso para visualizar e gerar relatórios de uma partida específica. A tela `app/(app)/teams/export.tsx` provavelmente lida com a exportação de dados para equipes.

### Gerenciamento de Banco de Dados:

*   **Drizzle ORM:** Utilizado para definir o esquema do banco de dados (em `src/database/schemas/index.ts`) e interagir com ele de forma type-safe. Facilita a realização de consultas e modificações nos dados.
    *   *Nota:* Todas as tabelas principais possuem colunas `createdAt` e `updatedAt` para controle de sincronização.
*   **Expo SQLite:** O driver subjacente para o banco de dados SQLite local, garantindo que os dados sejam armazenados e acessíveis offline no dispositivo.
*   **Migrações:** O Drizzle Kit gerencia as migrações do banco de dados, permitindo a evolução do esquema de forma controlada. O `useMigrations` em `app/_layout.tsx` garante que o esquema do banco de dados esteja atualizado na inicialização da aplicação.

## 4. Aprofundamento em Tecnologias Chave

Esta seção oferece uma visão mais detalhada sobre as principais tecnologias que compõem o projeto ScoutVôlei.

### Expo & React Native:

*   **Descrição:** Expo é um framework e plataforma para o desenvolvimento universal de aplicativos React. Ele simplifica o processo de construção e implantação de aplicativos React Native, fornecendo acesso a APIs nativas do dispositivo e um ecossistema robusto. React Native permite escrever aplicativos móveis usando JavaScript e React, compilando para componentes nativos.
*   **Benefícios no Projeto:** Desenvolvimento rápido, capacidade de rodar o mesmo código em Android e iOS, acesso a funcionalidades nativas do telefone via APIs do Expo, e um ambiente de desenvolvimento amigável.

### Expo Router:

*   **Descrição:** Um roteador baseado em arquivos para Expo e React Native, que permite definir a navegação do aplicativo através da estrutura de diretórios, de forma similar a frameworks web como Next.js.
*   **Benefícios no Projeto:** Simplifica a definição de rotas e a navegação entre telas, oferecendo uma abordagem intuitiva e organizada para o fluxo do usuário no aplicativo.

### NativeWind (Tailwind CSS):

*   **Descrição:** Traz a metodologia do Tailwind CSS para o React Native. Permite estilizar componentes usando classes utilitárias diretamente no JSX, que são convertidas em estilos nativos otimizados.
*   **Benefícios no Projeto:** Desenvolve uma interface de usuário responsiva e customizável com alta velocidade, promove a consistência visual e reduz a necessidade de escrever CSS/folhas de estilo separadas.

### Drizzle ORM & Expo SQLite:

*   **Descrição:** Drizzle ORM é um Object-Relational Mapper (ORM) moderno e type-safe para TypeScript. Ele é usado aqui com `expo-sqlite`, um módulo do Expo que fornece acesso ao banco de dados SQLite local do dispositivo.
*   **Benefícios no Projeto:** Oferece uma maneira segura e tipada de interagir com o banco de dados local, facilitando operações de persistência de dados. As migrações garantem que o esquema do banco de dados possa evoluir de forma controlada.

### Firebase:

*   **Descrição:** Uma plataforma de desenvolvimento de aplicativos do Google que oferece uma variedade de serviços de backend, incluindo autenticação, bancos de dados em tempo real (Firestore), armazenamento de arquivos e funções de nuvem.
*   **Benefícios no Projeto:** Presumivelmente utilizado para gerenciamento de autenticação, sincronização de dados (provavelmente como backend para o `syncService`) e possibly armazenamento em nuvem de relatórios ou backups.

### Zustand:

*   **Descrição:** Uma solução de gerenciamento de estado minimalista e poderosa para React, conhecida por sua simplicidade e baixo "boilerplate".
*   **Benefícios no Projeto:** Gerencia de forma eficiente o estado global da aplicação (como autenticação e tema), tornando o código mais limpo e fácil de entender, sem a complexidade de outras bibliotecas de estado maiores.

### React Native Paper:

*   **Descrição:** Uma biblioteca de componentes UI de alta qualidade que implementa as diretrizes do Material Design 3 para React Native.
*   **Benefícios no Projeto:** Fornece um conjunto abrangente de componentes pré-construídos que seguem um design moderno e consistente, acelerando o desenvolvimento da UI e garantindo uma experiência de usuário polida.

### TypeScript:

*   **Descrição:** Um superconjunto de JavaScript que adiciona tipagem estática.
*   **Benefícios no Projeto:** Melhora a manutenibilidade do código, ajuda a capturar erros durante o desenvolvimento (antes que se tornem problemas em tempo de execução), e fornece uma melhor documentação e autocompletar para os desenvolvedores.

## 5. Setup de Desenvolvimento e Boas Práticas

Para garantir um desenvolvimento eficiente e consistente, siga as seguintes diretrizes e padrões de projeto:

### Configuração Inicial:

1.  **Clone o Repositório:** `git clone [URL_DO_REPOSITORIO]`
2.  **Instale as Dependências:** `npm install` ou `yarn install`
3.  **Configuração do Expo:** Certifique-se de ter o CLI do Expo instalado (`npm install -g expo-cli`).
4.  **Configuração do Firebase:**
    *   Crie um projeto Firebase.
    *   Configure o aplicativo para Android e iOS no Firebase.
    *   Atualize o arquivo `src/services/firebaseConfig.ts` com as credenciais do seu projeto Firebase.
5.  **Executar o Aplicativo:** `expo start` e use o aplicativo Expo Go no seu celular ou um emulador.

### Padrões e Convenções:

*   **Arquitetura Orientada a Serviços:** Utilize os serviços (`src/services/`) para encapsular a lógica de negócio e as interações com o banco de dados/APIs. Isso promove a separação de responsabilidades e facilita testes.
*   **Gerenciamento de Estado com Zustand:** Mantenha o estado global em stores Zustand (`src/store/`). Evite o uso excessivo de `useState` para estados globais ou que afetem múltiplos componentes.
*   **Interação com o Banco de Dados via Drizzle ORM:** Todas as operações de banco de dados devem ser feitas através do Drizzle ORM, utilizando os esquemas definidos em `src/database/schemas/`. Isso garante a segurança de tipos e a consistência dos dados.
*   **Estilização com NativeWind:** Prefira as classes utilitárias do NativeWind para estilização, mantendo a consistência visual e aproveitando os benefícios do Tailwind CSS. Para componentes mais complexos ou que exigem theming, utilize os componentes do React Native Paper.
*   **TypeScript:** Adira estritamente ao uso do TypeScript para todos os novos códigos e, se possível, para refatorações. Defina interfaces e tipos claros para melhorar a legibilidade e evitar erros.
*   **Estrutura de Diretórios:** Mantenha a estrutura de diretórios existente. Ao adicionar novos módulos ou funcionalidades, crie-os em subdiretórios apropriados (`app/`, `src/components/`, `src/services/`, etc.).
*   **Comentários:** Adicione comentários *apenas* quando o código não for autoexplicativo ou para explicar o "porquê" de uma decisão de design complexa. Evite comentários redundantes que apenas descrevem o "o quê".
*   **Testes:** (A ser implementado/definido) Embora não haja um diretório explícito para testes, a intenção é ter cobertura de testes para os serviços e lógica de negócio. Utilize o framework de testes apropriado para React Native/Expo (ex: Jest, React Native Testing Library).

### Considerações para Manutenção e Evolução:

*   **Migrações de Banco de Dados:** Sempre que houver uma alteração no esquema do banco de dados, utilize o Drizzle Kit para gerar e aplicar novas migrações.
*   **Sincronização de Dados:** O `syncService` é um ponto crítico para a integridade dos dados. Quaisquer alterações nas entidades de dados (`teams`, `players`, `matches`, `matchActions`) devem considerar como isso afeta a lógica de sincronização.
*   **Performance:** Monitore o desempenho da aplicação, especialmente em telas com muitos dados ou animações, e otimize conforme necessário.
*   **Segurança:** Garanta que as configurações do Firebase e as operações de autenticação sejam seguras. Mantenha as dependências atualizadas para evitar vulnerabilidades de segurança.
*   **Acessibilidade:** Projete e implemente interfaces que sejam acessíveis a todos os usuários, seguindo as diretrizes de acessibilidade para aplicativos móveis.