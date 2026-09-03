-- A project can now target more than one niche at once (e.g. restaurantes +
-- cafeterías in one search), so `keyword` (single text) becomes `keywords`
-- (text array). Backfill existing rows from their single keyword before
-- dropping the old column.

alter table projects add column keywords text[] not null default '{}';
update projects set keywords = array[keyword] where keyword is not null;
alter table projects alter column keywords drop default;
alter table projects drop column keyword;
