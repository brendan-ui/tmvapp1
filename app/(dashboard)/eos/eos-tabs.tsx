'use client'

import { useState } from 'react'
import { Card } from '@/components/card'
import { createClient } from '@/lib/supabase/client'
import type { AppRole } from '@/lib/brand'

interface ScorecardRow {
  id: string
  owner_id: string
  owner_name: string | null
  metric_name: string
  target: number | null
  actual: number | null
  week_of: string
  on_track: boolean | null
}

interface Rock {
  id: string
  owner_id: string
  owner_name: string | null
  title: string
  quarter: string | null
  status: string
  created_at: string
}

interface Todo {
  id: string
  owner_id: string
  owner_name: string | null
  title: string
  completed: boolean
  due_date: string | null
  created_at: string
}

interface Issue {
  id: string
  title: string
  description: string | null
  priority: number
  status: string
  owner_name: string | null
  created_at: string
}

const TABS = ['Scorecard', 'Rocks', 'To-Dos', 'Issues', 'L10'] as const

export function EosTabs({
  scorecards,
  rocks,
  todos,
  issues,
  userId,
  userRole,
}: {
  scorecards: ScorecardRow[]
  rocks: Rock[]
  todos: Todo[]
  issues: Issue[]
  userId: string
  userRole: AppRole
}) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Scorecard')
  const canWrite = userRole !== 'viewer'

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-100 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-body text-sm transition-colors ${
              activeTab === tab
                ? 'bg-navy text-white'
                : 'text-gray-500 hover:text-navy hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Scorecard' && <ScorecardPanel data={scorecards} />}
      {activeTab === 'Rocks' && <RocksPanel data={rocks} canWrite={canWrite} />}
      {activeTab === 'To-Dos' && <TodosPanel data={todos} canWrite={canWrite} userId={userId} />}
      {activeTab === 'Issues' && <IssuesPanel data={issues} canWrite={canWrite} />}
      {activeTab === 'L10' && <L10Panel />}
    </div>
  )
}

