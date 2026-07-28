# Fase 6 — Cadastro e ativação de novos Espaços

Data: 28/07/2026  
Versão: 0.21.0

## Fluxo

1. O Super Admin abre `Administração → Organizações → Novo Espaço`.
2. Informa os dados da organização e do administrador principal.
3. Escolhe convite por e-mail ou senha provisória.
4. A Edge Function cria a organização como pendente.
5. O administrador é criado ou convidado pelo Supabase Auth.
6. O perfil é vinculado como administrador principal e marcado para primeiro acesso.
7. No primeiro login, o usuário deve definir uma senha própria e confirmar seus dados.

## Senha provisória

Quando o envio automático de e-mail não estiver configurado:

- é gerada com aleatoriedade criptográfica;
- é enviada diretamente ao Supabase Auth;
- retorna uma única vez para a tela do Super Admin;
- pode ser copiada junto com o endereço e o e-mail de acesso;
- nunca é gravada em tabelas, auditoria ou metadados;
- expira operacionalmente em sete dias caso o primeiro acesso não seja concluído.

## Convite por e-mail

Quando o SMTP do Supabase estiver configurado, a opção de convite usa
`inviteUserByEmail`. O endereço de retorno deve apontar para `/onboarding`.

## Banco

Aplicar no SQL Editor:

`202607280010_organization_provisioning.sql`

Essa migration adiciona os dados de provisionamento ao perfil e cria a função
`complete_first_access()`.

## Edge Function

Código:

`supabase/functions/provision-organization/index.ts`

Publicação pela CLI:

```bash
supabase functions deploy provision-organization
```

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são
fornecidas automaticamente pelo ambiente das Edge Functions.

Para convite por e-mail, configure também:

```bash
supabase secrets set FIRST_ACCESS_REDIRECT_URL=https://SEU-DOMINIO/onboarding
```

Nunca configure `SUPABASE_SERVICE_ROLE_KEY` no Vite, no navegador ou na Vercel.

## Ativação

Concluir o primeiro acesso marca o onboarding da organização como concluído, mas não
aprova automaticamente a cobrança. A situação da assinatura continua sob controle
manual do Super Admin.

## Compatibilidade

O antigo autocadastro em `/onboarding` foi removido. Contas sem perfil recebem uma
orientação para procurar o administrador da plataforma.
