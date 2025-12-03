# Instruções para o Agente (Você)

Você está encarregado de reconstruir o projeto "MeuAppVolei" **do zero**, seguindo estritamente o plano definido na pasta `Plano/`.

## Contexto
O código antigo (na pasta `app/`, `src/` antigo) **NÃO deve ser mantido**. Ele serve apenas como referência histórica de lógica de negócios se houver dúvida, mas a arquitetura, UI e implementação devem ser novas.

## Sua Missão
1.  **Leia a pasta `Plano/`**: Lá estão todas as definições de arquitetura, banco de dados e design.
2.  **Ignore a estrutura antiga**: Não tente consertar o que existe. Você vai criar uma nova estrutura de pastas conforme definido em `Plano/2-Arquitetura.md`.
3.  **Foco no Offline-First**: Toda funcionalidade crítica deve funcionar sem internet, usando SQLite local.
4.  **Estilo**: Use **React Native Paper** e **Tailwind (NativeWind)** para criar uma UI moderna e limpa, "estilo template".
5.  **Qualidade**: Escreva código TypeScript limpo, tipado e modular.

## Primeiros Passos Sugeridos
Ao iniciar, você provavelmente vai querer:
1.  Mover os arquivos antigos para uma pasta `_OLD` ou deletá-los (conforme instrução do usuário na hora, mas prepare-se para limpar a casa).
2.  Instalar as dependências listadas na Arquitetura (`expo-sqlite`, `drizzle-orm`, `zustand`, `react-native-paper`).
3.  Configurar o banco de dados local.

Boa sorte!
