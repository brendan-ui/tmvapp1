import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchDataflow,
  DATAFLOWS,
  mapXeroPL,
  mapXeroBalanceSheet,
  mapXeroInvoices,
  mapXeroAccounts,
  mapXeroTransactions,
  mapLoxoDeals,
  mapSignedClients,
} from '@/lib/coupler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Record<string, { rows: number; error?: string }> = {}

  // Sync Xero P&L
  try {
    const raw = await fetchDataflow(DATAFLOWS.XERO_PL)
    const rows = raw.map(mapXeroPL)
    await supabase.from('xero_profit_and_loss').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('xero_profit_and_loss').insert(rows)
    results['xero_pl'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['xero_pl'] = { rows: 0, error: e.message }
  }

  // Sync Xero Balance Sheet
  try {
    const raw = await fetchDataflow(DATAFLOWS.XERO_BALANCE_SHEET)
    const rows = raw.map(mapXeroBalanceSheet)
    await supabase.from('xero_balance_sheet').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('xero_balance_sheet').insert(rows)
    results['xero_balance_sheet'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['xero_balance_sheet'] = { rows: 0, error: e.message }
  }

  // Sync Xero Invoices
  try {
    const raw = await fetchDataflow(DATAFLOWS.XERO_INVOICES)
    const rows = raw.map(mapXeroInvoices)
    await supabase.from('xero_invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('xero_invoices').insert(rows)
    results['xero_invoices'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['xero_invoices'] = { rows: 0, error: e.message }
  }

  // Sync Xero Accounts
  try {
    const raw = await fetchDataflow(DATAFLOWS.XERO_ACCOUNTS)
    const rows = raw.map(mapXeroAccounts)
    await supabase.from('xero_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('xero_accounts').insert(rows)
    results['xero_accounts'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['xero_accounts'] = { rows: 0, error: e.message }
  }

  // Sync Xero Transactions
  try {
    const raw = await fetchDataflow(DATAFLOWS.XERO_TRANSACTIONS)
    const rows = raw.map(mapXeroTransactions)
    await supabase.from('xero_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('xero_transactions').insert(rows)
    results['xero_transactions'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['xero_transactions'] = { rows: 0, error: e.message }
  }

  // Sync Loxo Deals
  try {
    const raw = await fetchDataflow(DATAFLOWS.LOXO_DEALS)
    const rows = raw.map(mapLoxoDeals)
    await supabase.from('loxo_deals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('loxo_deals').insert(rows)
    results['loxo_deals'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['loxo_deals'] = { rows: 0, error: e.message }
  }

  // Sync Signed Clients
  try {
    const raw = await fetchDataflow(DATAFLOWS.SIGNED_CLIENTS)
    const rows = raw.map(mapSignedClients)
    await supabase.from('signed_clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('signed_clients').insert(rows)
    results['signed_clients'] = { rows: rows.length, error: error?.message }
  } catch (e: any) {
    results['signed_clients'] = { rows: 0, error: e.message }
  }

  const hasErrors = Object.values(results).some((r) => r.error)

  return NextResponse.json({
    success: !hasErrors,
    synced_at: new Date().toISOString(),
    results,
  }, { status: hasErrors ? 207 : 200 })
}
