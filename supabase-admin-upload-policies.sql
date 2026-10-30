begin;

-- 감사보고서 원본 파일을 보관하는 비공개 bucket입니다.
insert into storage.buckets (id, name, public)
values ('audit-reports', 'audit-reports', false)
on conflict (id) do update set public = false;

-- 기존 정책이 있다면 같은 이름의 정책만 안전하게 다시 만듭니다.
drop policy if exists "audit_reports_admin_insert" on public.audit_reports;
drop policy if exists "audit_reports_admin_delete" on public.audit_reports;
drop policy if exists "audit_report_files_authenticated_select" on storage.objects;
drop policy if exists "audit_report_files_admin_insert" on storage.objects;
drop policy if exists "audit_report_files_admin_delete" on storage.objects;

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

-- 로그인 사용자는 감사보고서 원본을 조회할 수 있습니다.
create policy "audit_report_files_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'audit-reports');

-- audit-reports bucket의 업로드와 정리는 관리자만 할 수 있습니다.
create policy "audit_report_files_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'audit-reports'
  and (select public.is_admin())
);

create policy "audit_report_files_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'audit-reports'
  and (select public.is_admin())
);

-- Data API와 Storage API에서 필요한 최소 테이블 권한입니다.
grant execute on function public.is_admin() to authenticated;
grant select, insert, delete on table public.audit_reports to authenticated;
grant select, insert, delete on table storage.objects to authenticated;

commit;
