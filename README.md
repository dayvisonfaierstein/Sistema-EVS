# Espaço+

Sistema de gestão para Espaços Vida Saudável, preparado para operação SaaS
multiempresa.

## Versão atual

**0.1.0 — MVP inicial**

O histórico completo está em [CHANGELOG.md](./CHANGELOG.md).

## Funcionalidades disponíveis

- Autenticação por e-mail e senha com Supabase Auth;
- Recuperação de senha e sessão persistente;
- Cadastro inicial da organização;
- Perfis e permissões;
- Isolamento multiempresa com Row Level Security;
- Listagem, busca e cadastro de clientes;
- Upload privado de foto do cliente;
- Perfil individual com histórico;
- Registro e histórico de acessos;
- Avaliações corporais históricas;
- Cálculo automático de IMC;
- Gráficos de peso, gordura corporal e massa muscular;
- Dashboard conectado ao banco;
- Relatório individual em PDF.

Os módulos ainda não conectados estão identificados na interface como
demonstrativos.

## Tecnologias

- React 19 e TypeScript;
- TanStack Start, Router e Query;
- Vite e Tailwind CSS;
- shadcn/ui e Radix UI;
- Supabase/PostgreSQL;
- React Hook Form e Zod;
- Recharts;
- pdf-lib.

## Configuração local

Requisitos:

- Node.js LTS;
- Bun.

Instale as dependências:

```sh
bun install
```

Copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use somente a chave pública/publishable do Supabase. Nunca coloque
`service_role` no front-end.

Inicie o ambiente local:

```sh
bun run dev
```

## Banco de dados

As migrations versionadas estão em `supabase/migrations` e devem ser executadas
em ordem:

1. `202607240001_initial_schema.sql`;
2. `202607240002_organization_bootstrap.sql`.

O seed em `supabase/seed/development.sql` é destinado somente a desenvolvimento.

## Verificações

```sh
bun run build
bunx tsc --noEmit
bun run lint
```

## Publicação

- Código e revisão: GitHub;
- Banco, autenticação e arquivos: Supabase;
- Aplicação web: Vercel.

Configure na Vercel as mesmas variáveis públicas existentes no `.env`.

## Segurança

- `.env`, dependências e builds não são versionados;
- Todas as tabelas organizacionais utilizam RLS;
- Dados de organizações diferentes são separados no banco;
- A chave `service_role` nunca deve ser utilizada no navegador.

## Lovable

O projeto continua conectado ao Lovable. Não reescreva o histórico publicado
com force push, rebase ou alterações destrutivas.
