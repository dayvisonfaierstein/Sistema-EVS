# Fase 2 — Permissões granulares

Data: 28/07/2026  
Versão: 0.18.1

## Migration

`202607280007_granular_permissions.sql`

Esta migration depende da aplicação da migration da Fase 1.

## Tabelas criadas

### `permissions`

Catálogo global de permissões, identificado por uma chave estável, módulo, nome e
descrição.

### `user_permissions`

Permissões efetivamente concedidas aos usuários, sempre vinculadas à organização.

### `access_templates`

Modelos de acesso:

- Administrador;
- Comercial;
- Atendimento;
- Avaliação;
- Estoque;
- Financeiro;
- Personalizado.

### `access_template_permissions`

Relaciona os modelos às permissões que devem ser marcadas automaticamente.

## Módulos cadastrados

- Dashboard;
- Clientes;
- Avaliações;
- Acessos;
- Agenda;
- Vendas;
- Produtos;
- Estoque;
- Receitas;
- Financeiro;
- Eventos;
- Campanhas;
- Relatórios;
- Usuários;
- Configurações e auditoria.

## Permissões financeiras

- `finance.view`;
- `finance.income.view`;
- `finance.income.create`;
- `finance.expense.view`;
- `finance.expense.create`;
- `finance.entries.update`;
- `finance.entries.cancel`;
- `finance.payables.view`;
- `finance.receivables.view`;
- `finance.payments.register`;
- `finance.cash.view`;
- `finance.cash.open`;
- `finance.cash.close`;
- `finance.profit.view`;
- `finance.reports.export`.

## Administradores

Super Admin e administrador principal da organização recebem acesso total
implicitamente. Não são criadas dezenas de linhas para esses usuários, garantindo
que novas permissões futuras também sejam liberadas automaticamente.

As permissões do administrador principal não podem ser removidas pela função de
gestão de permissões.

## Compatibilidade com usuários existentes

Os perfis fixos existentes são convertidos em modelos:

- `attendant` → Atendimento;
- `evaluator` → Avaliação;
- `inventory` → Estoque;
- `finance` → Financeiro;
- `administrator` → Administrador.

As permissões dos modelos são materializadas para os funcionários atuais durante a
migration. O perfil fixo continua disponível temporariamente para compatibilidade.

## Funções

### `get_my_permissions()`

Retorna todas as chaves autorizadas ao usuário autenticado.

### `get_template_permissions(template)`

Retorna as permissões previstas em um modelo.

### `set_user_permissions(user, permissions, template)`

Substitui as permissões de um funcionário de forma transacional.

Regras:

- somente Super Admin ou administrador da mesma organização;
- não permite alterar Super Admin;
- não permite retirar acesso implícito do administrador principal;
- rejeita permissões ou modelos inexistentes;
- remove apenas permissões que deixaram de ser selecionadas;
- grava somente as diferenças necessárias;
- registra concessões e remoções em auditoria.

## RLS

- Catálogo e modelos podem ser lidos por usuários autenticados.
- Somente Super Admin pode alterar o catálogo global.
- Usuário pode consultar as próprias permissões.
- Administrador pode consultar permissões da própria organização.
- Não existe política de escrita direta em `user_permissions`.
- Alterações passam obrigatoriamente pela função transacional.
- Uma política restritiva impede acesso cruzado por `organization_id`.

## Front-end

O `AuthContext` agora carrega as permissões após autenticar e disponibiliza:

- `permissions`;
- `hasPermission(permission)`.

O menu e as rotas ainda não foram modificados nesta fase. Eles passarão a consumir
essa estrutura na Fase 3.
