# Fase 0 — Auditoria SaaS e Financeiro

Data da análise: 28/07/2026  
Versão de referência: 0.17.0  
Branch auditada: `main`

## 1. Objetivo

Registrar a situação atual do Espaço+ antes da transformação em plataforma SaaS
multiempresa e antes da implementação do financeiro real. Esta fase não altera o
banco, as políticas ou os fluxos operacionais.

## 2. Estado encontrado

### Autenticação

- O login utiliza Supabase Authentication com e-mail e senha.
- A sessão é mantida pelo cliente oficial do Supabase.
- O perfil é carregado da tabela `profiles` após a autenticação.
- O contexto atual autoriza recursos por perfil fixo através de `can(...roles)`.
- Ainda não existem permissões granulares carregadas na sessão.
- O último acesso é atualizado diretamente pelo front-end.

### Organizações

- As tabelas operacionais principais possuem `organization_id`.
- A função `current_organization_id()` deriva a organização do perfil autenticado.
- As políticas existentes isolam a maior parte dos dados por organização.
- `super_admin` já existe no enum de perfis.
- A tabela `organizations` já contém dados cadastrais e um status de assinatura
  simplificado.
- Ainda não existem estados completos de onboarding, bloqueio, carência e
  cancelamento.

### Onboarding

- Existe uma página `/onboarding`.
- O fluxo atual permite que qualquer usuário autenticado sem perfil crie uma
  organização por meio de `bootstrap_organization`.
- Esse comportamento conflita com o novo modelo, no qual somente o Super Admin
  poderá criar uma organização.
- O onboarding atual possui somente dados básicos e não exige troca de senha.

### Usuários e permissões

- A tabela `profiles` utiliza perfis fixos no enum `user_role`.
- A interface ainda não possui permissões granulares por usuário.
- O menu lateral é estático.
- As rotas operacionais verificam autenticação e perfil ativo, mas não uma
  permissão específica por página.
- Algumas telas escondem ações por perfil, mas isso ainda não é um padrão global.

### Super Admin

- O perfil `super_admin` está previsto no banco.
- Não existe área administrativa separada `/admin`.
- Não existem serviços ou telas para criar organizações, administrar planos ou
  controlar assinaturas.
- Um Super Admin sem `organization_id` precisa de tratamento próprio para não ser
  redirecionado ao fluxo operacional de uma unidade.

### Financeiro da organização

As seguintes tabelas básicas já existem e devem ser adaptadas:

- `financial_categories`;
- `financial_entries`;
- `cash_registers`;
- `cash_movements`;
- `payments`;
- `sales`;
- `sale_items`.

Limitações atuais:

- A tela `/financeiro` utiliza `mockData`.
- O botão de novo lançamento não executa operação real.
- Não existem serviços financeiros no front-end.
- Não há pagamentos parciais, parcelas normalizadas, contas financeiras, centros
  de custo, transferências, anexos ou conciliação.
- Recorrência está representada apenas por texto.
- Não existem funções transacionais para pagamento, estorno e fechamento.
- A página usa apenas visão simplificada de caixa, sem separar caixa e
  competência.

### Vendas e integração financeira

- A página `/vendas` ainda utiliza produtos e clientes fictícios.
- A finalização está desabilitada.
- As tabelas de vendas e pagamentos existem, mas não estão conectadas à interface.
- Ainda não há integração confiável entre venda, estoque, caixa e lançamento
  financeiro.
- Consumos, custos e perdas já possuem uma base histórica melhor estruturada e
  devem alimentar relatórios sem gerar movimentações financeiras duplicadas.

### Auditoria

- A tabela `audit_logs` já existe e deve ser reutilizada.
- Há auditoria automática parcial no módulo comercial.
- A estrutura atual não cobre todas as operações sensíveis.
- Não existe interface de consulta.
- Mudanças de permissão, assinatura, pagamento e bloqueio ainda não são auditadas.

### Dados fictícios remanescentes

As rotas abaixo ainda dependem total ou parcialmente de dados fictícios ou aviso de
módulo pendente:

- `/financeiro`;
- `/vendas`;
- `/agenda`;
- `/portal`.

## 3. Riscos identificados

### Críticos

1. `bootstrap_organization` permite autocadastro por usuário autenticado sem
   perfil. A função deverá ser desativada ou restrita antes de liberar o SaaS.
2. `profiles_admin_write` concede operação ampla aos administradores atuais. Ela
   deverá ser substituída por políticas específicas e permissões granulares.
3. Políticas baseadas somente em perfil fixo não atendem ao novo modelo.
4. O front-end não possui uma separação entre ambiente da plataforma e ambiente da
   organização.
5. O bloqueio de assinatura ainda não protege rotas nem funções do banco.

### Altos

1. Não há origem única para lançamentos financeiros, criando risco de duplicidade
   entre venda, pagamento e caixa.
