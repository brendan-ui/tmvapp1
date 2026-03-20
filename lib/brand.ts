// TMV Brand Design Tokens
export const brand = {
  colors: {
    navyDarkest: '#1A2040',
    navyDeep: '#2A3150',
    navy: '#3F486B',
    blue: '#6D7AB6',
    gold: '#C9A96E',
    goldLight: '#DFC49A',
    cream: '#F0F0F0',
    white: '#FFFFFF',
    red: '#C75050',
    green: '#5CAA6E',
    amber: '#D4A017',
  },
  fonts: {
    display: "'EB Garamond', serif",
    body: "'Poppins', sans-serif",
  },
} as const

// V8 2026 Budget (monthly, in dollars) — from v8 base case model
export const V8_BUDGET_2026 = {
  revenue:     [257000, 262000, 292000, 310000, 334000, 351000, 375000, 350000, 375000, 400000, 350000, 300000],
  grossProfit: [197000, 202000, 234000, 223000, 236000, 231000, 250000, 230000, 250000, 265000, 230000, 195000],
  opex:        [82000,  82000,  97000,  99000,  99000,  101000, 105000, 100000, 105000, 110000, 105000, 100000],
  ebitda:      [115000, 120000, 138000, 124000, 137000, 130000, 145000, 130000, 145000, 155000, 125000, 95000],
} as const

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

// Loxo pipeline stage probabilities (actual stages from TMV's Loxo CRM)
export const PIPELINE_STAGES: Record<string, number> = {
  'Closed Won': 1.0,
  'Contract Out': 0.70,
  'Follow Up': 0.50,
  'Meeting Scheduled': 0.25,
  'Next Quarter': 0.20,
  'SQL': 0.10,
}

// AR aging thresholds (days overdue)
export const AR_AGING = {
  current: { max: 30, label: 'Current', color: '#5CAA6E' },
  aging: { max: 60, label: '31-60 Days', color: '#D4A017' },
  atRisk: { max: 90, label: '61-90 Days', color: '#C75050' },
  critical: { max: Infinity, label: '90+ Days', color: '#991B1B' },
} as const

// Andersen Plumbing — always flagged in AR views (avg DSO: 122 days)
export const ALWAYS_FLAGGED_CUSTOMERS = ['Andersen Plumbing']

// App roles
export type AppRole = 'owner' | 'executive' | 'sales' | 'recruiter' | 'viewer'

export const ROLE_PERMISSIONS: Record<AppRole, { tabs: string[]; canWriteEos: boolean; canWriteAll: boolean }> = {
  owner: { tabs: ['revenue', 'cash', 'pipeline', 'profitability', 'eos'], canWriteEos: true, canWriteAll: true },
  executive: { tabs: ['revenue', 'cash', 'pipeline', 'profitability', 'eos'], canWriteEos: true, canWriteAll: false },
  sales: { tabs: ['revenue', 'pipeline', 'eos'], canWriteEos: true, canWriteAll: false },
  recruiter: { tabs: ['pipeline', 'eos'], canWriteEos: true, canWriteAll: false },
  viewer: { tabs: ['revenue', 'pipeline'], canWriteEos: false, canWriteAll: false },
}

// Data caveat banners — ALWAYS display these on relevant views
export const DATA_CAVEATS = {
  payrollReclassification: 'Payroll reclassification pending: All W2 payroll currently flows to Recruiter Wages/COGS via Gusto. Gross margin is distorted until Chris executes the Xero recode.',
  midMonthIncomplete: 'Current month data is incomplete — payroll and some OpEx have not yet posted.',
  balanceSheetPointInTime: 'Balance sheet reflects latest Coupler.io snapshot only, not historical month-ends.',
  retainerCreditThrough: 'Budget vs Actual compares TOTAL revenue only. Do not compare retainer or placement lines individually (Xero books retainer credits differently than the v8 model).',
} as const
