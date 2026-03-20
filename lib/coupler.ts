const COUPLER_BASE = 'https://api.coupler.io/v1/dataflows'

// Dataflow IDs
export const DATAFLOWS = {
  XERO_PL: '611c062b-87c0-411d-8e05-933d5b23ff19',
  SIGNED_CLIENTS: '6951d439-262a-439c-8d85-77caee1c659d',
  LOXO_DEALS: '965d389e-103b-41ef-9a49-60a496fdd6c1',
  TOP_OF_FUNNEL: '901b1d2b-238d-48a9-b041-f3c2d5a07f2f',
  XERO_INVOICES: 'f965bc32-d4ea-4767-9833-4c2b6a2a414a',
  XERO_BALANCE_SHEET: 'c5bbcc9a-1581-447a-b371-57b2a47427b0',
  XERO_ACCOUNTS: 'eb8b71b1-651f-4b18-82d6-3666a65704b6',
  XERO_TRANSACTIONS: '35c2ff4f-cb36-410e-aa1c-f57eca5afa0d',
} as const

interface CouplerResponse {
  data: Record<string, unknown>[]
}

export async function fetchDataflow(dataflowId: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${COUPLER_BASE}/${dataflowId}/data`, {
    headers: {
      'Authorization': `Bearer ${process.env.COUPLER_API_KEY}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Coupler API error: ${res.status} ${res.statusText}`)
  }

  const json: CouplerResponse = await res.json()
  return json.data
}

// Column mappings for each dataflow (col_N -> human-readable name)

export function mapXeroPL(row: Record<string, unknown>) {
  return {
    report: row.col_0 as string | null,
    report_date: row.col_1 as string | null,
    account_class: row.col_2 as string | null,
    account_type: row.col_3 as string | null,
    account_name: row.col_4 as string | null,
    amount: row.col_5 as number | null,
    amount_for_calculation: row.col_6 as number | null,
    gross_profit: row.col_7 as string | null,
    operating_profit: row.col_8 as string | null,
    net_profit: row.col_9 as string | null,
  }
}

export function mapXeroBalanceSheet(row: Record<string, unknown>) {
  return {
    report: row.col_0 as string | null,
    report_date: row.col_1 as string | null,
    category: row.col_2 as string | null,
    account_type: row.col_3 as string | null,
    account_subclass: row.col_4 as string | null,
    account_class: row.col_5 as string | null,
    account_name: row.col_6 as string | null,
    amount: row.col_7 as number | null,
    account_currency: row.col_8 as string | null,
  }
}

export function mapXeroInvoices(row: Record<string, unknown>) {
  return {
    invoice_type: row.col_0 as string | null,
    invoice_id: row.col_1 as string | null,
    invoice_number: row.col_2 as string | null,
    contact_customer: row.col_3 as string | null,
    line_item_description: row.col_4 as string | null,
    line_item_id: row.col_5 as string | null,
    invoice_date: row.col_6 as string | null,
    invoice_due_date: row.col_7 as string | null,
    payment_date: row.col_8 as string | null,
    invoice_status: row.col_9 as string | null,
    currency: row.col_10 as string | null,
    currency_rate: row.col_11 as number | null,
    payment_currency_rate: row.col_12 as number | null,
    tax: row.col_13 as string | null,
    tax_type: row.col_14 as string | null,
    quantity: row.col_15 as string | null,
    total_amount: row.col_16 as number | null,
    amount_paid: row.col_17 as number | null,
    amount_due: row.col_18 as number | null,
    total_amount_home: row.col_19 as number | null,
    amount_paid_home: row.col_20 as number | null,
    amount_due_home: row.col_21 as number | null,
  }
}

export function mapXeroAccounts(row: Record<string, unknown>) {
  return {
    report: row.col_0 as string | null,
    account_code: row.col_1 as string | null,
    name: row.col_2 as string | null,
    account_type: row.col_3 as string | null,
    account_subclass: row.col_4 as string | null,
    account_class: row.col_5 as string | null,
    account_currency: row.col_6 as string | null,
    bank_account_type: row.col_7 as string | null,
    description: row.col_8 as string | null,
    status: row.col_9 as string | null,
  }
}

export function mapXeroTransactions(row: Record<string, unknown>) {
  return {
    report: row.col_0 as string | null,
    journal_date: row.col_1 as string | null,
    account_code: row.col_2 as string | null,
    account_name: row.col_3 as string | null,
    contact_name: row.col_4 as string | null,
    gross_amount: row.col_5 as number | null,
    net_amount: row.col_6 as number | null,
    description: row.col_7 as string | null,
    reference: row.col_8 as string | null,
    account_type: row.col_9 as string | null,
    source_type: row.col_10 as string | null,
    reversal: row.col_11 as string | null,
  }
}

export function mapLoxoDeals(row: Record<string, unknown>) {
  return {
    deal_id: row.col_1 as number | null,
    deal_name: row.col_2 as string | null,
    amount: row.col_3 as number | null,
    expected_amount: row.col_4 as number | null,
    close_date: row.col_5 as string | null,
    company_name: row.col_6 as string | null,
    pipeline_name: row.col_7 as string | null,
    pipeline_stage: row.col_8 as string | null,
    stage_win_probability: row.col_9 as number | null,
    owner: row.col_10 as string | null,
    owner_email: row.col_11 as string | null,
    linked_job: row.col_12 as string | null,
    contact_person: row.col_13 as string | null,
    deal_status: row.col_14 as string | null,
    status_updated_at: row.col_15 as string | null,
    created_at: row.col_16 as string | null,
    updated_at: row.col_17 as string | null,
    deleted: row.col_18 as boolean,
    job_id: row.col_19 as number | null,
    job_title: row.col_20 as string | null,
    job_company: row.col_21 as string | null,
    city: row.col_22 as string | null,
    state: row.col_23 as string | null,
    fee: row.col_36 as number | null,
  }
}

export function mapSignedClients(row: Record<string, unknown>) {
  return {
    sheet_name: row.col_0 as string,
    timestamp: row.col_1 as string | null,
    email_address: row.col_2 as string | null,
    company_name: row.col_4 as string | null,
    hiring_manager: row.col_5 as string | null,
    hiring_manager_email: row.col_6 as string | null,
    sales_credit_person: row.col_8 as string | null,
    managing_person: row.col_9 as string | null,
    retainer_amount: row.col_10 as number | null,
    success_fee_pct: row.col_11 as number | null,
    fee_applied_to: row.col_12 as string | null,
    special_terms: row.col_13 as string | null,
    origination_source: row.col_14 as string | null,
    invoice_status: row.col_15 as string | null,
    invoice_number: row.col_16 as string | null,
    candidate_name: row.col_24 as string | null,
    candidate_start_date: row.col_25 as string | null,
    annual_base_comp: row.col_26 as number | null,
    annual_bonus_comp: row.col_27 as number | null,
    other_comp: row.col_28 as number | null,
    total_comp_for_fee: row.col_29 as number | null,
    sourcer: row.col_31 as string | null,
    recruiter: row.col_32 as string | null,
    client_partner: row.col_34 as string | null,
    sales_credit: row.col_38 as string | null,
    billable_total: row.col_45 as number | null,
    retainer_credit: row.col_46 as number | null,
    invoice_total: row.col_47 as number | null,
    billable_total_for_invoicing: row.col_75 as number | null,
    invoice_issue_date: row.col_51 as string | null,
    invoice_due_date: row.col_53 as string | null,
    invoice_paid_date: row.col_54 as string | null,
  }
}
