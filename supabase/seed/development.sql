-- Execute apenas em um projeto Supabase local/de desenvolvimento.
insert into public.organizations (id, legal_name, trade_name, email, subscription_status)
values ('00000000-0000-0000-0000-000000000001','Espaço Mais Demonstração Ltda','Espaço+ Demonstração','demo@espacomais.local','trial')
on conflict do nothing;

-- Usuários do auth devem ser criados pelo painel/CLI. Depois associe seus UUIDs em profiles.
insert into public.clients (organization_id,full_name,cpf,phone,email,primary_goal,status)
values
('00000000-0000-0000-0000-000000000001','Ana Beatriz Souza','12345678901','11990000001','ana@example.local','Emagrecimento','active'),
('00000000-0000-0000-0000-000000000001','Carlos Eduardo Lima','12345678902','11990000002','carlos@example.local','Ganho de massa','active');