2. Não há idempotência para pagamentos, estornos e integrações financeiras.
3. Não existe separação formal entre regime de caixa e competência.
4. O PDV ainda não realiza baixa transacional integrada.
5. O Super Admin está previsto nas políticas operacionais, mas não possui um
   contexto administrativo próprio.

### Médios

1. Tipos TypeScript ainda não modelam organizações, vendas, pagamentos, caixa e
   financeiro de forma completa.
2. O menu estático poderá exibir módulos sem autorização.
3. O último acesso depende de atualização realizada pelo navegador.
4. Vários status são textos livres e precisam de constraints.
5. Exclusão lógica ainda não está padronizada em todas as entidades sensíveis.

## 4. Arquitetura aprovada para evolução

### Dois domínios financeiros

#### Plataforma Espaço+

- planos;
- assinaturas;
- mensalidades;
- receita recorrente;
- inadimplência;
- bloqueio e reativação.

#### Organização

- contas financeiras;
- categorias;
- centros de custo;
- receitas e despesas;
- contas a pagar e receber;
- pagamentos;
- caixa;
- vendas;
- relatórios financeiros.

Os domínios não compartilharão permissões nem telas operacionais.

### Autorização

A autorização futura terá quatro camadas:

1. autenticação pelo Supabase Auth;
2. situação da organização e da assinatura;
3. isolamento por `organization_id`;
4. permissão granular por usuário.

O `organization_admin` terá todas as permissões da própria organização de forma
implícita. O `super_admin` terá acesso ao domínio da plataforma sem depender de
uma organização.

### Origem financeira

Todo lançamento integrado terá:

- tipo de origem;
- identificador da origem;
- chave de idempotência;
- organização;
- usuário responsável;
- data de competência;
- data de caixa;
- situação;
- trilha de auditoria.

Isso impedirá que uma venda ou pagamento gere o mesmo lançamento duas vezes.

## 5. Reaproveitamento

### Reutilizar

- Supabase Auth;
- `organizations`;
- `profiles`;
- `audit_logs`;
- `financial_categories`;
- `financial_entries`;
- `cash_registers`;
- `cash_movements`;
- `payments`;
- `sales`;
- `sale_items`;
- design system, cards, tabelas, gráficos e componentes de formulário;
- isolamento por `organization_id`;
- snapshots comerciais de custo e PV.

### Adaptar

- `AuthContext`;
- layout `_app`;
- onboarding;
- menu lateral;
- políticas RLS;
- enum de perfis;
- tipos TypeScript;
- dashboard;
- página Financeiro;
- PDV;
- auditoria comercial.

### Criar

- área `/admin`;
- planos e assinaturas;
- permissões e modelos;
- gestão de usuários;
- proteção reutilizável de rotas e ações;
- páginas de assinatura, bloqueio e falta de permissão;
- serviços financeiros e funções transacionais;
- contas financeiras e centros de custo;
- relatórios de caixa e competência.

## 6. Estratégia de migração

1. Nunca reescrever migrations já aplicadas.
2. Criar somente migrations incrementais.
3. Preservar os perfis atuais durante a transição.
4. Popular permissões padrão antes de trocar o menu e as rotas.
5. Manter administradores atuais com acesso total.
6. Desativar o autocadastro somente após existir o fluxo do Super Admin.
7. Migrar dados financeiros existentes sem recriar tabelas.
8. Adicionar constraints somente após corrigir dados incompatíveis.
9. Não excluir registros operacionais ou financeiros.
10. Usar Git como ponto de recuperação e migrations reversíveis quando possível.

## 7. Escopo exato da Fase 1

A Fase 1 implementará:

- novos campos de organização e perfil;
- funções seguras de identidade e isolamento;
- preparação do Super Admin sem organização;
- estados de organização;
- base para bloqueio por assinatura;
- revisão das políticas de leitura e escrita;
- índices de isolamento;
- auditoria das alterações de organização;
- testes SQL de separação entre duas organizações.

A Fase 1 não implementará ainda:

- telas do Super Admin;
- planos e assinaturas;
- permissões granulares;
- financeiro real;
- envio de convites;
- bloqueio visual.

## 8. Critérios para encerrar a Fase 1

- Organização A não consegue ler ou alterar dados da Organização B.
- Super Admin é reconhecido sem `organization_id`.
- Usuário inativo não acessa dados.
- Funções auxiliares não causam recursão nas políticas.
- Dados atuais continuam acessíveis pelos administradores existentes.
- Migrations executam em base nova e em base já existente.
- TypeScript, lint direcionado e build são aprovados.

## 9. Conclusão

O projeto já possui uma boa base multiempresa, mas ainda não funciona como SaaS
administrável. A evolução deve começar por identidade, isolamento e estados da
organização. Permissões, assinaturas e financeiro devem ser construídos sobre essa
base, nesta ordem, para evitar retrabalho e falhas de segurança.
