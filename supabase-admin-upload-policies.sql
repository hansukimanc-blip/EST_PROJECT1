begin;

-- profiles.role을 기준으로 현재 로그인 사용자가 관리자인지 확인합니다.
-- security definer로 실행해 profiles RLS와 무관하게 안전하게 역할을 검사합니다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 기존 정책이 있다면 같은 이름의 정책만 안전하게 다시 만듭니다.
alter table public.audit_reports enable row level security;

drop policy if exists "audit_reports_authenticated_select" on public.audit_reports;
drop policy if exists "audit_reports_admin_insert" on public.audit_reports;
drop policy if exists "audit_reports_admin_delete" on public.audit_reports;

-- 로그인 사용자는 공용 감사보고서 전체를 조회할 수 있습니다.
-- INSERT 후 반환된 행을 화면에 표시할 때도 이 정책이 필요합니다.
create policy "audit_reports_authenticated_select"
on public.audit_reports
for select
to authenticated
using (true);

-- 공용 보고서 정보는 관리자만 등록하고 삭제할 수 있습니다.
create policy "audit_reports_admin_insert"
on public.audit_reports
for insert
to authenticated
with check ((select public.is_admin()));

create policy "audit_reports_admin_delete"
on public.audit_reports
for delete
to authenticated
using ((select public.is_admin()));

-- Data API에서 감사보고서를 등록하는 데 필요한 최소 권한입니다.
grant usage on schema public to authenticated;
grant select, insert, delete on table public.audit_reports to authenticated;
grant usage on sequence public.audit_reports_id_seq to authenticated;

commit;
