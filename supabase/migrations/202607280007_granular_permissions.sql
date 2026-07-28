-- Fase 2: permissões granulares, modelos de acesso e auditoria.

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  module text not null,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_template_permissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.access_templates(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (template_id, permission_id)
);

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references public.profiles(id),
  permission_id uuid not null references public.permissions(id),
  granted boolean not null default true,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, permission_id)
);

create index if not exists permissions_module_active_idx
  on public.permissions(module, active);
create index if not exists user_permissions_user_granted_idx
  on public.user_permissions(user_id, granted);
create index if not exists user_permissions_organization_idx
  on public.user_permissions(organization_id, user_id);

drop trigger if exists set_updated_at on public.permissions;
create trigger set_updated_at
before update on public.permissions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.access_templates;
create trigger set_updated_at
before update on public.access_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_permissions;
create trigger set_updated_at
before update on public.user_permissions
for each row execute function public.set_updated_at();

insert into public.permissions (key, module, name, description)
values
  ('dashboard.view', 'dashboard', 'Visualizar dashboard', 'Acessar indicadores gerais da organização.'),

  ('clients.view', 'clients', 'Visualizar clientes', 'Consultar a lista e o perfil dos clientes.'),
  ('clients.create', 'clients', 'Cadastrar clientes', 'Cadastrar novos clientes.'),
  ('clients.update', 'clients', 'Editar clientes', 'Alterar dados cadastrais dos clientes.'),
  ('clients.deactivate', 'clients', 'Inativar clientes', 'Inativar e reativar clientes.'),
  ('clients.personal_data.view', 'clients', 'Visualizar dados pessoais', 'Consultar dados pessoais e contatos.'),
  ('clients.body_data.view', 'clients', 'Visualizar informações corporais', 'Consultar informações corporais e de saúde.'),
  ('clients.export', 'clients', 'Exportar clientes', 'Exportar dados autorizados de clientes.'),

  ('assessments.view', 'assessments', 'Visualizar avaliações', 'Consultar avaliações corporais.'),
  ('assessments.create', 'assessments', 'Criar avaliações', 'Registrar avaliações corporais.'),
  ('assessments.update', 'assessments', 'Editar avaliações', 'Alterar avaliações corporais.'),
  ('assessments.photos.view', 'assessments', 'Visualizar fotos', 'Consultar fotos de evolução.'),
  ('assessments.export', 'assessments', 'Exportar avaliações', 'Exportar relatórios de avaliação.'),

  ('accesses.view', 'accesses', 'Visualizar acessos', 'Consultar acessos e atendimentos.'),
  ('accesses.create', 'accesses', 'Registrar acessos', 'Registrar acesso e consumo do cliente.'),
  ('accesses.update', 'accesses', 'Editar acessos', 'Corrigir registros de acesso.'),
  ('accesses.frequency.view', 'accesses', 'Visualizar frequência', 'Consultar frequência dos clientes.'),

  ('agenda.view', 'agenda', 'Visualizar agenda', 'Consultar agenda e compromissos.'),
  ('agenda.create', 'agenda', 'Criar agendamentos', 'Registrar novos agendamentos.'),
  ('agenda.update', 'agenda', 'Editar agendamentos', 'Alterar agendamentos.'),
  ('agenda.cancel', 'agenda', 'Cancelar agendamentos', 'Cancelar agendamentos existentes.'),

  ('sales.view', 'sales', 'Visualizar vendas', 'Consultar vendas e seus itens.'),
  ('sales.create', 'sales', 'Criar vendas', 'Registrar e finalizar vendas.'),
  ('sales.discount', 'sales', 'Aplicar desconto', 'Aplicar desconto em vendas.'),
  ('sales.cancel', 'sales', 'Cancelar vendas', 'Cancelar e estornar vendas.'),
  ('sales.view_cost', 'sales', 'Visualizar custo', 'Consultar custos dos itens vendidos.'),
  ('sales.view_profit', 'sales', 'Visualizar margem de lucro', 'Consultar lucro e margem das vendas.'),

  ('products.view', 'products', 'Visualizar produtos', 'Consultar o catálogo de produtos.'),
  ('products.create', 'products', 'Cadastrar produtos', 'Cadastrar novos produtos.'),
  ('products.update', 'products', 'Editar produtos', 'Alterar produtos existentes.'),
  ('products.deactivate', 'products', 'Inativar produtos', 'Inativar e reativar produtos.'),
  ('products.export', 'products', 'Exportar produtos', 'Exportar catálogo e preços.'),

  ('inventory.view', 'inventory', 'Visualizar estoque', 'Consultar saldos e movimentações.'),
  ('inventory.create', 'inventory', 'Registrar entrada', 'Registrar compras e entradas de estoque.'),
  ('inventory.adjust', 'inventory', 'Registrar ajuste', 'Registrar ajustes positivos ou negativos.'),
  ('inventory.loss', 'inventory', 'Registrar perda', 'Registrar perdas e desperdícios.'),
  ('inventory.view_cost', 'inventory', 'Visualizar custo de estoque', 'Consultar custo médio e valor do estoque.'),
  ('inventory.batches.view', 'inventory', 'Visualizar lotes', 'Consultar lotes e validades.'),
  ('inventory.export', 'inventory', 'Exportar estoque', 'Exportar estoque e movimentações.'),

  ('recipes.view', 'recipes', 'Visualizar receitas', 'Consultar preparações e fichas técnicas.'),
  ('recipes.create', 'recipes', 'Cadastrar receitas', 'Cadastrar novas preparações.'),
  ('recipes.update', 'recipes', 'Editar receitas', 'Alterar preparações existentes.'),
  ('recipes.deactivate', 'recipes', 'Inativar receitas', 'Inativar e reativar preparações.'),
  ('recipes.cost.view', 'recipes', 'Visualizar custo de receitas', 'Consultar custo, lucro e margem das preparações.'),

  ('finance.view', 'finance', 'Visualizar financeiro', 'Acessar o módulo financeiro.'),
  ('finance.income.view', 'finance', 'Visualizar receitas', 'Consultar lançamentos de receita.'),
  ('finance.income.create', 'finance', 'Cadastrar receitas', 'Criar lançamentos de receita.'),
  ('finance.expense.view', 'finance', 'Visualizar despesas', 'Consultar lançamentos de despesa.'),
  ('finance.expense.create', 'finance', 'Cadastrar despesas', 'Criar lançamentos de despesa.'),
  ('finance.entries.update', 'finance', 'Editar lançamentos', 'Alterar lançamentos financeiros.'),
  ('finance.entries.cancel', 'finance', 'Cancelar lançamentos', 'Cancelar ou estornar lançamentos.'),
  ('finance.payables.view', 'finance', 'Contas a pagar', 'Consultar contas a pagar.'),
  ('finance.receivables.view', 'finance', 'Contas a receber', 'Consultar contas a receber.'),
  ('finance.payments.register', 'finance', 'Registrar pagamentos', 'Registrar pagamentos e recebimentos.'),
  ('finance.cash.view', 'finance', 'Visualizar caixa', 'Consultar caixas e movimentações.'),
  ('finance.cash.open', 'finance', 'Abrir caixa', 'Abrir um novo caixa operacional.'),
  ('finance.cash.close', 'finance', 'Fechar caixa', 'Realizar fechamento de caixa.'),
  ('finance.profit.view', 'finance', 'Visualizar lucro', 'Consultar lucro, margem e resultado.'),
  ('finance.reports.export', 'finance', 'Exportar relatórios financeiros', 'Exportar dados e relatórios financeiros.'),

  ('events.view', 'events', 'Visualizar eventos', 'Consultar eventos.'),
  ('events.create', 'events', 'Criar eventos', 'Cadastrar eventos.'),
  ('events.update', 'events', 'Editar eventos', 'Alterar eventos.'),
  ('events.participants.manage', 'events', 'Gerenciar participantes', 'Administrar participantes de eventos.'),

  ('campaigns.view', 'campaigns', 'Visualizar campanhas', 'Consultar campanhas.'),
  ('campaigns.create', 'campaigns', 'Criar campanhas', 'Cadastrar campanhas.'),
  ('campaigns.update', 'campaigns', 'Editar campanhas', 'Alterar campanhas.'),
  ('campaigns.send', 'campaigns', 'Enviar campanhas', 'Autorizar envio de campanhas.'),

  ('reports.clients', 'reports', 'Relatórios de clientes', 'Consultar relatórios de clientes.'),
  ('reports.assessments', 'reports', 'Relatórios de avaliações', 'Consultar relatórios de avaliações.'),
  ('reports.accesses', 'reports', 'Relatórios de acessos', 'Consultar relatórios de acessos.'),
  ('reports.sales', 'reports', 'Relatórios de vendas', 'Consultar relatórios de vendas.'),
  ('reports.inventory', 'reports', 'Relatórios de estoque', 'Consultar relatórios de estoque.'),
  ('reports.finance', 'reports', 'Relatórios financeiros', 'Consultar relatórios financeiros.'),

  ('users.view', 'users', 'Visualizar usuários', 'Consultar usuários da organização.'),
  ('users.create', 'users', 'Cadastrar usuários', 'Convidar novos usuários.'),
  ('users.update', 'users', 'Editar usuários', 'Alterar usuários da organização.'),
  ('users.activate', 'users', 'Ativar ou inativar usuários', 'Controlar situação de usuários.'),
  ('users.permissions', 'users', 'Gerenciar permissões', 'Alterar permissões dos usuários.'),

  ('settings.organization', 'settings', 'Dados do espaço', 'Alterar dados cadastrais da organização.'),
  ('settings.permissions', 'settings', 'Configurar permissões', 'Gerenciar modelos e permissões.'),
  ('settings.integrations', 'settings', 'Configurar integrações', 'Gerenciar integrações da organização.'),
  ('settings.subscription.view', 'settings', 'Visualizar assinatura', 'Consultar plano, situação e pagamentos.'),
  ('audit.view', 'settings', 'Visualizar auditoria', 'Consultar auditoria da organização.')
