-- Permettre à un utilisateur de créer SON profil à l'inscription (register insère
-- côté client). WITH CHECK force role=BUYER / status=PENDING -> empêche l'auto-
-- promotion ADMIN par self-insert. (Les ADMIN sont créés via service role.)
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert
  with check (auth.uid() = id and role = 'BUYER' and status = 'PENDING');
