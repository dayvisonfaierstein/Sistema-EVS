create or replace function public.bootstrap_organization(
  p_legal_name text, p_trade_name text, p_document text default null,
  p_phone text default null, p_email text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare org_id uuid; user_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from profiles where id=auth.uid()) then raise exception 'profile already provisioned'; end if;
  user_email := coalesce((select email from auth.users where id=auth.uid()),p_email);
  insert into organizations(legal_name,trade_name,document,phone,email)
  values(p_legal_name,p_trade_name,nullif(regexp_replace(coalesce(p_document,''),'\D','','g'),''),p_phone,p_email)
  returning id into org_id;
  insert into profiles(id,organization_id,full_name,email,role)
  values(auth.uid(),org_id,p_trade_name,user_email,'administrator');
  return org_id;
end $$;
revoke all on function public.bootstrap_organization(text,text,text,text,text) from public;
grant execute on function public.bootstrap_organization(text,text,text,text,text) to authenticated;
