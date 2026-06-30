-- Defense-in-depth : empêche un utilisateur non-admin de modifier role/status de
-- son profil (escalade de privilège). Les ADMIN et le service_role restent libres.
create or replace function public.guard_profile_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare jwt_role text := coalesce((auth.jwt() ->> 'role'), '');
begin
  if (new.role is distinct from old.role) or (new.status is distinct from old.status) then
    if jwt_role <> 'service_role' and coalesce(public.get_user_role(), '') <> 'ADMIN' then
      new.role := old.role;
      new.status := old.status;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_profile_role on public.profiles;
create trigger trg_guard_profile_role
  before update on public.profiles
  for each row execute procedure public.guard_profile_role_change();
