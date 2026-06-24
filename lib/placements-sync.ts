/**
 * Placements sync — keeps the Notion "Candidate Delivery Dashboard" up to date.
 *
 * Reads the **Signed Offers** tab of "TMV Closed Deals" (via the existing
 * Coupler.io "New Signed Client" dataflow — no Google credentials required),
 * then:
 *   1. upserts each placement into the Notion "TMV Placements" database, and
 *   2. refreshes the KPI tiles + goal progress bar on the dashboard page.
 *
 * Triggered two ways (see app/api/refresh-placements/route.ts):
 *   - the "🔄 Refresh" button on the Notion page, and
 *   - the scheduled Vercel cron (6 AM / 2 PM).
 *
 * Only the fields the delivery team asked for are synced — NO commission data.
 */

import { GoogleAuth } from 'google-auth-library'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

// IDs default to the live dashboard created for TMV; override via env if needed.
const SHEET_ID = process.env.SIGNED_OFFERS_SHEET_ID || '15tl16CvD3Vy5ls0L4Yc2NffsZGBcjUZLml1PzndS8c4'
const SHEET_TAB = process.env.SIGNED_OFFERS_TAB || 'Signed Offers'
const NOTION_DB_ID = process.env.NOTION_PLACEMENTS_DB_ID || 'cc62dc691dde44bfbaf91d5b7f2217e8'
const NOTION_PAGE_ID = process.env.NOTION_DASHBOARD_PAGE_ID || '3896130c-d1c1-81af-b7c4-f275b13d6d31'

// Quarterly goals (base, stretch). Add a row here each quarter.
export const GOALS: Record<string, { goal: number; stretch: number }> = {
  '2026 Q2': { goal: 800_000, stretch: 880_000 },
  '2026 Q3': { goal: 1_200_000, stretch: 1_320_000 },
}

// Safety floor: if Coupler returns fewer than this many placements, treat the
// pull as bad and DON'T archive anything (prevents wiping the DB on a bad run).
const MIN_SANE_ROWS = 20

export interface Placement {
  candidate: string
  client: string
  recruiter: string | null
  sourcer: string | null
  salesRep: string | null
  dealValue: number | null
  base: number | null
  bonus: number | null
  other: number | null
  totalComp: number | null
  offerDate: string | null // ISO yyyy-mm-dd
  quarter: string | null
}

export interface SyncResult {
  ok: boolean
  created: number
  updated: number
  archived: number
  total: number
  quarter: string
  revenue: number
  deals: number
  avgDeal: number
  goal: number
  stretch: number
  pctGoal: number
  errors: string[]
}

// ---------- value coercion (Coupler returns mixed/quoted values) ----------

function asStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  let t = String(v).trim()
  if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1).trim()
  return t === '' ? null : t
}

function asNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const t = String(v).replace(/^"|"$/g, '').replace(/[$,]/g, '').trim()
  if (t === '') return null
  const f = parseFloat(t)
  return Number.isNaN(f) ? null : f
}

// Real person names only — drop the "NO X COMMISSION" / "NONE" placeholders.
function person(v: unknown, ...bad: string[]): string | null {
  const s = asStr(v)
  if (!s) return null
  const up = s.toUpperCase()
  if (up === 'NONE') return null
  if (bad.some((b) => up.includes(b))) return null
  return s
}

function toIsoDate(v: unknown): string | null {
  const s = asStr(v)
  if (!s) return null
  const datePart = s.split(' ')[0] // "6/19/2026 10:28:00" -> "6/19/2026"
  const m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, mm, dd, yyyy] = m
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  const iso = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return iso ? datePart : null
}

function quarterOf(iso: string | null): string | null {
  if (!iso) return null
  const [y, m] = iso.split('-').map(Number)
  return `${y} Q${Math.floor((m - 1) / 3) + 1}`
}

// ---------- 1. read the Signed Offers tab from Google Sheets ----------

// Column positions in the "Signed Offers" tab (0-based):
//   0 Timestamp · 2 Client · 4 Candidate · 6 Base · 7 Bonus · 8 Other ·
//   9 Total Comp for Fee · 11 Sourcer · 12 Recruiter · 19 Sales Credit ·
//   25 Total First-Year Comp · 28 Billable Total (Column AC = Deal Value)

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Could not obtain a Google access token (check service account env vars)')
  return token
}

