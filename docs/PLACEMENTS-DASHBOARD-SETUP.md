# Candidate Delivery Dashboard — Auto-Sync Setup (Deploy)

This makes the Notion **Candidate Delivery Dashboard** update itself from the
**Signed Offers** tab — automatically twice a day **and** on demand via a
**🔄 Refresh** button. It reads the Google Sheet directly (a Google service
account) and writes to Notion. No Zapier, no Coupler.

You don't write any code. Three one-time steps, ~15 minutes.

---

## Step 1 — Notion integration (lets the app edit the dashboard)

1. Go to **https://www.notion.so/my-integrations → New integration**. Name it
   `TMV Dashboard Sync`, pick your workspace, submit.
2. Copy the **Internal Integration Secret** (starts with `ntn_`). Save it.
3. Open the **Candidate Delivery Dashboard** page → **•••** → **Connections** →
   **Connect to** → `TMV Dashboard Sync`.

---

## Step 2 — Google service account (lets the app read the sheet)

A service account is a "robot" Google user you share the sheet with — no human
login, no OAuth.

1. Go to **https://console.cloud.google.com** → create (or pick) a project.
2. **APIs & Services → Library →** search **Google Sheets API → Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   Name it `tmv-dashboard`, create, done.
4. Open that service account → **Keys → Add key → Create new key → JSON**. A
   `.json` file downloads. Open it; you'll use two values:
   - `client_email` (looks like `tmv-dashboard@…iam.gserviceaccount.com`)
   - `private_key` (a long `-----BEGIN PRIVATE KEY-----…` block)
5. **Share the sheet with the robot:** open **TMV Closed Deals - Invoice Request
   (Responses)** in Google Sheets → **Share** → paste the `client_email` →
   give **Viewer** → send. (Just like sharing with a coworker.)

---

## Step 3 — Deploy to Vercel

1. **https://vercel.com** → sign in with GitHub → **Add New → Project** → import
   `brendan-ui/tmvapp1`.
2. Open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `NOTION_TOKEN` | the `ntn_…` secret from Step 1 |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from Step 2 |
   | `GOOGLE_PRIVATE_KEY` | the `private_key` from Step 2 (paste the whole block, quotes and all) |
   | `PLACEMENTS_REFRESH_SECRET` | any random string, e.g. `tmv-refresh-9f3k2` |
   | `CRON_SECRET` | any random string |

   *(The Supabase / Coupler variables power other dashboards in this app; leave
   them blank if you're only using the placements dashboard.)*

3. Click **Deploy**. You'll get a URL like `https://tmvapp1.vercel.app`.

---

## Step 4 — Add the Refresh button in Notion

Your refresh link:

```
https://YOUR-APP.vercel.app/api/refresh-placements?key=YOUR_PLACEMENTS_REFRESH_SECRET
```

**Test it** by pasting it in a browser — you should see a green
"✅ Dashboard refreshed" card. Then on the dashboard page: type `/button`,
label it `🔄 Refresh placements`, action **Open link**, paste the link.

---

## How updates flow

- **Automatic:** Vercel Cron hits the endpoint at **10:00 and 18:00 UTC**
  (6 AM / 2 PM Eastern, daylight time) — see `vercel.json`.
- **On demand:** the button, any time.
- Each run reads the Signed Offers tab, upserts every placement into the Notion
  database, and recomputes the top tiles. The live charts update on their own.

**Caveats**
- *Daylight saving:* cron is UTC. In winter the times shift an hour; change the
  hours in `vercel.json` (`0 11` / `0 19`) if you care.
- *Vercel Hobby (free) plan* limits cron frequency; if twice-daily doesn't fire,
  upgrade to Pro or rely on the button + one daily run.

## Safety
- Reads the sheet **only** — never writes to it.
- If the sheet returns fewer than 20 placements (a bad pull), the sync **skips
  archiving** so it can't wipe the database.
- Quarterly goals live in `lib/placements-sync.ts` (`GOALS`). Add a line each
  new quarter (Q3 2026 is already there).
- Only the requested fields sync — **no commission data**.
