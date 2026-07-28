# Fase 1 — Base SaaS e isolamento das organizações

Data: 28/07/2026  
Versão: 0.18.0

## Migration

`202607280006_saas_tenant_foundation.sql`

## Alterações em `organizations`

- `status`;
- `onboarding_completed`;
- `onboarding_completed_at`;
- `legal_document_type`;
- `address_number`;
- `address_complement`;
- `neighborhood`;
- `responsible_name`;
- `responsible_phone`;
- `responsible_whatsapp`;
- `responsible_email`;
- `blocked_at`;
- `blocked_reason`;
- `deleted_at`.

Organizações existentes são preservadas e marcadas como onboarding concluído.
Novas organizações passam a ter estado inicial `pending`.

Estados permitidos:

- `pending`;
- `trial`;
- `active`;
- `grace_period`;
- `blocked`;
- `cancelled`;
- `inactive`.

## Alterações em `profiles`

- `is_platform_admin`;
- `is_organization_admin`;
- `first_access`;
- `job_title`;
- `access_template`;
- `deleted_at`.

Os perfis existentes são migrados de forma compatível:

- `super_admin` torna-se administrador da plataforma;
- `administrator` torna-se administrador da organização;
- usuários existentes não são enviados novamente ao primeiro acesso.

## Funções seguras

- `is_super_admin()`;
- `is_organization_admin()`;
- `current_organization_id()`;
- `has_permission(permission_key)`;
- `can_access_organization(organization_id)`.

As funções utilizam `SECURITY DEFINER`, `search_path` fixo e `row_security = off`
somente para resolver a identidade do usuário sem recursão de RLS. A execução
pública foi revogada e concedida apenas a usuários autenticados.

`has_permission()` já reconhece Super Admin e administrador da organização. A
consulta granular fica preparada para as tabelas da Fase 2 e retorna falso para
demais usuários enquanto elas ainda não existirem.

## Barreira multiempresa

Todas as tabelas públicas que possuem `organization_id` recebem automaticamente
uma política RLS restritiva.

Uma política restritiva é combinada com as políticas existentes usando `AND`.
Portanto, nenhuma política antiga ou futura poderá permitir acesso a uma
organização diferente.

Regras:

- Super Admin pode administrar organizações pela área da plataforma;
- usuário comum acessa somente sua própria organização;
- usuário sem organização não acessa dados operacionais;
- perfil inativo ou excluído não resolve uma organização;
- registros globais com `organization_id` vazio ficam disponíveis somente para a
  plataforma.

## Proteção de campos sensíveis

Triggers impedem alterações diretas em:

- perfil de Super Admin;
- organização do usuário;
- papel e flags administrativas;
- exclusão lógica de perfil;
- situação da organização;
- situação de assinatura;
- bloqueio e reativação.

Essas operações serão disponibilizadas posteriormente por funções específicas e
auditadas.

## Autocadastro

A função histórica `bootstrap_organization` foi mantida para não quebrar o
histórico de migrations, mas sua execução foi removida do papel `authenticated`.
Com isso, novos Espaços só poderão ser criados pelo fluxo administrativo que será
implementado nas fases seguintes.

## Compatibilidade

- Nenhuma tabela foi apagada.
- Nenhum registro foi excluído.
- Nenhuma migration anterior foi modificada.
- Perfis fixos continuam funcionando durante a transição.
- Permissões granulares serão adicionadas sem interromper os administradores
  existentes.

## Aplicação

Executar a migration no SQL Editor do Supabase ou pelo fluxo de migrations do
projeto. Depois da aplicação, validar login de um administrador existente antes de
iniciar a Fase 2.
