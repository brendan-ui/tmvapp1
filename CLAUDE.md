# CLAUDE.md — TMV Operating System

## What This Is
A proprietary internal operating platform for TMV (The Military Veteran), a veteran-focused executive search firm. This Next.js app replaces spreadsheets, Claude artifacts, and manual data pulls with a deployed web application featuring live financial dashboards, EOS (Entrepreneurial Operating System) tracking, pipeline management, and role-based access control.

## Quick Start
```bash
npm install
cp .env.example .env.local  # Fill in Supabase + Coupler.io credentials
# Run supabase/schema.sql in Supabase SQL Editor
npm run dev
# Deploy: npx vercel
```

---

## Company Overview
TMV (The Military Veteran) is a military veteran-focused executive search firm founded by Brendan Aronson (USMC veteran). The company places veteran leaders into operational roles at PE-backed portfolio companies, defense contractors, and mission-driven organizations.

- **Current Revenue:** ~$2M FY2025, on pace for ~$3.5-4M FY2026
- **Revenue Target:** $10M
- **Business Model:** Retained executive search (retainer + placement fee)
- **Accounting:** Xero (source of truth), Gusto (payroll), Happy Lifestyle Accounting (external accountant: Chris)
- **ATS/CRM:** Loxo ($200/user/month)
- **Location:** Arlington, VA 22207

---

## Org Chart & Team

### Board / Ownership
- **Brendan Aronson** — Founder/Managing Partner. App role: `owner`. Also runs Valhalla Group. Paid as contractor via Aronson Partners.

### Reporting Structure
```
                        Jim Lose
                   Chief Executive Officer
                           │
        ┌──────────────────┼──────────────────┐────────────────┐
        │                  │                  │                │
   Doug Poldrugo    Christina Womack    Nick Lodestro    T'fani Hixon
   Sr. Director,     Chief of Staff     Performance     Director,
   Sales + Contract  HR/OPS/Finance     Coach           Executive Search
   Recruiting        + Marketing
        │                  │                                  │
   ┌────┴────┐        ┌────┼────┐                    ┌───────┼───────┐
   │         │        │    │    │                    │       │       │
 Danny    Affiliates Liz Andrew Avery           Tyler    Nick B.  Kelsi
 Laylan   (Lenore,   Pod  Pod   Marketing      Gargano  Buman   Majeske
 Partner- Beau,      Coord Editor Associate    Sr.Client Client  Sourcer/
 ships    Will,                                Partner  Partner  Associate
          Randy)
```

### Full Team Roster
| Name | Title | Reports To | App Role | Notes |
|------|-------|-----------|----------|-------|
| **Brendan Aronson** | Founder/Managing Partner | Board | `owner` | Also runs Valhalla Group |
| **Jim Lose** | CEO | Brendan | `executive` | Quarterly bonus = 50% of pre-bonus operating income |
| **Doug Poldrugo** | Sr. Director, Sales + Contract Recruiting | Jim | `sales` | Started Mar 3, 2026. Leads Alleanz staffing line. $170K |
| **Danny Laylan** | Partnerships | Doug | `sales` | Primary BD. Owns majority of Loxo pipeline. $100K |
| **Christina Womack** | Chief of Staff (HR/Ops/Finance + Marketing) | Jim | `sales` | Cross-functional with Sales |
| **Nick Lodestro** | Performance Coach | Jim | `recruiter` | Has Loxo access |
| **T'fani Hixon** | Director, Executive Search | Jim | `recruiter` | Started Mar 16, 2026. $150K |
| **Tyler Gargano** | Sr. Client Partner | T'fani | `recruiter` | $70-80K |
| **Nick Buman** | Client Partner | T'fani | `recruiter` | Starting ~June 2026 |
| **Kelsi Majeske** | Sourcer / Associate | T'fani | `recruiter` | Has some Loxo pipeline deals. ~$45K |