on conflict (key) do update
set
  module = excluded.module,
  name = excluded.name,
  description = excluded.description,
  active = true,
  updated_at = now();

insert into public.access_templates (key, name, description, is_system)
values
  ('administrator', 'Administrador', 'Acesso total à própria organização.', true),
  ('commercial', 'Comercial', 'Clientes, acessos, vendas, produtos e agenda.', true),
  ('service', 'Atendimento', 'Clientes, acessos e agenda, sem custos ou financeiro.', true),
  ('assessment', 'Avaliação', 'Clientes e avaliações corporais.', true),
  ('inventory', 'Estoque', 'Produtos, receitas, estoque, lotes e movimentações.', true),
  ('finance', 'Financeiro', 'Financeiro, caixa e relatórios financeiros.', true),
  ('custom', 'Personalizado', 'Permissões definidas individualmente.', true)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = true,
  active = true,
  updated_at = now();

with template_map(template_key, permission_key) as (
  values
    ('commercial', 'dashboard.view'),
    ('commercial', 'clients.view'),
    ('commercial', 'clients.create'),
    ('commercial', 'clients.update'),
    ('commercial', 'clients.personal_data.view'),
    ('commercial', 'accesses.view'),
    ('commercial', 'accesses.create'),
    ('commercial', 'accesses.frequency.view'),
    ('commercial', 'agenda.view'),
    ('commercial', 'agenda.create'),
    ('commercial', 'agenda.update'),
    ('commercial', 'agenda.cancel'),
    ('commercial', 'sales.view'),
    ('commercial', 'sales.create'),
    ('commercial', 'sales.discount'),
    ('commercial', 'products.view'),
    ('commercial', 'reports.clients'),
    ('commercial', 'reports.accesses'),
    ('commercial', 'reports.sales'),

    ('service', 'dashboard.view'),
    ('service', 'clients.view'),
    ('service', 'clients.create'),
    ('service', 'clients.update'),
    ('service', 'clients.personal_data.view'),
    ('service', 'accesses.view'),
    ('service', 'accesses.create'),
    ('service', 'accesses.frequency.view'),
    ('service', 'agenda.view'),
    ('service', 'agenda.create'),
    ('service', 'agenda.update'),
    ('service', 'agenda.cancel'),

    ('assessment', 'dashboard.view'),
    ('assessment', 'clients.view'),
    ('assessment', 'clients.personal_data.view'),
    ('assessment', 'clients.body_data.view'),
    ('assessment', 'assessments.view'),
    ('assessment', 'assessments.create'),
    ('assessment', 'assessments.update'),
    ('assessment', 'assessments.photos.view'),
    ('assessment', 'assessments.export'),
    ('assessment', 'reports.assessments'),

    ('inventory', 'dashboard.view'),
    ('inventory', 'products.view'),
    ('inventory', 'products.create'),
    ('inventory', 'products.update'),
    ('inventory', 'products.deactivate'),
    ('inventory', 'products.export'),
    ('inventory', 'inventory.view'),
    ('inventory', 'inventory.create'),
    ('inventory', 'inventory.adjust'),
    ('inventory', 'inventory.loss'),
    ('inventory', 'inventory.view_cost'),
    ('inventory', 'inventory.batches.view'),
    ('inventory', 'inventory.export'),
    ('inventory', 'recipes.view'),
    ('inventory', 'recipes.create'),
    ('inventory', 'recipes.update'),
    ('inventory', 'recipes.deactivate'),
    ('inventory', 'recipes.cost.view'),
    ('inventory', 'reports.inventory'),

    ('finance', 'dashboard.view'),
    ('finance', 'sales.view'),
    ('finance', 'sales.view_cost'),
    ('finance', 'sales.view_profit'),
    ('finance', 'finance.view'),
    ('finance', 'finance.income.view'),
    ('finance', 'finance.income.create'),
    ('finance', 'finance.expense.view'),
    ('finance', 'finance.expense.create'),
    ('finance', 'finance.entries.update'),
    ('finance', 'finance.entries.cancel'),
    ('finance', 'finance.payables.view'),
    ('finance', 'finance.receivables.view'),
    ('finance', 'finance.payments.register'),
    ('finance', 'finance.cash.view'),
    ('finance', 'finance.cash.open'),
    ('finance', 'finance.cash.close'),
    ('finance', 'finance.profit.view'),
    ('finance', 'finance.reports.export'),
    ('finance', 'reports.finance')
)
insert into public.access_template_permissions (template_id, permission_id)
select templates.id, permissions.id
from template_map
join public.access_templates templates on templates.key = template_map.template_key
join public.permissions permissions on permissions.key = template_map.permission_key
on conflict (template_id, permission_id) do nothing;

