-- La colonne flag est attendue par l'UI (countries.flag) mais absente du schéma
-- de base reconstruit -> les select('... countries(name,flag)') renvoyaient 400.
alter table public.countries add column if not exists flag text;

update public.countries set flag = case code
  when 'CD' then '🇨🇩' when 'CN' then '🇨🇳' when 'AE' then '🇦🇪'
  when 'TR' then '🇹🇷' when 'TH' then '🇹🇭' when 'JP' then '🇯🇵'
  else coalesce(flag,'🌐') end;
