import { NextResponse } from 'next/server'
import { syncPlacements } from '@/lib/placements-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const NOTION_PAGE_URL = 'https://www.notion.so/3896130cd1c181afb7c4f275b13d6d31'

/**
 * Refreshes the Candidate Delivery Dashboard from the Signed Offers tab
 * (read directly from Google Sheets via a service account).
 *
 * Two callers:
 *   - The "🔄 Refresh" button on the Notion page → opens this URL with ?key=<secret>.
 *     Returns a small styled HTML page so the user gets visual confirmation.
 *   - Vercel Cron (6 AM / 2 PM) → sends "Authorization: Bearer <CRON_SECRET>".
 *     Returns JSON.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const key = url.searchParams.get('key')
  const authHeader = request.headers.get('authorization')

  const fromButton = !!key && key === process.env.PLACEMENTS_REFRESH_SECRET
  const fromCron = !!authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!fromButton && !fromCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let result
  try {
    result = await syncPlacements()
  } catch (e: any) {
    if (fromCron) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
    return new NextResponse(errorPage(e.message), {
      status: 500,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  if (fromCron) {
    return NextResponse.json(
      { success: result.ok, synced_at: new Date().toISOString(), ...result },
      { status: result.ok ? 200 : 207 }
    )
  }

  return new NextResponse(successPage(result), {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function shell(inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Refresh placements</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Poppins,sans-serif;
       background:#F0F0F0;color:#1A2040;display:flex;min-height:100vh;align-items:center;justify-content:center}
  .card{background:#fff;border:1px solid #e3e3e3;border-radius:12px;max-width:460px;width:90%;
        padding:32px 36px;box-shadow:0 8px 30px rgba(26,32,64,.08)}
  h1{font-family:'EB Garamond',Georgia,serif;font-size:24px;margin:0 0 4px}
  .sub{color:#6D7AB6;font-size:13px;margin:0 0 20px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}
  .stat{background:#F7F8FB;border:1px solid #eee;border-radius:8px;padding:12px 14px}
  .stat .k{font-size:11px;letter-spacing:.04em;color:#6D7AB6;text-transform:uppercase}
  .stat .v{font-family:'EB Garamond',Georgia,serif;font-size:20px;font-weight:700;margin-top:2px}
  .note{font-size:12px;color:#3F486B;margin:14px 0 0;line-height:1.5}
  .err{background:#fbeaea;border:1px solid #C75050;color:#8a2f2f;border-radius:8px;padding:10px 12px;font-size:12px;margin-top:14px}
  a{color:#C9A96E;text-decoration:none;font-weight:600}
  .bar{font-family:ui-monospace,Menlo,monospace;color:#5CAA6E;font-size:13px;margin-top:6px}
</style></head><body><div class="card">${inner}</div></body></html>`
}

function successPage(r: any) {
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
  const width = 20
  const filled = Math.max(0, Math.min(width, Math.round((r.pctGoal / 100) * width)))
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  const errs =
    r.errors && r.errors.length
      ? `<div class="err"><b>Completed with ${r.errors.length} warning(s):</b><br>${r.errors
          .map((e: string) => e.replace(/</g, '&lt;'))
          .join('<br>')}</div>`
      : ''
  return shell(`
    <h1>✅ Dashboard refreshed</h1>
    <p class="sub">${r.quarter} · pulled from the Signed Offers tab</p>
    <div class="grid">
      <div class="stat"><div class="k">Revenue to date</div><div class="v">${money(r.revenue)}</div></div>
      <div class="stat"><div class="k">Deals closed</div><div class="v">${r.deals}</div></div>
      <div class="stat"><div class="k">Avg deal value</div><div class="v">${money(r.avgDeal)}</div></div>
      <div class="stat"><div class="k">% to goal</div><div class="v">${r.pctGoal}%</div></div>
    </div>
    <div class="bar">${bar} ${r.pctGoal}% of ${money(r.goal)}</div>
    <p class="note">Synced ${r.total} placements · ${r.created} added · ${r.updated} updated · ${r.archived} archived.</p>
    ${errs}
    <p class="note">You can close this tab. <a href="${NOTION_PAGE_URL}">↩ Back to the dashboard</a></p>
  `)
}

function errorPage(msg: string) {
  return shell(`
    <h1>⚠️ Refresh failed</h1>
    <p class="sub">Nothing was changed.</p>
    <div class="err">${msg.replace(/</g, '&lt;')}</div>
    <p class="note">Try again in a minute. If it keeps failing, the most likely cause is an expired
    token or a Notion sharing change. <a href="${NOTION_PAGE_URL}">↩ Back to the dashboard</a></p>
  `)
}
