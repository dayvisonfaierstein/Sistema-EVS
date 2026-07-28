# Fase 5 — Área do Super Admin

Data: 28/07/2026  
Versão: 0.20.0

## Acesso

A central administrativa está disponível em `/admin` e aceita somente perfis com:

- `is_platform_admin = true`; ou
- perfil legado `super_admin`.

Após o login, esses usuários são direcionados automaticamente para `/admin`. Usuários
comuns que tentarem abrir a rota recebem a página `Sem permissão`.

## Navegação exclusiva

A área administrativa não utiliza a navegação operacional do Espaço. Ela possui
layout próprio com:

- Visão global;
- Organizações;
- Planos;
- Assinaturas;
- Auditoria.

## Dashboard global

Apresenta:

- total de organizações;
- ativas, pendentes, bloqueadas e canceladas;
- assinaturas ativas e vencidas;
- receita recorrente mensal normalizada;
- novos espaços e cancelamentos do mês;
- total de usuários e clientes da plataforma;
- alertas de cobrança, carência e ativação pendente.

## Gestão de planos

Permite criar e editar planos, definindo:

- código estável;
- nome e descrição;
- preço;
- periodicidade;
- dias de teste;
- dias de carência;
- disponibilidade para novas assinaturas.

## Gestão de assinaturas

Permite:

- vincular uma organização a um plano;
- alterar a situação da assinatura;
- consultar o preço contratado e vencimento;
- gerar mensalidades manualmente;
- registrar a baixa manual do pagamento.

As operações usam as funções `admin_*` protegidas no banco pela Fase 4.

## Auditoria global

Exibe os 250 registros mais recentes, com busca por ação, entidade, organização ou
responsável.

## Pré-requisito

Antes de publicar esta versão, aplicar no Supabase:

`202607280009_platform_plans_subscriptions.sql`
