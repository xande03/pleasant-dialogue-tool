# Merge Cheats

Merge Cheats é uma ferramenta de diálogo desenvolvida com Vite, TypeScript e Tailwind CSS.

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

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
VITE_APP_TITLE="Merge Cheats"
VITE_APP_VERSION="1.0.0"
```