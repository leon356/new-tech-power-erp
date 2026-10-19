'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const statuses = [
  { value: 'job_created', label: 'Job Created' },
  { value: 'site_assessment', label: 'Site Assessment' },
  { value: 'system_design', label: 'System Design' },
  { value: 'materials_required', label: 'Materials Required' },
  { value: 'materials_ordered', label: 'Materials Ordered' },
  { value: 'materials_ready', label: 'Materials Ready' },
  { value: 'installation_scheduled', label: 'Installation Scheduled' },
  { value: 'installation_in_progress', label: 'Installation In Progress' },
  { value: 'installation_complete', label: 'Installation Complete' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'handover', label: 'Handover' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function StatusSelector({
  jobId,
  currentStatus,
}: {
  jobId: string
  currentStatus: string
}) {
  const router = useRouter()

  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const newStatus = e.target.value

    setStatus(newStatus)
    setSaving(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase
      .from('jobs')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (error) {
      setStatus(currentStatus)
      setError(error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    router.refresh()
  }

  return (
    <div>

      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        Job Status
      </label>

      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:border-gray-500 disabled:bg-gray-100"
      >
        {statuses.map((item) => (
          <option
            key={item.value}
            value={item.value}
          >
            {item.label}
          </option>
        ))}
      </select>

      {saving && (
        <p className="mt-1.5 text-xs text-gray-500">
          Saving...
        </p>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

    </div>
  )
}
