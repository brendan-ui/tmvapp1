import { getServerSession } from 'next-auth/next'
import { EB_Garamond, Poppins } from 'next/font/google'
import { authOptions, ALLOWED_DOMAIN } from '@/lib/auth'
import { fetchSignedOffers, GOALS, type Placement } from '@/lib/placements-sync'
import SignInButton from './sign-in-button'

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
const usdK = (n: number) => (n ? '$' + Math.round((n || 0) / 1000).toLocaleString('en-US') + 'K' : '—')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function quarterRange(qy: string) {
  const n = Number(qy.split('Q')[1])
  const s = (n - 1) * 3
  return `${MONTHS[s]} 1 – ${MONTHS[s + 2]} ${[31, 30, 30, 31][n - 1]}, ${qy.slice(0, 4)}`
}

function SignInScreen({ denied }: { denied: boolean }) {
  return (
    <main
      className={`${serif.variable} ${sans.variable}`}
      style={{
        minHeight: '100vh',
        margin: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        fontFamily: 'var(--font-sans)',
        color: C.cream,
        background:
          `radial-gradient(900px 500px at 50% -10%, rgba(201,169,110,.12), transparent 60%), linear-gradient(160deg, ${C.navyDarkest}, #161B33 55%, ${C.navyDarkest})`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))',
          border: '1px solid rgba(201,169,110,.2)',
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 18px 50px rgba(0,0,0,.34)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 18px',
            border: `1.5px solid ${C.gold}`,
            borderRadius: 11,
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            fontSize: 21,
            color: C.gold,
          }}
        >
          TMV
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 24, color: C.white, margin: '0 0 6px' }}>
          Candidate Delivery Dashboard
        </h1>
        <p style={{ color: C.blue, fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
          Sign in with your The Military Veteran Google account to continue.
        </p>
        {denied ? (
          <p
            style={{
              color: '#f3c9c9',
              background: 'rgba(199,80,80,.16)',
              border: `1px solid ${C.red}`,
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 13,
              margin: '0 0 18px',
            }}
          >
            That account isn&apos;t authorized. Use your <b>@{ALLOWED_DOMAIN}</b> company account.
          </p>
        ) : null}
        <SignInButton />
        <p style={{ color: C.navy, fontSize: 12, marginTop: 22 }}>
          Access is restricted to @{ALLOWED_DOMAIN} accounts.
        </p>
      </div>
    </main>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase() || ''
  const authed = !!email && email.endsWith('@' + ALLOWED_DOMAIN)
  if (!authed) {
    return <SignInScreen denied={typeof searchParams.error === 'string'} />
  }

  let placements: Placement[] = []
  let loadError = ''
  try {
    placements = await fetchSignedOffers()
  } catch (e: any) {
    loadError = e?.message || 'Could not load data'
  }

  const now = new Date()
  const curQ = `${now.getFullYear()} Q${Math.ceil((now.getMonth() + 1) / 3)}`
  const qpresent = (Array.from(new Set(placements.map((p) => p.quarter).filter(Boolean))) as string[]).sort((a, b) => {
    return Number(b.slice(0, 4)) - Number(a.slice(0, 4)) || Number(b.split('Q')[1]) - Number(a.split('Q')[1])
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

  const cutoff = new Date(now.getTime() - 30 * 86400000)
  const last30 = placements.filter((p) => p.offerDate && new Date(p.offerDate) >= cutoff)
  const last30rev = last30.reduce((s, p) => s + (p.dealValue || 0), 0)
  const ytdRev = placements
    .filter((p) => p.offerDate?.startsWith(String(now.getFullYear())))
    .reduce((s, p) => s + (p.dealValue || 0), 0)

  const lbMap = new Map<string, { deals: number; value: number }>()
  for (const p of q) {
    const r = p.recruiter || 'Unassigned'
    const cur = lbMap.get(r) || { deals: 0, value: 0 }
    cur.deals += 1
    cur.value += p.dealValue || 0
    lbMap.set(r, cur)
  }
  const leaderboard = Array.from(lbMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value)
  const lbMax = Math.max(1, ...leaderboard.map((l) => l.value))

  const year = Number(targetQ.slice(0, 4))
  const monthly = MONTHS.map((m, i) => {
    const pre = `${year}-${String(i + 1).padStart(2, '0')}`
    const rows = placements.filter((p) => p.offerDate?.startsWith(pre))
    return { month: m, value: rows.reduce((s, p) => s + (p.dealValue || 0), 0), deals: rows.length }
  }).filter((m) => m.deals > 0)
  const monMax = Math.max(1, ...monthly.map((m) => m.value))

  const rows = [...q].sort((a, b) => (b.dealValue ?? -1) - (a.dealValue ?? -1))

  const gaugeMax = Math.max(goalCfg.stretch * 1.06, revenue * 1.04, 1)
  const fillPct = Math.min(100, (revenue / gaugeMax) * 100)
  const goalMark = (goalCfg.goal / gaugeMax) * 100
  const stretchMark = (goalCfg.stretch / gaugeMax) * 100
  const overGoal = revenue >= goalCfg.goal
  const asOf = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const css = `
    :root { --font-serif: ${serif.style.fontFamily}; --font-sans: ${sans.style.fontFamily}; }
    * { box-sizing: border-box; }
    .tmv { font-family: var(--font-sans); margin: 0; min-height: 100vh; color: ${C.cream};
      background:
        radial-gradient(1200px 600px at 78% -8%, rgba(201,169,110,.10), transparent 60%),
        radial-gradient(900px 500px at 10% 4%, rgba(109,122,182,.16), transparent 55%),
        linear-gradient(160deg, ${C.navyDarkest} 0%, #161B33 48%, ${C.navyDarkest} 100%);
      padding: 0 0 56px; -webkit-font-smoothing: antialiased; }
    .wrap { max-width: 1180px; margin: 0 auto; padding: 0 clamp(16px,4vw,40px); }
    .serif { font-family: var(--font-serif); }
    .num { font-variant-numeric: tabular-nums; }
    a { color: inherit; }

    /* header */
    .topbar { border-bottom: 1px solid rgba(201,169,110,.22); margin-bottom: 30px;
      background: linear-gradient(180deg, rgba(0,0,0,.18), transparent); }
    .topbar .wrap { display: flex; align-items: center; justify-content: space-between; gap: 18px;
      padding-top: 22px; padding-bottom: 22px; flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .mark { width: 50px; height: 50px; border: 1.5px solid ${C.gold}; border-radius: 9px;
      display: grid; place-items: center; font-family: var(--font-serif); font-weight: 700;
      font-size: 19px; letter-spacing: .04em; color: ${C.gold};
      box-shadow: inset 0 0 18px rgba(201,169,110,.16); }
    .brand .word { line-height: 1.06; }
    .brand .word .l1 { font-family: var(--font-serif); font-weight: 700; font-size: 17px; color: ${C.white}; letter-spacing: .02em; }
    .brand .word .l2 { font-size: 9.5px; letter-spacing: .34em; text-transform: uppercase; color: ${C.blue}; margin-top: 3px; }
    .hdr-right { text-align: right; }
    .hdr-right .q { font-family: var(--font-serif); font-weight: 600; font-size: 18px; color: ${C.goldLight}; }
    .hdr-right .d { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: ${C.blue}; margin-top: 3px; }

    .eyebrow { font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: ${C.gold}; font-weight: 600; }
    .h-title { font-family: var(--font-serif); font-weight: 700; font-size: clamp(28px,4.4vw,42px);
      color: ${C.white}; margin: 6px 0 0; letter-spacing: -.01em; text-wrap: balance; }
    .h-sub { color: ${C.blue}; font-size: 13.5px; margin-top: 6px; }

    .panel { background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));
      border: 1px solid rgba(201,169,110,.16); border-radius: 14px; padding: 22px 24px;
      box-shadow: 0 14px 40px rgba(0,0,0,.22); }
    .sect-h { font-family: var(--font-serif); font-weight: 600; color: ${C.white}; font-size: 19px; margin: 0 0 16px; }
    .sect-lead { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 34px 0 14px; }
    .sect-lead h2 { font-family: var(--font-serif); font-weight: 700; color: ${C.white}; font-size: 22px; margin: 0; }
    .sect-lead .meta { font-size: 12px; color: ${C.blue}; letter-spacing: .04em; }

    /* hero */
    .hero { margin-top: 24px; display: grid; grid-template-columns: 1.15fr 1fr; gap: 0; overflow: hidden;
      border-radius: 16px; border: 1px solid rgba(201,169,110,.2);
      background: linear-gradient(135deg, ${C.navyDeep}, ${C.navyDarkest}); box-shadow: 0 18px 50px rgba(0,0,0,.32); }
    @media (max-width: 720px) { .hero { grid-template-columns: 1fr; } }
    .hero-l { padding: 30px 32px; }
    .hero-r { padding: 30px 32px; border-left: 1px solid rgba(255,255,255,.08);
      display: flex; flex-direction: column; justify-content: center; gap: 6px;
      background: radial-gradient(420px 220px at 80% 20%, rgba(201,169,110,.10), transparent); }
    @media (max-width: 720px) { .hero-r { border-left: none; border-top: 1px solid rgba(255,255,255,.08); } }
    .hero-label { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: ${C.goldLight}; font-weight: 600; }
    .hero-rev { font-family: var(--font-serif); font-weight: 700; font-size: clamp(40px,7vw,62px); line-height: .98; color: ${C.white}; margin-top: 8px; }
    .track { position: relative; height: 16px; border-radius: 9px; background: rgba(255,255,255,.12); margin-top: 26px; }
    .fill { height: 100%; border-radius: 9px; width: ${fillPct}%;
      background: ${overGoal ? `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` : `linear-gradient(90deg, ${C.blue}, #8b97cf)`};
      box-shadow: 0 0 16px rgba(201,169,110,.4); animation: grow 1.1s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes grow { from { width: 0; } }
    @media (prefers-reduced-motion: reduce) { .fill { animation: none; } }
    .mk { position: absolute; top: -7px; bottom: -7px; width: 2px; background: rgba(255,255,255,.5); }
    .mk span { position: absolute; top: -19px; transform: translateX(-50%); font-size: 10px; color: rgba(255,255,255,.78); white-space: nowrap; }
    .hero-pct { font-family: var(--font-serif); font-weight: 700; font-size: 64px; line-height: 1;
      color: ${overGoal ? C.gold : C.white}; }
    .hero-note { font-size: 13px; color: ${C.goldLight}; margin-top: 6px; }

    /* kpi tiles */
    .tiles { display: grid; grid-template-columns: repeat(auto-fit,minmax(190px,1fr)); gap: 16px; margin-top: 16px; }
    .tile .k { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: ${C.blue}; font-weight: 600; }
    .tile .v { font-family: var(--font-serif); font-weight: 700; color: ${C.white}; font-size: 32px; margin-top: 8px; line-height: 1; }
    .tile .s { font-size: 12px; color: ${C.blue}; margin-top: 8px; }

    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    @media (max-width: 820px) { .two { grid-template-columns: 1fr; } }

    /* leaderboard */
    .lb-row { display: grid; grid-template-columns: 96px 1fr auto; align-items: center; gap: 12px; margin-bottom: 14px; }
    .lb-row:last-child { margin-bottom: 0; }
    .lb-name { font-weight: 600; font-size: 13px; color: ${C.white}; }
    .lb-bar { height: 11px; border-radius: 6px; background: rgba(255,255,255,.08); overflow: hidden; }
    .lb-bar > i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, ${C.gold}, ${C.goldLight}); }
    .lb-val { font-weight: 600; font-size: 13px; color: ${C.white}; text-align: right; }
    .lb-deals { font-size: 11px; color: ${C.blue}; text-align: right; }

    /* monthly */
    .bars { display: flex; align-items: flex-end; gap: 12px; height: 168px; }
    .bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 7px; height: 100%; justify-content: flex-end; }
    .bar > .col { width: 100%; max-width: 38px; border-radius: 6px 6px 0 0; min-height: 4px;
      background: linear-gradient(180deg, ${C.blue}, ${C.navy}); }
    .bar.peak > .col { background: linear-gradient(180deg, ${C.gold}, ${C.goldLight}); }
    .bar > .ml { font-size: 11px; color: ${C.blue}; font-weight: 500; }
    .bar > .mv { font-size: 10px; color: ${C.cream}; }

    /* table */
    .tbl-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid rgba(201,169,110,.16);
      box-shadow: 0 14px 40px rgba(0,0,0,.22); }
    table { width: 100%; border-collapse: collapse; min-width: 920px; font-size: 13px; background: rgba(255,255,255,.02); }
    thead th { text-align: left; font-size: 10.5px; letter-spacing: .09em; text-transform: uppercase;
      color: ${C.goldLight}; font-weight: 600; padding: 14px 14px; background: rgba(0,0,0,.22);
      border-bottom: 1px solid rgba(201,169,110,.22); white-space: nowrap; position: sticky; top: 0; }
    tbody td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,.06); color: ${C.cream}; white-space: nowrap; }
    tbody tr:nth-child(even) td { background: rgba(255,255,255,.025); }
    tbody tr:hover td { background: rgba(201,169,110,.08); }
    .t-cand { font-weight: 600; color: ${C.white}; }
    .t-client { color: ${C.blue}; }
    .r { text-align: right; font-variant-numeric: tabular-nums; }
    .t-deal { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; color: ${C.white}; }
    .t-pending { color: ${C.amber}; font-weight: 600; }
    .t-dim { color: ${C.blue}; }
    tfoot td { padding: 14px; font-weight: 700; color: ${C.white}; border-top: 2px solid rgba(201,169,110,.3);
      background: rgba(0,0,0,.2); font-variant-numeric: tabular-nums; }

    .foot { color: ${C.blue}; font-size: 12px; margin-top: 30px; line-height: 1.7; border-top: 1px solid rgba(255,255,255,.08); padding-top: 16px; }
    .err { background: rgba(199,80,80,.16); border: 1px solid ${C.red}; color: #f3c9c9; padding: 14px 16px; border-radius: 10px; margin-top: 20px; }
  `

  return (
    <main className={`tmv ${serif.variable} ${sans.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="topbar">
        <div className="wrap">
          <div className="brand">
            <div className="mark">TMV</div>
            <div className="word">
              <div className="l1">The Military Veteran</div>
              <div className="l2">Executive Search</div>
            </div>
          </div>
          <div className="hdr-right">
            <div className="q num">{targetQ}</div>
            <div className="d">Updated {asOf}</div>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="eyebrow">Candidate Delivery</div>
        <h1 className="h-title">Placement Performance</h1>
        <div className="h-sub num">{quarterRange(targetQ)} &nbsp;•&nbsp; {deals} placements this quarter</div>

        {loadError ? <div className="err">Couldn&apos;t load the sheet: {loadError}</div> : null}

        {/* Hero */}
        <section className="hero">
          <div className="hero-l">
            <div className="hero-label">Revenue to date</div>
            <div className="hero-rev num">{usd(revenue)}</div>
            <div className="track">
              <div className="fill" />
              <div className="mk" style={{ left: `${goalMark}%` }}><span>Goal {usdK(goalCfg.goal)}</span></div>
              <div className="mk" style={{ left: `${stretchMark}%` }}><span>Stretch {usdK(goalCfg.stretch)}</span></div>
            </div>
            <div className="hero-note num">
              {overGoal ? `✓ ${usd(revenue - goalCfg.goal)} past goal` : `${usd(goalCfg.goal - revenue)} to goal`}
            </div>
          </div>
          <div className="hero-r">
            <div className="hero-label">of {usdK(goalCfg.goal)} quarterly goal</div>
            <div className="hero-pct num">{pct}%</div>
            <div className="hero-note num">{pctStretch}% of {usdK(goalCfg.stretch)} stretch</div>
          </div>
        </section>

        {/* KPI tiles */}
        <div className="tiles">
          <div className="panel tile"><div className="k">Deals closed</div><div className="v num">{deals}</div><div className="s num">{withVal.length} with billable value</div></div>
          <div className="panel tile"><div className="k">Avg deal value</div><div className="v num">{usd(avg)}</div><div className="s">per revenue placement</div></div>
          <div className="panel tile"><div className="k">Last 30 days</div><div className="v num">{usd(last30rev)}</div><div className="s num">{last30.length} placements</div></div>
          <div className="panel tile"><div className="k">{year} year-to-date</div><div className="v num">{usd(ytdRev)}</div><div className="s">placement revenue</div></div>
        </div>

        {/* Leaderboard + Monthly */}
        <div className="two">
          <div className="panel">
            <h3 className="sect-h">Recruiter leaderboard</h3>
            {leaderboard.map((l) => (
              <div className="lb-row" key={l.name}>
                <div className="lb-name">{l.name}</div>
                <div className="lb-bar"><i style={{ width: `${Math.max(4, (l.value / lbMax) * 100)}%` }} /></div>
                <div><div className="lb-val num">{usd(l.value)}</div><div className="lb-deals num">{l.deals} {l.deals === 1 ? 'deal' : 'deals'}</div></div>
              </div>
            ))}
          </div>
          <div className="panel">
            <h3 className="sect-h">Monthly revenue · {year}</h3>
            <div className="bars">
              {monthly.map((m) => (
                <div className={`bar${m.value === monMax ? ' peak' : ''}`} key={m.month}>
                  <div className="mv num">{usdK(m.value)}</div>
                  <div className="col" style={{ height: `${Math.max(4, (m.value / monMax) * 100)}%` }} />
                  <div className="ml">{m.month}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed placement table */}
        <div className="sect-lead">
          <h2>Placement detail · {targetQ}</h2>
          <div className="meta num">{rows.length} placements · {usd(revenue)} total</div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th><th>Client</th><th>Recruiter</th><th>Sourcer</th><th>Sales / Affiliate</th>
                <th className="r">Base</th><th className="r">Bonus</th><th className="r">Other</th>
                <th className="r">Total Comp</th><th className="r">Deal Value</th><th>Signed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={i}>
                  <td className="t-cand">{p.candidate}</td>
                  <td className="t-client">{p.client}</td>
                  <td>{p.recruiter || <span className="t-dim">—</span>}</td>
                  <td>{p.sourcer || <span className="t-dim">—</span>}</td>
                  <td>{p.salesRep || <span className="t-dim">—</span>}</td>
                  <td className="r">{usdK(p.base || 0)}</td>
                  <td className="r">{usdK(p.bonus || 0)}</td>
                  <td className="r">{usdK(p.other || 0)}</td>
                  <td className="r">{usdK(p.totalComp || 0)}</td>
                  {p.dealValue != null ? <td className="t-deal">{usd(p.dealValue)}</td> : <td className="t-deal"><span className="t-pending">Pending</span></td>}
                  <td className="t-dim num">{p.offerDate || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={9}>Total · {rows.length} placements</td>
                <td className="r">{usd(revenue)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="foot">
          The Military Veteran — Candidate Delivery · Live from the <b>Signed Offers</b> tab of TMV Closed Deals ·
          Deal Value = Billable Total · figures refresh automatically on each load.
        </div>
      </div>
    </main>
  )
}
