# Fase 3 — Proteção do sistema

Data: 28/07/2026  
Versão: 0.18.2

## Migration

`202607280008_permission_enforcement.sql`

Esta migration depende das migrations das Fases 1 e 2.

## Proteções da interface

- o menu lateral mostra somente os módulos autorizados;
- as rotas do sistema usam uma matriz central de permissões;
- acessos diretos sem autorização levam à página `Sem permissão`;
- botões e ações críticas usam o componente reutilizável `RequirePermission`;
- Super Admin e administrador principal continuam com acesso total implícito.

## Proteções do banco

As tabelas operacionais receberam políticas RLS permissivas para usuários com
permissões personalizadas e políticas restritivas que tornam a autorização
obrigatória mesmo quando ainda existe uma política antiga baseada em perfil.

Um gatilho também valida INSERT e UPDATE nas tabelas sensíveis. Essa segunda camada
impede que funções `SECURITY DEFINER` contornem acidentalmente as permissões.

O Supabase Storage valida leitura, envio, substituição e remoção conforme o módulo:

- fotos de clientes;
- fotos de avaliações;
- imagens de produtos e receitas;
- imagens de eventos;
- logos das organizações;
- documentos.

## Compatibilidade temporária

Os perfis fixos permanecem disponíveis durante a transição. Os usuários existentes
recebem as permissões equivalentes por meio dos modelos criados na Fase 2, enquanto
as novas proteções consultam as permissões efetivas.

## Aplicação

Executar as migrations na ordem:

1. `202607280006_saas_tenant_isolation.sql`;
2. `202607280007_granular_permissions.sql`;
3. `202607280008_permission_enforcement.sql`.

Após aplicar a migration, sair e entrar novamente no sistema para recarregar as
permissões da sessão.