function ScorecardPanel({ data }: { data: ScorecardRow[] }) {
  // Group by week
  const weeks = new Map<string, ScorecardRow[]>()
  for (const row of data) {
    const week = row.week_of
    if (!weeks.has(week)) weeks.set(week, [])
    weeks.get(week)!.push(row)
  }

  const sortedWeeks = Array.from(weeks.entries()).slice(0, 4)

  return (
    <div className="space-y-6">
      {sortedWeeks.map(([week, rows]) => (
        <Card key={week}>
          <h3 className="font-display text-lg font-bold text-navy mb-3">Week of {week}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase pb-2">Owner</th>
                  <th className="text-left font-body text-xs font-semibold text-gray-500 uppercase pb-2">Metric</th>
                  <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase pb-2">Target</th>
                  <th className="text-right font-body text-xs font-semibold text-gray-500 uppercase pb-2">Actual</th>
                  <th className="text-center font-body text-xs font-semibold text-gray-500 uppercase pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 font-body text-sm text-navy">{row.owner_name ?? 'Unknown'}</td>
                    <td className="py-2 font-body text-sm text-gray-600">{row.metric_name}</td>
                    <td className="py-2 font-body text-sm text-gray-500 text-right">{row.target ?? '-'}</td>
                    <td className="py-2 font-body text-sm text-navy text-right font-medium">{row.actual ?? '-'}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${
                        row.on_track === true ? 'bg-tmv-green' : row.on_track === false ? 'bg-tmv-red' : 'bg-gray-300'
                      }`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      {sortedWeeks.length === 0 && (
        <Card>
          <p className="font-body text-sm text-gray-400 text-center py-8">No scorecard data yet</p>
        </Card>
      )}
    </div>
  )
}

function RocksPanel({ data, canWrite }: { data: Rock[]; canWrite: boolean }) {
  const statusColors: Record<string, string> = {
    on_track: 'bg-tmv-green/10 text-tmv-green',
    off_track: 'bg-tmv-red/10 text-tmv-red',
    complete: 'bg-navy/10 text-navy',
    not_started: 'bg-gray-100 text-gray-500',
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-navy">Quarterly Rocks</h3>
      </div>
      <div className="space-y-3">
        {data.map((rock) => (
          <div key={rock.id} className="flex items-center justify-between p-3 rounded-lg bg-cream/50 border border-gray-100">
            <div className="flex-1 min-w-0">
              <p className="font-body text-sm font-medium text-navy truncate">{rock.title}</p>
              <p className="font-body text-xs text-gray-500 mt-0.5">
                {rock.owner_name ?? 'Unassigned'} {rock.quarter ? `• ${rock.quarter}` : ''}
              </p>
            </div>
            <span className={`ml-3 px-2 py-0.5 rounded-full font-body text-xs font-medium ${statusColors[rock.status] ?? statusColors.not_started}`}>
              {rock.status.replace('_', ' ')}
            </span>
          </div>
        ))}
        {data.length === 0 && (
          <p className="font-body text-sm text-gray-400 text-center py-8">No rocks defined yet</p>
        )}
      </div>
    </Card>
  )
}

function TodosPanel({ data, canWrite, userId }: { data: Todo[]; canWrite: boolean; userId: string }) {
  const toggleTodo = async (todoId: string, completed: boolean) => {
    const supabase = createClient()
    await supabase.from('eos_todos').update({ completed: !completed }).eq('id', todoId)
    window.location.reload()
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-navy">To-Dos</h3>
      </div>
      <div className="space-y-2">
        {data.map((todo) => (
          <div key={todo.id} className="flex items-center gap-3 p-3 rounded-lg bg-cream/50 border border-gray-100">
            {canWrite && (
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  todo.completed ? 'bg-navy border-navy' : 'border-gray-300 hover:border-navy'
                }`}
              >
                {todo.completed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-body text-sm ${todo.completed ? 'text-gray-400 line-through' : 'text-navy'}`}>
                {todo.title}
              </p>
              <p className="font-body text-xs text-gray-500 mt-0.5">
                {todo.owner_name ?? 'Unassigned'}
                {todo.due_date ? ` • Due ${todo.due_date}` : ''}
              </p>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="font-body text-sm text-gray-400 text-center py-8">No to-dos yet</p>
        )}
      </div>
    </Card>
  )
}

function IssuesPanel({ data, canWrite }: { data: Issue[]; canWrite: boolean }) {
  const priorityColors: Record<number, string> = {
    1: 'bg-tmv-red/10 text-tmv-red',
    2: 'bg-tmv-amber/10 text-tmv-amber',
    3: 'bg-gray-100 text-gray-500',
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-navy">Issues (IDS)</h3>
      </div>
      <div className="space-y-3">
        {data.map((issue) => (
          <div key={issue.id} className="p-3 rounded-lg bg-cream/50 border border-gray-100">
            <div className="flex items-center justify-between">
              <p className="font-body text-sm font-medium text-navy">{issue.title}</p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-body text-xs font-medium ${priorityColors[issue.priority] ?? priorityColors[3]}`}>
                  P{issue.priority}
                </span>
                <span className="px-2 py-0.5 rounded-full font-body text-xs font-medium bg-navy/5 text-navy capitalize">
                  {issue.status}
                </span>
              </div>
            </div>
            {issue.description && (
              <p className="font-body text-xs text-gray-500 mt-1">{issue.description}</p>
            )}
            <p className="font-body text-xs text-gray-400 mt-1">{issue.owner_name ?? 'Unassigned'}</p>
          </div>
        ))}
        {data.length === 0 && (
          <p className="font-body text-sm text-gray-400 text-center py-8">No issues tracked yet</p>
        )}
      </div>
    </Card>
  )
}

function L10Panel() {
  return (
    <Card>
      <h3 className="font-display text-lg font-bold text-navy mb-4">L10 Meeting</h3>
      <div className="space-y-4">
        {[
          { time: '5 min', item: 'Segue — Good news (personal & professional)' },
          { time: '5 min', item: 'Scorecard Review' },
          { time: '5 min', item: 'Rock Review' },
          { time: '5 min', item: 'Customer/Employee Headlines' },
          { time: '5 min', item: 'To-Do List Review' },
          { time: '60 min', item: 'IDS — Identify, Discuss, Solve' },
          { time: '5 min', item: 'Conclude — Recap to-dos, cascading messages, rating (1-10)' },
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-4 p-3 rounded-lg border border-gray-100">
            <span className="font-body text-xs font-semibold text-gold bg-gold/10 px-2 py-1 rounded shrink-0">
              {step.time}
            </span>
            <p className="font-body text-sm text-navy">{step.item}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