### Affiliates (under Doug — NOT in app auth)
- Lenore Karafa, Beau Higgins, Will Carroll, Randy

---

## Revenue Model

### Fee Structure
- **Retainer fee:** $10-15K upfront (avg ~$12,500), collected within 10 days
- **Placement fee:** 25-30% of candidate's first-year salary (avg ~$50K executive, ~$15K technician)
- **Retainer credit-through:** Retainer credited against placement fee
- **Payment terms:** Net 30, but actual DSO ~60 days on placements

### Four Revenue Streams
1. **Executive Recruiting** — Core business. 18 starting active clients.
2. **Technician Recruiting** — Launching Q2 2026. $5K retainer, $15K placement fee.
3. **Coaching/Advisory** — $2,500 MRR per client. Nick Lodestro leads.
4. **Contract Staffing** — via Alleanz Partners MSA (March 2026). Doug Poldrugo leads.

### Critical Revenue Accounting Note
The v8 financial model has NO retainer credit-through — retainer line is always gross positive. Xero books retainer credits as negative retainer revenue on placement close. **Use TOTAL revenue for actuals vs budget, not retainer/placement individually.**

---

## Financial Model (v8 Base Case)

### 2026 Monthly Budget
| Month | Total Revenue | Gross Profit | OpEx | EBITDA |
|-------|-------------|-------------|------|--------|
| Jan | $257K | $197K | $82K | $115K |
| Feb | $262K | $202K | $82K | $120K |
| Mar | $292K | $234K | $97K | $138K |
| Apr | $310K | $223K | $99K | $124K |
| May | $334K | $236K | $99K | $137K |
| Jun | $351K | $231K | $101K | $130K |
| **2026 Total** | **$4.9M** | **$3.4M** | **$1.2M** | **$2.2M** |

### Latest Actuals (Xero, pulled March 19, 2026)
| Period | Revenue | Cash | AR | AP |
|--------|---------|------|------|------|
| Jan | $317,254 | $709,655 | $430,911 | $77,051 |
| Feb | $227,498 | $862,088 | $398,561 | $107,843 |
| Mar MTD | $404,879 | $868,815 | $744,161 | $118,811 |
| **Q1 QTD** | **$949,631** | | | |

Q1 2025 was $450K → ~111% YoY growth.

### Standing Data Caveats (ALWAYS display these)
1. **Payroll reclassification pending:** All W2 payroll currently flows to Recruiter Wages/COGS via Gusto. Until Chris executes the Xero recode (Jan 1, 2026 forward), gross margin is distorted. Show a warning banner on any profitability view.
2. **Mid-month pulls incomplete:** Current month shows artificially low OpEx/COGS because payroll hasn't posted. Flag March (or any current month) data.
3. **Balance sheet is point-in-time only:** Coupler.io provides latest snapshot, not historical month-ends.

---

## Data Infrastructure

### Coupler.io Dataflows
| Dataflow | ID | Key Columns |
|----------|-----|------------|
| Xero P&L | `611c062b-87c0-411d-8e05-933d5b23ff19` | col_1=period, col_4=account, col_5=amount |
| Xero Balance Sheet | `c5bbcc9a-1581-447a-b371-57b2a47427b0` | col_1=date, col_6=account, col_7=amount |
| Xero Invoices | `f965bc32-d4ea-4767-9833-4c2b6a2a414a` | col_3=client, col_6=date, col_9=status, col_16=total, col_18=amount_due |
| Loxo Deals | `965d389e-103b-41ef-9a49-60a496fdd6c1` | col_2=deal_name, col_3=amount, col_8=stage, col_9=probability, col_10=owner |
| New Signed Clients | `6951d439-262a-439c-8d85-77caee1c659d` | Client agreements, signed offers, commission reference |
| Xero Accounts | `eb8b71b1-651f-4b18-82d6-3666a65704b6` | Chart of accounts |
| Xero Transactions | `35c2ff4f-cb36-410e-aa1c-f57eca5afa0d` | Only through Dec 31, 2025 |
| Top of Funnel | `901b1d2b-238d-48a9-b041-f3c2d5a07f2f` | Lead/prospect data |
| Notion | `753dbd6b-077b-4039-a0be-8f2851ba35ea` | Notion connection |