export async function fetchSignedOffers(): Promise<Placement[]> {
  const token = await getAccessToken()
  const range = encodeURIComponent(`${SHEET_TAB}!A1:AS5000`)
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}` +
    `?valueRenderOption=FORMATTED_VALUE`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) throw new Error(`Google Sheets API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { values?: unknown[][] }
  const rows = json.values || []

  const out: Placement[] = []
  for (let i = 1; i < rows.length; i++) {
    // skip header row
    const r = rows[i]
    const candidate = asStr(r[4])
    const client = asStr(r[2])
    const offerDate = toIsoDate(r[0])
    if (!candidate && !client && !offerDate) continue // blank/spacer row

    out.push({
      candidate: candidate || '(no name)',
      client: client || '',
      recruiter: person(r[12], 'NO RECRUITER'),
      sourcer: person(r[11], 'NO SOURC'),
      salesRep: person(r[19], 'NO ', 'COMMISSION'),
      dealValue: asNum(r[28]), // Billable Total (Column AC)
      base: asNum(r[6]),
      bonus: asNum(r[7]),
      other: asNum(r[8]),
      totalComp: asNum(r[25]) ?? asNum(r[9]),
      offerDate,
      quarter: quarterOf(offerDate),
    })
  }
  return out
}

// ---------- Notion REST helpers ----------

function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

async function notion(path: string, init?: RequestInit) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: { ...notionHeaders(), ...(init?.headers || {}) },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion ${res.status} on ${path}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

const keyOf = (candidate: string, client: string, offerDate: string | null) =>
  `${candidate}||${client}||${offerDate ?? ''}`

function buildProps(p: Placement) {
  return {
    Candidate: { title: [{ text: { content: p.candidate } }] },
    Client: { rich_text: p.client ? [{ text: { content: p.client } }] : [] },
    Recruiter: p.recruiter ? { select: { name: p.recruiter } } : { select: null },
    Sourcer: p.sourcer ? { select: { name: p.sourcer } } : { select: null },
    'Sales Rep / Affiliate': p.salesRep ? { select: { name: p.salesRep } } : { select: null },
    'Deal Value': { number: p.dealValue },
    'Base Comp': { number: p.base },
    'Bonus Comp': { number: p.bonus },
    'Other Comp': { number: p.other },
    'Total Comp': { number: p.totalComp },
    'Offer Date': p.offerDate ? { date: { start: p.offerDate } } : { date: null },
    Quarter: p.quarter ? { select: { name: p.quarter } } : { select: null },
  }
}

interface ExistingPage {
  id: string
  sig: string
  archived: boolean
}

async function queryAllPages(): Promise<Map<string, ExistingPage>> {
  const map = new Map<string, ExistingPage>()
  let cursor: string | undefined
  do {
    const body: Record<string, unknown> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor
    const res: any = await notion(`/databases/${NOTION_DB_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    for (const page of res.results) {
      const pr = page.properties
      const candidate = pr.Candidate?.title?.[0]?.plain_text || '(no name)'
      const client = pr.Client?.rich_text?.[0]?.plain_text || ''
      const offerDate = pr['Offer Date']?.date?.start || null
      const sig = JSON.stringify([
        pr.Recruiter?.select?.name ?? null,
        pr.Sourcer?.select?.name ?? null,
        pr['Sales Rep / Affiliate']?.select?.name ?? null,
        pr['Deal Value']?.number ?? null,
        pr['Base Comp']?.number ?? null,
        pr['Bonus Comp']?.number ?? null,
        pr['Other Comp']?.number ?? null,
        pr['Total Comp']?.number ?? null,
        pr.Quarter?.select?.name ?? null,
      ])
      map.set(keyOf(candidate, client, offerDate), { id: page.id, sig, archived: page.archived })
    }
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return map
}

function sigOf(p: Placement) {
  return JSON.stringify([
    p.recruiter,
    p.sourcer,
    p.salesRep,
    p.dealValue,
    p.base,
    p.bonus,
    p.other,
    p.totalComp,
    p.quarter,
  ])
}

// ---------- KPI tile + progress bar refresh ----------

const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function quarterRange(quarter: string) {
  const q = Number(quarter.split('Q')[1])
  const startM = (q - 1) * 3
  const endM = startM + 2
  const lastDay = [31, q === 1 ? 31 : 30, 30, 31][q - 1] // Mar31, Jun30, Sep30, Dec31
  return `${MONTHS[startM]} 1 – ${MONTHS[endM]} ${lastDay}`
}

function progressBar(pct: number, width = 20) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const rt = (content: string, opts: { bold?: boolean; code?: boolean } = {}) => ({
  type: 'text',
  text: { content },
  annotations: { bold: !!opts.bold, code: !!opts.code },
})

// Recursively collect callout + heading_2 blocks (KPIs live inside columns).
async function collectBlocks(
  blockId: string,
  acc: { id: string; type: string; text: string }[] = [],
  depth = 0
): Promise<{ id: string; type: string; text: string }[]> {
  if (depth > 4) return acc
  let cursor: string | undefined
  do {
    const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : `?page_size=100`
    const res: any = await notion(`/blocks/${blockId}/children${qs}`)
    for (const b of res.results) {
      if (b.type === 'callout' || b.type === 'heading_2') {
        const text = (b[b.type]?.rich_text || []).map((r: any) => r.plain_text).join('')
        acc.push({ id: b.id, type: b.type, text })
      }
      if (b.has_children && (b.type === 'column_list' || b.type === 'column')) {
        await collectBlocks(b.id, acc, depth + 1)
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return acc
}

async function refreshKpiBlocks(r: SyncResult, errors: string[]) {
  let blocks
  try {
    blocks = await collectBlocks(NOTION_PAGE_ID)
  } catch (e: any) {
    errors.push(`KPI read: ${e.message}`)
    return
  }

  const pctStretch = Math.round((r.revenue / r.stretch) * 100)
  const range = quarterRange(r.quarter)

  const updates: { match: (t: string) => boolean; type: string; payload: any }[] = [
    {
      match: (t) => t.includes('This Quarter') && t.includes('Q'),
      type: 'heading_2',
      payload: { rich_text: [rt(`📊 This Quarter — ${r.quarter} · ${range}`)] },
    },
    {
      match: (t) => /REVENUE TO DATE/i.test(t),
      type: 'callout',
      payload: { rich_text: [rt('REVENUE TO DATE\n', { bold: true }), rt(fmtMoney(r.revenue), { bold: true })] },
    },
    {
      match: (t) => /DEALS CLOSED/i.test(t),
      type: 'callout',
      payload: { rich_text: [rt('DEALS CLOSED\n', { bold: true }), rt(String(r.deals), { bold: true })] },
    },
    {
      match: (t) => /AVG DEAL VALUE/i.test(t),
      type: 'callout',
      payload: { rich_text: [rt('AVG DEAL VALUE\n', { bold: true }), rt(fmtMoney(r.avgDeal), { bold: true })] },
    },
    {
      match: (t) => /Pacing|quarterly goal/i.test(t),
      type: 'callout',
      payload: {
        rich_text: [
          rt(`Pacing to the ${fmtMoney(r.goal)} quarterly goal  ·  stretch goal ${fmtMoney(r.stretch)} → ${pctStretch}%\n`, {
            bold: true,
          }),
          rt(progressBar(r.pctGoal), { code: true }),
          rt(`  ${r.pctGoal}%`, { bold: true }),
        ],
      },
    },
  ]

  for (const u of updates) {
    const block = blocks.find((b) => b.type === u.type && u.match(b.text))
    if (!block) continue
    try {
      await notion(`/blocks/${block.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [u.type]: u.payload }),
      })
    } catch (e: any) {
      errors.push(`KPI ${u.type}: ${e.message}`)
    }
  }
}

