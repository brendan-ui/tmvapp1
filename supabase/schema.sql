-- =============================================================================
-- TMV Operating System - Supabase Database Schema
-- =============================================================================
-- Architecture:
--   - Raw tables (raw_*) receive data directly from Coupler.io PostgreSQL destinations
--     using col_N column names. All columns are text to avoid type-casting failures.
--   - Views with human-readable names sit on top for the app to query.
--   - EOS tables are app-managed (not synced).
--   - Row Level Security enforces role-based access.
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

-- ===========================================================================
-- RAW COUPLER TABLES
-- ===========================================================================
-- These tables receive data directly from Coupler.io PostgreSQL destinations.
-- All data columns are text to avoid type-casting issues during sync.
-- Coupler "Replace" mode will TRUNCATE + INSERT on each run.
--
-- Coupler destination config for each:
--   Host: db.fyymeuwhzrpwqsbrdmik.supabase.co
--   Port: 5432
--   Database: postgres
--   User: postgres
--   Password: <your database password>
--   Schema: public
--   Mode: Replace
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 4. Raw Xero P&L (10 columns: col_0 .. col_9)
--    Coupler destination table name: raw_xero_pl
-- ---------------------------------------------------------------------------
create table raw_xero_pl (
  id    bigint generated always as identity primary key,
  col_0 text,  -- Report
  col_1 text,  -- Report date
  col_2 text,  -- Account class
  col_3 text,  -- Account type
  col_4 text,  -- Account name
  col_5 text,  -- Amount
  col_6 text,  -- Amount for calculation
  col_7 text,  -- Gross profit
  col_8 text,  -- Operating Profit (Loss)
  col_9 text,  -- Net Profit (Loss)
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Raw Xero Balance Sheet (9 columns: col_0 .. col_8)
--    Coupler destination table name: raw_xero_balance_sheet
-- ---------------------------------------------------------------------------
create table raw_xero_balance_sheet (
  id    bigint generated always as identity primary key,
  col_0 text,  -- Report
  col_1 text,  -- Report date
  col_2 text,  -- Category
  col_3 text,  -- Account type
  col_4 text,  -- Account subclass
  col_5 text,  -- Account class
  col_6 text,  -- Account name
  col_7 text,  -- Amount
  col_8 text,  -- Account currency
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Raw Xero Invoices (35 columns: col_0 .. col_34)
--    Coupler destination table name: raw_xero_invoices
-- ---------------------------------------------------------------------------
create table raw_xero_invoices (
  id     bigint generated always as identity primary key,
  col_0  text,  -- Invoice: Type
  col_1  text,  -- Invoice: ID
  col_2  text,  -- Invoice: Number
  col_3  text,  -- Contact: Customer
  col_4  text,  -- LineItems: LineItem description
  col_5  text,  -- LineItems: LineItem ID
  col_6  text,  -- Invoice: Date
  col_7  text,  -- Invoice: Due date
  col_8  text,  -- Payments: Date
  col_9  text,  -- Invoice: Status
  col_10 text,  -- Invoice: Currency
  col_11 text,  -- Invoice: Currency rate
  col_12 text,  -- Payments: Currency rate
  col_13 text,  -- Invoice: Tax
  col_14 text,  -- LineItems: Tax type
  col_15 text,  -- LineItems: Quantity
  col_16 text,  -- Invoice: Total amount
  col_17 text,  -- Invoice: Amount paid
  col_18 text,  -- Invoice: Amount due
  col_19 text,  -- LineItems: Total amount in home currency
  col_20 text,  -- LineItems: Amount paid in home currency
  col_21 text,  -- LineItems: Amount due in home currency
  col_22 text,  -- Url
  col_23 text,  -- Payments.BatchPaymentID
  col_24 text,  -- CreditNotes.Count
  col_25 text,  -- CreditNotes.CreditNoteID
  col_26 text,  -- CreditNotes.CreditNoteNumber
  col_27 text,  -- CreditNotes.ID
  col_28 text,  -- CreditNotes.HasErrors
  col_29 text,  -- CreditNotes.InvoiceAddresses
  col_30 text,  -- CreditNotes.AppliedAmount
  col_31 text,  -- CreditNotes.DateString
  col_32 text,  -- CreditNotes.Date
  col_33 text,  -- CreditNotes.LineItems
  col_34 text,  -- CreditNotes.Total
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. Raw Xero Accounts (10 columns: col_0 .. col_9)
--    Coupler destination table name: raw_xero_accounts
-- ---------------------------------------------------------------------------
create table raw_xero_accounts (
  id    bigint generated always as identity primary key,
  col_0 text,  -- Report
  col_1 text,  -- Account code
  col_2 text,  -- Name
  col_3 text,  -- Account type
  col_4 text,  -- Account subclass
  col_5 text,  -- Account class
  col_6 text,  -- Account currency
  col_7 text,  -- Bank account type
  col_8 text,  -- Description
  col_9 text,  -- Status
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. Raw Xero Transactions (12 columns: col_0 .. col_11)
--    Coupler destination table name: raw_xero_transactions
-- ---------------------------------------------------------------------------
create table raw_xero_transactions (
  id     bigint generated always as identity primary key,
  col_0  text,  -- Report
  col_1  text,  -- Journal date
  col_2  text,  -- Account code
  col_3  text,  -- Account name
  col_4  text,  -- Contact name
  col_5  text,  -- Gross amount (in home currency)
  col_6  text,  -- Net amount (in home currency)
  col_7  text,  -- Description
  col_8  text,  -- Reference
  col_9  text,  -- Account type
  col_10 text,  -- Source type
  col_11 text,  -- Reversal
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 9. Raw Loxo Deals (38 columns: col_0 .. col_37)
--    Coupler destination table name: raw_loxo_deals
-- ---------------------------------------------------------------------------
create table raw_loxo_deals (
  id     bigint generated always as identity primary key,
  col_0  text,  -- Sheet Name
  col_1  text,  -- Deal ID
  col_2  text,  -- Deal Name
  col_3  text,  -- Amount
  col_4  text,  -- Expected Amount
  col_5  text,  -- Close Date
  col_6  text,  -- Company Name
  col_7  text,  -- Pipeline Name
  col_8  text,  -- Pipeline Stage
  col_9  text,  -- Stage Win Probability
  col_10 text,  -- Owner
  col_11 text,  -- Owner Email
  col_12 text,  -- Linked Job
  col_13 text,  -- Contact Person
  col_14 text,  -- Deal Status
  col_15 text,  -- Status Updated At
  col_16 text,  -- Created At
  col_17 text,  -- Updated At
  col_18 text,  -- Deleted
  col_19 text,  -- Job ID
  col_20 text,  -- Title
  col_21 text,  -- Company
  col_22 text,  -- City
  col_23 text,  -- State
  col_24 text,  -- Salary Min
  col_25 text,  -- Salary Max
  col_26 text,  -- Published
  col_27 text,  -- Status
  col_28 text,  -- URL
  col_29 text,  -- Job Type
  col_30 text,  -- Remote Work Allowed
  col_31 text,  -- Bonus
  col_32 text,  -- Equity
  col_33 text,  -- Owner Emails
  col_34 text,  -- Categories
  col_35 text,  -- Macro Address
  col_36 text,  -- Fee
  col_37 text,  -- Company ID
  synced_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. Raw Signed Clients (81 columns: col_0 .. col_80)
--     Coupler destination table name: raw_signed_clients
-- ---------------------------------------------------------------------------
create table raw_signed_clients (
  id     bigint generated always as identity primary key,
  col_0  text,  -- Sheet Name (retainer / placement / coaching)
  col_1  text,  -- Timestamp
  col_2  text,  -- Email Address
  col_3  text,  -- Signed client contract attachment
  col_4  text,  -- Company Name
  col_5  text,  -- Hiring Manager (First & Last Name)
  col_6  text,  -- Hiring Manager (Email)
  col_7  text,  -- Accounts Payable Email
  col_8  text,  -- Sales credit person
  col_9  text,  -- Managing person
  col_10 text,  -- Retainer Amount
  col_11 text,  -- Success fee (%)
  col_12 text,  -- Fee applied to
  col_13 text,  -- Special terms
  col_14 text,  -- Origination Source
  col_15 text,  -- Invoice Status
  col_16 text,  -- Invoice Number
  col_17 text,  -- Commission %
  col_18 text,  -- Retainer Commission
  col_19 text,  -- Commission Status
  col_20 text,  -- Origination Source (alt)
  col_21 text,  -- Signed offer letter attachment
  col_22 text,  -- Client (Company Name)
  col_23 text,  -- Loxo Job Link (Internal)
  col_24 text,  -- Candidate Name
  col_25 text,  -- Candidate Start Date
  col_26 text,  -- Annual Cash Base Compensation
  col_27 text,  -- Annual Cash Bonus Compensation
  col_28 text,  -- Other First-Year Cash Compensation
  col_29 text,  -- Total Compensation for Client Success Fee
  col_30 text,  -- Billable amount difference reason
  col_31 text,  -- Sourcer
  col_32 text,  -- Recruiter
  col_33 text,  -- Deal Split - Recruiter
  col_34 text,  -- Client Partner
  col_35 text,  -- Deal Split - Client Partner
  col_36 text,  -- Commission payment notes
  col_37 text,  -- Team Player Bonus
  col_38 text,  -- Sales Credit
  col_39 text,  -- Where did the deal originate?
  col_40 text,  -- Advertisement company
  col_41 text,  -- Vertical
  col_42 text,  -- Total First-Year Comp
  col_43 text,  -- Billable Amount Difference
  col_44 text,  -- Client Hiring Fee
  col_45 text,  -- Billable Total
  col_46 text,  -- Retainer Credit
  col_47 text,  -- Invoice Total
  col_48 text,  -- Sales Commission
  col_49 text,  -- Sales Commission (alt)
  col_50 text,  -- Billable Total for Delivery Commissions
  col_51 text,  -- Invoice Issue Date
  col_52 text,  -- Invoice Send Date
  col_53 text,  -- Invoice Due Date
  col_54 text,  -- Invoice Paid Date
  col_55 text,  -- Commission Due Date
  col_56 text,  -- 30 Days Follow-Up
  col_57 text,  -- 60-Day Follow-Up
  col_58 text,  -- 90-Day Follow-Up
  col_59 text,  -- Signed Coaching Contract
  col_60 text,  -- Company (coaching)
  col_61 text,  -- Client Name (coaching)
  col_62 text,  -- Company Contact (coaching)
  col_63 text,  -- Contact Email (coaching)
  col_64 text,  -- Accounts Payable email (coaching)
  col_65 text,  -- Sales credit for deal (coaching)
  col_66 text,  -- Managing engagement (coaching)
  col_67 text,  -- Total Fee (coaching)
  col_68 text,  -- Final Bill Amount (coaching)
  col_69 text,  -- Retainer Invoice Send Date (coaching)
  col_70 text,  -- Retainer Invoice Due Date (coaching)
  col_71 text,  -- Retainer Invoice Paid Date (coaching)
  col_72 text,  -- Final Invoice Send Date (coaching)
  col_73 text,  -- Final Invoice Due Date (coaching)
  col_74 text,  -- Final Invoice Paid Date (coaching)
  col_75 text,  -- Billable Total for Client Invoicing
  col_76 text,  -- Client Partners
  col_77 text,  -- % Commission
  col_78 text,  -- NEW % Commission
  col_79 text,  -- Placement Tracker & Scorecard
  col_80 text,  -- (empty label)
  synced_at timestamptz not null default now()
);

-- ===========================================================================
-- VIEWS (human-readable names for the app to query)
-- ===========================================================================
-- These views map col_N columns to meaningful names and cast types.
-- The app queries these views (same names as the old tables).
-- security_invoker = true ensures RLS on raw tables is respected.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 11. xero_profit_and_loss view
-- ---------------------------------------------------------------------------
create or replace view xero_profit_and_loss
  with (security_invoker = true)
as select
  id,
  col_0                         as report,
  col_1::date                   as report_date,
  col_2                         as account_class,
  col_3                         as account_type,
  col_4                         as account_name,
  nullif(col_5, '')::numeric    as amount,
  nullif(col_6, '')::numeric    as amount_for_calculation,
  col_7                         as gross_profit,
  col_8                         as operating_profit,
  col_9                         as net_profit,
  synced_at
from raw_xero_pl;

-- ---------------------------------------------------------------------------
-- 12. xero_balance_sheet view
-- ---------------------------------------------------------------------------
create or replace view xero_balance_sheet
  with (security_invoker = true)
as select
  id,
  col_0                         as report,
  col_1::date                   as report_date,
  col_2                         as category,
  col_3                         as account_type,
  col_4                         as account_subclass,
  col_5                         as account_class,
  col_6                         as account_name,
  nullif(col_7, '')::numeric    as amount,
  col_8                         as account_currency,
  synced_at
from raw_xero_balance_sheet;

-- ---------------------------------------------------------------------------
-- 13. xero_invoices view
-- ---------------------------------------------------------------------------
create or replace view xero_invoices
  with (security_invoker = true)
as select
  id,
  col_0                         as invoice_type,
  col_1                         as invoice_id,
  col_2                         as invoice_number,
  col_3                         as contact_customer,
  col_4                         as lineitem_description,
  col_5                         as lineitem_id,
  col_6::date                   as invoice_date,
  col_7::date                   as invoice_due_date,
  col_8::date                   as payment_date,
  col_9                         as invoice_status,
  col_10                        as currency,
  nullif(col_11, '')::numeric   as currency_rate,
  nullif(col_12, '')::numeric   as payment_currency_rate,
  col_13                        as tax,
  col_14                        as tax_type,
  col_15                        as quantity,
  nullif(col_16, '')::numeric   as total_amount,
  nullif(col_17, '')::numeric   as amount_paid,
  nullif(col_18, '')::numeric   as amount_due,
  nullif(col_19, '')::numeric   as total_amount_in_home_currency,
  nullif(col_20, '')::numeric   as amount_paid_in_home_currency,
  nullif(col_21, '')::numeric   as amount_due_in_home_currency,
  col_22                        as url,
  synced_at
from raw_xero_invoices;

-- ---------------------------------------------------------------------------
-- 14. xero_accounts view
-- ---------------------------------------------------------------------------
create or replace view xero_accounts
  with (security_invoker = true)
as select
  id,
  col_0                         as report,
  col_1                         as account_code,
  col_2                         as name,
  col_3                         as account_type,
  col_4                         as account_subclass,
  col_5                         as account_class,
  col_6                         as account_currency,
  col_7                         as bank_account_type,
  col_8                         as description,
  col_9                         as status,
  synced_at
from raw_xero_accounts;

-- ---------------------------------------------------------------------------
-- 15. xero_transactions view
-- ---------------------------------------------------------------------------
create or replace view xero_transactions
  with (security_invoker = true)
as select
  id,
  col_0                         as report,
  col_1::date                   as journal_date,
  col_2                         as account_code,
  col_3                         as account_name,
  col_4                         as contact_name,
  nullif(col_5, '')::numeric    as gross_amount,
  nullif(col_6, '')::numeric    as net_amount,
  col_7                         as description,
  col_8                         as reference,
  col_9                         as account_type,
  col_10                        as source_type,
  col_11::boolean               as reversal,
  synced_at
from raw_xero_transactions;

-- ---------------------------------------------------------------------------
-- 16. loxo_deals view
-- ---------------------------------------------------------------------------
create or replace view loxo_deals
  with (security_invoker = true)
as select
  id,
  col_0                              as sheet_name,
  nullif(col_1, '')::integer         as deal_id,
  col_2                              as deal_name,
  nullif(col_3, '')::numeric         as amount,
  nullif(col_4, '')::numeric         as expected_amount,
  col_5::date                        as close_date,
  col_6                              as company_name,
  col_7                              as pipeline_name,
  col_8                              as pipeline_stage,
  nullif(col_9, '')::numeric         as stage_win_probability,
  col_10                             as owner,
  col_11                             as owner_email,
  col_12                             as linked_job,
  col_13                             as contact_person,
  col_14                             as deal_status,
  col_15::timestamptz                as status_updated_at,
  col_16::timestamptz                as created_at,
  col_17::timestamptz                as updated_at,
  coalesce(col_18::boolean, false)   as deleted,
  nullif(col_19, '')::integer        as job_id,
  col_20                             as title,
  col_21                             as company,
  col_22                             as city,
  col_23                             as state,
  col_24                             as salary_min,
  col_25                             as salary_max,
  col_26::boolean                    as published,
  col_27                             as status,
  col_28                             as url,
  col_29                             as job_type,
  col_30::boolean                    as remote_work_allowed,
  col_31                             as bonus,
  col_32                             as equity,
  col_33                             as owner_emails,
  col_34                             as categories,
  col_35                             as macro_address,
  nullif(col_36, '')::numeric        as fee,
  nullif(col_37, '')::integer        as company_id,
  synced_at
from raw_loxo_deals;

-- ---------------------------------------------------------------------------
-- 17. signed_clients view
-- ---------------------------------------------------------------------------
create or replace view signed_clients
  with (security_invoker = true)
as select
  id,
  col_0                              as sheet_name,
  col_1::timestamptz                 as "timestamp",
  col_2                              as email_address,
  col_4                              as company_name,
  col_5                              as hiring_manager,
  col_6                              as hiring_manager_email,
  col_8                              as sales_credit_person,
  col_9                              as managing_person,
  nullif(col_10, '')::numeric        as retainer_amount,
  nullif(col_11, '')::numeric        as success_fee_pct,
  col_12                             as fee_applied_to,
  col_13                             as special_terms,
  col_14                             as origination_source,
  col_15                             as invoice_status,
  col_16                             as invoice_number,
  nullif(col_17, '')::numeric        as commission_pct,
  nullif(col_18, '')::numeric        as retainer_commission,
  col_19                             as commission_status,
  col_24                             as candidate_name,
  col_25                             as candidate_start_date,
  nullif(col_26, '')::numeric        as annual_base_comp,
  nullif(col_27, '')::numeric        as annual_bonus_comp,
  nullif(col_28, '')::numeric        as other_comp,
  nullif(col_29, '')::numeric        as total_comp_for_fee,
  col_31                             as sourcer,
  col_32                             as recruiter,
  col_34                             as client_partner,
  col_38                             as sales_credit,
  col_39                             as deal_origination,
  nullif(col_42, '')::numeric        as total_first_year_comp,
  nullif(col_44, '')::numeric        as client_hiring_fee,
  nullif(col_45, '')::numeric        as billable_total,
  nullif(col_46, '')::numeric        as retainer_credit,
  nullif(col_47, '')::numeric        as invoice_total,
  nullif(col_48, '')::numeric        as sales_commission,
  nullif(col_50, '')::numeric        as billable_total_for_delivery,
  col_51                             as invoice_issue_date,
  col_53                             as invoice_due_date,
  col_54                             as invoice_paid_date,
  nullif(col_75, '')::numeric        as billable_total_for_invoicing,
  col_76                             as client_partners,
  synced_at
from raw_signed_clients;

-- ===========================================================================
-- EOS TABLES (app-managed, not Coupler-synced)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 18. EOS Scorecards - Weekly KPIs per team member
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
-- 19. EOS Rocks - Quarterly goals
-- ---------------------------------------------------------------------------
create table eos_rocks (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  quarter         text not null,
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
-- 20. EOS Todos - Action items
-- ---------------------------------------------------------------------------
create table eos_todos (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  title           text not null,
  description     text,
  due_date        date,
  completed       boolean not null default false,
  completed_at    timestamptz,
  meeting_date    date,
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
-- 21. EOS Issues - IDS tracker
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

-- ===========================================================================
-- ANALYTICAL VIEWS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 22. Revenue by month (from P&L view)
-- ---------------------------------------------------------------------------
create or replace view v_revenue_by_month
  with (security_invoker = true)
as select
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

-- ---------------------------------------------------------------------------
-- 23. AR aging (from invoices view)
-- ---------------------------------------------------------------------------
create or replace view v_ar_aging
  with (security_invoker = true)
as select
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

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================

-- Enable RLS on all raw tables and EOS tables
alter table profiles                enable row level security;
alter table raw_xero_pl             enable row level security;
alter table raw_xero_balance_sheet  enable row level security;
alter table raw_xero_invoices       enable row level security;
alter table raw_xero_accounts       enable row level security;
alter table raw_xero_transactions   enable row level security;
alter table raw_loxo_deals          enable row level security;
alter table raw_signed_clients      enable row level security;
alter table eos_scorecards          enable row level security;
alter table eos_rocks               enable row level security;
alter table eos_todos               enable row level security;
alter table eos_issues              enable row level security;

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

-- ---- Raw Xero P&L ----
create policy "Owner exec can view raw P&L"
  on raw_xero_pl for select
  using (current_user_role() in ('owner', 'executive'));

create policy "Sales can view raw P&L"
  on raw_xero_pl for select
  using (current_user_role() = 'sales');

-- ---- Raw Xero Balance Sheet ----
create policy "Owner exec can view raw balance sheet"
  on raw_xero_balance_sheet for select
  using (current_user_role() in ('owner', 'executive'));

-- ---- Raw Xero Invoices ----
create policy "Owner exec sales can view raw invoices"
  on raw_xero_invoices for select
  using (current_user_role() in ('owner', 'executive', 'sales'));

-- ---- Raw Xero Accounts ----
create policy "Owner exec can view raw accounts"
  on raw_xero_accounts for select
  using (current_user_role() in ('owner', 'executive'));

-- ---- Raw Xero Transactions ----
create policy "Owner exec can view raw transactions"
  on raw_xero_transactions for select
  using (current_user_role() in ('owner', 'executive'));

-- ---- Raw Loxo Deals ----
create policy "Team can view raw deals"
  on raw_loxo_deals for select
  using (current_user_role() in ('owner', 'executive', 'sales', 'recruiter'));

-- ---- Raw Signed Clients ----
create policy "Sales team can view raw signed clients"
  on raw_signed_clients for select
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

-- ===========================================================================
-- SERVICE ROLE BYPASS
-- ===========================================================================
-- Coupler.io connects via the postgres user (superuser) which bypasses RLS.
-- No additional policies needed for data ingestion.

-- ===========================================================================
-- GRANTS
-- ===========================================================================
grant usage on schema public to anon, authenticated;

grant select on profiles to authenticated;
grant update (full_name, avatar_url) on profiles to authenticated;

-- Grant SELECT on raw tables (needed for security_invoker views)
grant select on raw_xero_pl            to authenticated;
grant select on raw_xero_balance_sheet to authenticated;
grant select on raw_xero_invoices      to authenticated;
grant select on raw_xero_accounts      to authenticated;
grant select on raw_xero_transactions  to authenticated;
grant select on raw_loxo_deals         to authenticated;
grant select on raw_signed_clients     to authenticated;

-- Grant SELECT on views
grant select on xero_profit_and_loss   to authenticated;
grant select on xero_balance_sheet     to authenticated;
grant select on xero_invoices          to authenticated;
grant select on xero_accounts          to authenticated;
grant select on xero_transactions      to authenticated;
grant select on loxo_deals             to authenticated;
grant select on signed_clients         to authenticated;
grant select on v_revenue_by_month     to authenticated;
grant select on v_ar_aging             to authenticated;

-- Grant EOS table access
grant select, insert, update          on eos_scorecards to authenticated;
grant select, insert, update          on eos_rocks      to authenticated;
grant select, insert, update, delete  on eos_todos      to authenticated;
grant select, insert, update          on eos_issues     to authenticated;
