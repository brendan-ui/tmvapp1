import { EB_Garamond, Poppins } from 'next/font/google'
import { fetchSignedOffers, GOALS, type Placement } from '@/lib/placements-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const serif = EB_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-serif' })
const sans = Poppins({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-sans' })

const C = {
  navyDarkest: '#1A2040',
  navyDeep: '#2A3150',
  navy: '#3F486B',
  blue: '#6D7AB6',
  gold: '#C9A96E',
  goldLight: '#DFC49A',
  cream: '#F0F0F0',
  white: '#FFFFFF',
  green: '#5CAA6E',
  red: '#C75050',
  amber: '#D4A017',
}

const usd = (n: number) => '$' + Math.round(n || 0).toLocaleString('en-US')
const usdK = (n: number) => '$' + Math.round((n || 0) / 1000).toLocaleString('en-US') + 'K'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function quarterRange(q: string) {
  const n = Number(q.split('Q')[1])
  const s = (n - 1) * 3
  return `${MONTHS[s]} 1 – ${MONTHS[s + 2]} ${[31, 30, 30, 31][n - 1]}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const key = typeof searchParams.key === 'string' ? searchParams.key : ''
  const secret = process.env.PLACEMENTS_REFRESH_SECRET
  if (!secret || key !== secret) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 48, color: C.navy, background: C.cream, minHeight: '100vh' }}>
        <h1>Access key required</h1>
        <p>Add <code>?key=YOUR_SECRET</code> to this URL to view the dashboard.</p>
      </main>
    )
  }

  let placements: Placement[] = []
  let loadError = ''
  try {
    placements = await fetchSignedOffers()
  } catch (e: any) {
    loadError = e?.message || 'Could not load data'
  }

  // Pick the quarter to show: current quarter if it has deals, else the most recent one with data.
  const now = new Date()
  const curQ = `${now.getFullYear()} Q${Math.ceil((now.getMonth() + 1) / 3)}`
  const qpresent = Array.from(new Set(placements.map((p) => p.quarter).filter(Boolean))) as string[]
  qpresent.sort((a, b) => {
    const [ay, aq] = [Number(a.slice(0, 4)), Number(a.split('Q')[1])]
    const [by, bq] = [Number(b.slice(0, 4)), Number(b.split('Q')[1])]
    return by - ay || bq - aq
  })
  const targetQ = placements.some((p) => p.quarter === curQ) ? curQ : qpresent[0] || curQ

  const q = placements.filter((p) => p.quarter === targetQ)
  const withVal = q.filter((p) => (p.dealValue || 0) > 0)
  const revenue = q.reduce((s, p) => s + (p.dealValue || 0), 0)
  const deals = q.length
  const avg = withVal.length ? revenue / withVal.length : 0
  const goalCfg = GOALS[targetQ] || { goal: 0, stretch: 0 }
  const pct = goalCfg.goal ? Math.round((revenue / goalCfg.goal) * 100) : 0
  const pctStretch = goalCfg.stretch ? Math.round((revenue / goalCfg.stretch) * 100) : 0

  // Last 30 days
  const cutoff = new Date(now.getTime() - 30 * 86400000)
  const last30 = placements.filter((p) => p.offerDate && new Date(p.offerDate) >= cutoff && (p.dealValue || 0) >= 0)
  const last30rev = last30.reduce((s, p) => s + (p.dealValue || 0), 0)

  // Recruiter leaderboard (target quarter)
  const lbMap = new Map<string, { deals: number; value: number }>()
  for (const p of q) {
    const r = p.recruiter || 'Unassigned'
    const cur = lbMap.get(r) || { deals: 0, value: 0 }
    cur.deals += 1
    cur.value += p.dealValue || 0
    lbMap.set(r, cur)
  }
  const leaderboard = Array.from(lbMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)
  const lbMax = Math.max(1, ...leaderboard.map((l) => l.value))

  // Monthly trend (year of the target quarter)
  const year = Number(targetQ.slice(0, 4))
  const monthly = MONTHS.map((m, i) => {
    const pre = `${year}-${String(i + 1).padStart(2, '0')}`
    const rows = placements.filter((p) => p.offerDate?.startsWith(pre))
    return { month: m, value: rows.reduce((s, p) => s + (p.dealValue || 0), 0), deals: rows.length }
  }).filter((m) => m.deals > 0)
  const monMax = Math.max(1, ...monthly.map((m) => m.value))

  // Placement cards (target quarter, by value desc, nulls last)
  const cards = [...q].sort((a, b) => (b.dealValue ?? -1) - (a.dealValue ?? -1))

  const gaugeMax = Math.max(goalCfg.stretch * 1.06, revenue * 1.04, 1)
  const fillPct = Math.min(100, (revenue / gaugeMax) * 100)
  const goalMark = (goalCfg.goal / gaugeMax) * 100
  const stretchMark = (goalCfg.stretch / gaugeMax) * 100
  const overGoal = revenue >= goalCfg.goal

  const asOf = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const css = `
    :root { --font-serif:${serif.style.fontFamily}; --font-sans:${sans.style.fontFamily}; }
    * { box-sizing: border-box; }
    .tmv { font-family: var(--font-sans); background: ${C.cream}; color: ${C.navy};
      min-height: 100vh; margin: 0; padding: 28px clamp(16px,4vw,40px);
      font-weight: 400; -webkit-font-smoothing: antialiased; }
    .wrap { max-width: 1140px; margin: 0 auto; }
    .serif { font-family: var(--font-serif); }
    .eyebrow { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: ${C.blue}; font-weight: 600; }
    h1.title { font-family: var(--font-serif); font-weight: 700; color: ${C.navyDarkest};
      font-size: clamp(26px,4vw,38px); margin: 4px 0 0; letter-spacing: -.01em; }
    .sub { color: ${C.blue}; font-size: 14px; margin-top: 4px; }
    .num { font-variant-numeric: tabular-nums; }
    /* hero goal */
    .hero { background: linear-gradient(135deg, ${C.navyDarkest}, ${C.navyDeep}); color: ${C.white};
      border-radius: 14px; padding: 26px 30px; margin: 22px 0; box-shadow: 0 10px 34px rgba(26,32,64,.16); }
    .hero-top { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    .hero-rev { font-family: var(--font-serif); font-weight: 700; font-size: clamp(34px,6vw,54px); line-height: 1; }
    .hero-label { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: ${C.goldLight}; font-weight: 600; }
    .pctpill { font-family: var(--font-serif); font-weight: 700; font-size: 30px;
      color: ${overGoal ? C.gold : C.white}; }
    .track { position: relative; height: 14px; border-radius: 8px; background: rgba(255,255,255,.14);
      margin-top: 20px; overflow: visible; }
    .fill { height: 100%; border-radius: 8px; width: ${fillPct}%;
      background: ${overGoal ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : C.blue};
      animation: grow 1s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes grow { from { width: 0; } }
    @media (prefers-reduced-motion: reduce) { .fill { animation: none; } }
    .mark { position: absolute; top: -6px; bottom: -6px; width: 2px; background: rgba(255,255,255,.55); }
    .mark span { position: absolute; top: -18px; transform: translateX(-50%); font-size: 10px;
      letter-spacing: .04em; color: rgba(255,255,255,.8); white-space: nowrap; }
    /* grids */
    .tiles { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 14px; }
    .card { background: ${C.white}; border: 1px solid #e6e4dd; border-radius: 8px; padding: 18px 20px; }
    .tile .k { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: ${C.blue}; font-weight: 600; }
    .tile .v { font-family: var(--font-serif); font-weight: 700; color: ${C.navyDarkest};
      font-size: 30px; margin-top: 6px; }
    .tile .s { font-size: 12px; color: ${C.navy}; margin-top: 2px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    @media (max-width: 760px) { .two { grid-template-columns: 1fr; } }
    .sect-h { font-family: var(--font-serif); font-weight: 600; color: ${C.navyDarkest}; font-size: 18px; margin: 0 0 14px; }
    /* leaderboard */
    .lb-row { display: grid; grid-template-columns: 92px 1fr auto; align-items: center; gap: 10px; margin-bottom: 12px; }
    .lb-name { font-weight: 600; font-size: 13px; color: ${C.navyDarkest}; }
    .lb-bar { height: 10px; border-radius: 6px; background: #eceae3; overflow: hidden; }
    .lb-bar > i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, ${C.navy}, ${C.blue}); }
    .lb-val { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; color: ${C.navyDarkest}; }
    .lb-deals { font-size: 11px; color: ${C.blue}; }
    /* monthly */
    .bars { display: flex; align-items: flex-end; gap: 10px; height: 150px; padding-top: 8px; }
    .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
    .bar > .col { width: 100%; max-width: 34px; border-radius: 5px 5px 0 0;
      background: linear-gradient(180deg, ${C.gold}, ${C.goldLight}); }
    .bar > .ml { font-size: 11px; color: ${C.blue}; font-weight: 500; }
    .bar > .mv { font-size: 10px; color: ${C.navy}; font-variant-numeric: tabular-nums; }
    /* placement cards */
    .pcards { display: grid; grid-template-columns: repeat(auto-fill,minmax(252px,1fr)); gap: 14px; margin-top: 14px; }
    .pcard { background: ${C.white}; border: 1px solid #e6e4dd; border-radius: 8px; padding: 16px 18px;
      display: flex; flex-direction: column; gap: 10px; }
    .pcard:hover { border-color: ${C.gold}; }
    .pc-name { font-family: var(--font-serif); font-weight: 700; color: ${C.navyDarkest}; font-size: 17px; }
    .pc-client { font-size: 13px; color: ${C.navy}; margin-top: -4px; }
    .pc-val { font-family: var(--font-serif); font-weight: 700; font-size: 22px; color: ${C.navyDarkest};
      font-variant-numeric: tabular-nums; }
    .pc-val.pending { color: ${C.amber}; font-size: 15px; font-family: var(--font-sans); font-weight: 600; }
    .pc-meta { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: ${C.cream};
      color: ${C.navy}; border: 1px solid #e6e4dd; }
    .chip b { color: ${C.navyDarkest}; font-weight: 600; }
    .pc-foot { font-size: 11px; color: ${C.blue}; border-top: 1px solid #efede6; padding-top: 8px;
      font-variant-numeric: tabular-nums; }
    .foot { color: ${C.blue}; font-size: 12px; margin-top: 26px; line-height: 1.6; }
    .err { background: #fbeaea; border: 1px solid ${C.red}; color: #8a2f2f; padding: 14px 16px; border-radius: 8px; }
  `

  return (
    <main className={`tmv ${serif.variable} ${sans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="wrap">
        <div className="eyebrow">The Military Veteran · Candidate Delivery</div>
        <h1 className="title">Placement Performance</h1>
        <div className="sub num">
          {targetQ} · {quarterRange(targetQ)} &nbsp;•&nbsp; {deals} placements &nbsp;•&nbsp; as of {asOf}
        </div>

        {loadError ? (
          <div className="err" style={{ marginTop: 20 }}>
            Couldn&apos;t load the sheet: {loadError}
          </div>
        ) : null}

        {/* Goal hero */}
        <section className="hero">
          <div className="hero-top">
            <div>
              <div className="hero-label">Revenue to date</div>
              <div className="hero-rev num">{usd(revenue)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="hero-label">of {usdK(goalCfg.goal)} goal</div>
              <div className="pctpill num">{pct}%</div>
            </div>
          </div>
          <div className="track">
            <div className="fill" />
            <div className="mark" style={{ left: `${goalMark}%` }}>
              <span>Goal {usdK(goalCfg.goal)}</span>
            </div>
            <div className="mark" style={{ left: `${stretchMark}%` }}>
              <span>Stretch {usdK(goalCfg.stretch)}</span>
            </div>
          </div>
          <div style={{ marginTop: 22, fontSize: 13, color: C.goldLight }} className="num">
            {overGoal ? '✓ Past goal' : `${usd(goalCfg.goal - revenue)} to goal`} &nbsp;·&nbsp; {pctStretch}% of stretch
          </div>
        </section>

        {/* Stat tiles */}
        <div className="tiles">
          <div className="card tile">
            <div className="k">Deals closed</div>
            <div className="v num">{deals}</div>
            <div className="s">{withVal.length} with billable value</div>
          </div>
          <div className="card tile">
            <div className="k">Avg deal value</div>
            <div className="v num">{usd(avg)}</div>
            <div className="s">per revenue-generating placement</div>
          </div>
          <div className="card tile">
            <div className="k">Last 30 days</div>
            <div className="v num">{usd(last30rev)}</div>
            <div className="s">{last30.length} placements</div>
          </div>
          <div className="card tile">
            <div className="k">Top recruiter</div>
            <div className="v" style={{ fontSize: 24 }}>{leaderboard[0]?.name || '—'}</div>
            <div className="s num">{leaderboard[0] ? `${leaderboard[0].deals} deals · ${usd(leaderboard[0].value)}` : ''}</div>
          </div>
        </div>

        {/* Leaderboard + Monthly trend */}
        <div className="two">
          <div className="card">
            <h2 className="sect-h">Recruiter leaderboard · {targetQ}</h2>
            {leaderboard.map((l) => (
              <div className="lb-row" key={l.name}>
                <div className="lb-name">{l.name}</div>
                <div className="lb-bar">
                  <i style={{ width: `${Math.max(4, (l.value / lbMax) * 100)}%` }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="lb-val num">{usd(l.value)}</div>
                  <div className="lb-deals num">{l.deals} {l.deals === 1 ? 'deal' : 'deals'}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 className="sect-h">Monthly revenue · {year}</h2>
            <div className="bars">
              {monthly.map((m) => (
                <div className="bar" key={m.month}>
                  <div className="mv num">{usdK(m.value)}</div>
                  <div className="col" style={{ height: `${Math.max(4, (m.value / monMax) * 100)}%` }} />
                  <div className="ml">{m.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Placement cards */}
        <h2 className="sect-h" style={{ marginTop: 26 }}>Placements · {targetQ}</h2>
        <div className="pcards">
          {cards.map((p, i) => (
            <div className="pcard" key={i}>
              <div>
                <div className="pc-name">{p.candidate}</div>
                <div className="pc-client">{p.client}</div>
              </div>
              {p.dealValue != null ? (
                <div className="pc-val num">{usd(p.dealValue)}</div>
              ) : (
                <div className="pc-val pending">Billable pending</div>
              )}
              <div className="pc-meta">
                {p.recruiter ? <span className="chip">Recruiter <b>{p.recruiter}</b></span> : null}
                {p.sourcer ? <span className="chip">Sourcer <b>{p.sourcer}</b></span> : null}
                {p.salesRep ? <span className="chip">Sales <b>{p.salesRep}</b></span> : null}
              </div>
              <div className="pc-foot num">
                {p.totalComp ? `${usd(p.totalComp)} total comp` : ''}{p.offerDate ? ` · signed ${p.offerDate}` : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="foot">
          Live from the <b>Signed Offers</b> tab of TMV Closed Deals · Deal Value = Billable Total ·
          updates automatically each time this page loads.
        </div>
      </div>
    </main>
  )
}
