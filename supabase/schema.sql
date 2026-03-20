-- =============================================================================
-- TMV Operating System - Supabase Database Schema
-- =============================================================================
-- This schema supports:
--   - Coupler.io synced data from Xero, Loxo, and Google Sheets
--   - EOS (Entrepreneurial Operating System) app-managed tables
--   - Row Level Security for role-based access
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 2. Custom types
-- ---------------------------------------------------------------------------
create type app_role as enum (
  'owner',
  'executive',
  'sales',
  'recruiter',
  'viewer'
);

-- ---------------------------------------------------------------------------
-- 3. Profiles table (linked to auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text,
  role          app_role not null default 'viewer',
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_email on profiles(email);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Xero P&L (source: Xero P&L This/Last year)
-- ---------------------------------------------------------------------------
create table xero_profit_and_loss (
  id                      bigint generated always as identity primary key,
  report                  text,
  report_date             date,
  account_class           text,
  account_type            text,
  account_name            text,
  amount                  numeric,
  amount_for_calculation  numeric,
  gross_profit            numeric,
  operating_profit        numeric,
  net_profit              numeric,
  synced_at               timestamptz not null default now()
);

create index idx_xero_pl_report_date on xero_profit_and_loss(report_date);
create index idx_xero_pl_account_class on xero_profit_and_loss(account_class);
create index idx_xero_pl_account_type on xero_profit_and_loss(account_type);
create index idx_xero_pl_account_name on xero_profit_and_loss(account_name);

-- ---------------------------------------------------------------------------
-- 5. Xero Balance Sheet (source: Xero Balance Sheet This/Last year)
-- ---------------------------------------------------------------------------
create table xero_balance_sheet (
  id                bigint generated always as identity primary key,
  report            text,
  report_date       date,
  category          text,
  account_type      text,
  account_subclass  text,
  account_class     text,
  account_name      text,
  amount            numeric,
  account_currency  text,
  synced_at         timestamptz not null default now()
);

create index idx_xero_bs_report_date on xero_balance_sheet(report_date);
create index idx_xero_bs_account_class on xero_balance_sheet(account_class);
create index idx_xero_bs_category on xero_balance_sheet(category);

-- ---------------------------------------------------------------------------
-- 6. Xero Invoices (source: Xero Invoices with Line Items)
-- ---------------------------------------------------------------------------
create table xero_invoices (
  id                              bigint generated always as identity primary key,
  invoice_type                    text,
  invoice_id                      text,
  invoice_number                  text,
  contact_customer                text,
  lineitem_description            text,
  lineitem_id                     text,
  invoice_date                    date,
  invoice_due_date                date,
  payment_date                    date,
  invoice_status                  text,
  currency                        text,
  currency_rate                   numeric,
  payment_currency_rate           numeric,
  tax                             numeric,
  tax_type                        text,
  quantity                        numeric,
  total_amount                    numeric,
  amount_paid                     numeric,
  amount_due                      numeric,
  total_amount_in_home_currency   numeric,
  amount_paid_in_home_currency    numeric,
  amount_due_in_home_currency     numeric,
  url                             text,
  synced_at                       timestamptz not null default now()
);

create index idx_xero_inv_invoice_id on xero_invoices(invoice_id);
create index idx_xero_inv_invoice_number on xero_invoices(invoice_number);
create index idx_xero_inv_contact on xero_invoices(contact_customer);
create index idx_xero_inv_date on xero_invoices(invoice_date);
create index idx_xero_inv_due_date on xero_invoices(invoice_due_date);
create index idx_xero_inv_status on xero_invoices(invoice_status);
create index idx_xero_inv_type on xero_invoices(invoice_type);

-- ---------------------------------------------------------------------------
-- 7. Xero Accounts (source: Xero Accounts)
-- ---------------------------------------------------------------------------
create table xero_accounts (
  id                  bigint generated always as identity primary key,
  report              text,
  account_code        text,
  name                text,
  account_type        text,
  account_subclass    text,
  account_class       text,
  account_currency    text,
  bank_account_type   text,
  description         text,
  status              text,
  synced_at           timestamptz not null default now()
);

create index idx_xero_acct_code on xero_accounts(account_code);
create index idx_xero_acct_type on xero_accounts(account_type);
create index idx_xero_acct_class on xero_accounts(account_class);

-- ---------------------------------------------------------------------------
-- 8. Xero Transactions (source: Xero Account Transactions with Contacts)
-- ---------------------------------------------------------------------------
create table xero_transactions (
  id              bigint generated always as identity primary key,
  report          text,
  journal_date    date,
  account_code    text,
  account_name    text,
  contact_name    text,
  gross_amount    numeric,
  net_amount      numeric,
  description     text,
  reference       text,
  account_type    text,
  source_type     text,
  reversal        boolean,
  synced_at       timestamptz not null default now()
);

create index idx_xero_txn_journal_date on xero_transactions(journal_date);
create index idx_xero_txn_account_code on xero_transactions(account_code);
create index idx_xero_txn_contact on xero_transactions(contact_name);
create index idx_xero_txn_source_type on xero_transactions(source_type);

-- ---------------------------------------------------------------------------
-- 9. Loxo Deals (source: Loxo Deals)
-- ---------------------------------------------------------------------------
create table loxo_deals (
  id                    bigint generated always as identity primary key,
  sheet_name            text,
  deal_id               integer,
  deal_name             text,
  amount                numeric,
  expected_amount       numeric,
  close_date            date,
  company_name          text,
  pipeline_name         text,
  pipeline_stage        text,
  stage_win_probability numeric,
  owner                 text,
  owner_email           text,
  linked_job            text,
  contact_person        text,
  deal_status           text,
  status_updated_at     timestamptz,
  created_at            timestamptz,
  updated_at            timestamptz,
  deleted               boolean,
  job_id                integer,
  title                 text,
  company               text,
  city                  text,
  state                 text,
  salary_min            numeric,
  salary_max            numeric,
  published             boolean,
  status                text,
  url                   text,
  job_type              text,
  remote_work_allowed   boolean,
  bonus                 numeric,
  equity                text,
  owner_emails          text,
  categories            text,
  macro_address         text,
  fee                   numeric,
  company_id            integer,
  synced_at             timestamptz not null default now()
);

create index idx_loxo_deal_id on loxo_deals(deal_id);
create index idx_loxo_pipeline_stage on loxo_deals(pipeline_stage);
create index idx_loxo_deal_status on loxo_deals(deal_status);
create index idx_loxo_owner on loxo_deals(owner);
create index idx_loxo_company on loxo_deals(company_name);
create index idx_loxo_close_date on loxo_deals(close_date);

-- ---------------------------------------------------------------------------
-- 10. Signed Clients (source: New Signed Client)
-- ---------------------------------------------------------------------------
create table signed_clients (
  id                    bigint generated always as identity primary key,
  sheet_name            text,                    -- retainer / placement / coaching
  timestamp             timestamptz,
  email_address         text,
  company_name          text,
  hiring_manager        text,
  retainer_amount       numeric,
  success_fee_pct       numeric,
  sales_credit          text,
  recruiter             text,
  client_partner        text,
  commission_pct        numeric,
  invoice_date_1        date,
  invoice_status_1      text,
  invoice_date_2        date,
  invoice_status_2      text,
  invoice_date_3        date,
  invoice_status_3      text,
  candidate_name        text,
  candidate_title       text,
  candidate_start_date  date,
  candidate_salary      numeric,
  billable_total        numeric,
  notes                 text,
  synced_at             timestamptz not null default now()
);

create index idx_signed_sheet on signed_clients(sheet_name);
create index idx_signed_company on signed_clients(company_name);
create index idx_signed_recruiter on signed_clients(recruiter);
create index idx_signed_client_partner on signed_clients(client_partner);
create index idx_signed_timestamp on signed_clients(timestamp);

-- ---------------------------------------------------------------------------
-- 11. EOS Scorecards - Weekly KPIs per team member
-- ---------------------------------------------------------------------------
create table eos_scorecards (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  week_of         date not null,
  measurable      text not null,
  goal            numeric,
  actual          numeric,
  on_track        boolean,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_eos_sc_owner on eos_scorecards(owner_id);
create index idx_eos_sc_week on eos_scorecards(week_of);
create index idx_eos_sc_owner_week on eos_scorecards(owner_id, week_of);

create trigger eos_scorecards_updated_at
  before update on eos_scorecards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 12. EOS Rocks - Quarterly goals
-- ---------------------------------------------------------------------------
create table eos_rocks (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  quarter         text not null,                 -- e.g. '2026-Q1'
  status          text not null default 'on-track'
                  check (status in ('on-track', 'off-track', 'complete', 'dropped')),
  due_date        date,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_eos_rocks_owner on eos_rocks(owner_id);
create index idx_eos_rocks_quarter on eos_rocks(quarter);
create index idx_eos_rocks_status on eos_rocks(status);

create trigger eos_rocks_updated_at
  before update on eos_rocks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 13. EOS Todos - Action items
-- ---------------------------------------------------------------------------
create table eos_todos (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date,
  completed       boolean not null default false,
  completed_at    timestamptz,
  meeting_date    date,                          -- L10 meeting it came from
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_eos_todos_owner on eos_todos(owner_id);
create index idx_eos_todos_completed on eos_todos(completed);
create index idx_eos_todos_due_date on eos_todos(due_date);

create trigger eos_todos_updated_at
  before update on eos_todos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 14. EOS Issues - IDS (Identify, Discuss, Solve) tracker
-- ---------------------------------------------------------------------------
create table eos_issues (
  id              uuid primary key default uuid_generate_v4(),
  created_by      uuid not null references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  priority        text not null default 'medium'
                  check (priority in ('low', 'medium', 'high', 'critical')),
  status          text not null default 'open'
                  check (status in ('open', 'identified', 'discussing', 'solved', 'closed')),
  resolved_at     timestamptz,
  resolution      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_eos_issues_created_by on eos_issues(created_by);
create index idx_eos_issues_status on eos_issues(status);
create index idx_eos_issues_priority on eos_issues(priority);

create trigger eos_issues_updated_at
  before update on eos_issues
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 15. Views
-- ---------------------------------------------------------------------------

-- Revenue by month from Xero P&L data
create or replace view v_revenue_by_month as
select
  date_trunc('month', report_date)::date  as month,
  report,
  account_class,
  account_type,
  sum(amount)                             as total_amount,
  sum(amount_for_calculation)             as total_for_calculation
from xero_profit_and_loss
where account_class = 'REVENUE'
group by date_trunc('month', report_date), report, account_class, account_type
order by month desc;

-- Accounts receivable aging from Xero Invoices
create or replace view v_ar_aging as
select
  contact_customer,
  invoice_number,
  invoice_date,
  invoice_due_date,
  invoice_status,
  amount_due_in_home_currency                                       as amount_due,
  current_date - invoice_due_date                                   as days_overdue,
  case
    when current_date - invoice_due_date <= 0  then 'Current'
    when current_date - invoice_due_date <= 30 then '1-30 days'
    when current_date - invoice_due_date <= 60 then '31-60 days'
    when current_date - invoice_due_date <= 90 then '61-90 days'
    else '90+ days'
  end                                                               as aging_bucket
from xero_invoices
where invoice_status in ('AUTHORISED', 'SENT')
  and invoice_type = 'ACCREC'
  and amount_due_in_home_currency > 0
order by days_overdue desc;

-- ---------------------------------------------------------------------------
-- 16. Row Level Security
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
alter table profiles              enable row level security;
alter table xero_profit_and_loss  enable row level security;
alter table xero_balance_sheet    enable row level security;
alter table xero_invoices         enable row level security;
alter table xero_accounts         enable row level security;
alter table xero_transactions     enable row level security;
alter table loxo_deals            enable row level security;
alter table signed_clients        enable row level security;
alter table eos_scorecards        enable row level security;
alter table eos_rocks             enable row level security;
alter table eos_todos             enable row level security;
alter table eos_issues            enable row level security;

-- Helper: get current user's role
create or replace function public.current_user_role()
returns app_role
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---- Profiles ----
create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Owners and executives can view all profiles"
  on profiles for select
  using (current_user_role() in ('owner', 'executive'));

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Owners can manage all profiles"
  on profiles for all
  using (current_user_role() = 'owner');

-- ---- Xero tables: read-only for authenticated, owner/exec see all ----
-- P&L
create policy "Authenticated users can view P&L"
  on xero_profit_and_loss for select
  using (current_user_role() in ('owner', 'executive'));

create policy "Sales can view P&L"
  on xero_profit_and_loss for select
  using (current_user_role() = 'sales');

-- Balance Sheet
create policy "Owner and executive can view balance sheet"
  on xero_balance_sheet for select
  using (current_user_role() in ('owner', 'executive'));

-- Invoices
create policy "Owner and executive can view invoices"
  on xero_invoices for select
  using (current_user_role() in ('owner', 'executive', 'sales'));

-- Accounts
create policy "Owner and executive can view accounts"
  on xero_accounts for select
  using (current_user_role() in ('owner', 'executive'));

-- Transactions
create policy "Owner and executive can view transactions"
  on xero_transactions for select
  using (current_user_role() in ('owner', 'executive'));

-- ---- Loxo Deals: owner, exec, sales, recruiter can read ----
create policy "Team can view deals"
  on loxo_deals for select
  using (current_user_role() in ('owner', 'executive', 'sales', 'recruiter'));

-- ---- Signed Clients: owner, exec, sales can read ----
create policy "Sales team can view signed clients"
  on signed_clients for select
  using (current_user_role() in ('owner', 'executive', 'sales'));

-- ---- EOS Scorecards ----
create policy "Users can view own scorecards"
  on eos_scorecards for select
  using (owner_id = auth.uid());

create policy "Owner and executive can view all scorecards"
  on eos_scorecards for select
  using (current_user_role() in ('owner', 'executive'));

create policy "Users can insert own scorecards"
  on eos_scorecards for insert
  with check (owner_id = auth.uid());

create policy "Users can update own scorecards"
  on eos_scorecards for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can manage all scorecards"
  on eos_scorecards for all
  using (current_user_role() = 'owner');

-- ---- EOS Rocks ----
create policy "Users can view own rocks"
  on eos_rocks for select
  using (owner_id = auth.uid());

create policy "Owner and executive can view all rocks"
  on eos_rocks for select
  using (current_user_role() in ('owner', 'executive'));

create policy "Users can insert own rocks"
  on eos_rocks for insert
  with check (owner_id = auth.uid());

create policy "Users can update own rocks"
  on eos_rocks for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can manage all rocks"
  on eos_rocks for all
  using (current_user_role() = 'owner');

-- ---- EOS Todos ----
create policy "Users can view own todos"
  on eos_todos for select
  using (owner_id = auth.uid());

create policy "Owner and executive can view all todos"
  on eos_todos for select
  using (current_user_role() in ('owner', 'executive'));

create policy "Users can insert own todos"
  on eos_todos for insert
  with check (owner_id = auth.uid());

create policy "Users can update own todos"
  on eos_todos for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can delete own todos"
  on eos_todos for delete
  using (owner_id = auth.uid());

create policy "Owners can manage all todos"
  on eos_todos for all
  using (current_user_role() = 'owner');

-- ---- EOS Issues ----
create policy "All authenticated can view issues"
  on eos_issues for select
  using (current_user_role() is not null);

create policy "All authenticated can create issues"
  on eos_issues for insert
  with check (current_user_role() is not null);

create policy "Creator can update own issues"
  on eos_issues for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Owner and executive can manage all issues"
  on eos_issues for all
  using (current_user_role() in ('owner', 'executive'));

-- ---------------------------------------------------------------------------
-- 17. Service role bypass for Coupler.io sync
-- ---------------------------------------------------------------------------
-- Coupler.io connects via the service_role key which bypasses RLS.
-- No additional policies needed for data ingestion.
-- If using a custom sync user instead, grant INSERT/UPDATE/DELETE
-- on the Coupler-synced tables to that role.

-- ---------------------------------------------------------------------------
-- 18. Grants for the anon and authenticated roles (Supabase default)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on profiles to authenticated;
grant update (full_name, avatar_url) on profiles to authenticated;

grant select on xero_profit_and_loss  to authenticated;
grant select on xero_balance_sheet    to authenticated;
grant select on xero_invoices         to authenticated;
grant select on xero_accounts         to authenticated;
grant select on xero_transactions     to authenticated;
grant select on loxo_deals            to authenticated;
grant select on signed_clients        to authenticated;

grant select, insert, update          on eos_scorecards to authenticated;
grant select, insert, update          on eos_rocks      to authenticated;
grant select, insert, update, delete  on eos_todos      to authenticated;
grant select, insert, update          on eos_issues     to authenticated;

grant select on v_revenue_by_month    to authenticated;
grant select on v_ar_aging            to authenticated;