-- Administrador recebe acesso total implicitamente; o modelo não precisa materializar
-- uma linha por permissão e continuará abrangendo novas permissões futuras.
update public.profiles
set access_template = case
  when is_organization_admin or role = 'administrator' then 'administrator'
  when role = 'attendant' then 'service'
  when role = 'evaluator' then 'assessment'
  when role = 'inventory' then 'inventory'
  when role = 'finance' then 'finance'
  else coalesce(access_template, 'custom')
end
where not is_platform_admin
  and role <> 'super_admin';

alter table public.profiles
  drop constraint if exists profiles_access_template_fkey;
alter table public.profiles
  add constraint profiles_access_template_fkey
  foreign key (access_template) references public.access_templates(key);

insert into public.user_permissions (
  organization_id,
  user_id,
  permission_id,
  granted,
  granted_by
)
select
  profiles.organization_id,
  profiles.id,
  template_permissions.permission_id,
  true,
  null
from public.profiles profiles
join public.access_templates templates
  on templates.key = profiles.access_template
join public.access_template_permissions template_permissions
  on template_permissions.template_id = templates.id
where profiles.organization_id is not null
  and profiles.active
  and profiles.deleted_at is null
  and not profiles.is_organization_admin
  and profiles.role <> 'administrator'
on conflict (organization_id, user_id, permission_id)
do update set granted = true, updated_at = now();