### Loxo Pipeline Stages & Probabilities
| Stage | Win Probability |
|-------|----------------|
| Closed Won | 100% |
| Contract Out | 70% |
| Follow Up | 50% |
| Meeting Scheduled | 25% |
| Next Quarter | 20% |
| SQL | 10% |

---

## TMV Brand System

### Colors (use exact hex values)
| Token | Hex | Usage |
|-------|-----|-------|
| Navy Darkest | `#1A2040` | Primary backgrounds, headers |
| Navy Deep | `#2A3150` | Secondary backgrounds |
| Navy | `#3F486B` | Body text, borders |
| Blue | `#6D7AB6` | Labels, secondary UI |
| Gold | `#C9A96E` | CTAs, accents — **use sparingly, never large fills** |
| Gold Light | `#DFC49A` | Hover states |
| Cream | `#F0F0F0` | Page background |
| White | `#FFFFFF` | Cards, content areas |
| Red | `#C75050` | Errors, alerts, AR flags |
| Green | `#5CAA6E` | Success, on-track |
| Amber | `#D4A017` | Warnings, mid-month caveats |

### Typography
- **Headers/Titles/Stat numbers:** `EB Garamond` Bold 700 — serif, authoritative
- **Body/UI/Buttons/Labels:** `Poppins` 300-700 — clean sans-serif
- **NEVER use Inter, Arial, Roboto, or system fonts**

### Design Principles
- Premium executive feel — not startup-trendy, not corporate-stiff
- Navy dominant. Gold accent only.
- Cards: 8px border-radius, 1px cream border, white background

---

## Permission Model (enforced via Supabase RLS)
| Role | Who | Sees |
|------|-----|------|
| `owner` | Brendan | Everything + user management |
| `executive` | Jim | Full financials, pipeline, EOS, board views |
| `sales` | Danny, Doug, Christina | Pipeline, revenue, own scorecard |
| `recruiter` | T'fani, Tyler, Nick B, Kelsi, Nick L | Own scorecard, team metrics |
| `viewer` | Board/investors | Read-only executive summary |

---

## Key Business Rules

### AR Flagging
- **Andersen Plumbing** = always flagged. Historical avg DSO: 122 days.
- Any invoice > 90 days = red status in AR aging view.

### Retainer Credit-Through
- Xero: negative retainer revenue on placement close
- V8 Model: retainer line always gross positive
- **NEVER compare retainer or placement budget vs actuals individually. Only compare TOTAL revenue.**

### Sales Credit ≠ Origination
- Pipeline "owner" in Loxo = comp attribution (who gets commission)
- "Origination source" = marketing channel — separate field

### CEO Bonus
- Jim: 50% of pre-bonus quarterly operating income, paid quarterly

### Contract Staffing (Alleanz)
- Doug Poldrugo leads. 27% burden rate. TMV paid weekly (~7-day DSO).
- Currently $0 revenue — show as placeholder in dashboards.

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
COUPLER_API_KEY=xxx
CRON_SECRET=<random-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment Checklist
1. Supabase project created → save URL + anon key + service role key
2. `schema.sql` run in Supabase SQL Editor
3. `.env.local` filled with all credentials
4. `npm install` succeeds
5. `npm run dev` runs locally at localhost:3000
6. `npx vercel` deploys
7. Environment variables set in Vercel dashboard
8. Initial user roles set: `UPDATE profiles SET role = 'owner' WHERE email LIKE '%brendan%'`
9. Cron verified: GET `/api/cron` with `Authorization: Bearer <CRON_SECRET>`
10. Optional: point `app.themilvet.org` DNS to Vercel
