# FiermPhoto

FiermPhoto é uma ferramenta de diálogo desenvolvida com Vite, TypeScript e Tailwind CSS.

## Tecnologias Utilizadas

- [Vite](https://vitejs.dev/) - Ferramenta de build e desenvolvimento rápida
- [TypeScript](https://www.typescriptlang.org/) - Superset tipado do JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Framework de CSS utilitário
- [Playwright](https://playwright.dev/) - Framework de testes E2E
- [Bun](https://bun.sh/) - Runtime e gerenciador de pacotes rápido

## Estrutura do Projeto

- `src/` - Código fonte da aplicação
- `public/` - Arquivos estáticos públicos
- `tests/` - Testes com Playwright

## Desenvolvimento

Para começar a desenvolver:

```bash
# Instalar dependências
bun install

# Iniciar servidor de desenvolvimento
bun run dev

# Rodar testes
bun run test

# Construir para produção
bun run build
```

## Publicação automática na main

Toda alteração é commitada e enviada automaticamente para a `main` do repositório
principal (`xande03/pleasant-dialogue-tool`) através do script de auto-push:

```bash
# commita tudo, envia para a branch de trabalho e mescla na main
bun run push "mensagem do commit"

# ou, sem mensagem (usa data/hora automática)
bun run push
```

O script `scripts/auto-push.sh` executa, em sequência:

1. `git add -A` + `git commit` (se houver mudanças pendentes)
2. `git push` para a branch de trabalho
3. abre o Pull Request para a `main` (ou reaproveita um já aberto)
4. faz o merge do PR na `main` e atualiza a referência local

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_APP_TITLE="FiermPhoto"
VITE_APP_VERSION="1.0.0"
```