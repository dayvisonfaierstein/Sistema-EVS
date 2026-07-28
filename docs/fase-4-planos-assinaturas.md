# Fase 4 — Planos e assinaturas da plataforma

Data: 28/07/2026  
Versão: 0.19.0

## Migration

`202607280009_platform_plans_subscriptions.sql`

Esta migration depende das Fases 1, 2 e 3.

## Estrutura

### `plans`

Catálogo de planos da plataforma. Armazena preço, periodicidade, dias de carência,
recursos, limites e campos opcionais para um gateway futuro.

Nenhum preço comercial foi criado automaticamente. O Super Admin poderá cadastrar
quantos planos forem necessários quando a administração da plataforma receber suas
telas.

### `subscriptions`

Relaciona uma organização ao plano contratado. Preserva preço, moeda e periodicidade
da contratação, mesmo que o plano seja alterado futuramente.

Somente uma assinatura não cancelada pode existir por organização. Assinaturas
canceladas permanecem como histórico.

### `subscription_payments`

Registra cada mensalidade, período de referência, vencimento, pagamento, comprovante
e situação. O vínculo composto impede associar uma mensalidade à organização errada.

## Estados da assinatura

- `pending` — pendente;
- `active` — ativa;
- `overdue` — vencida;
- `grace_period` — em carência;
- `blocked` — bloqueada;
- `cancelled` — cancelada.

## Funções do Super Admin

- `admin_create_subscription()` — cria a assinatura e registra o preço contratado;
- `admin_set_subscription_status()` — altera a situação e sincroniza a organização;
- `admin_create_subscription_payment()` — gera uma mensalidade manual;
- `admin_register_subscription_payment()` — registra o recebimento;
- `admin_refresh_subscription_statuses()` — identifica mensalidades vencidas sob
  comando do Super Admin.

Não há automação cron nem comunicação externa nesta fase.

## Compatibilidade

`organizations.subscription_status`, `organizations.status` e `organizations.active`
continuam sincronizados pelas funções administrativas. Assim, funcionalidades
existentes não precisam migrar imediatamente para as novas tabelas.

## Gateway futuro

As tabelas reservam provedor, identificadores externos e metadados. Esses campos não
executam cobrança e não armazenam dados sensíveis de cartão.

## Aplicação

Executar no SQL Editor do Supabase:

`202607280009_platform_plans_subscriptions.sql`