// ---------- main entry point ----------

export async function syncPlacements(): Promise<SyncResult> {
  const errors: string[] = []
  const placements = await fetchSignedOffers()

  // Current quarter from the server clock.
  const now = new Date()
  const currentQuarter = `${now.getUTCFullYear()} Q${Math.floor(now.getUTCMonth() / 3) + 1}`
  const { goal, stretch } = GOALS[currentQuarter] || { goal: 0, stretch: 0 }

  const existing = await queryAllPages()
  const seen = new Set<string>()
  let created = 0
  let updated = 0

  for (const p of placements) {
    const key = keyOf(p.candidate, p.client, p.offerDate)
    seen.add(key)
    const props = buildProps(p)
    const prev = existing.get(key)
    try {
      if (!prev) {
        await notion('/pages', {
          method: 'POST',
          body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties: props }),
        })
        created++
      } else if (prev.archived || prev.sig !== sigOf(p)) {
        await notion(`/pages/${prev.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ archived: false, properties: props }),
        })
        updated++
      }
    } catch (e: any) {
      errors.push(`${p.candidate}: ${e.message}`)
    }
  }

  // Archive placements that disappeared from the sheet — only if the pull looks sane.
  let archived = 0
  if (placements.length >= MIN_SANE_ROWS) {
    for (const [key, page] of Array.from(existing.entries())) {
      if (!seen.has(key) && !page.archived) {
        try {
          await notion(`/pages/${page.id}`, { method: 'PATCH', body: JSON.stringify({ archived: true }) })
          archived++
        } catch (e: any) {
          errors.push(`archive: ${e.message}`)
        }
      }
    }
  } else {
    errors.push(`Only ${placements.length} rows from Coupler — skipped archive for safety.`)
  }

  // KPI math for the current quarter.
  const q = placements.filter((p) => p.quarter === currentQuarter)
  const withVal = q.filter((p) => (p.dealValue || 0) > 0)
  const revenue = q.reduce((s, p) => s + (p.dealValue || 0), 0)
  const deals = q.length
  const avgDeal = withVal.length ? revenue / withVal.length : 0
  const pctGoal = goal ? Math.round((revenue / goal) * 100) : 0

  const result: SyncResult = {
    ok: errors.length === 0,
    created,
    updated,
    archived,
    total: placements.length,
    quarter: currentQuarter,
    revenue,
    deals,
    avgDeal,
    goal,
    stretch,
    pctGoal,
    errors,
  }

  await refreshKpiBlocks(result, errors)
  result.ok = errors.length === 0
  return result
}
