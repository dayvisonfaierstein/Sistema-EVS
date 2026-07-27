drop policy if exists client_photos_org_delete on storage.objects;

create policy client_photos_org_delete on storage.objects
  for delete
  using (
    bucket_id = 'client-photos'
    and (storage.foldername(name))[1] = public.current_organization_id()::text
    and public.current_role() <> 'client'
  );