alter table public.permissions enable row level security;
alter table public.access_templates enable row level security;
alter table public.access_template_permissions enable row level security;
alter table public.user_permissions enable row level security;

drop policy if exists permissions_authenticated_read on public.permissions;
create policy permissions_authenticated_read
on public.permissions for select
to authenticated
using (active or public.is_super_admin());

drop policy if exists permissions_platform_write on public.permissions;
create policy permissions_platform_write
on public.permissions for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists access_templates_authenticated_read on public.access_templates;
create policy access_templates_authenticated_read
on public.access_templates for select
to authenticated
using (active or public.is_super_admin());

drop policy if exists access_templates_platform_write on public.access_templates;
create policy access_templates_platform_write
on public.access_templates for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists access_template_permissions_authenticated_read
  on public.access_template_permissions;
create policy access_template_permissions_authenticated_read
on public.access_template_permissions for select
to authenticated
using (true);

drop policy if exists access_template_permissions_platform_write
  on public.access_template_permissions;
create policy access_template_permissions_platform_write
on public.access_template_permissions for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists user_permissions_org_read on public.user_permissions;
create policy user_permissions_org_read
on public.user_permissions for select
to authenticated
using (
  public.is_super_admin()
  or user_id = auth.uid()
  or (
    organization_id = public.current_organization_id()
    and public.is_organization_admin()
  )
);

drop policy if exists user_permissions_tenant_boundary on public.user_permissions;
create policy user_permissions_tenant_boundary
on public.user_permissions
as restrictive
for all
to authenticated
using (public.can_access_organization(organization_id))
with check (public.can_access_organization(organization_id));

-- Não há política permissiva de escrita em user_permissions. Toda alteração passa
-- pela função transacional abaixo, que compara, grava e audita as diferenças.

create or replace function public.audit_user_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  permission_key text;
  target_organization uuid;
  target_user uuid;
