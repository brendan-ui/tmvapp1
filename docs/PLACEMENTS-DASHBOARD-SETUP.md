# Candidate Delivery Dashboard — Refresh Button + Auto-Sync Setup

This wires up two things for the Notion **Candidate Delivery Dashboard**:

1. A **🔄 Refresh button** on the Notion page you can tap any time.
2. An **automatic sync** that runs every day at **6 AM and 2 PM**.

Both run the same endpoint (`/api/refresh-placements`), which reads the **Signed
Offers** tab (through your existing Coupler.io connection — no Google login
needed) and updates the Notion database + the KPI tiles at the top of the page.

You don't need to write any code. There are three one-time steps. Budget ~15 minutes.

---

## Step 1 — Create a Notion integration (so the app can edit the page)

1. Go to **https://www.notion.so/my-integrations** → **New integration**.
2. Name it `TMV Dashboard Sync`, pick your workspace, submit.
3. Copy the **Internal Integration Secret** (starts with `secret_` or `ntn_`). Save it for Step 2.
4. Open the **Candidate Delivery Dashboard** page in Notion → top-right **•••** menu
   → **Connections** → **Connect to** → choose `TMV Dashboard Sync`.
   *(This is what gives the app permission to read and update the page + database.)*

---

## Step 2 — Deploy the app to Vercel

1. Go to **https://vercel.com** and sign in with GitHub.
2. **Add New… → Project →** import the `brendan-ui/tmvapp1` repo.
3. Before clicking Deploy, open **Environment Variables** and add these:

   | Name | Value |
   |------|-------|
   | `COUPLER_API_KEY` | your existing Coupler.io API key |
   | `NOTION_TOKEN` | the secret from Step 1 |
   | `PLACEMENTS_REFRESH_SECRET` | any random string you make up, e.g. `tmv-refresh-9f3k2` |
   | `CRON_SECRET` | any random string (used by the scheduled job) |

   *(The Supabase variables in `.env.example` are only needed for the other
   dashboards in this app — you can leave them blank if you're only using the
   placements dashboard, though the build is happiest if they're present.)*

4. Click **Deploy**. When it finishes you'll have a URL like
   `https://tmvapp1.vercel.app`.

---

## Step 3 — Add the Refresh button in Notion

Your refresh link is:

```
https://YOUR-APP.vercel.app/api/refresh-placements?key=YOUR_PLACEMENTS_REFRESH_SECRET
```

Replace `YOUR-APP` with your Vercel domain and `YOUR_PLACEMENTS_REFRESH_SECRET`
with the value you set above. **Test it first** by pasting it into a browser —
you should see a green "✅ Dashboard refreshed" card.

Then add the button:

1. On the dashboard page, type `/button` and press Enter.
2. Label it `🔄 Refresh placements`.
3. Under **Add action**, choose **Open link** and paste the refresh link above.
4. Save. Tapping it now opens a confirmation tab and updates the page.

---

## How the automatic sync works

`vercel.json` already schedules the endpoint:

- `0 10 * * *` → 10:00 UTC (**6 AM Eastern**, daylight time)
- `0 18 * * *` → 18:00 UTC (**2 PM Eastern**, daylight time)

Vercel Cron automatically sends your `CRON_SECRET`, so no button key is needed
for the scheduled runs.

**Two caveats worth knowing:**

- **Daylight saving:** Vercel cron is in UTC and can't follow time zones. In
  winter (Eastern Standard Time) these fire at 5 AM / 1 PM instead of 6 / 2.
  If that matters, change the hours in `vercel.json` to `0 11` and `0 19`.
- **Vercel Hobby (free) plan** limits how many/often crons run. If the schedule
  doesn't trigger twice a day, you're on Hobby — either upgrade to Pro or keep
  using the button + the one allowed daily run.

---

## What gets synced (and what doesn't)

Per placement: **Candidate, Client, Recruiter, Sourcer, Sales Rep / Affiliate,
Deal Value (Billable Total / Column AC), and candidate comp (Base / Bonus /
Other / Total)**. The top tiles recompute **revenue to date, deals closed, avg
deal value, and % to goal** for the current quarter.

**No commission data is ever pulled** (no commission %, splits, or payouts).

Quarterly goals live in `lib/placements-sync.ts` (`GOALS`): Q2 2026 = \$800K /
\$880K stretch, Q3 2026 = \$1.2M / \$1.32M stretch. Add a line there each new
quarter.

### Safety

- If Coupler returns fewer than 20 placements (a sign of a bad pull), the sync
  **skips archiving** so it can never wipe the database.
- The spreadsheet is **only ever read**, never written.
- The refresh link contains a secret; treat it like a password. To rotate it,
  change `PLACEMENTS_REFRESH_SECRET` in Vercel and update the Notion button.