begin
  select key into permission_key
  from public.permissions
  where id = coalesce(new.permission_id, old.permission_id);

  target_organization := coalesce(new.organization_id, old.organization_id);
  target_user := coalesce(new.user_id, old.user_id);

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity,
    entity_id,
    old_data,
    new_data
  )
  values (
    target_organization,
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'permission.granted'
      when tg_op = 'DELETE' then 'permission.revoked'
      else 'permission.updated'
    end,
    'profile_permission',
    target_user,
    case when tg_op = 'INSERT' then null else jsonb_build_object(
      'permission', permission_key,
      'granted', old.granted
    ) end,
    case when tg_op = 'DELETE' then null else jsonb_build_object(
      'permission', permission_key,
      'granted', new.granted
    ) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

drop trigger if exists audit_user_permission_change on public.user_permissions;
create trigger audit_user_permission_change
after insert or update or delete on public.user_permissions
for each row execute function public.audit_user_permission_change();

create or replace function public.get_my_permissions()
returns table(permission_key text)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p.key
  from public.permissions p
  where p.active
    and (
      public.is_super_admin()
      or public.is_organization_admin()
      or exists (
        select 1
        from public.user_permissions up
        where up.permission_id = p.id
          and up.user_id = auth.uid()
          and up.organization_id = public.current_organization_id()
          and up.granted
      )
    )
  order by p.module, p.key
$$;

create or replace function public.get_template_permissions(requested_template_key text)
returns table(permission_key text)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select p.key
  from public.access_templates t
  join public.access_template_permissions tp on tp.template_id = t.id
  join public.permissions p on p.id = tp.permission_id
  where t.key = requested_template_key
    and t.active
    and p.active
  order by p.module, p.key
$$;

create or replace function public.set_user_permissions(
  target_user_id uuid,
  permission_keys text[],
  selected_template_key text default 'custom'
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  target_profile public.profiles%rowtype;
  caller_organization uuid := public.current_organization_id();
  normalized_keys text[] := coalesce(permission_keys, array[]::text[]);
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into target_profile
  from public.profiles
  where id = target_user_id
    and active
    and deleted_at is null;

  if not found then
    raise exception 'Usuário não encontrado ou inativo';
  end if;

  if not public.is_super_admin() then
    if not public.is_organization_admin()
       or target_profile.organization_id is distinct from caller_organization then
      raise exception 'Sem permissão para alterar este usuário';
    end if;
  end if;

  if target_profile.is_platform_admin
     or target_profile.role = 'super_admin'
     or target_profile.is_organization_admin
     or target_profile.role = 'administrator' then
    raise exception 'Administradores possuem acesso total implícito';
  end if;

  if selected_template_key is null
     or not exists (
       select 1 from public.access_templates
       where key = selected_template_key and active
     ) then
    raise exception 'Modelo de acesso inválido';
  end if;

  if exists (
    select 1
    from unnest(normalized_keys) requested_key
    left join public.permissions p on p.key = requested_key and p.active
    where p.id is null
  ) then
    raise exception 'Uma ou mais permissões são inválidas';
  end if;

  delete from public.user_permissions up
  where up.user_id = target_user_id
    and up.organization_id = target_profile.organization_id
    and not exists (
      select 1
      from public.permissions p
      where p.id = up.permission_id
        and p.key = any(normalized_keys)
    );

  insert into public.user_permissions (
    organization_id,
    user_id,
    permission_id,
    granted,
    granted_by
  )
  select
    target_profile.organization_id,
    target_user_id,
    p.id,
    true,
    auth.uid()
  from public.permissions p
  where p.active
    and p.key = any(normalized_keys)
  on conflict (organization_id, user_id, permission_id)
  do update set
    granted = true,
    granted_by = auth.uid(),
    updated_at = now()
  where not user_permissions.granted;

  update public.profiles
  set access_template = selected_template_key
  where id = target_user_id;
end
$$;

revoke all on function public.get_my_permissions() from public;
revoke all on function public.get_template_permissions(text) from public;
revoke all on function public.set_user_permissions(uuid, text[], text) from public;

grant execute on function public.get_my_permissions() to authenticated;
grant execute on function public.get_template_permissions(text) to authenticated;
grant execute on function public.set_user_permissions(uuid, text[], text) to authenticated;

comment on table public.permissions is
  'Catálogo global de capacidades granulares da plataforma.';
comment on table public.user_permissions is
  'Permissões concedidas individualmente e isoladas por organização.';
comment on function public.set_user_permissions(uuid, text[], text) is
  'Substitui permissões do usuário de forma transacional e auditada.';
